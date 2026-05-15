/* Templates Marketplace
 * Each template is a project-shaped object that can be loaded directly
 * into the builder, OR contains a "prompt" used to generate a fresh AI version.
 * Categories: Horror, AI Tools, Portfolio, Reel Tools, Business, Anime, Gaming, Memes
 */
(function (global) {
  'use strict';

  const CATEGORIES = [
    { id: 'all',       label: 'All',           icon: '✨' },
    { id: 'horror',    label: 'Horror',        icon: '🎃' },
    { id: 'ai',        label: 'AI Tools',      icon: '🤖' },
    { id: 'portfolio', label: 'Portfolio',     icon: '👤' },
    { id: 'reel',      label: 'Reel Tools',    icon: '🎬' },
    { id: 'business',  label: 'Business',      icon: '💼' },
    { id: 'anime',     label: 'Anime',         icon: '🎌' },
    { id: 'gaming',    label: 'Gaming',        icon: '🎮' },
    { id: 'meme',      label: 'Meme Pages',    icon: '😂' },
  ];

  const TEMPLATES = [
    // Horror
    { id: 't_horror_1', name: 'Midnight Tales', category: 'horror', accent: '#b91c1c',
      description: 'A spooky horror storytelling site with atmospheric scenes and AI-driven story snippets.',
      prompt: 'Create a moody horror storytelling website called "Midnight Tales" with a featured story, dark atmosphere, scrolling fog effects, and a section listing creepy tales by category. Use deep blacks and blood-red accents.' },
    { id: 't_horror_2', name: 'Whisper Manor', category: 'horror', accent: '#7f1d1d',
      description: 'Haunted manor showcase with ambient horror visuals.',
      prompt: 'Create a horror website themed around a haunted manor, with chapter cards, candle-flicker animations, and a creepy guestbook form.' },

    // AI Tools
    { id: 't_ai_1', name: 'PromptForge AI', category: 'ai', accent: '#7c3aed',
      description: 'AI prompt-engineering hub with template library.',
      prompt: 'Create a futuristic AI prompt library website called "PromptForge" with categories, search, copy-to-clipboard buttons, and a hero section explaining what prompts are. Modern dark UI with violet accents.' },
    { id: 't_ai_2', name: 'NeuroChat', category: 'ai', accent: '#06b6d4',
      description: 'AI chatbot landing page with feature highlights.',
      prompt: 'Create a SaaS landing page for an AI chatbot called "NeuroChat" with hero, feature grid, animated chat preview, pricing, and FAQ.' },

    // Portfolio
    { id: 't_port_1', name: 'Aurora Folio', category: 'portfolio', accent: '#f59e0b',
      description: 'Minimal designer portfolio with case studies.',
      prompt: 'Create a clean minimal portfolio website for a designer named "Aurora" with hero, about, project grid (6 case studies), testimonials, and contact form. Tasteful gradient accents.' },
    { id: 't_port_2', name: 'Code & Coffee', category: 'portfolio', accent: '#10b981',
      description: 'Developer portfolio with terminal aesthetics.',
      prompt: 'Create a developer portfolio website with a terminal-style hero, skills grid, GitHub project cards, and a blog section. Use monospace fonts and green-on-black accent.' },

    // Reel Tools
    { id: 't_reel_1', name: 'ReelForge', category: 'reel', accent: '#ec4899',
      description: 'Facebook Reel idea generator UI.',
      prompt: 'Create a Facebook Reel content generator web app: input box for topic, a generate button that produces 5 viral reel ideas with hooks and captions, and a saved reels grid. Pink/purple gradient theme.' },
    { id: 't_reel_2', name: 'CaptionLab', category: 'reel', accent: '#f43f5e',
      description: 'Caption generator for short-form video.',
      prompt: 'Create a caption generator app for Reels and TikToks with topic input, vibe selector (funny/aesthetic/motivational), and generated caption cards with copy button.' },

    // Business
    { id: 't_biz_1', name: 'Stratos SaaS', category: 'business', accent: '#3b82f6',
      description: 'B2B SaaS marketing site.',
      prompt: 'Create a B2B SaaS marketing site for "Stratos" — a project management platform. Include hero, social proof logos, feature grid, integrations, pricing (3 tiers), testimonials, and CTA. Blue gradient theme.' },
    { id: 't_biz_2', name: 'Ember Studio', category: 'business', accent: '#f97316',
      description: 'Creative agency website.',
      prompt: 'Create a creative agency website for "Ember Studio" with bold typography, project showcases, services, team grid, and contact form. Orange gradient theme.' },

    // Anime
    { id: 't_anime_1', name: 'Sakura Stream', category: 'anime', accent: '#ec4899',
      description: 'Anime streaming-style landing.',
      prompt: 'Create an anime streaming platform landing page called "Sakura Stream" with hero featuring a popular series, trending grid, genres list, and seasonal calendar. Pink and purple sakura theme.' },
    { id: 't_anime_2', name: 'Otaku Hub', category: 'anime', accent: '#a855f7',
      description: 'Anime fan community page.',
      prompt: 'Create an anime fan community website with character spotlights, top 10 lists, fanart gallery, and forum-style discussion preview cards.' },

    // Gaming
    { id: 't_game_1', name: 'NeonArena', category: 'gaming', accent: '#22d3ee',
      description: 'Esports/gaming brand site.',
      prompt: 'Create an esports team website "NeonArena" with hero featuring the roster, upcoming matches, achievements, sponsors, and store CTA. Cyberpunk neon dark theme.' },
    { id: 't_game_2', name: 'Pixel Quest', category: 'gaming', accent: '#84cc16',
      description: 'Indie game showcase.',
      prompt: 'Create an indie pixel-art game showcase website with hero trailer placeholder, gameplay features, screenshots gallery, devlog updates, and wishlist CTA.' },

    // Memes
    { id: 't_meme_1', name: 'LolFactory', category: 'meme', accent: '#eab308',
      description: 'Meme generator-style page.',
      prompt: 'Create a meme generator web app called "LolFactory" with template selector, top/bottom text inputs, live preview of meme image, and a trending memes grid. Bright playful theme.' },
    { id: 't_meme_2', name: 'Daily Doses', category: 'meme', accent: '#fb923c',
      description: 'Meme aggregator feed.',
      prompt: 'Create a meme feed website "Daily Doses" with top memes grid, categories, upvote buttons, and submission form. Playful design.' },
  ];

  global.Templates = { CATEGORIES, TEMPLATES };
})(window);
