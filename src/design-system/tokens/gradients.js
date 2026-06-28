// === Gradient Tokens ===
// v3.3 design system — gradient definitions for buttons, hero text, hero backgrounds
// v3.12.0: extended to 6 themes via lookup table
// Provide both full CSS strings (for inline style / framer) and reusable shorthand

export const gradient = {
    // Plain: 2-stop violet → cyan (modern, professional)
    primary: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
    // Background: 3-stop violet → cyan → pink (subtle mesh)
    background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #ec4899 100%)',
    // Soft: low-opacity version of primary (used for hover overlays)
    soft: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(6, 182, 212, 0.08))',
    // Warm: amber → orange (low-stimulus)
    warm: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
    // Dark: cyan → purple (neon, late-night)
    dark: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
    // Contrast: pure black (no gradient — accessibility)
    contrast: 'linear-gradient(180deg, #000000 0%, #000000 100%)',
    // Paper: cream → light stone (subtle paper texture)
    paper: 'linear-gradient(180deg, #fefce8 0%, #fef3c7 100%)',
    // Reactor: amber → sky → red (Iron Man HUD)
    reactor: 'linear-gradient(135deg, #f59e0b 0%, #0ea5e9 50%, #ef4444 100%)',
};

// Theme → primary gradient alias (for backward compat with old gradientFor call pattern)
gradient.plain = gradient.primary;

// Helper: get theme-aware gradient by name
// Plain uses name-keyed (primary/background/soft) for backward compat;
// Other themes override all 3 slots with theme-specific gradient.
export const gradientFor = (theme, name = 'primary') => {
    if (theme === 'warm' || theme === 'dark' || theme === 'contrast' ||
        theme === 'paper' || theme === 'reactor') {
        // For non-plain themes, override primary/background/soft with theme gradient
        if (name === 'primary' || name === 'background' || name === 'soft') {
            return gradient[theme];
        }
    }
    return gradient[name] ?? gradient.primary;
};
