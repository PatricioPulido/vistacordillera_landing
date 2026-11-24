// Vista Cordillera 505 — asistente con IA para huéspedes.
// Supabase Edge Function: recibe { messages: [{role, content}] } y responde { reply }.
// Necesita el secreto ANTHROPIC_API_KEY (Supabase > Edge Functions > Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@1.13.0";

const ALLOWED_ORIGINS = [
  "https://vistacordillera505.cl",
  "https://www.vistacordillera505.cl",
  "https://patriciopulido.github.io",
];
const isAllowedOrigin = (o: string) =>
  ALLOWED_ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

const MAX_MSGS = 12;
const MAX_CHARS = 600;
const RATE = { windowMs: 10 * 60 * 1000, max: 20 }; // 20 preguntas cada 10 min por IP

const client = new Anthropic(); // lee ANTHROPIC_API_KEY
const hits = new Map<string, number[]>();

// Hechos fijos del depto (lo mismo que dice la página).
const FACTS = `
Departamento: Vista Cordillera 505, Edificio O2, Av. Libertador Bernardo O'Higgins (Alameda) 4361, Estación Central, Santiago, Chile.
Departamento completo (no pieza): 1 dormitorio con cama 2 plazas y ventanal de piso a cielo, sofá cama en el living para un tercer huésped, 1 baño. Hasta 3 huéspedes. Balcón con vista a la ciudad. Doble vidrio PVC.
Comodidades: wifi de fibra rápido, Smart TV con Netflix y YouTube, cocina completa con horno, vajilla, ollas y sartenes, juguera, hervidor y prensa francesa, aire acondicionado frío/calor 12.000 BTU, agua caliente por caldera, toallas, sábanas y amenities (champú, acondicionador, secador de pelo, plancha, té y café).
Edificio: conserjería 24 h, ascensor, gimnasio gratis, lavandería, sala de estar, patio interior con jardín vertical, quinchos y sala gourmet (se reservan con anticipación). Check-in autónomo 24 h con cerradura digital.
No hay estacionamiento propio: se recomienda Uber o metro. Limpieza extra disponible para estadías largas.
Distancias desde la puerta: Metro Ecuador / San Alberto Hurtado (Línea 1) 4 min a pie; Terminal Alameda (buses y trenes) 3 min a pie; Mall Plaza Alameda 5 min a pie; Líder Alameda (supermercado) 6 min a pie; Movistar Arena 10 min a pie; Parque Quinta Normal 8 min en auto; Plaza de Armas 12 min en auto; Aeropuerto Arturo Merino Benítez unos 12 min en auto (sin tráfico).
La Línea 1 del metro va directo al centro, Providencia y Las Condes.
Reseñas: Favorito entre huéspedes de Airbnb. Puntajes: limpieza 4,8, veracidad 4,9, llegada 4,8, comunicación 4,8, ubicación 4,7, calidad-precio 4,9. 100 % tasa de respuesta, responde en menos de 1 hora.
Se puede reservar directo por WhatsApp, o por Airbnb o Booking.
`.trim();

type Content = Record<string, unknown>;
let cached: { at: number; data: Content } | null = null;

async function loadContent(): Promise<Content> {
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.data;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    const res = await fetch(`${url}/rest/v1/landing_contenido?id=eq.1&select=data`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    });
    const rows = res.ok ? await res.json() : [];
    const data = (rows?.[0]?.data ?? {}) as Content;
    cached = { at: Date.now(), data };
    return data;
  } catch {
    return cached?.data ?? {};
  }
}

