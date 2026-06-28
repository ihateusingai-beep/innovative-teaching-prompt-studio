// === Gradient Tokens ===
// v3.3 design system — gradient definitions for buttons, hero text, hero backgrounds
// Provide both full CSS strings (for inline style / framer) and reusable shorthand

export const gradient = {
    // Primary: 2-stop violet → cyan (modern, professional)
    primary: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
    // Background: 3-stop violet → cyan → pink (subtle mesh)
    background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 50%, #ec4899 100%)',
    // Soft: low-opacity version of primary (used for hover overlays)
    soft: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(6, 182, 212, 0.08))',
    // Warm theme: amber → orange (low-stimulus)
    warm: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
};

// Helper: get theme-aware gradient by name
export const gradientFor = (theme, name = 'primary') => {
    if (theme === 'warm' && (name === 'primary' || name === 'background' || name === 'soft')) {
        return gradient.warm;
    }
    return gradient[name] ?? gradient.primary;
};
