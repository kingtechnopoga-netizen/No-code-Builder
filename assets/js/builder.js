/* ===========================================================
 * Builder — orchestrates AI generation, live preview,
 * device toggles, components, undo/redo, autosave, voice,
 * floating assistant, drag-drop, export, and publish.
 * =========================================================== */
(function () {
  'use strict';

  const { $, $$, escapeHtml, toast, modal, copyToClipboard } = window.UI;

  /* ---- State ---- */
  const state = {
    id: null,
    title: 'Untitled project',
    description: '',
    tags: [],
    html: '',
    css: '',
    js: '',
    published: null,
  };
  const undoStack = []; let hIndex = -1;
  let saveTimer = null;
  let lastModel = localStorage.getItem('nexus_model') || 'gpt-5-nano';

  /* ---- DOM ---- */
  const promptInput = $('#prompt-input');
  const generateBtn = $('#generate-btn');
  const voiceBtn    = $('#voice-btn');
  const titleInput  = $('#title-input');
  const saveStatus  = $('#save-status');
  const previewIfr  = $('#preview-iframe');
  const previewFr   = $('#preview-frame');
  const codeHtml    = $('#code-html');
  const codeCss     = $('#code-css');
  const codeJs      = $('#code-js');
  const exportBtn   = $('#export-btn');
  const publishBtn  = $('#publish-btn');
  const undoBtn     = $('#undo-btn');
  const redoBtn     = $('#redo-btn');

  /* ---- Component library ---- */
  const COMPONENTS = [
    { name: 'Hero',     html: `<section style="padding:80px 24px;text-align:center;background:linear-gradient(135deg,#ff8f3d,#ff6b1a);color:#fff;border-radius:16px;"><h2 style="font-size:42px;margin:0 0 12px;font-weight:800;">Bold Headline</h2><p style="opacity:.9;max-width:480px;margin:0 auto 18px;">A short subtitle that explains your value clearly.</p><button style="padding:12px 22px;border-radius:999px;border:0;background:#fff;color:#ff6b1a;font-weight:600;">Get Started</button></section>` },
    { name: 'Heading',  html: `<h2 style="font-size:32px;margin:24px 0 12px;">Section Title</h2>` },
    { name: 'Paragraph', html: `<p style="line-height:1.65;color:#444;margin:0 0 14px;max-width:640px;">Edit this text to tell your story. Click on any element to modify.</p>` },
    { name: 'Button',   html: `<button style="padding:10px 20px;border-radius:999px;border:0;background:#ff6b1a;color:#fff;font-weight:600;cursor:pointer;">Click me</button>` },
    { name: 'Image',    html: `<img src="https://images.unsplash.com/photo-1503264116251-35a269479413?w=900" alt="placeholder" style="width:100%;border-radius:16px;display:block;">` },
    { name: 'Card',     html: `<div style="padding:22px;border-radius:18px;background:#fff;box-shadow:0 10px 30px -10px rgba(0,0,0,.15);max-width:340px;"><h3 style="margin:0 0 6px;">Card title</h3><p style="margin:0;color:#555;">Card body content goes here.</p></div>` },
    { name: 'Form',     html: `<form style="display:grid;gap:10px;max-width:360px;"><input placeholder="Your name" style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;"><input type="email" placeholder="Email" style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;"><textarea placeholder="Message" style="padding:10px 14px;border-radius:10px;border:1px solid #ddd;min-height:90px;"></textarea><button type="submit" style="padding:10px 14px;border-radius:10px;border:0;background:#111;color:#fff;font-weight:600;">Send</button></form>` },
    { name: 'Divider',  html: `<hr style="border:0;height:1px;background:linear-gradient(90deg,transparent,#ddd,transparent);margin:30px 0;">` },
  ];

  function renderComponentList() {
    const c = $('#comp-list');
    c.innerHTML = COMPONENTS.map((cp, i) => `
      <div class="comp-item" draggable="true" data-i="${i}">
        <span style="width:24px;height:24px;border-radius:6px;background:var(--grad-orange-soft);display:grid;place-items:center;font-size:11px;color:var(--orange-300);">${cp.name[0]}</span>
        ${escapeHtml(cp.name)}
        <span style="margin-left:auto;color:var(--text-muted);font-size:11px;">drag</span>
      </div>
    `).join('');
    $$('.comp-item', c).forEach(el => {
      el.addEventListener('dragstart', e => {
        const i = +el.dataset.i;
        e.dataTransfer.setData('text/component', COMPONENTS[i].html);
      });
      el.addEventListener('click', () => insertComponent(COMPONENTS[+el.dataset.i].html));
    });
  }
  function insertComponent(html) {
    state.html = (state.html || '') + '\n' + html;
    pushHistory();
    syncCodeBoxes();
    renderPreview();
    scheduleSave();
    toast('Component added', 'success');
  }

  /* ---- Templates dropdown ---- */
  function renderTemplatesPanel() {
    const sel = $('#template-cat');
    sel.innerHTML = '<option value="all">All categories</option>' + window.Templates.CATEGORIES
      .filter(c => c.id !== 'all')
      .map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
    sel.onchange = renderTemplatesList;
    renderTemplatesList();
  }
  function renderTemplatesList() {
    const cat = $('#template-cat').value;
    const list = $('#template-list');
    const tpls = cat === 'all' ? window.Templates.TEMPLATES : window.Templates.TEMPLATES.filter(t => t.category === cat);
    list.innerHTML = tpls.map(t => `
      <div class="comp-item" data-tid="${t.id}" style="cursor:pointer;">
        <span style="width:8px;height:8px;border-radius:50%;background:${t.accent};"></span>
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.name)}</span>
        <span style="font-size:11px;color:var(--text-muted);">use</span>
      </div>
    `).join('');
    list.querySelectorAll('[data-tid]').forEach(el => {
      el.addEventListener('click', () => useTemplate(el.dataset.tid));
    });
  }
  async function useTemplate(tid) {
    const t = window.Templates.TEMPLATES.find(x => x.id === tid);
    if (!t) return;
    promptInput.value = t.prompt;
    titleInput.value = t.name;
    await runGeneration(t.prompt, t.name);
  }

  /* ---- Preview ---- */
  function renderPreview() {
    const doc = ProjectStore.buildHtmlDoc(state);
    previewIfr.srcdoc = doc;
  }

  /* ---- Code panes ---- */
  function syncCodeBoxes() {
    codeHtml.value = state.html || '';
    codeCss.value  = state.css  || '';
    codeJs.value   = state.js   || '';
  }
  [codeHtml, codeCss, codeJs].forEach(el => {
    el.addEventListener('input', () => {
      state.html = codeHtml.value;
      state.css = codeCss.value;
      state.js = codeJs.value;
      pushHistory();
      renderPreview();
      scheduleSave();
    });
  });
  $$('.code-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.code-tab').forEach(t => t.classList.toggle('active', t === tab));
      $$('.code-pane').forEach(p => p.classList.add('hide'));
      $('#code-' + tab.dataset.tab).classList.remove('hide');
    });
  });

  /* ---- Device toggle ---- */
  $$('.device-btn').forEach(b => {
    b.addEventListener('click', () => {
      $$('.device-btn').forEach(x => x.classList.toggle('active', x === b));
      previewFr.classList.remove('mobile', 'tablet', 'desktop');
      previewFr.classList.add(b.dataset.device);
    });
  });

  /* ---- Title ---- */
  titleInput.addEventListener('input', () => {
    state.title = titleInput.value || 'Untitled project';
    scheduleSave();
  });

  /* ---- Undo/Redo ---- */
  function pushHistory() {
    undoStack.splice(hIndex + 1);
    undoStack.push({ html: state.html, css: state.css, js: state.js });
    if (undoStack.length > 50) undoStack.shift();
    hIndex = undoStack.length - 1;
  }
  function applyHistory(i) {
    const snap = undoStack[i];
    if (!snap) return;
    state.html = snap.html; state.css = snap.css; state.js = snap.js;
    syncCodeBoxes(); renderPreview();
  }
  undoBtn.onclick = () => { if (hIndex > 0) { hIndex--; applyHistory(hIndex); } };
  redoBtn.onclick = () => { if (hIndex < undoStack.length - 1) { hIndex++; applyHistory(hIndex); } };
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoBtn.click(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redoBtn.click(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave(true); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generateBtn.click(); }
  });

  /* ---- Auto-save ---- */
  function scheduleSave() {
    saveStatus.textContent = '· editing';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => doSave(false), 1200);
  }
  async function doSave(showToast) {
    saveStatus.textContent = 'saving…';
    try {
      const saved = await ProjectStore.saveProject({ ...state });
      state.id = saved.id;
      const url = new URL(location.href);
      if (!url.searchParams.get('id')) {
        url.searchParams.set('id', saved.id);
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', url.toString());
        }
      }
      saveStatus.textContent = 'saved · ' + new Date().toLocaleTimeString();
      if (showToast) toast('Saved', 'success');
    } catch (err) {
      saveStatus.textContent = 'save failed';
      toast('Save error: ' + err.message, 'error');
    }
  }

  /* ---- Generation ---- */
  async function runGeneration(prompt, suggestedTitle) {
    if (!prompt) { toast('Enter a prompt first', 'error'); return; }
    const orig = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Generating…';
    saveStatus.textContent = 'AI thinking…';

    // Show streaming overlay in preview
    previewIfr.srcdoc = streamingPlaceholder(prompt);

    try {
      const proj = await AIEngine.generateProject(prompt, {
        model: lastModel,
        onProgress: () => { /* could update overlay here */ }
      });
      state.html = proj.html;
      state.css  = proj.css;
      state.js   = proj.js;
      state.title = suggestedTitle || proj.title || state.title;
      state.description = proj.description || '';
      state.tags = proj.tags || [];
      titleInput.value = state.title;
      pushHistory();
      syncCodeBoxes();
      renderPreview();
      await doSave(false);
      toast('Project generated!', 'success');
    } catch (err) {
      console.error(err);
      toast('Generation failed: ' + (err.message || err), 'error');
      renderPreview();
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = orig;
    }
  }

  function streamingPlaceholder(prompt) {
    return `<!doctype html><html><head><meta charset="UTF-8"><style>
      body{margin:0;background:#0a0a0b;color:#f5f5f5;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;height:100vh;text-align:center;padding:24px;background:radial-gradient(circle at 50% 30%,rgba(255,107,26,.18),transparent 60%),#0a0a0b;}
      .b{padding:28px;border-radius:20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);max-width:520px;}
      .s{display:inline-block;width:32px;height:32px;border:3px solid rgba(255,255,255,.15);border-top-color:#ff8f3d;border-radius:50%;animation:s 1s linear infinite;margin-bottom:14px}
      @keyframes s{to{transform:rotate(360deg)}}
      h1{font-size:22px;margin:0 0 8px;background:linear-gradient(135deg,#ff8f3d,#ff6b1a);-webkit-background-clip:text;background-clip:text;color:transparent}
      p{margin:0;color:#a1a1aa;line-height:1.55;font-size:14px}
    </style></head><body><div class="b"><div class="s"></div><h1>Generating your site…</h1><p>${escapeHtml(prompt)}</p></div></body></html>`;
  }

  generateBtn.addEventListener('click', () => runGeneration(promptInput.value.trim()));
  promptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generateBtn.click(); }
  });
  $$('#example-prompts .cat-pill').forEach(p => {
    p.addEventListener('click', () => { promptInput.value = p.dataset.prompt; promptInput.focus(); });
  });

  /* ---- Voice prompt ---- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    let rec;
    voiceBtn.addEventListener('click', () => {
      if (rec) { rec.stop(); rec = null; voiceBtn.classList.remove('pulse-glow'); return; }
      rec = new SR();
      rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true;
      voiceBtn.classList.add('pulse-glow');
      rec.onresult = (ev) => {
        let txt = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
        promptInput.value = txt;
      };
      rec.onend = () => { voiceBtn.classList.remove('pulse-glow'); rec = null; };
      rec.onerror = () => { voiceBtn.classList.remove('pulse-glow'); rec = null; toast('Voice not available', 'error'); };
      rec.start();
    });
  } else {
    voiceBtn.title = 'Voice not supported in this browser';
    voiceBtn.style.opacity = .4;
  }

  /* ---- Quick AI actions ---- */
  $$('[data-quick]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const kind = btn.dataset.quick;
      btn.disabled = true;
      const orig = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Working…';
      try {
        if (kind === 'redesign') {
          const out = await AIEngine.editProject(state, 'Redesign the entire UI with a modern, futuristic look. Keep the same content. Use bold typography, gradients, glassmorphism, and smooth hover animations. Mobile-first responsive.', { model: lastModel });
          state.html = out.html; state.css = out.css; state.js = out.js;
          pushHistory(); syncCodeBoxes(); renderPreview(); doSave(false); toast('Redesigned ✨', 'success');
        } else if (kind === 'improve') {
          const out = await AIEngine.improveCode(state);
          state.html = out.html; state.css = out.css; state.js = out.js;
          pushHistory(); syncCodeBoxes(); renderPreview(); doSave(false); toast('Code improved', 'success');
        } else if (kind === 'palette') {
          const theme = state.title || promptInput.value || 'modern dark site';
          const p = await AIEngine.generatePalette(theme);
          await modal({
            title: `Palette: ${p.name}`,
            body: `<div class="row" style="gap:8px;flex-wrap:wrap;">${p.colors.map(c=>`<div style="text-align:center;"><div style="width:64px;height:64px;border-radius:12px;background:${c};border:1px solid rgba(255,255,255,.1);"></div><div style="font-size:11px;color:var(--text-dim);margin-top:6px;font-family:monospace;">${c}</div></div>`).join('')}</div>`,
            actions: [
              { label: 'Apply to site', value: 'apply', kind: 'primary' },
              { label: 'Close', value: null, kind: 'ghost' },
            ]
          }).then(async (val) => {
            if (val === 'apply') {
              const instr = `Apply this color palette to the site: ${p.colors.join(', ')}. Use the first as background, the others as accents and text.`;
              const out = await AIEngine.editProject(state, instr, { model: lastModel });
              state.html = out.html; state.css = out.css; state.js = out.js;
              pushHistory(); syncCodeBoxes(); renderPreview(); doSave(false);
              toast('Palette applied', 'success');
            }
          });
        } else if (kind === 'content') {
          const brief = await promptModal('What should the copy be about?');
          if (brief) {
            const text = await AIEngine.generateContent(brief);
            await modal({ title: 'AI Copy', body: `<pre style="white-space:pre-wrap;color:var(--text);font-family:inherit;font-size:14px;line-height:1.55;">${escapeHtml(text)}</pre>`, actions: [{label:'Copy',value:'copy',kind:'primary'},{label:'Close',value:null,kind:'ghost'}] }).then(v => {
              if (v === 'copy') copyToClipboard(text).then(() => toast('Copied', 'success'));
            });
          }
        } else if (kind === 'image') {
          const p = await promptModal('Describe the image to generate:');
          if (p) {
            const img = await AIEngine.generateImage(p);
            const src = (img && img.src) ? img.src : '';
            if (!src) throw new Error('No image returned');
            await modal({
              title: 'Generated Image',
              body: `<img src="${src}" style="width:100%;border-radius:12px;border:1px solid var(--line);">`,
              actions: [
                { label: 'Insert into site', value: 'insert', kind: 'primary' },
                { label: 'Close', value: null, kind: 'ghost' },
              ]
            }).then(v => {
              if (v === 'insert') {
                state.html += `\n<img src="${src}" alt="AI generated" style="width:100%;max-width:600px;border-radius:14px;display:block;margin:18px auto;">`;
                pushHistory(); syncCodeBoxes(); renderPreview(); doSave(false);
              }
            });
          }
        } else if (kind === 'logo') {
          const brief = await promptModal('Describe your brand for the logo:');
          if (brief) {
            const img = await AIEngine.generateImage(`Minimal modern flat logo, vector style, transparent background, brand: ${brief}`);
            const src = (img && img.src) ? img.src : '';
            if (src) await modal({ title:'Logo', body:`<img src="${src}" style="width:200px;display:block;margin:0 auto;">`, actions:[{label:'Done',value:null,kind:'primary'}] });
          }
        } else if (kind === 'caption') {
          const brief = await promptModal('Topic / vibe for captions?');
          if (brief) {
            const text = await PuterBridge.aiChat(`Write 5 short, punchy, on-trend social-media captions for: ${brief}. Number them 1–5. Plain text.`, { stream: false });
            await modal({ title:'Captions', body:`<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;">${escapeHtml(text)}</pre>`, actions:[{label:'Copy',value:'copy',kind:'primary'},{label:'Close',value:null,kind:'ghost'}] }).then(v=>{
              if(v==='copy') copyToClipboard(text).then(()=>toast('Copied','success'));
            });
          }
        } else if (kind === 'story') {
          const brief = await promptModal('Setting for the horror scene:');
          if (brief) {
            const text = await PuterBridge.aiChat(`Write a 200-word atmospheric horror scene set in: ${brief}. Vivid sensory detail. End on a cliffhanger.`, { stream: false });
            await modal({ title:'Horror Scene', body:`<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;">${escapeHtml(text)}</pre>`, actions:[{label:'Insert',value:'insert',kind:'primary'},{label:'Close',value:null,kind:'ghost'}] }).then(v=>{
              if (v==='insert') {
                state.html += `\n<section style="padding:32px;background:#0a0a0b;color:#f5f5f5;border-radius:14px;max-width:720px;margin:24px auto;line-height:1.7;"><h3>${escapeHtml(brief)}</h3><p>${escapeHtml(text).replace(/\n/g,'<br>')}</p></section>`;
                pushHistory(); syncCodeBoxes(); renderPreview(); doSave(false);
              }
            });
          }
        }
      } catch (err) {
        toast(err.message || 'Action failed', 'error');
      } finally {
        btn.disabled = false; btn.innerHTML = orig;
      }
    });
  });

  function promptModal(label) {
    return new Promise(resolve => {
      const host = document.createElement('div');
      host.className = 'modal-host open';
      host.innerHTML = `
        <div class="modal">
          <h3 class="h-display" style="margin:0 0 10px;font-size:18px;">${escapeHtml(label)}</h3>
          <textarea class="textarea" rows="3" autofocus></textarea>
          <div class="row" style="justify-content:flex-end;gap:8px;margin-top:14px;">
            <button class="btn btn-ghost btn-sm" data-act="cancel">Cancel</button>
            <button class="btn btn-primary btn-sm" data-act="ok">OK</button>
          </div>
        </div>`;
      document.body.appendChild(host);
      const ta = host.querySelector('textarea'); ta.focus();
      const close = (val) => { host.remove(); resolve(val); };
      host.querySelector('[data-act="cancel"]').onclick = () => close(null);
      host.querySelector('[data-act="ok"]').onclick = () => close(ta.value.trim());
      host.addEventListener('click', e => { if (e.target === host) close(null); });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) close(ta.value.trim());
      });
    });
  }

  /* ---- Floating AI Assistant ---- */
  const aiFab = $('#ai-fab'), aiPanel = $('#ai-panel'), aiMsgs = $('#ai-msgs'), aiInput = $('#ai-input'), aiSend = $('#ai-send'), aiClose = $('#ai-close');
  let aiHistory = [];
  function aiPush(role, content) {
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'bot'}`;
    div.textContent = content;
    aiMsgs.appendChild(div);
    aiMsgs.scrollTop = aiMsgs.scrollHeight;
    return div;
  }
  aiFab.onclick = () => aiPanel.classList.toggle('open');
  aiClose.onclick = () => aiPanel.classList.remove('open');
  async function sendAi() {
    const t = aiInput.value.trim(); if (!t) return;
    aiInput.value = '';
    aiPush('user', t);
    const bot = aiPush('bot', '…');

    // If the user wants to edit the project, run an edit.
    const wantsEdit = /\b(make|change|add|remove|redesign|update|fix|swap|use|set|apply|edit)\b/i.test(t);
    if (wantsEdit && (state.html || state.css)) {
      try {
        bot.textContent = 'Applying changes…';
        const out = await AIEngine.editProject(state, t, { model: lastModel });
        state.html = out.html; state.css = out.css; state.js = out.js;
        pushHistory(); syncCodeBoxes(); renderPreview(); doSave(false);
        bot.textContent = '✓ ' + (out.note || 'Done. Preview updated.');
        return;
      } catch (err) {
        bot.textContent = 'Edit failed — falling back to chat.';
      }
    }
    try {
      const reply = await AIEngine.chatAssistant(aiHistory, t, {
        model: lastModel,
        onChunk: (_c, full) => { bot.textContent = full; aiMsgs.scrollTop = aiMsgs.scrollHeight; }
      });
      aiHistory.push({ role:'user', content:t }); aiHistory.push({ role:'assistant', content:reply });
      bot.textContent = reply;
    } catch (err) {
      bot.textContent = 'Sorry — ' + (err.message || 'error');
    }
  }
  aiSend.onclick = sendAi;
  aiInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAi(); }});

  /* ---- Drag & drop onto preview iframe ---- */
  previewFr.addEventListener('dragover', e => { e.preventDefault(); previewFr.style.outline = '2px dashed var(--orange-500)'; });
  previewFr.addEventListener('dragleave', () => { previewFr.style.outline = ''; });
  previewFr.addEventListener('drop', e => {
    e.preventDefault();
    previewFr.style.outline = '';
    const html = e.dataTransfer.getData('text/component');
    if (html) insertComponent(html);
  });

  /* ---- Export / Publish ---- */
  exportBtn.onclick = async () => {
    if (!state.html) { toast('Nothing to export yet', 'error'); return; }
    await ProjectStore.exportZip(state);
    toast('ZIP downloaded', 'success');
  };

  publishBtn.onclick = async () => {
    if (!state.html) { toast('Generate a site first', 'error'); return; }
    const signed = await PuterBridge.isSignedIn();
    if (!signed) {
      const go = await modal({
        title: 'Sign in to publish',
        body: 'Publishing to a public Puter URL requires signing in (free, one click).',
        actions: [{label:'Cancel',value:false,kind:'ghost'},{label:'Sign in',value:true,kind:'primary'}]
      });
      if (go) location.href = 'login.html';
      return;
    }
    const orig = publishBtn.innerHTML;
    publishBtn.disabled = true; publishBtn.innerHTML = '<span class="spinner"></span> Publishing…';
    try {
      // Ensure the project is saved first (gives us an id)
      if (!state.id) await doSave(false);
      const pub = await ProjectStore.publishProject(state);
      state.published = pub;
      const url = pub.url;
      await modal({
        title: 'You\'re live!',
        body: `Your site is published.<br><br><a href="${url}" target="_blank" rel="noopener" style="color:var(--orange-300);word-break:break-all;">${url}</a>`,
        actions: [
          { label: 'Copy link', value: 'copy', kind: 'primary' },
          { label: 'Close', value: null, kind: 'ghost' },
        ]
      }).then(v => { if (v === 'copy') copyToClipboard(url).then(()=>toast('Link copied','success')); });
    } catch (err) {
      toast('Publish failed: ' + err.message, 'error');
    } finally {
      publishBtn.disabled = false; publishBtn.innerHTML = orig;
    }
  };

  /* ---- Pane toggles (mobile) ---- */
  const leftPane = $('#left-pane');
  const rightPane = $('#right-pane');
  const backdrop = $('#mobile-backdrop');
  const isMobile = () => window.innerWidth <= 1100;

  function openPane(pane) {
    if (!isMobile()) return;
    pane.classList.add('mobile-open');
    backdrop.classList.add('show');
  }
  function closeAllPanes() {
    leftPane.classList.remove('mobile-open');
    rightPane.classList.remove('mobile-open');
    backdrop.classList.remove('show');
  }
  $('#left-toggle').onclick = () => closeAllPanes();
  $('#right-toggle').onclick = () => closeAllPanes();
  if (backdrop) backdrop.onclick = () => closeAllPanes();

  /* Pull-to-close: swipe down on pane handles */
  [leftPane, rightPane].forEach(pane => {
    let startY = 0, currentY = 0, dragging = false;
    const handle = pane.querySelector('.pull-handle');
    if (!handle) return;
    handle.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY; dragging = true;
      pane.style.transition = 'none';
    }, { passive: true });
    handle.addEventListener('touchmove', e => {
      if (!dragging) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) pane.style.transform = `translateY(${diff}px)`;
    }, { passive: true });
    handle.addEventListener('touchend', () => {
      dragging = false;
      pane.style.transition = '';
      const diff = currentY - startY;
      if (diff > 100) { closeAllPanes(); }
      pane.style.transform = '';
      startY = 0; currentY = 0;
    });
  });

  /* ---- Mobile FAB toolbar ---- */
  const mobileDeviceModes = ['desktop', 'mobile', 'tablet'];
  let mobileDeviceIdx = 0;

  $$('.fab-toolbar button').forEach(b => {
    b.addEventListener('click', () => {
      const k = b.dataset.fab;

      // Device toggle cycles through modes
      if (k === 'device') {
        mobileDeviceIdx = (mobileDeviceIdx + 1) % mobileDeviceModes.length;
        const mode = mobileDeviceModes[mobileDeviceIdx];
        previewFr.classList.remove('mobile', 'tablet', 'desktop');
        previewFr.classList.add(mode);
        toast(`Preview: ${mode}`, 'info');
        return;
      }

      // Highlight active
      $$('.fab-toolbar button').forEach(x => {
        if (x.dataset.fab !== 'device') x.classList.toggle('active', x === b);
      });

      closeAllPanes();

      if (k === 'prompt') openPane(leftPane);
      else if (k === 'tools') openPane(rightPane);
      else if (k === 'publish') publishBtn.click();
      // 'preview' just closes panes (done by closeAllPanes above)
    });
  });

  /* ---- Mobile gesture: swipe on preview to open panes ---- */
  (function initSwipeGestures() {
    const stage = document.querySelector('.preview-stage');
    if (!stage) return;
    let touchStartX = 0, touchStartY = 0, swiping = false;

    stage.addEventListener('touchstart', e => {
      if (!isMobile()) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      swiping = true;
    }, { passive: true });

    stage.addEventListener('touchend', e => {
      if (!swiping || !isMobile()) return;
      swiping = false;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      // Only trigger on horizontal swipes (dx > dy)
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      if (dx > 0) {
        // Swipe right → open prompt pane
        openPane(leftPane);
        $$('.fab-toolbar button').forEach(x => {
          if (x.dataset.fab !== 'device') x.classList.toggle('active', x.dataset.fab === 'prompt');
        });
      } else {
        // Swipe left → open tools pane
        openPane(rightPane);
        $$('.fab-toolbar button').forEach(x => {
          if (x.dataset.fab !== 'device') x.classList.toggle('active', x.dataset.fab === 'tools');
        });
      }
    });
  })();

  /* ---- Double-tap preview to show quick generate ---- */
  (function initDoubleTap() {
    const stage = document.querySelector('.preview-stage');
    if (!stage) return;
    let lastTap = 0;
    stage.addEventListener('touchend', e => {
      if (!isMobile()) return;
      const now = Date.now();
      if (now - lastTap < 300) {
        // Double tap detected → open prompt pane
        e.preventDefault();
        openPane(leftPane);
        $$('.fab-toolbar button').forEach(x => {
          if (x.dataset.fab !== 'device') x.classList.toggle('active', x.dataset.fab === 'prompt');
        });
        promptInput.focus();
      }
      lastTap = now;
    });
  })();

  /* ---- Haptic feedback (if supported) ---- */
  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms || 10);
  }
  // Add haptics to generate button
  generateBtn.addEventListener('click', () => vibrate(15));
  publishBtn.addEventListener('click', () => vibrate(15));
  $$('.fab-toolbar button').forEach(b => b.addEventListener('click', () => vibrate(8)));

  /* ---- Auto-resize prompt textarea on mobile ---- */
  promptInput.addEventListener('input', () => {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
  });

  /* ---- Prevent pull-to-refresh in preview on mobile ---- */
  document.querySelector('.preview-stage')?.addEventListener('touchmove', e => {
    if (e.target.closest('.preview-frame')) {
      // Allow scrolling inside iframe area
    }
  }, { passive: true });

  /* ---- Orientation change: close panes ---- */
  window.addEventListener('orientationchange', () => {
    setTimeout(() => closeAllPanes(), 200);
  });

  /* ---- Init: load project from URL or template ---- */
  (async function init() {
    renderComponentList();
    renderTemplatesPanel();
    titleInput.value = state.title;
    $('#model-pill').textContent = lastModel;

    const params = new URLSearchParams(location.search);
    const projectId = params.get('id');
    const templateId = params.get('template');

    if (projectId) {
      try {
        const p = await ProjectStore.getProject(projectId);
        if (p) {
          Object.assign(state, p);
          titleInput.value = state.title;
          syncCodeBoxes(); renderPreview(); pushHistory();
          saveStatus.textContent = 'loaded';
          return;
        }
      } catch (e) {}
    }

    if (templateId) {
      const t = window.Templates.TEMPLATES.find(x => x.id === templateId);
      if (t) {
        promptInput.value = t.prompt;
        titleInput.value = t.name;
        await runGeneration(t.prompt, t.name);
        return;
      }
    }

    // Default welcome doc
    state.html = `<section style="padding:80px 24px;text-align:center;font-family:Inter,system-ui,sans-serif;">
  <h1 style="font-size:clamp(36px,6vw,64px);margin:0 0 12px;background:linear-gradient(135deg,#ff8f3d,#ff6b1a);-webkit-background-clip:text;background-clip:text;color:transparent;">Welcome to your canvas</h1>
  <p style="color:#444;max-width:520px;margin:0 auto 18px;line-height:1.6;">Type a prompt on the left and tap <strong>Generate</strong>. NEXUS will design, code, and preview your site in seconds.</p>
  <p style="color:#888;font-size:14px;">Tip: try "Create a horror storytelling website" — or pick a template.</p>
</section>`;
    state.css = `body{margin:0;background:#fff;color:#222;}`;
    state.js = '';
    syncCodeBoxes(); renderPreview(); pushHistory();
    saveStatus.textContent = 'ready';
  })();
})();
