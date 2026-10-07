// === Theme Variant Helpers ===
// v3.7.0 Path B.2 — centralized theme-aware className helpers
// v3.12.0: 6 themes → v3.20.0: + school (將軍澳培智校網藍 default)
//
// Usage:
//   <div className={cardClass(theme)}>
//   <button className={buttonClass(theme, 'primary')}>

import {
    accent,
    warmAccent,
    darkAccent,
    contrastAccent,
    paperAccent,
    reactorAccent,
    schoolAccent,
    focusRing,
} from '../tokens/colors.js';

// === Theme normalization ===
// Active: school | plain | warm | dark | contrast | paper | reactor
// Cyber + invalid → school (default brand)
export const normalizeTheme = (theme) => {
    if (theme === 'school' || theme === 'plain' || theme === 'warm' || theme === 'dark'
        || theme === 'contrast' || theme === 'paper' || theme === 'reactor') {
        return theme;
    }
    return 'school';
};

// === Card variant ===
export const cardClass = (theme, variant = 'default') => {
    const t = normalizeTheme(theme);
    const baseClass = variant === 'flat' ? 'glass-card-flat'
                    : variant === 'elevated' ? 'glass-card-elevated'
                    : 'glass-card';
    const borderOverride = {
        school: 'border-[#426eb4]/25',
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
        school: 'text-[#1e3a5f]',
        plain: 'text-slate-700',
        warm: 'text-amber-900',
        dark: 'text-cyan-100',
        contrast: 'text-black font-bold',
        paper: 'text-stone-900',
        reactor: 'text-amber-100',
    }[t];
};

// === Button variant ===
export const buttonClass = (theme, variant = 'primary', { disabled = false } = {}) => {
    const t = normalizeTheme(theme);
    if (disabled) {
        return 'bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    if (variant === 'primary') {
        return {
            school: 'bg-[#426eb4] text-white hover:bg-[#2f5285]',
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
            school: 'bg-white text-[#1e3a5f] border border-[#426eb4]/30 hover:bg-[#e8f1fb]',
            plain: 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100',
            warm: 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100',
            dark: 'bg-slate-800 text-cyan-100 border border-cyan-500/40 hover:bg-slate-700',
            contrast: 'bg-white text-black border-2 border-black hover:bg-black hover:text-white',
            paper: 'bg-stone-50 text-stone-700 border border-stone-400 hover:bg-stone-100',
            reactor: 'bg-zinc-900 text-amber-100 border border-amber-500/40 hover:bg-zinc-800',
        }[t];
    }
    return {
        school: 'text-[#1e3a5f] hover:bg-[#e8f1fb]',
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
            school: 'bg-[#426eb4]',
            plain: 'bg-blue-600',
            warm: 'bg-amber-500',
            dark: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]',
            contrast: 'bg-black',
            paper: 'bg-stone-800',
            reactor: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]',
        }[t];
    }
    return {
        school: 'bg-slate-300',
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
            school: 'bg-[#d6e6f7] text-[#1e3a5f] ring-1 ring-[#426eb4]/40',
            plain: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300',
            warm: 'bg-amber-200/80 text-amber-900 ring-1 ring-amber-400',
            dark: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/50',
            contrast: 'bg-black text-white ring-2 ring-black',
            paper: 'bg-stone-200 text-stone-900 ring-1 ring-stone-500',
            reactor: 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-500/60',
        }[t];
    }
    return {
        school: 'text-[#1e3a5f]/80 hover:bg-white hover:shadow-sm',
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
        school: 'text-[#2f5285]/80',
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
        school: 'border-[#426eb4]/25',
        plain: 'border-slate-200',
        warm: 'border-amber-200',
        dark: 'border-cyan-500/30',
        contrast: 'border-black border-2',
        paper: 'border-stone-400',
        reactor: 'border-amber-500/30',
    }[t];
};

// === Focus ring ===
export const focusRingClass = (theme) => focusRing[normalizeTheme(theme)] ?? focusRing.school;

// === Accent color (for inline style or framer) ===
export const accentColor = (theme) => {
    const t = normalizeTheme(theme);
    return {
        school: schoolAccent.primary,
        plain: accent.primary,
        warm: warmAccent.primary,
        dark: darkAccent.primary,
        contrast: contrastAccent.primary,
        paper: paperAccent.primary,
        reactor: reactorAccent.primary,
    }[t];
};
