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

  render(base);
  loadRemote().then((remote) => { if (remote) render(Object.assign({}, base, remote)); });
})();
