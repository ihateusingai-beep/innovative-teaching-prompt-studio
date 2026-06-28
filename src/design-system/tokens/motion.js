// === Motion Tokens ===
// v3.3 design system — easing curves, transition durations, animation curves
// Used by framer-motion variants + CSS transitions

export const easing = {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // overshoot for delight
};

export const transition = {
    fast: { duration: 0.15, ease: [0.16, 1, 0.3, 1] },
    base: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
    slow: { duration: 0.40, ease: [0.16, 1, 0.3, 1] },
    spring: { duration: 0.50, ease: [0.34, 1.56, 0.64, 1] },
};

// CSS-friendly strings (for use in style strings)
export const transitionCss = {
    fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
    base: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
    slow: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};
