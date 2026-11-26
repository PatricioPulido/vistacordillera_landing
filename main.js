// Vista Cordillera 505 — main.js
// Pinta la galería, reseñas y datos desde content.js y, si existe,
// desde lo que guardaste en el panel /admin (Supabase).

(function () {
  const base = window.SITE_CONTENT || {};
  const cfg = window.SITE_CONFIG || {};
  const GALLERY_PREVIEW = 9;
  let fotos = [];

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

  render(base);
  loadRemote().then((remote) => { if (remote) render(Object.assign({}, base, remote)); });
})();
