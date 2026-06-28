// === Elevation Tokens ===
// v3.3 design system — semantic elevation scale (1..4)
// Replaces ad-hoc shadow-* scale with semantic naming
// Layered shadow effect gives natural "lift" perception

export const elevation = {
    1: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
    2: '0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
    3: '0 12px 24px -6px rgba(15, 23, 42, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
    4: '0 24px 48px -12px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.04)',
};

// Legacy shadow aliases (for any remaining shadow-* references)
export const shadow = {
    sm: elevation[1],
    md: elevation[2],
    lg: elevation[3],
    xl: elevation[4],
};

// Helper
export const elevationOf = (level) => elevation[level] ?? elevation[1];
