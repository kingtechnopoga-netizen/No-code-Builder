# NEXUS — AI No-Code Builder

> **Build apps with AI. Just type. Ship in seconds.**

NEXUS is a futuristic AI-powered no-code website & app builder inspired by Claude AI, Framer, Lovable, and Replit — but optimized for **mobile users** and **beginner creators**.

Powered entirely by [**Puter.js**](https://docs.puter.com) — meaning **no API keys**, **no servers**, and **no setup**. The whole product runs in the browser.

---

## ✨ Core features

| Feature | Details |
|---|---|
| **AI Prompt Builder** | Streaming AI generates full HTML / CSS / JS from a single sentence. |
| **Live Multi-Device Preview** | Mobile · Tablet · Desktop toggle, real-time sync. |
| **Drag & Drop Editor** | Component sidebar, drag to drop into preview, click to insert. |
| **Floating AI Assistant** | Built-in chat that fixes bugs, redesigns sections, edits the live project. |
| **Project File System** | Auto-save · cloud sync (Puter KV) · folders · ZIP export. |
| **Authentication** | One-click sign-in via Puter — guests can still build & save locally. |
| **Templates Marketplace** | Horror · AI Tools · Portfolio · Reel Tools · Business · Anime · Gaming · Memes. |
| **One-Click Publish** | Push to a public Puter subdomain instantly. |
| **Advanced AI** | Image gen · Logo gen · Color palettes · Content writer · Code improver · Horror story scenes · Captions. |
| **Mobile First** | Floating bottom toolbar, touch gestures, voice prompts, responsive on entry-level Android. |

---

## 🏗 Tech stack

- **HTML5** — semantic, accessible markup
- **TailwindCSS-style utility CSS** — handcrafted in `assets/css/styles.css` (no Tailwind build step required)
- **Vanilla JavaScript (ES2020)** — no React, no bundler, no build pipeline
- **Puter.js** — auth, AI chat (streaming), AI image gen, KV store, FS, hosting
- **JSZip** (loaded on demand) — for ZIP export

Everything is **static**. Open `index.html` in a browser and the app works.

---

## 📁 Project structure

```
No-code-Builder/
├── index.html              ← Marketing landing (hero, features, templates, pricing, FAQ)
├── login.html              ← Puter sign-in
├── dashboard.html          ← User dashboard (projects, chat, publish, settings)
├── builder.html            ← The main AI builder/editor
├── preview.html            ← Standalone preview / share view
├── README.md
└── assets/
    ├── css/
    │   └── styles.css      ← Global theme (orange + dark, glassmorphism, animations)
    └── js/
        ├── ui.js           ← Toasts, modals, helpers
        ├── puter-bridge.js ← Wraps every Puter.js call (auth, AI, fs, kv, hosting)
        ├── ai-engine.js    ← Project generation + edits + image/palette/content
        ├── templates.js    ← Marketplace templates
        ├── projects.js     ← Project storage (cloud KV w/ localStorage fallback) + ZIP export
        ├── landing.js      ← Landing page interactivity
        ├── dashboard.js    ← Dashboard tabs + project grid + chat
        └── builder.js      ← Builder orchestration (generation, drag-drop, preview, etc.)
```

---

## 🚀 Run locally

The project is fully static — no build step, no dependencies to install.

```bash
# Any static server works. Examples:
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

> Puter.js is loaded from CDN (`https://js.puter.com/v2/`) and works out of the box — no keys, no config.

---

## 🎨 Design language

- **Theme** — dark background (`#0a0a0b`), orange gradient accents (`#ff8f3d → #e8530a`)
- **Glassmorphism** — translucent cards with `backdrop-filter: blur()`
- **Typography** — Inter (body) + Space Grotesk (display)
- **Animations** — smooth `cubic-bezier(.2, .7, .2, 1)`, fade-up on scroll, glow pulses
- **Mobile-first** — every layout collapses gracefully; floating bottom toolbar appears under 880 px

---

## 🔌 How Puter.js is used

| Capability | Puter API |
|---|---|
| Auth | `puter.auth.signIn()` · `puter.auth.getUser()` · `puter.auth.isSignedIn()` |
| AI text (streaming) | `puter.ai.chat(messages, { stream: true })` |
| AI images | `puter.ai.txt2img(prompt)` |
| Cloud key-value | `puter.kv.set/get/list/del` (project metadata) |
| Cloud file storage | `puter.fs.write/read/mkdir` (published HTML) |
| Publishing | `puter.hosting.create(subdomain, dir)` |

All calls are wrapped in `assets/js/puter-bridge.js` so the rest of the app stays clean.

---

## 🧠 How project generation works

1. User types a prompt (or picks a template).
2. `AIEngine.generateProject()` sends a strict system prompt to `puter.ai.chat()` asking for a single JSON object.
3. Streaming chunks are surfaced through `onProgress`.
4. The JSON is parsed (with a lenient fallback) into `{ html, css, js, title, ... }`.
5. The builder writes those fields into the live preview iframe via `srcdoc`, syncs the code editors, and auto-saves.

The same engine powers **edits** (`editProject`) and the **floating assistant** — when the user says "make the hero centered", the assistant calls `editProject` with the current code + instruction.

---

## 📱 Mobile optimizations

- Layout collapses to a single column under 1100 px
- A **floating bottom toolbar** swaps between Prompt · Preview · Tools · Publish under 880 px
- **Voice prompts** via `webkitSpeechRecognition` — tap the mic, dictate
- Sidebar slides in via `transform: translateX()` (off-screen by default on mobile)
- Touch-friendly hit targets (≥ 38 px)
- All `iframe` previews scale via `aspect-ratio` rather than fixed pixels

---

## 🗺 Future roadmap

- Rich, in-place WYSIWYG editing on the preview iframe
- Component picker that snapshots the AI's own output as new presets
- Custom domain wiring on top of `puter.hosting`
- Multi-page projects (file tree)
- AI design "review" — automatic accessibility & contrast audit

---

Built with ❤️ on Puter.js.
