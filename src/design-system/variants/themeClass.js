// === Theme Variant Helpers ===
// v3.7.0 Path B.2 — centralized theme-aware className helpers
//
// Replaces inline `theme === 'cyber' ? cyberV : (theme === 'warm' ? warmV : plainV)`
// ternary with pure function calls. Cyber alias 已退役 (v3.2) — 所以實際
// runtime 只有 plain + warm 兩個 theme 有意義，但 variant API 仍接受 'cyber'
// 當 backward-compat alias for plain.
//
// Usage:
//   <div className={themeClass('card', theme)}>
//   <div className={themeClass('tab', theme, { active: isActive })}>
//   <button className={themeClass('button-primary', theme, { disabled })}>

import { accent, warmAccent, focusRing } from '../tokens/colors.js';

// === Theme normalization ===
// Cyber alias retired (v3.2) — runtime only plain + warm
export const normalizeTheme = (theme) => {
    if (theme === 'warm') return 'warm';
    return 'plain';  // plain + cyber + invalid all → plain
};

// === Card variant ===
// Returns theme-aware classes for card containers
// variant options: 'default' (glass) | 'flat' (no hover lift) | 'elevated' (deeper shadow)
export const cardClass = (theme, variant = 'default') => {
    const t = normalizeTheme(theme);
    if (variant === 'flat') {
        return t === 'warm'
            ? 'glass-card-flat border-amber-200'
            : 'glass-card-flat';
    }
    if (variant === 'elevated') {
        return t === 'warm'
            ? 'glass-card-elevated border-amber-300'
            : 'glass-card-elevated';
    }
    // default — glass-card with hover lift
    return t === 'warm' ? 'glass-card' : 'glass-card';
};

// === Input variant ===
export const inputClass = (theme) => {
    const t = normalizeTheme(theme);
    return t === 'warm' ? 'glass-input' : 'glass-input';
};

// === Label variant ===
// Returns theme-aware classes for form labels
export const labelClass = (theme) => {
    const t = normalizeTheme(theme);
    if (t === 'warm') {
        return 'text-amber-900';
    }
    return 'text-slate-700';
};

// === Button variant ===
// Returns theme-aware classes for primary / secondary / ghost buttons
export const buttonClass = (theme, variant = 'primary', { disabled = false } = {}) => {
    const t = normalizeTheme(theme);
    if (disabled) {
        return t === 'warm'
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    if (variant === 'primary') {
        return t === 'warm'
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-blue-600 text-white hover:bg-blue-700';
    }
    if (variant === 'secondary') {
        return t === 'warm'
            ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100'
            : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100';
    }
    // ghost — no background
    return t === 'warm'
        ? 'text-amber-700 hover:bg-amber-50'
        : 'text-slate-700 hover:bg-slate-50';
};

// === Toggle (pill switch) variant ===
export const toggleClass = (theme, isOn) => {
    const t = normalizeTheme(theme);
    if (isOn) {
        return t === 'warm' ? 'bg-amber-500' : 'bg-blue-600';
    }
    return t === 'warm' ? 'bg-slate-300' : 'bg-slate-300';
};

// === Pill / Tab variant ===
// For tab pills, badge backgrounds
export const pillClass = (theme, { active = false } = {}) => {
    const t = normalizeTheme(theme);
    if (active) {
        return t === 'warm'
            ? 'bg-amber-200/80 text-amber-900 ring-1 ring-amber-400'
            : 'bg-blue-100 text-blue-700 ring-1 ring-blue-300';
    }
    return t === 'warm'
        ? 'text-amber-800 hover:text-amber-900 hover:bg-amber-100'
        : 'text-slate-600 hover:bg-white hover:shadow-sm';
};

// === Hint / muted text variant ===
export const mutedTextClass = (theme) => {
    const t = normalizeTheme(theme);
    return t === 'warm' ? 'text-amber-700' : 'text-slate-500';
};

// === Border variant (for inputs / cards) ===
export const borderClass = (theme) => {
    const t = normalizeTheme(theme);
    return t === 'warm' ? 'border-amber-200' : 'border-slate-200';
};

// === Focus ring ===
export const focusRingClass = (theme) => {
    const t = normalizeTheme(theme);
    return t === 'warm' ? focusRing.warm : focusRing.plain;
};

// === Accent color (for inline style or framer) ===
export const accentColor = (theme) => {
    const t = normalizeTheme(theme);
    return t === 'warm' ? warmAccent.primary : accent.primary;
};
