// === Typography Tokens ===
// v3.3 design system — font families, scale, line heights, weights
// Used by inline style or by className composition

// === Font stacks (mirrors body font-family in styles/index.css) ===
export const fontFamily = {
    sans: "'Inter', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Share Tech Mono', monospace",
    display: "'Orbitron', 'Inter', sans-serif",  // retained for backward compat (overridden to Inter)
};

// === Font scale (Tailwind-aligned) ===
export const fontSize = {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px (h1 hero size)
};

// === Font weights ===
export const fontWeight = {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
};

// === Line heights ===
export const lineHeight = {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
};

// === Letter spacing ===
export const letterSpacing = {
    tight: '-0.01em',
    normal: '0',
    wide: '0.025em',
    widest: '0.1em',  // used for footer tracking-widest
};
