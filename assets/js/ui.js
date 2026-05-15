/* Tiny UI helpers — toasts, modal, $, $$, escapeHtml */
(function (global) {
  'use strict';

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  let toastHost;
  function ensureToastHost() {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-host';
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }
  function toast(msg, type = 'info', timeout = 3200) {
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${escapeHtml(msg)}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'all .3s';
      setTimeout(() => el.remove(), 300);
    }, timeout);
  }

  /* Simple modal */
  function modal({ title, body, actions = [] }) {
    return new Promise(resolve => {
      const host = document.createElement('div');
      host.className = 'modal-host open';
      const m = document.createElement('div');
      m.className = 'modal';
      m.innerHTML = `
        <h3 class="h-display" style="margin:0 0 12px;font-size:20px;">${escapeHtml(title || '')}</h3>
        <div class="modal-body" style="color:var(--text-dim);font-size:14px;line-height:1.55;margin-bottom:18px;">${body || ''}</div>
        <div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap;"></div>
      `;
      const actRow = m.querySelector('.row');
      const close = (val) => { host.remove(); resolve(val); };
      (actions.length ? actions : [{ label: 'Close', value: null, kind: 'ghost' }]).forEach(a => {
        const b = document.createElement('button');
        b.className = `btn btn-${a.kind || 'ghost'} btn-sm`;
        b.textContent = a.label;
        b.onclick = () => close(a.value);
        actRow.appendChild(b);
      });
      host.appendChild(m);
      host.addEventListener('click', e => { if (e.target === host) close(null); });
      document.body.appendChild(host);
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    return Promise.resolve();
  }

  global.UI = { $, $$, escapeHtml, toast, modal, copyToClipboard };
})(window);
