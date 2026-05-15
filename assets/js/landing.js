/* Landing page interactivity: typed prompt, hero preview, template grid */
(function () {
  const { $, $$, escapeHtml } = window.UI;
  const PROMPTS = [
    'Create a horror storytelling website…',
    'Create a Facebook Reel idea generator…',
    'Create a portfolio for an indie illustrator…',
    'Create an esports team landing page…',
  ];

  const PREVIEW_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;background:#0a0a0b;color:#f5f5f5;overflow:hidden}
.hero{height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:24px;
background:radial-gradient(circle at 70% 20%,rgba(255,107,26,.3),transparent 60%),#0a0a0b}
h1{font-size:clamp(28px,5vw,52px);font-weight:700;letter-spacing:-.02em;margin-bottom:10px;line-height:1.05}
.grad{background:linear-gradient(135deg,#ff8f3d,#ff6b1a);-webkit-background-clip:text;background-clip:text;color:transparent}
p{color:#a1a1aa;max-width:540px;line-height:1.55;font-size:15px;margin-bottom:20px}
.btn{padding:10px 20px;border-radius:999px;background:linear-gradient(135deg,#ff8f3d,#ff6b1a);color:#fff;border:0;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 10px 30px -8px rgba(255,107,26,.5)}
.tag{display:inline-block;padding:4px 10px;background:rgba(255,107,26,.12);border:1px solid rgba(255,107,26,.3);border-radius:99px;color:#ff8f3d;font-size:11px;margin-bottom:14px;text-transform:uppercase;letter-spacing:.06em}
</style></head><body><div class="hero">
<span class="tag">Live preview</span>
<h1>Welcome to <span class="grad">Midnight Tales</span></h1>
<p>A horror storytelling experience. Curated tales updated nightly. Click below to descend.</p>
<button class="btn">Enter the dark →</button>
</div></body></html>`;

  /* Typewriter */
  const target = $('#typed-prompt');
  const cursor = document.querySelector('.cursor');
  if (cursor) {
    const style = document.createElement('style');
    style.textContent = `.cursor{display:inline-block;width:2px;background:#ff8f3d;margin-left:2px;animation:blink 1s steps(2) infinite}@keyframes blink{50%{opacity:0}}`;
    document.head.appendChild(style);
  }
  let pi = 0, ci = 0, deleting = false;
  function tick() {
    if (!target) return;
    const cur = PROMPTS[pi];
    if (!deleting) {
      target.textContent = cur.slice(0, ++ci);
      if (ci >= cur.length) { deleting = true; setTimeout(tick, 1600); return; }
    } else {
      target.textContent = cur.slice(0, --ci);
      if (ci <= 0) { deleting = false; pi = (pi + 1) % PROMPTS.length; }
    }
    setTimeout(tick, deleting ? 25 : 45);
  }
  tick();

  /* Inject hero preview */
  const iframe = $('#hero-preview');
  if (iframe) {
    iframe.srcdoc = PREVIEW_HTML;
  }

  /* Templates */
  const grid = $('#tpl-grid');
  const pills = $('#cat-pills');
  if (grid && window.Templates) {
    let active = 'all';

    function renderPills() {
      pills.innerHTML = window.Templates.CATEGORIES.map(c =>
        `<span class="cat-pill ${c.id === active ? 'active' : ''}" data-id="${c.id}">${c.icon} ${c.label}</span>`
      ).join('');
      pills.querySelectorAll('.cat-pill').forEach(el => {
        el.addEventListener('click', () => {
          active = el.dataset.id;
          renderPills();
          renderGrid();
        });
      });
    }

    function renderGrid() {
      const list = active === 'all'
        ? window.Templates.TEMPLATES
        : window.Templates.TEMPLATES.filter(t => t.category === active);
      grid.innerHTML = list.slice(0, 8).map(t => `
        <a class="feature-card fade-up" href="builder.html?template=${encodeURIComponent(t.id)}" style="text-decoration:none;display:block;">
          <div style="height:140px;border-radius:14px;margin-bottom:14px;background:linear-gradient(135deg,${t.accent}33,${t.accent}11);border:1px solid ${t.accent}44;display:grid;place-items:center;font-size:42px;">
            ${(window.Templates.CATEGORIES.find(c=>c.id===t.category)||{}).icon || '✨'}
          </div>
          <div class="row between" style="margin-bottom:6px;">
            <h3 style="margin:0;">${escapeHtml(t.name)}</h3>
            <span class="tag">${escapeHtml(t.category)}</span>
          </div>
          <p style="margin:0;">${escapeHtml(t.description)}</p>
        </a>
      `).join('');
    }

    renderPills();
    renderGrid();
  }

  /* Reveal on scroll */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('fade-up');
    });
  }, { threshold: 0.12 });
  $$('.section .feature-card, .section .price-card, .faq-item').forEach(el => io.observe(el));
})();
