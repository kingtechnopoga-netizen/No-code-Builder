/* ===========================================================
 * Puter.js Bridge — auth, AI, fs, kv, hosting
 * Centralizes every interaction with the Puter cloud SDK so
 * the rest of the app can stay clean and swappable.
 * =========================================================== */
(function (global) {
  'use strict';

  const PUTER_READY_TIMEOUT = 8000;

  function waitForPuter() {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        if (typeof window !== 'undefined' && window.puter) return resolve(window.puter);
        if (Date.now() - start > PUTER_READY_TIMEOUT) return reject(new Error('Puter SDK failed to load'));
        setTimeout(poll, 80);
      })();
    });
  }

  /* ---------- AUTH ---------- */
  async function isSignedIn() {
    try {
      const p = await waitForPuter();
      return !!(p.auth && p.auth.isSignedIn && p.auth.isSignedIn());
    } catch { return false; }
  }

  async function getUser() {
    try {
      const p = await waitForPuter();
      if (!p.auth || !p.auth.isSignedIn || !p.auth.isSignedIn()) return null;
      return await p.auth.getUser();
    } catch { return null; }
  }

  async function signIn() {
    const p = await waitForPuter();
    await p.auth.signIn();
    return await getUser();
  }

  async function signOut() {
    const p = await waitForPuter();
    if (p.auth && p.auth.signOut) p.auth.signOut();
  }

  /* ---------- AI: chat (with streaming) ---------- */
  /**
   * Call AI with optional streaming. Falls back to a non-streaming completion.
   * @param {string|Array} prompt  - prompt string or messages array
   * @param {object} opts          - { model, stream, onChunk, system }
   * @returns {Promise<string>}    - full text response
   */
  async function aiChat(prompt, opts = {}) {
    const p = await waitForPuter();
    if (!p.ai || !p.ai.chat) throw new Error('Puter AI not available');

    const { model = 'gpt-5-nano', stream = false, onChunk, system } = opts;

    let messages = prompt;
    if (typeof prompt === 'string') {
      messages = system ? [{ role: 'system', content: system }, { role: 'user', content: prompt }] : prompt;
    } else if (Array.isArray(prompt) && system) {
      messages = [{ role: 'system', content: system }, ...prompt];
    }

    try {
      const res = await p.ai.chat(messages, { model, stream });
      // Streaming response (async iterator)
      if (stream && res && typeof res[Symbol.asyncIterator] === 'function') {
        let full = '';
        for await (const part of res) {
          const text = (part && (part.text || part.message?.content || part.content)) || '';
          if (text) {
            full += text;
            if (typeof onChunk === 'function') onChunk(text, full);
          }
        }
        return full;
      }
      // Non-streaming
      if (typeof res === 'string') return res;
      if (res?.message?.content) return res.message.content;
      if (res?.text) return res.text;
      return JSON.stringify(res);
    } catch (err) {
      console.error('aiChat error:', err);
      throw err;
    }
  }

  /* ---------- AI: image generation ---------- */
  async function aiImage(prompt, opts = {}) {
    const p = await waitForPuter();
    if (!p.ai || !p.ai.txt2img) throw new Error('Puter image generation not available');
    return await p.ai.txt2img(prompt, opts.testMode || false);
  }

  /* ---------- File System ---------- */
  async function fsWrite(path, data) {
    const p = await waitForPuter();
    return await p.fs.write(path, data);
  }
  async function fsRead(path) {
    const p = await waitForPuter();
    const blob = await p.fs.read(path);
    return await blob.text();
  }
  async function fsList(path) {
    const p = await waitForPuter();
    try { return await p.fs.readdir(path); } catch { return []; }
  }
  async function fsMkdir(path) {
    const p = await waitForPuter();
    try { return await p.fs.mkdir(path, { createMissingParents: true }); } catch (e) { return null; }
  }
  async function fsDelete(path) {
    const p = await waitForPuter();
    try { return await p.fs.delete(path); } catch (e) { return null; }
  }

  /* ---------- KV Store (project metadata) ---------- */
  async function kvSet(key, value) {
    const p = await waitForPuter();
    return await p.kv.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  async function kvGet(key) {
    const p = await waitForPuter();
    const v = await p.kv.get(key);
    if (v == null) return null;
    try { return JSON.parse(v); } catch { return v; }
  }
  async function kvList(prefix) {
    const p = await waitForPuter();
    try { return await p.kv.list(prefix || '', true); }
    catch { return []; }
  }
  async function kvDelete(key) {
    const p = await waitForPuter();
    return await p.kv.del(key);
  }

  /* ---------- Hosting (one-click publish) ---------- */
  async function publishSite(directoryPath, subdomain) {
    const p = await waitForPuter();
    if (!p.hosting || !p.hosting.create) throw new Error('Puter hosting not available');
    return await p.hosting.create(subdomain, directoryPath);
  }

  global.PuterBridge = {
    waitForPuter,
    isSignedIn, getUser, signIn, signOut,
    aiChat, aiImage,
    fsWrite, fsRead, fsList, fsMkdir, fsDelete,
    kvSet, kvGet, kvList, kvDelete,
    publishSite,
  };
})(window);
