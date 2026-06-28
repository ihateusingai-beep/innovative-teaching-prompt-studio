// === Theme Variant Helpers ===
// v3.7.0 Path B.2 — centralized theme-aware className helpers
// v3.12.0: extended to 6 themes via lookup tables (plain/warm/dark/contrast/paper/reactor)
//
// Replaces inline `theme === 'cyber' ? cyberV : (theme === 'warm' ? warmV : plainV)`
// ternary with pure function calls. Cyber alias 已退役 (v3.2) — runtime 6 themes.
//
// Usage:
//   <div className={cardClass(theme)}>
//   <button className={buttonClass(theme, 'primary')}>

import { accent, warmAccent, darkAccent, contrastAccent, paperAccent, reactorAccent, focusRing } from '../tokens/colors.js';

// === Theme normalization ===
// Returns one of 6 active theme names: 'plain' | 'warm' | 'dark' | 'contrast' | 'paper' | 'reactor'
// Cyber + invalid → plain (backward compat)
export const normalizeTheme = (theme) => {
    if (theme === 'plain' || theme === 'warm' || theme === 'dark' ||
        theme === 'contrast' || theme === 'paper' || theme === 'reactor') {
        return theme;
    }
    return 'plain';
};

// === Card variant ===
// variant options: 'default' (glass with hover) | 'flat' (no hover) | 'elevated' (deeper shadow)
// Theme overrides only the border color — glass effect itself is theme-agnostic via CSS
export const cardClass = (theme, variant = 'default') => {
    const t = normalizeTheme(theme);
    const baseClass = variant === 'flat' ? 'glass-card-flat'
                    : variant === 'elevated' ? 'glass-card-elevated'
                    : 'glass-card';
    const borderOverride = {
        plain: '',
        warm: 'border-amber-200',
        dark: 'border-cyan-500/40',
        contrast: 'border-black border-2',
        paper: 'border-stone-400',
        reactor: 'border-amber-500/40',
    }[t];
    return `${baseClass} ${borderOverride}`.trim();
};

// === Input variant ===
export const inputClass = (theme) => {
    return 'glass-input';  // CSS handles theme via body class
};

// === Label variant ===
export const labelClass = (theme) => {
    const t = normalizeTheme(theme);
    return {
        plain: 'text-slate-700',
        warm: 'text-amber-900',
        dark: 'text-cyan-100',
        contrast: 'text-black font-bold',
        paper: 'text-stone-900',
        reactor: 'text-amber-100',
    }[t];
};

// === Button variant ===
// variant: 'primary' | 'secondary' | 'ghost'
export const buttonClass = (theme, variant = 'primary', { disabled = false } = {}) => {
    const t = normalizeTheme(theme);
    if (disabled) {
        return 'bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    if (variant === 'primary') {
        return {
            plain: 'bg-blue-600 text-white hover:bg-blue-700',
            warm: 'bg-amber-500 text-white hover:bg-amber-600',
            dark: 'bg-cyan-500 text-slate-900 hover:bg-cyan-400',
            contrast: 'bg-black text-white border-2 border-white outline outline-2 outline-black hover:bg-white hover:text-black',
            paper: 'bg-stone-800 text-stone-50 hover:bg-stone-700',
            reactor: 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
        }[t];
    }
    if (variant === 'secondary') {
        return {
            plain: 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100',
            warm: 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100',
            dark: 'bg-slate-800 text-cyan-100 border border-cyan-500/40 hover:bg-slate-700',
            contrast: 'bg-white text-black border-2 border-black hover:bg-black hover:text-white',
            paper: 'bg-stone-50 text-stone-700 border border-stone-400 hover:bg-stone-100',
            reactor: 'bg-zinc-900 text-amber-100 border border-amber-500/40 hover:bg-zinc-800',
        }[t];
    }
    // ghost
    return {
        plain: 'text-slate-700 hover:bg-slate-50',
        warm: 'text-amber-700 hover:bg-amber-50',
        dark: 'text-cyan-300 hover:bg-slate-800',
        contrast: 'text-black hover:bg-black hover:text-white',
        paper: 'text-stone-700 hover:bg-stone-100',
        reactor: 'text-amber-300 hover:bg-zinc-900',
    }[t];
};

// === Toggle (pill switch) variant ===
export const toggleClass = (theme, isOn) => {
    const t = normalizeTheme(theme);
    if (isOn) {
        return {
            plain: 'bg-blue-600',
            warm: 'bg-amber-500',
            dark: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
            contrast: 'bg-black',
            paper: 'bg-stone-800',
            reactor: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]',
        }[t];
    }
    return {
        plain: 'bg-slate-300',
        warm: 'bg-slate-300',
        dark: 'bg-slate-700',
        contrast: 'bg-white border border-black',
        paper: 'bg-stone-300',
        reactor: 'bg-zinc-700',
    }[t];
};

// === Pill / Tab variant ===
export const pillClass = (theme, { active = false } = {}) => {
    const t = normalizeTheme(theme);
    if (active) {
        return {
            plain: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300',
            warm: 'bg-amber-200/80 text-amber-900 ring-1 ring-amber-400',
            dark: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/50',
            contrast: 'bg-black text-white ring-2 ring-black',
            paper: 'bg-stone-200 text-stone-900 ring-1 ring-stone-500',
            reactor: 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/60',
        }[t];
    }
    return {
        plain: 'text-slate-600 hover:bg-white hover:shadow-sm',
        warm: 'text-amber-800 hover:text-amber-900 hover:bg-amber-100',
        dark: 'text-cyan-300/80 hover:bg-slate-800 hover:text-cyan-100',
        contrast: 'text-black hover:bg-black hover:text-white',
        paper: 'text-stone-700 hover:bg-stone-100',
        reactor: 'text-amber-200/80 hover:bg-zinc-900 hover:text-amber-100',
    }[t];
};

// === Hint / muted text variant ===
export const mutedTextClass = (theme) => {
    const t = normalizeTheme(theme);
    return {
        plain: 'text-slate-500',
        warm: 'text-amber-700',
        dark: 'text-cyan-300/70',
        contrast: 'text-black/70',
        paper: 'text-stone-600',
        reactor: 'text-amber-200/70',
    }[t];
};

// === Border variant (for inputs / cards) ===
export const borderClass = (theme) => {
    const t = normalizeTheme(theme);
    return {
        plain: 'border-slate-200',
        warm: 'border-amber-200',
        dark: 'border-cyan-500/30',
        contrast: 'border-black border-2',
        paper: 'border-stone-400',
        reactor: 'border-amber-500/30',
    }[t];
};

// === Focus ring ===
export const focusRingClass = (theme) => focusRing[normalizeTheme(theme)] ?? focusRing.plain;

// === Accent color (for inline style or framer) ===
export const accentColor = (theme) => {
    const t = normalizeTheme(theme);
    return {
        plain: accent.primary,
        warm: warmAccent.primary,
        dark: darkAccent.primary,
        contrast: contrastAccent.primary,
        paper: paperAccent.primary,
        reactor: reactorAccent.primary,
    }[t];
};
