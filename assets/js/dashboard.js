/* Dashboard logic — tabs, projects, templates, chat, publish, settings */
(function () {
  const { $, $$, escapeHtml, toast, modal } = window.UI;

  /* ---- Tabs ---- */
  const links = $$('.side-link');
  const sections = $$('.page-section');
  const titleEl = $('#page-title');
  function activate(tab) {
    links.forEach(l => l.classList.toggle('active', l.dataset.tab === tab));
    sections.forEach(s => s.classList.toggle('hide', s.dataset.page !== tab));
    titleEl.textContent = ({
      projects: 'Projects', templates: 'Templates', chat: 'AI Chat',
      publish: 'Publish Manager', settings: 'Settings',
    })[tab] || 'Dashboard';
    if (tab === 'projects')  renderProjects();
    if (tab === 'templates') renderTemplates();
    if (tab === 'publish')   renderPublish();
    if (tab === 'settings')  renderSettings();
    if (window.innerWidth <= 880) $('#sidebar').classList.remove('open');
    history.replaceState(null, '', `?tab=${tab}`);
  }
  links.forEach(l => l.addEventListener('click', () => activate(l.dataset.tab)));

  /* Mobile menu */
  const menuBtn = $('#menu-toggle');
  function syncMenu() {
    if (window.innerWidth <= 880) menuBtn.style.display = 'inline-grid';
    else menuBtn.style.display = 'none';
  }
  menuBtn.addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  window.addEventListener('resize', syncMenu); syncMenu();

  /* ---- User card / auth ---- */
  async function refreshUser() {
    const signed = await PuterBridge.isSignedIn();
    const userCard = $('#user-card');
    const avatar = $('#avatar');
    const name = $('#user-name');
    const sub = $('#user-sub');
    const btn = $('#auth-btn');
    if (signed) {
      const u = await PuterBridge.getUser();
      const display = (u && (u.username || u.email)) || 'Account';
      name.textContent = display;
      sub.textContent = 'Cloud sync';
      avatar.textContent = display[0].toUpperCase();
      btn.textContent = 'Sign out';
      btn.onclick = async () => { await PuterBridge.signOut(); location.reload(); };
    } else {
      name.textContent = 'Guest';
      sub.textContent = 'Local mode';
      avatar.textContent = 'G';
      btn.textContent = 'Sign in';
      btn.onclick = () => location.href = 'login.html';
    }
  }

  /* ---- Projects ---- */
  async function renderProjects() {
    const grid = $('#projects-grid');
    const empty = $('#projects-empty');
    grid.innerHTML = `<div class="skeleton" style="height:200px;"></div><div class="skeleton" style="height:200px;"></div><div class="skeleton" style="height:200px;"></div>`;
    const projects = await ProjectStore.listProjects();
    if (!projects.length) {
      grid.innerHTML = '';
      empty.classList.remove('hide');
      return;
    }
    empty.classList.add('hide');
    grid.innerHTML = projects.map(p => `
      <div class="project-card" data-id="${p.id}">
        <div class="project-thumb">
          <iframe srcdoc="${escapeHtml(ProjectStore.buildHtmlDoc(p))}" sandbox="allow-same-origin"></iframe>
        </div>
        <div class="row between" style="margin-top:8px;">
          <strong style="font-size:14px;">${escapeHtml(p.title)}</strong>
          ${p.published?.url ? '<span class="tag">live</span>' : ''}
        </div>
        <div class="project-meta">
          <span>${new Date(p.updatedAt).toLocaleDateString()}</span>
          <span class="row gap-sm">
            <button class="btn btn-ghost btn-sm" data-action="open">Open</button>
            <button class="btn btn-ghost btn-sm" data-action="export">Export</button>
            <button class="btn btn-ghost btn-sm" data-action="delete" style="color:#f87171;">×</button>
          </span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.project-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-action="open"]').onclick = () => location.href = `builder.html?id=${id}`;
      card.querySelector('[data-action="export"]').onclick = async (e) => {
        e.stopPropagation();
        const p = await ProjectStore.getProject(id);
        await ProjectStore.exportZip(p);
        toast('ZIP exported', 'success');
      };
      card.querySelector('[data-action="delete"]').onclick = async (e) => {
        e.stopPropagation();
        const ok = await modal({
          title: 'Delete project?',
          body: 'This will permanently remove the project. This cannot be undone.',
          actions: [{ label: 'Cancel', value: false, kind: 'ghost' }, { label: 'Delete', value: true, kind: 'primary' }]
        });
        if (ok) {
          await ProjectStore.deleteProject(id);
          toast('Deleted', 'info');
          renderProjects();
        }
      };
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        location.href = `builder.html?id=${id}`;
      });
    });
  }

  /* ---- Templates ---- */
  let activeCat = 'all';
  function renderTemplates() {
    const pills = $('#cat-pills');
    const grid = $('#tpl-grid');
    pills.innerHTML = window.Templates.CATEGORIES.map(c =>
      `<span class="cat-pill ${c.id === activeCat ? 'active' : ''}" data-id="${c.id}">${c.icon} ${c.label}</span>`
    ).join('');
    pills.querySelectorAll('.cat-pill').forEach(p => p.onclick = () => { activeCat = p.dataset.id; renderTemplates(); });

    const list = activeCat === 'all'
      ? window.Templates.TEMPLATES
      : window.Templates.TEMPLATES.filter(t => t.category === activeCat);
    grid.innerHTML = list.map(t => `
      <a class="project-card" href="builder.html?template=${t.id}" style="text-decoration:none;color:inherit;">
        <div class="project-thumb" style="background:linear-gradient(135deg,${t.accent}33,${t.accent}11);border-color:${t.accent}44;font-size:42px;">
          ${(window.Templates.CATEGORIES.find(c=>c.id===t.category)||{}).icon||'✨'}
        </div>
        <div class="row between"><strong style="font-size:14px;">${escapeHtml(t.name)}</strong><span class="tag">${escapeHtml(t.category)}</span></div>
        <p class="muted" style="margin:0;font-size:13px;">${escapeHtml(t.description)}</p>
      </a>
    `).join('');
  }

  /* ---- Publish manager ---- */
  async function renderPublish() {
    const list = $('#publish-list');
    const projects = await ProjectStore.listProjects();
    const live = projects.filter(p => p.published?.url);
    if (!live.length) {
      list.innerHTML = `<div class="center muted" style="padding:24px 0;">No live sites yet. Open a project and click <strong>Publish</strong> in the builder.</div>`;
      return;
    }
    list.innerHTML = live.map(p => `
      <div class="row between glass" style="padding:14px 16px;">
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="dim" style="font-size:12px;">
            <a href="${escapeHtml(p.published.url)}" target="_blank" rel="noopener" style="color:var(--orange-300);">${escapeHtml(p.published.url)}</a>
          </div>
        </div>
        <div class="row gap-sm">
          <button class="btn btn-ghost btn-sm" data-copy="${escapeHtml(p.published.url)}">Copy</button>
          <a class="btn btn-outline btn-sm" href="builder.html?id=${p.id}">Manage</a>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('[data-copy]').forEach(b => {
      b.onclick = () => UI.copyToClipboard(b.dataset.copy).then(() => toast('Link copied', 'success'));
    });
  }

  /* ---- Settings ---- */
  async function renderSettings() {
    const u = await PuterBridge.getUser();
    $('#settings-user').textContent = u ? `Signed in as ${u.username || u.email}` : 'Guest mode (sign in to sync to cloud)';
    const projects = await ProjectStore.listProjects();
    $('#storage-count').textContent = projects.length;
    const sel = $('#model-select');
    sel.value = localStorage.getItem('nexus_model') || 'gpt-5-nano';
    sel.onchange = () => { localStorage.setItem('nexus_model', sel.value); toast('Model updated', 'success'); };
    $('#export-all').onclick = async () => {
      const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'nexus-projects.json'; a.click();
      toast('Exported', 'success');
    };
  }

  /* ---- Chat ---- */
  const chatMsgs = $('#chat-msgs');
  const chatInput = $('#chat-input');
  const chatSend  = $('#chat-send');
  const clearBtn  = $('#clear-chat');
  let chatHistory = [];

  function pushMsg(role, content) {
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
    div.textContent = content;
    chatMsgs.appendChild(div);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
    return div;
  }

  async function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    pushMsg('user', text);
    const botDiv = pushMsg('bot', '…');
    try {
      // We import AIEngine lazily (only when user actually chats) to keep dashboard light
      if (!window.AIEngine) await new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = 'assets/js/ai-engine.js'; s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      const reply = await AIEngine.chatAssistant(chatHistory, text, {
        model: localStorage.getItem('nexus_model') || 'gpt-5-nano',
        onChunk: (_chunk, full) => { botDiv.textContent = full; chatMsgs.scrollTop = chatMsgs.scrollHeight; }
      });
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: reply });
      botDiv.textContent = reply;
    } catch (err) {
      botDiv.textContent = `Sorry — ${err.message || 'something broke'}.`;
      botDiv.classList.add('error');
    }
  }
  chatSend.onclick = sendChat;
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  });
  clearBtn.onclick = () => {
    chatHistory = [];
    chatMsgs.innerHTML = '<div class="msg bot">Chat cleared. What next?</div>';
  };

  /* ---- Init ---- */
  (async function init() {
    await refreshUser();
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') || 'projects';
    activate(tab);
  })();
})();
