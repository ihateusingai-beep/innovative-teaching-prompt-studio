// === Spacing Tokens ===
// v3.3 design system — 8px 為基數嘅 spacing scale
// Mirrors :root CSS variables in src/styles/index.css (--space-1 .. --space-16)
// Export as JS object so React components can compute inline styles / framer-motion animations
// without parsing CSS

export const spacing = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
    12: 48,
    16: 64,
};

// Token names matching CSS variable suffixes (without `--space-` prefix)
export const spacingTokens = ['1', '2', '3', '4', '6', '8', '12', '16'];

// Helper: spacing key → px value
export const space = (key) => spacing[key] ?? spacing[4];
