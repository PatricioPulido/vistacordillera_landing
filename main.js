// Vista Cordillera 505 — main.js
// Pinta la galería, reseñas y datos desde content.js y, si existe,
// desde lo que guardaste en el panel /admin (Supabase).

(function () {
  const base = window.SITE_CONTENT || {};
  const cfg = window.SITE_CONFIG || {};
  const GALLERY_PREVIEW = 9;
  let fotos = [];
  let wspNum = String(base.whatsapp || '56963008006').replace(/\D/g, '');

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^(https?:|img\/|\.\/|\/)/i.test(String(u || '')) ? String(u) : '');

  function render(c) {
    // Datos sueltos
    document.querySelectorAll('[data-field]').forEach((el) => {
      const v = c[el.dataset.field];
      if (v !== undefined && v !== null && v !== '') el.textContent = v;
    });

    // Portada
    if (c.titulo && String(c.titulo).trim()) {
      document.getElementById('hero-title').innerHTML = esc(c.titulo).replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }
    if (c.bajada && String(c.bajada).trim()) document.getElementById('hero-lede').textContent = c.bajada;
    if (c.portada && safeUrl(c.portada)) {
      const hi = document.getElementById('hero-img');
      if (hi.getAttribute('src') !== c.portada) hi.src = c.portada;
    }

    // Aviso superior
    const aviso = document.getElementById('aviso');
    if (c.aviso && String(c.aviso).trim()) { aviso.textContent = c.aviso; aviso.hidden = false; }
    else aviso.hidden = true;

    // Anfitriones (el primero es el contacto principal)
    const hostWsp = (h) => {
      const num = String(h.whatsapp || '').replace(/\D/g, '');
      if (num.length < 8) return '';
      const nombre = String(h.nombre).trim();
      const visible = num.length === 11 && num.startsWith('569') ? `+56 9 ${num.slice(3, 7)} ${num.slice(7)}` : '+' + num;
      return `<a class="btn btn-outline" href="https://wa.me/${num}?text=Hola%20${encodeURIComponent(nombre)}!%20Tengo%20una%20consulta%20por%20el%20Depto%20505" target="_blank" rel="noopener">WhatsApp ${esc(nombre)} · <span style="white-space:nowrap">${visible}</span></a>`;
    };
    const hosts = (c.anfitriones || []).filter((h) => h && String(h.nombre || '').trim());
    if (hosts.length) {
      document.getElementById('hosts').innerHTML = hosts.map((h, i) => `
        <article class="host-card${i === 0 ? ' main' : ''}">
          <div class="host-avatar" aria-hidden="true">${safeUrl(h.foto) ? `<img src="${esc(h.foto)}" alt="" loading="lazy">` : esc(String(h.nombre).trim().charAt(0))}</div>
          <div>
            <h3>${esc(h.nombre)}</h3>
            <span class="host-role">${esc(h.rol || (i === 0 ? 'Anfitrión' : 'Coanfitrión/a'))}</span>
            <p>${esc(h.texto)}</p>
            ${i === 0 ? `<a class="btn btn-primary" data-wsp href="https://wa.me/56963008006?text=Hola%20${encodeURIComponent(String(h.nombre).trim())}!%20Tengo%20una%20consulta%20por%20el%20Depto%20505" target="_blank" rel="noopener">Escribirle a ${esc(h.nombre)}</a>` : hostWsp(h)}
          </div>
        </article>`).join('');
      document.querySelectorAll('[data-host-main]').forEach((el) => (el.textContent = String(hosts[0].nombre).trim()));
    }

    // Enlaces
    if (c.whatsapp) {
      const num = String(c.whatsapp).replace(/\D/g, '');
      wspNum = num;
      if (window.__calRefresh) window.__calRefresh();
      document.querySelectorAll('[data-wsp]').forEach((a) => {
        const u = new URL(a.href); u.pathname = '/' + num; a.href = u.toString();
      });
    }
    if (c.airbnb && safeUrl(c.airbnb)) document.querySelectorAll('[data-airbnb]').forEach((a) => (a.href = c.airbnb));
    if (c.booking && safeUrl(c.booking)) document.querySelectorAll('[data-booking]').forEach((a) => (a.href = c.booking));

    // Galería
    fotos = (c.fotos || []).filter((f) => safeUrl(f.src));
    const g = document.getElementById('gallery');
    g.innerHTML = fotos.map((f, i) => `
      <button type="button" class="g-tile${i >= GALLERY_PREVIEW ? ' extra' : ''}" data-i="${i}">
        <img src="${esc(f.src)}" alt="${esc(f.texto)}" ${i ? 'loading="lazy"' : ''}>
        <span>${esc(f.texto)}</span>
      </button>`).join('');
    const more = document.getElementById('gallery-all');
    more.parentElement.hidden = fotos.length <= GALLERY_PREVIEW;
    more.textContent = `Ver las ${fotos.length} fotos`;

    // Reseñas
    document.getElementById('reviews').innerHTML = (c.resenas || []).map((r) => `
      <figure class="review">
        <div class="review-stars" aria-label="5 estrellas">★★★★★</div>
        <blockquote>“${esc(r.texto)}”</blockquote>
        <figcaption><span class="av">${esc((r.nombre || '?').trim().charAt(0))}</span>
          <span><b>${esc(r.nombre)}</b>${r.lugar ? `<small>${esc(r.lugar)}</small>` : ''}</span></figcaption>
      </figure>`).join('');
  }

  async function loadRemote() {
    if (!cfg.supabaseUrl || !cfg.supabaseKey) return null;
    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${cfg.tabla}?id=eq.1&select=data`, {
        headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` },
      });
      if (!res.ok) return null;
      const rows = await res.json();
      const data = rows && rows[0] && rows[0].data;
      return data && Object.keys(data).length ? data : null;
    } catch (e) { return null; }
  }

  // Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  let cur = 0;
  function show(i) {
    cur = (i + fotos.length) % fotos.length;
    lbImg.src = fotos[cur].src; lbImg.alt = fotos[cur].texto || '';
    lbCap.textContent = `${fotos[cur].texto || ''}  ·  ${cur + 1} / ${fotos.length}`;
  }
  function open(i) { show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; }
  function close() { lb.hidden = true; document.body.style.overflow = ''; }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('.g-tile');
    if (t) open(+t.dataset.i);
  });
  document.getElementById('gallery-all').addEventListener('click', () => {
    document.getElementById('gallery').classList.toggle('show-all');
    const all = document.getElementById('gallery').classList.contains('show-all');
    document.getElementById('gallery-all').textContent = all ? 'Ver menos' : `Ver las ${fotos.length} fotos`;
  });
  lb.querySelector('.lb-close').onclick = close;
  lb.querySelector('.lb-prev').onclick = () => show(cur - 1);
  lb.querySelector('.lb-next').onclick = () => show(cur + 1);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'ArrowLeft') show(cur - 1);
  });
  let tx = null;
  lb.addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    tx = null;
  });

  // Nav con sombra al hacer scroll
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Aparición suave
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add('is-visible'));

  // Asistente con IA (Supabase Edge Function "asistente")
  (function chat() {
    const fab = document.getElementById('chat-fab');
    const box = document.getElementById('chat');
    const log = document.getElementById('chat-log');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-in');
    const sugs = document.getElementById('chat-sugs');
    if (!fab || !cfg.supabaseUrl) { if (fab) fab.hidden = true; return; }
    const history = [];
    let busy = false;

    // Pinta el texto como nodos (seguro) y convierte enlaces y teléfonos en links
    function fill(el, text) {
      const re = /(https?:\/\/[^\s)]+[^\s).,;!?])|(\+?56\s?9[\s\d]{8,10}\d)/g;
      let last = 0, m;
      while ((m = re.exec(text))) {
        el.append(text.slice(last, m.index));
        const a = document.createElement('a');
        a.textContent = m[0];
        a.href = m[1] ? m[1] : `https://wa.me/${m[2].replace(/\D/g, '')}`;
        a.target = '_blank'; a.rel = 'noopener';
        el.append(a); last = m.index + m[0].length;
      }
      el.append(text.slice(last));
    }
    function add(role, text, extra) {
      const d = document.createElement('div');
      d.className = `msg ${role}${extra ? ' ' + extra : ''}`;
      if (extra === 'typing') { d.setAttribute('aria-label', 'Escribiendo'); d.innerHTML = '<i></i><i></i><i></i>'; }
      else if (role === 'bot') fill(d, text); else d.textContent = text;
      log.appendChild(d); log.scrollTop = log.scrollHeight;
      return d;
    }
    function toggle(open) {
      box.hidden = !open; fab.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('chat-open', open);
      if (open) {
        if (!log.children.length) add('bot', '¡Hola! 👋 Soy el asistente del Depto 505. Pregúntame lo que quieras sobre el departamento, el edificio o cómo llegar.');
        if (window.matchMedia('(min-width: 481px)').matches) setTimeout(() => input.focus(), 60);
      } else fab.focus();
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) toggle(false); });
    fab.addEventListener('click', () => toggle(box.hidden));
    document.getElementById('chat-x').addEventListener('click', () => toggle(false));

    async function ask(q) {
      q = q.trim(); if (!q || busy) return;
      busy = true; form.querySelector('button').disabled = true; sugs.hidden = true;
      add('user', q); history.push({ role: 'user', content: q });
      input.value = '';
      const wait = add('bot', '', 'typing');
      try {
        const res = await fetch(`${cfg.supabaseUrl}/functions/v1/asistente`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey },
          body: JSON.stringify({ messages: history.slice(-12) }),
        });
        const out = await res.json().catch(() => ({}));
        const text = out.reply || out.error || 'No pude responder ahora. Escríbenos por WhatsApp y te ayudamos.';
        wait.remove(); add('bot', text, out.reply ? '' : 'err');
        if (out.reply) history.push({ role: 'assistant', content: out.reply }); else history.pop();
      } catch (e) {
        wait.remove(); add('bot', 'No pude conectarme. Escríbenos por WhatsApp y te respondemos en minutos.', 'err'); history.pop();
      }
      busy = false; form.querySelector('button').disabled = false;
      if (window.matchMedia('(min-width: 481px)').matches) input.focus();
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
    sugs.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); });
  })();

  // Calendario de disponibilidad (Supabase Edge Function "calendario":
  // fechas ocupadas de Airbnb/Booking + bloqueos manuales del panel /admin)
  (function calendario() {
    const sec = document.getElementById('disponibilidad');
    if (!sec || !cfg.supabaseUrl) return;
    const monthsEl = document.getElementById('cal-months');
    const prev = document.getElementById('cal-prev');
    const next = document.getElementById('cal-next');
    const sum = document.getElementById('cal-sum');
    const clear = document.getElementById('cal-clear');
    const wsp = document.getElementById('cal-wsp');
    const upd = document.getElementById('cal-upd');
    const MAX_MONTHS = 12;
    const mq = window.matchMedia('(max-width: 760px)');

    const pad = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
    const nights = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
    const fmt = (s, o) => parse(s).toLocaleDateString('es-CL', o || { weekday: 'short', day: 'numeric', month: 'short' });

    let today = iso(new Date());
    let busy = new Set();
    let offset = 0; // meses desde el actual
    let start = null, end = null;

    const isBusy = (d) => busy.has(d);
    const rangeFree = (a, b) => { for (let d = a; d < b; d = addDays(d, 1)) if (isBusy(d)) return false; return true; };

    function monthHTML(y, m) {
      const first = new Date(y, m, 1);
      const lead = (first.getDay() + 6) % 7; // semana parte el lunes
      const days = new Date(y, m + 1, 0).getDate();
      let h = `<div class="cal-month"><h3>${first.toLocaleDateString('es-CL', { month: 'long' }).replace(/^./, (c) => c.toUpperCase())} ${y}</h3><div class="cal-grid">`;
      h += ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map((d) => `<span class="cal-dow">${d}</span>`).join('');
      h += '<span></span>'.repeat(lead);
      for (let n = 1; n <= days; n++) {
        const d = `${y}-${pad(m + 1)}-${pad(n)}`;
        const cls = ['cal-day'];
        let can = false, label = fmt(d, { weekday: 'long', day: 'numeric', month: 'long' });
        if (d < today) cls.push('past');
        else if (isBusy(d)) {
          cls.push('busy'); label += ', reservado';
          // un día reservado puede ser tu día de salida si las noches anteriores están libres
          if (start && !end && d > start && rangeFree(start, d)) { cls.push('out'); can = true; label += ', disponible como salida'; }
        } else { cls.push('free'); can = true; }
        if (d === today) cls.push('today');
        if (start && d === start) cls.push('start');
        if (end && d === end) cls.push('end');
        if (start && end && d > start && d < end) cls.push('in');
        h += `<button type="button" class="${cls.join(' ')}" data-d="${d}" ${can ? '' : 'disabled'} aria-label="${label}"${(d === start || d === end) ? ' aria-pressed="true"' : ''}><span>${n}</span></button>`;
      }
      return h + '</div></div>';
    }

    function draw() {
      const count = mq.matches ? 1 : 2;
      const maxOffset = MAX_MONTHS - count;
      offset = Math.max(0, Math.min(offset, maxOffset));
      const base = parse(today);
      let h = '';
      for (let i = 0; i < count; i++) {
        const d = new Date(base.getFullYear(), base.getMonth() + offset + i, 1);
        h += monthHTML(d.getFullYear(), d.getMonth());
      }
      monthsEl.innerHTML = h;
      monthsEl.classList.toggle('ranged', !!(start && end));
      prev.disabled = offset === 0;
      next.disabled = offset >= maxOffset;

      let msg = 'Hola! Quiero reservar el Depto 505';
      if (start && end) {
        const n = nights(start, end);
        sum.innerHTML = `<b>${fmt(start)} → ${fmt(end)}</b><small>${n} noche${n > 1 ? 's' : ''} · disponible</small>`;
        msg += ` del ${fmt(start, { day: 'numeric', month: 'long' })} al ${fmt(end, { day: 'numeric', month: 'long' })} (${n} noche${n > 1 ? 's' : ''}). ¿Me confirmas el precio?`;
        wsp.textContent = 'Reservar estas fechas';
      } else if (start) {
        sum.innerHTML = `<b>Llegada: ${fmt(start)}</b><small>Ahora elige el día de salida</small>`;
        wsp.textContent = 'Consultar por WhatsApp';
      } else {
        sum.textContent = 'Elige tu día de llegada';
        wsp.textContent = 'Consultar por WhatsApp';
      }
      clear.hidden = !start;
      wsp.href = `https://wa.me/${wspNum}?text=${encodeURIComponent(msg)}`;
    }
    window.__calRefresh = () => { if (!sec.hidden) draw(); };

    monthsEl.addEventListener('click', (e) => {
      const b = e.target.closest('.cal-day'); if (!b || b.disabled) return;
      const d = b.dataset.d;
      if (!start || end) { start = d; end = null; }
      else if (d <= start) { if (!isBusy(d)) start = d; }
      else if (rangeFree(start, d)) end = d;
      else if (!isBusy(d)) start = d;
      draw();
      const again = monthsEl.querySelector(`[data-d="${d}"]`); if (again) again.focus();
    });
    prev.addEventListener('click', () => { offset--; draw(); });
    next.addEventListener('click', () => { offset++; draw(); });
    clear.addEventListener('click', () => { start = end = null; draw(); });
    (mq.addEventListener ? mq.addEventListener('change', draw) : mq.addListener(draw));

    function hace(t) {
      const min = Math.max(0, Math.round((Date.now() - new Date(t)) / 60000));
      if (min < 2) return 'recién';
      if (min < 60) return `hace ${min} min`;
      const h = Math.round(min / 60);
      return h < 24 ? `hace ${h} h` : `el ${new Date(t).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}`;
    }

    fetch(`${cfg.supabaseUrl}/functions/v1/calendario`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((out) => {
        if (!out || !out.configurado || !Array.isArray(out.ocupado)) return;
        if (out.hoy) today = out.hoy;
        busy = new Set();
        out.ocupado.forEach(([a, b]) => { for (let d = a; d < b; d = addDays(d, 1)) busy.add(d); });
        upd.textContent = (out.actualizado ? `Calendario actualizado ${hace(out.actualizado)}. ` : '') +
          'La reserva queda confirmada cuando te respondemos por WhatsApp.';
        sec.hidden = false;
        document.querySelectorAll('[data-cal-link]').forEach((a) => (a.hidden = false));
        draw();
        if ('IntersectionObserver' in window) {
          const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { sec.classList.add('is-visible'); io.disconnect(); } }, { threshold: 0.12 });
          io.observe(sec);
        } else sec.classList.add('is-visible');
      })
      .catch(() => {});
  })();

  render(base);
  loadRemote().then((remote) => { if (remote) render(Object.assign({}, base, remote)); });
})();