function buildSystem(c: Content): string {
  const hosts = Array.isArray(c.anfitriones) && c.anfitriones.length
    ? (c.anfitriones as Array<Record<string, string>>)
    : [
      { nombre: "Patricio", rol: "Anfitrión" },
      { nombre: "Alejandra", rol: "Coanfitriona" },
    ];
  const main = hosts[0]?.nombre || "Patricio";
  const wsp = String(c.whatsapp || "56963008006").replace(/\D/g, "");
  const hostLines = hosts.map((h, i) =>
    `- ${h.nombre} (${h.rol || (i ? "coanfitrión/a" : "anfitrión")})${h.texto ? ": " + h.texto : ""}`
  ).join("\n");
  const fotos = Array.isArray(c.fotos)
    ? (c.fotos as Array<Record<string, string>>).map((f) => f.texto).filter(Boolean).join("; ")
    : "";
  const extra = String(c.asistente_info || "").trim();

  return `Eres el asistente virtual del sitio web vistacordillera505.cl, un departamento que se arrienda por días en Santiago de Chile. Respondes preguntas de posibles huéspedes y de huéspedes con reserva.

<datos_del_departamento>
${FACTS}
Calificación en Airbnb: ${c.rating || "4,89"} con ${c.reviews || 85} reseñas. Capacidad: ${c.huespedes || 3} huéspedes, ${c.dormitorios || 1} dormitorio, ${c.camas || 2} camas, ${c.banos || 1} baño.
Fotos de la galería: ${fotos || "dormitorio, balcón, living, cocina, baño, áreas comunes del edificio"}.
</datos_del_departamento>

<anfitriones>
${hostLines}
El contacto principal es ${main}: WhatsApp +${wsp} (https://wa.me/${wsp}). Airbnb: ${c.airbnb || "https://www.airbnb.com/h/vistacordillera-santiago-chile"}. Booking: ${c.booking || "https://www.booking.com/Share-9G10Ls"}.
</anfitriones>
${extra ? `\n<informacion_adicional_de_los_anfitriones>\n${extra}\n</informacion_adicional_de_los_anfitriones>\n` : ""}
Cómo responder:
- Responde en el idioma en que te escriben (por defecto español de Chile), con un tono cálido y cercano, en 1 a 4 frases. Texto plano, sin Markdown ni listas largas.
- Usa solo la información de arriba. Si algo no está ahí (precios, disponibilidad de fechas, descuentos, mascotas, horarios exactos de llegada o salida, reglas no mencionadas), dilo con honestidad y sugiere escribirle a ${main} por WhatsApp; no inventes.
- Nunca entregues códigos de acceso, claves de wifi ni datos personales de huéspedes; si te los piden, indica que ${main} los envía por WhatsApp a quienes tienen reserva.
- Para reservar, invita a escribirle a ${main} por WhatsApp (reserva directa) o a reservar por Airbnb o Booking.
- Puedes dar consejos generales sobre Santiago (transporte, barrios, qué visitar) si te preguntan, dejando claro que son sugerencias.
- Si te piden algo que no tiene que ver con el departamento o un viaje a Santiago, redirige amablemente la conversación.`;
}

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allow = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(allow) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405, allow);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "Origen no permitido" }, 403, allow);

  // Límite simple por IP (por instancia)
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (recent.length >= RATE.max) {
    return json({ error: "Hiciste muchas preguntas seguidas. Escríbenos por WhatsApp y te respondemos en minutos." }, 429, allow);
  }
  recent.push(now);
  hits.set(ip, recent);

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Solicitud inválida" }, 400, allow);
  }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_MSGS)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json({ error: "Escribe una pregunta." }, 400, allow);
  }

  if (!Deno.env.get("ANTHROPIC_API_KEY")) {
    return json({ error: "El asistente aún no está activado. Escríbenos por WhatsApp y te respondemos en minutos." }, 503, allow);
  }

  try {
    const content = await loadContent();
    const response = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 2048,
      output_config: { effort: "low" },
      system: [{ type: "text", text: buildSystem(content), cache_control: { type: "ephemeral" } }],
      messages,
    });
    if (response.stop_reason === "refusal") {
      return json({ reply: "Eso no lo puedo responder. Para cualquier duda sobre el depto, escríbenos por WhatsApp." }, 200, allow);
    }
    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    return json({ reply: reply || "No tengo esa información. Escríbenos por WhatsApp y te ayudamos." }, 200, allow);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Hay muchas consultas en este momento. Intenta en un minuto o escríbenos por WhatsApp." }, 429, allow);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
    } else {
      console.error("Error inesperado", err);
    }
    return json({ error: "No pude responder ahora. Escríbenos por WhatsApp y te respondemos en minutos." }, 502, allow);
  }
});
