// === Color Tokens ===
// v3.3 design system — accent palette + theme-aware color objects
// Provides JS exports that mirror CSS :root variables
// Theme-aware color helpers (getThemeColor) used by variants/themeClass.js

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

// === Focus ring colors ===
export const focusRing = {
    plain: 'rgba(124, 58, 237, 0.4)',
    warm: 'rgba(245, 158, 11, 0.5)',
};

// === Background colors (base layer, themes override via body class) ===
export const background = {
    plain: '#fafafa',
    warm: '#fffbeb',
    cyber: '#fafafa',  // alias to plain (cyber retired)
};

// === Theme → primary accent mapping ===
export const themePrimary = {
    plain: accent.primary,
    warm: warmAccent.primary,
    cyber: accent.primary,
};

// Helper: get theme-aware primary accent
export const getThemePrimary = (theme) => themePrimary[theme] ?? accent.primary;
