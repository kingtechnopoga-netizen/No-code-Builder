/* ===========================================================
 * AI Engine — turns a natural language prompt into a complete
 * web project (HTML / CSS / JS). Uses Puter.js AI chat.
 * =========================================================== */
(function (global) {
  'use strict';

  const SYSTEM_BUILDER = `You are NEXUS, an elite AI web designer & full-stack engineer.
You generate COMPLETE, production-quality, single-file websites or web apps from a user's natural-language brief.

OUTPUT RULES (very strict):
1. Reply with ONE JSON object only. No prose, no markdown fences, no commentary.
2. JSON shape:
{
  "title": "<short project name>",
  "description": "<one sentence summary>",
  "html": "<full HTML body content (no <html>/<head>/<body> tags)>",
  "css": "<full CSS — modern, mobile-first, responsive, polished>",
  "js":  "<vanilla JavaScript — interactivity, no external libs unless via CDN URL>",
  "tags": ["tag1","tag2"]
}
3. The HTML must be SEMANTIC and ACCESSIBLE. Use <header>, <main>, <section>, <footer>.
4. The CSS MUST be modern, beautiful, futuristic. Use CSS variables, gradients, glassmorphism when fitting.
   Default to a dark theme with a tasteful accent color. MUST be fully responsive (mobile-first).
5. Include realistic placeholder content (NOT lorem ipsum — write content that fits the brief).
   Use https://images.unsplash.com/... or https://picsum.photos for any image placeholders.
6. The JS must be vanilla (no React/Vue). Add small interactions (toggles, smooth scroll, form validation, etc.).
7. NEVER include <script src="..."> for the project's own scripts; the JS field is wired separately.
8. Keep total output reasonably sized but feature-complete. NO TODO comments.
9. Do NOT include any explanation outside the JSON.`;

  const SYSTEM_EDITOR = `You are NEXUS, a senior front-end engineer assisting inside a no-code builder.
You receive the current project's HTML, CSS, JS plus a user instruction.
Return ONE JSON object: {"html":"...","css":"...","js":"...","note":"<short change summary>"}
Apply the user's request precisely. Keep all unchanged sections intact. Output JSON only.`;

  const SYSTEM_ASSISTANT = `You are NEXUS, a friendly built-in assistant inside an AI no-code builder.
Help users create, debug, redesign, and improve their websites.
Be concise, helpful, action-oriented. When relevant, give short code snippets in markdown fences.
If the user asks to change their site, suggest using the "Apply" button (the host app handles editing).`;

  /* ---- helpers ---- */
  function extractJSON(raw) {
    if (!raw) return null;
    // Strip markdown fences if any
    let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    // Find first { ... } block
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const slice = s.substring(start, end + 1);
    try { return JSON.parse(slice); } catch (e) {
      // Try lenient cleanup: remove stray control chars
      try {
        const clean = slice
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
          .replace(/,\s*([\}\]])/g, '$1');
        return JSON.parse(clean);
      } catch { return null; }
    }
  }

  /**
   * Generate a brand-new project from a natural-language prompt.
   * Streams progress text via onProgress(textChunk).
   */
  async function generateProject(prompt, { onProgress, model = 'gpt-5-nano' } = {}) {
    if (!global.PuterBridge) throw new Error('Puter bridge not loaded');

    const fullPrompt = `User brief: ${prompt}\n\nReturn the JSON described in the system prompt.`;

    let raw = '';
    try {
      raw = await PuterBridge.aiChat(fullPrompt, {
        model,
        stream: true,
        system: SYSTEM_BUILDER,
        onChunk: (chunk) => { if (typeof onProgress === 'function') onProgress(chunk); }
      });
    } catch (err) {
      // Retry once non-streaming
      raw = await PuterBridge.aiChat(fullPrompt, { model, stream: false, system: SYSTEM_BUILDER });
    }

    const parsed = extractJSON(raw);
    if (!parsed || !parsed.html) {
      // Last-resort fallback
      return fallbackProject(prompt, raw);
    }
    return {
      title: parsed.title || 'Untitled Project',
      description: parsed.description || '',
      html: parsed.html || '',
      css: parsed.css || '',
      js: parsed.js || '',
      tags: parsed.tags || [],
    };
  }

  /**
   * Apply an edit to an existing project.
   */
  async function editProject({ html, css, js }, instruction, { model = 'gpt-5-nano' } = {}) {
    if (!global.PuterBridge) throw new Error('Puter bridge not loaded');
    const userMsg = `Current project:
=== HTML ===
${html}
=== CSS ===
${css}
=== JS ===
${js}

User request: ${instruction}

Return the updated JSON.`;
    const raw = await PuterBridge.aiChat(userMsg, { model, stream: false, system: SYSTEM_EDITOR });
    const parsed = extractJSON(raw);
    if (!parsed) throw new Error('AI returned malformed response');
    return {
      html: parsed.html ?? html,
      css:  parsed.css  ?? css,
      js:   parsed.js   ?? js,
      note: parsed.note || 'Updated',
    };
  }

  /**
   * Conversational assistant for the floating chat panel.
   */
  async function chatAssistant(history, message, { model = 'gpt-5-nano', onChunk } = {}) {
    const messages = [...history, { role: 'user', content: message }];
    return await PuterBridge.aiChat(messages, {
      model,
      stream: true,
      system: SYSTEM_ASSISTANT,
      onChunk,
    });
  }

  /**
   * AI color palette: returns array of 5 hex colors.
   */
  async function generatePalette(theme) {
    const raw = await PuterBridge.aiChat(
      `Generate a 5-color hex palette that fits the theme "${theme}". Reply with JSON: {"name":"...","colors":["#aaa","#bbb",...]} only.`,
      { stream: false }
    );
    const parsed = extractJSON(raw);
    if (parsed && Array.isArray(parsed.colors)) return parsed;
    return { name: theme, colors: ['#0a0a0b', '#17171c', '#ff6b1a', '#ff8f3d', '#f5f5f5'] };
  }

  /**
   * AI content writer: returns plain text.
   */
  async function generateContent(brief) {
    return await PuterBridge.aiChat(
      `Write polished website copy for: ${brief}. Keep it under 220 words.`,
      { stream: false }
    );
  }

  /**
   * AI image (txt2img). Returns an HTMLImageElement.
   */
  async function generateImage(prompt) {
    return await PuterBridge.aiImage(prompt);
  }

  /**
   * AI code improver — reformats / optimizes existing code.
   */
  async function improveCode({ html, css, js }) {
    return editProject({ html, css, js }, 'Improve the code: better accessibility, performance, polish, and add subtle animations. Keep look & feel.');
  }

  /**
   * Tiny offline fallback if the AI is unreachable.
   */
  function fallbackProject(prompt, partial = '') {
    const safe = (prompt || 'Untitled').replace(/[<>]/g, '');
    return {
      title: safe.slice(0, 60),
      description: 'Generated locally as fallback.',
      html: `<header><h1>${safe}</h1><p>Your AI-generated site is ready to be customized.</p></header>
<main>
  <section>
    <h2>Welcome</h2>
    <p>This is a fallback layout. Try regenerating, or use the assistant to add features.</p>
    <button class="cta" onclick="alert('Hello from your new site!')">Get Started</button>
  </section>
</main>
<footer>&copy; Built with NEXUS AI</footer>`,
      css: `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#0a0a0b;color:#f5f5f5;line-height:1.55}
header,main,footer{padding:32px 24px;max-width:960px;margin:0 auto}
h1{font-size:clamp(34px,6vw,64px);background:linear-gradient(135deg,#ff8f3d,#ff6b1a);-webkit-background-clip:text;background-clip:text;color:transparent;margin:0 0 12px}
section{padding:24px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(12px)}
.cta{margin-top:14px;padding:12px 22px;border-radius:999px;border:0;background:linear-gradient(135deg,#ff8f3d,#ff6b1a);color:#fff;font-weight:600;cursor:pointer}
footer{text-align:center;color:#71717a;font-size:13px}`,
      js: `console.log('Fallback project loaded.');`,
      tags: ['fallback'],
    };
  }

  global.AIEngine = {
    generateProject,
    editProject,
    chatAssistant,
    generatePalette,
    generateContent,
    generateImage,
    improveCode,
    extractJSON,
  };
})(window);
