// Vista Cordillera 505 — calendario de disponibilidad.
// Supabase Edge Function (desplegar con --no-verify-jwt).
//
//  GET /functions/v1/calendario
//    → { ocupado: [["2026-12-03","2026-12-07"], ...], actualizado, hoy, configurado }
//    Cada rango es [primera noche ocupada, día de salida). Sin notas ni origen.
//    Si los calendarios de Airbnb/Booking tienen más de 20 min, los vuelve a leer antes de responder.
//
//  GET /functions/v1/calendario?forzar=1   (con Authorization: Bearer <sesión del admin>)
//    → sincroniza ya y devuelve además el estado de cada fuente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "https://vistacordillera505.cl",
  "https://www.vistacordillera505.cl",
  "https://patriciopulido.github.io",
];
const isAllowedOrigin = (o: string) =>
  ALLOWED_ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

const STALE_MS = 20 * 60 * 1000; // relee los iCal cada 20 min como máximo
const FORCE_MIN_MS = 30 * 1000; // "Sincronizar ahora" no más de una vez cada 30 s
const HORIZON_DAYS = 400;

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

type Fuente = {
  id: number;
  nombre: string;
  url: string;
  activo: boolean;
  ultimo_sync: string | null;
  ultimo_ok: string | null;
  ultimo_error: string | null;
};
type Rango = [string, string];

// ── PostgREST con la llave de servicio ───────────────────────
async function db(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`db ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

// ── Fechas (en hora de Chile) ────────────────────────────────
function hoyChile(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── iCal ─────────────────────────────────────────────────────
// Devuelve rangos [inicio, fin) a partir de un .ics (Airbnb, Booking, Google…).
export function parseIcs(text: string): Rango[] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: Rango[] = [];
  for (const block of unfolded.split(/BEGIN:VEVENT/).slice(1)) {
    const ev = block.split(/END:VEVENT/)[0];
    if (/^STATUS:CANCELLED/mi.test(ev)) continue;
    const s = ev.match(/^DTSTART[^:\r\n]*:(\d{4})(\d{2})(\d{2})(T(\d{6}))?/m);
    if (!s) continue;
    const inicio = `${s[1]}-${s[2]}-${s[3]}`;
    const e = ev.match(/^DTEND[^:\r\n]*:(\d{4})(\d{2})(\d{2})(T(\d{6}))?/m);
    let fin = e ? `${e[1]}-${e[2]}-${e[3]}` : addDays(inicio, 1);
    if (fin <= inicio) fin = addDays(inicio, 1); // evento de un solo día
    out.push([inicio, fin]);
  }
  return out;
}

async function syncFuente(f: Fuente): Promise<{ ok: boolean; eventos?: number; error?: string }> {
  const now = new Date().toISOString();
  try {
    if (!/^https:\/\//i.test(f.url)) throw new Error("El link debe empezar con https://");
    const res = await fetch(f.url, {
      headers: { "User-Agent": "VistaCordillera505-Calendario/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`El calendario respondió ${res.status}`);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error("El link no es un calendario iCal (.ics)");
    const hoy = hoyChile();
    const rangos = parseIcs(text).filter(([, fin]) => fin > hoy);
    await db(`calendario_bloqueos?fuente_id=eq.${f.id}`, { method: "DELETE" });
    if (rangos.length) {
      await db("calendario_bloqueos", {
        method: "POST",
        body: JSON.stringify(rangos.map(([inicio, fin]) => ({ inicio, fin, origen: "ical", fuente_id: f.id }))),
      });
    }
    await db(`calendario_fuentes?id=eq.${f.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ultimo_ok: now, ultimo_error: null }),
    });
    return { ok: true, eventos: rangos.length };
  } catch (err) {
    const msg = String((err as Error)?.message || err).slice(0, 300);
    await db(`calendario_fuentes?id=eq.${f.id}`, {
      method: "PATCH",
      body: JSON.stringify({ ultimo_error: msg }),
    }).catch(() => {});
    return { ok: false, error: msg };
  }
}

// Toma el "turno" de sincronizar una fuente (evita que varias visitas la lean a la vez).
async function claim(f: Fuente, minMs: number): Promise<boolean> {
  const limite = new Date(Date.now() - minMs).toISOString();
  const rows = await db(
    `calendario_fuentes?id=eq.${f.id}&or=(ultimo_sync.is.null,ultimo_sync.lt.${encodeURIComponent(limite)})`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ultimo_sync: new Date().toISOString() }),
    },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function syncAll(forzar: boolean) {
  const fuentes: Fuente[] = await db("calendario_fuentes?select=*&order=id");
  const estado: Record<number, { ok: boolean; eventos?: number; error?: string }> = {};
  await Promise.all(
    fuentes.filter((f) => f.activo && f.url.trim()).map(async (f) => {
      if (await claim(f, forzar ? FORCE_MIN_MS : STALE_MS)) estado[f.id] = await syncFuente(f);
    }),
  );
  return { fuentes, estado };
}

function merge(rangos: Rango[]): Rango[] {
  const s = [...rangos].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const out: Rango[] = [];
  for (const r of s) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) { if (r[1] > last[1]) last[1] = r[1]; }
    else out.push([r[0], r[1]]);
  }
  return out;
}

async function esAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return false;
  const res = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
  if (!res.ok) return false;
  const email = String((await res.json())?.email || "").toLowerCase();
  if (!email) return false;
  const rows = await db(`landing_admins?select=email&email=ilike.${encodeURIComponent(email)}`);
  return Array.isArray(rows) && rows.length > 0;
}

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allow = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors(allow), ...extra },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(allow) });
  if (req.method !== "GET") return json({ error: "Método no permitido" }, 405);

  try {
    const forzar = new URL(req.url).searchParams.get("forzar") === "1";
    const admin = forzar && (await esAdmin(req));
    if (forzar && !admin) return json({ error: "Solo el administrador puede sincronizar" }, 401);

    let sync: Awaited<ReturnType<typeof syncAll>> | null = null;
    try { sync = await syncAll(admin); } catch (e) { console.error("sync", e); }

    const hoy = hoyChile();
    const hasta = addDays(hoy, HORIZON_DAYS);
    const rows: Array<{ inicio: string; fin: string }> = await db(
      `calendario_bloqueos?select=inicio,fin&fin=gt.${hoy}&inicio=lt.${hasta}&order=inicio`,
    );
    const fuentes: Fuente[] = await db("calendario_fuentes?select=*&order=id");
    const oks = fuentes.map((f) => f.ultimo_ok).filter(Boolean) as string[];
    const body: Record<string, unknown> = {
      ocupado: merge(rows.map((r) => [r.inicio, r.fin])),
      actualizado: oks.sort().pop() || null,
      hoy,
      // el sitio solo muestra el calendario si hay un link iCal o algún bloqueo manual
      configurado: fuentes.some((f) => f.activo && f.url.trim()) || rows.length > 0,
    };
    if (admin) {
      body.fuentes = fuentes.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        activo: f.activo,
        ultimo_ok: f.ultimo_ok,
        ultimo_error: f.ultimo_error,
        eventos: sync?.estado[f.id]?.eventos,
      }));
    }
    return json(body, 200, admin ? { "Cache-Control": "no-store" } : { "Cache-Control": "public, max-age=120" });
  } catch (err) {
    console.error(err);
    return json({ error: "No se pudo leer el calendario" }, 500);
  }
});
