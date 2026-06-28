// === Color Tokens ===
// v3.3 design system — accent palette + theme-aware color objects
// v3.12.0: extended to 6 themes (plain / warm / dark / contrast / paper / reactor)

// === Plain theme accent (default) ===
export const accent = {
    primary: '#7c3aed',       // violet 600
    secondary: '#06b6d4',     // cyan 500
    tertiary: '#ec4899',      // pink 500
};

// === Warm theme accent (low-stimulus, primary school) ===
export const warmAccent = {
    primary: '#f59e0b',       // amber 500
    secondary: '#fb923c',     // orange 400
};

// === Dark theme accent (late-night, neon) ===
export const darkAccent = {
    primary: '#06b6d4',       // cyan 500 (neon)
    secondary: '#a855f7',     // purple 500
    tertiary: '#ec4899',      // pink 500
};

// === Contrast theme accent (WCAG AAA, accessibility) ===
// Pure black + white + deep blue for max contrast (7:1+)
export const contrastAccent = {
    primary: '#000000',       // pure black
    secondary: '#1d4ed8',     // deep blue 700 (4.5:1+ on white)
    tertiary: '#ffffff',      // pure white
};

// === Paper theme accent (book-like, low eye-strain) ===
// Warm stone palette — feels like reading printed paper
export const paperAccent = {
    primary: '#1c1917',       // stone 900 (near-black ink)
    secondary: '#44403c',     // stone 700
    tertiary: '#7c2d12',      // amber 900 (subtle accent)
};

// === Reactor theme accent (Iron Man hologram, signature) ===
// Cyan + amber + red glow on near-black background
export const reactorAccent = {
    primary: '#f59e0b',       // amber 500 (reactor core)
    secondary: '#0ea5e9',     // sky 500 (HUD blue)
    tertiary: '#ef4444',      // red 500 (warning glow)
};

// === All themes accent map (for themePrimary lookup) ===
export const accentByTheme = {
    plain: accent,
    warm: warmAccent,
    dark: darkAccent,
    contrast: contrastAccent,
    paper: paperAccent,
    reactor: reactorAccent,
    cyber: accent,  // alias retained for backward compat
};

// === Focus ring colors ===
export const focusRing = {
    plain: 'rgba(124, 58, 237, 0.4)',
    warm: 'rgba(245, 158, 11, 0.5)',
    dark: 'rgba(6, 182, 212, 0.6)',         // neon cyan
    contrast: 'rgba(29, 78, 216, 0.9)',     // deep blue (high visibility)
    paper: 'rgba(124, 45, 18, 0.4)',        // amber (warm ink)
    reactor: 'rgba(245, 158, 11, 0.7)',     // amber glow
};

// === Background colors (base layer, themes override via body class) ===
export const background = {
    plain: '#fafafa',
    warm: '#fffbeb',
    cyber: '#fafafa',  // alias
    dark: '#0f172a',        // slate 900
    contrast: '#ffffff',     // pure white
    paper: '#fefce8',        // stone 50
    reactor: '#0c0a09',     // zinc 950 (near-black)
};

// === Theme → primary accent mapping ===
export const themePrimary = {
    plain: accent.primary,
    warm: warmAccent.primary,
    cyber: accent.primary,
    dark: darkAccent.primary,
    contrast: contrastAccent.primary,
    paper: paperAccent.primary,
    reactor: reactorAccent.primary,
};

// === Theme metadata (label + icon hint for dropdown selector) ===
export const themeMeta = {
    plain: { label: '簡潔', emoji: '☀️', description: '白底藍紫 accent，default' },
    warm: { label: '暖色', emoji: '🌅', description: '米色 cream amber，primary school' },
    dark: { label: 'Dark', emoji: '🌙', description: '深色 + neon cyan accent，late-night' },
    contrast: { label: '對比', emoji: '🖤', description: '純黑/白 AAA 7:1，accessibility' },
    paper: { label: '紙本', emoji: '📄', description: '米白 + 炭灰，書卷氣長閱讀' },
    reactor: { label: '反應爐', emoji: '⚡', description: 'Iron Man hologram，signature' },
};

// All themes in display order
export const themeOrder = ['plain', 'warm', 'dark', 'contrast', 'paper', 'reactor'];

// Helper: get theme-aware primary accent
export const getThemePrimary = (theme) => themePrimary[theme] ?? accent.primary;
