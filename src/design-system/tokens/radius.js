// === Radius Tokens ===
// v3.3 design system — radius scale for cards, buttons, pills
// Mirrors CSS variables (--radius-sm .. --radius-2xl + --radius-full)

export const radius = {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    '2xl': 28,
    full: 9999,
};

export const radiusTokens = ['sm', 'md', 'lg', 'xl', '2xl', 'full'];

// Helper
export const radiusOf = (key) => radius[key] ?? radius.md;
