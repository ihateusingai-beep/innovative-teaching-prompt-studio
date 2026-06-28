// === Design System Variants tests ===
// v3.7.0 Path B.2 — theme-aware variant helpers
// v3.12.0: extended to 6 themes

import { describe, it, expect } from 'vitest';
import {
    normalizeTheme,
    cardClass, inputClass, labelClass,
    buttonClass, toggleClass, pillClass,
    mutedTextClass, borderClass, focusRingClass, accentColor,
} from '../src/design-system/variants/themeClass.js';

describe('normalizeTheme', () => {
    it('returns each named theme unchanged', () => {
        expect(normalizeTheme('plain')).toBe('plain');
        expect(normalizeTheme('warm')).toBe('warm');
        expect(normalizeTheme('dark')).toBe('dark');
        expect(normalizeTheme('contrast')).toBe('contrast');
        expect(normalizeTheme('paper')).toBe('paper');
        expect(normalizeTheme('reactor')).toBe('reactor');
    });

    it('cyber alias retired → plain', () => {
        expect(normalizeTheme('cyber')).toBe('plain');
    });

    it('invalid input → plain (default)', () => {
        expect(normalizeTheme('invalid')).toBe('plain');
        expect(normalizeTheme(undefined)).toBe('plain');
        expect(normalizeTheme(null)).toBe('plain');
    });
});

describe('cardClass', () => {
    it('default variant — 6 themes, each with theme-specific border', () => {
        expect(cardClass('plain')).toBe('glass-card');
        expect(cardClass('warm')).toBe('glass-card border-amber-200');
        expect(cardClass('dark')).toBe('glass-card border-cyan-500/40');
        expect(cardClass('contrast')).toBe('glass-card border-black border-2');
        expect(cardClass('paper')).toBe('glass-card border-stone-400');
        expect(cardClass('reactor')).toBe('glass-card border-amber-500/40');
    });

    it('flat variant (no hover lift)', () => {
        expect(cardClass('plain', 'flat')).toBe('glass-card-flat');
        expect(cardClass('warm', 'flat')).toBe('glass-card-flat border-amber-200');
        expect(cardClass('dark', 'flat')).toBe('glass-card-flat border-cyan-500/40');
    });

    it('elevated variant (deeper shadow)', () => {
        expect(cardClass('plain', 'elevated')).toBe('glass-card-elevated');
        expect(cardClass('warm', 'elevated')).toBe('glass-card-elevated border-amber-200');
        expect(cardClass('contrast', 'elevated')).toBe('glass-card-elevated border-black border-2');
    });
});

describe('inputClass', () => {
    it('returns glass-input across themes (warm/dark tones via body override)', () => {
        expect(inputClass('plain')).toBe('glass-input');
        expect(inputClass('warm')).toBe('glass-input');
        expect(inputClass('dark')).toBe('glass-input');
        expect(inputClass('contrast')).toBe('glass-input');
        expect(inputClass('paper')).toBe('glass-input');
        expect(inputClass('reactor')).toBe('glass-input');
    });
});

describe('labelClass', () => {
    it('returns theme-specific color for all 6 themes', () => {
        expect(labelClass('plain')).toBe('text-slate-700');
        expect(labelClass('warm')).toBe('text-amber-900');
        expect(labelClass('dark')).toBe('text-cyan-100');
        expect(labelClass('contrast')).toBe('text-black font-bold');
        expect(labelClass('paper')).toBe('text-stone-900');
        expect(labelClass('reactor')).toBe('text-amber-100');
    });
});

describe('buttonClass', () => {
    it('primary button — theme-aware bg + hover', () => {
        expect(buttonClass('plain', 'primary')).toBe('bg-blue-600 text-white hover:bg-blue-700');
        expect(buttonClass('warm', 'primary')).toBe('bg-amber-500 text-white hover:bg-amber-600');
        expect(buttonClass('dark', 'primary')).toBe('bg-cyan-500 text-slate-900 hover:bg-cyan-400');
        expect(buttonClass('contrast', 'primary')).toContain('bg-black');
        expect(buttonClass('paper', 'primary')).toContain('bg-stone-800');
        expect(buttonClass('reactor', 'primary')).toContain('bg-amber-500');
    });

    it('secondary button — theme-aware border + bg', () => {
        expect(buttonClass('plain', 'secondary')).toBe('bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100');
        expect(buttonClass('warm', 'secondary')).toBe('bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100');
        expect(buttonClass('dark', 'secondary')).toContain('border-cyan-500/40');
    });

    it('ghost button — no background', () => {
        expect(buttonClass('plain', 'ghost')).toBe('text-slate-700 hover:bg-slate-50');
        expect(buttonClass('warm', 'ghost')).toBe('text-amber-700 hover:bg-amber-50');
        expect(buttonClass('dark', 'ghost')).toBe('text-cyan-300 hover:bg-slate-800');
    });

    it('disabled state — neutral gray regardless of theme', () => {
        expect(buttonClass('plain', 'primary', { disabled: true }))
            .toBe('bg-slate-200 text-slate-400 cursor-not-allowed');
        expect(buttonClass('warm', 'primary', { disabled: true }))
            .toBe('bg-slate-200 text-slate-400 cursor-not-allowed');
        expect(buttonClass('dark', 'primary', { disabled: true }))
            .toBe('bg-slate-200 text-slate-400 cursor-not-allowed');
    });
});

describe('toggleClass', () => {
    it('on state — theme-aware on color', () => {
        expect(toggleClass('plain', true)).toBe('bg-blue-600');
        expect(toggleClass('warm', true)).toBe('bg-amber-500');
        expect(toggleClass('dark', true)).toContain('bg-cyan-500');
        expect(toggleClass('contrast', true)).toBe('bg-black');
        expect(toggleClass('paper', true)).toBe('bg-stone-800');
        expect(toggleClass('reactor', true)).toContain('bg-amber-500');
    });

    it('off state — theme-specific neutral', () => {
        expect(toggleClass('plain', false)).toBe('bg-slate-300');
        expect(toggleClass('warm', false)).toBe('bg-slate-300');
        expect(toggleClass('dark', false)).toBe('bg-slate-700');
        expect(toggleClass('contrast', false)).toContain('bg-white');
        expect(toggleClass('paper', false)).toBe('bg-stone-300');
        expect(toggleClass('reactor', false)).toBe('bg-zinc-700');
    });
});

describe('pillClass', () => {
    it('active pill — theme-aware accent bg + ring', () => {
        expect(pillClass('plain', { active: true }))
            .toBe('bg-blue-100 text-blue-700 ring-1 ring-blue-300');
        expect(pillClass('warm', { active: true }))
            .toBe('bg-amber-200/80 text-amber-900 ring-1 ring-amber-400');
        expect(pillClass('dark', { active: true })).toContain('ring-cyan-500/50');
        expect(pillClass('contrast', { active: true })).toBe('bg-black text-white ring-2 ring-black');
        expect(pillClass('paper', { active: true })).toContain('ring-stone-500');
        expect(pillClass('reactor', { active: true })).toContain('ring-amber-500/60');
    });

    it('inactive pill — theme-aware hover', () => {
        expect(pillClass('plain')).toBe('text-slate-600 hover:bg-white hover:shadow-sm');
        expect(pillClass('warm')).toBe('text-amber-800 hover:text-amber-900 hover:bg-amber-100');
        expect(pillClass('dark')).toContain('hover:bg-slate-800');
        expect(pillClass('contrast')).toContain('hover:text-white');
        expect(pillClass('paper')).toContain('hover:bg-stone-100');
        expect(pillClass('reactor')).toContain('hover:bg-zinc-900');
    });
});

describe('mutedTextClass', () => {
    it('theme-aware muted text for all 6 themes', () => {
        expect(mutedTextClass('plain')).toBe('text-slate-500');
        expect(mutedTextClass('warm')).toBe('text-amber-700');
        expect(mutedTextClass('dark')).toBe('text-cyan-300/70');
        expect(mutedTextClass('contrast')).toBe('text-black/70');
        expect(mutedTextClass('paper')).toBe('text-stone-600');
        expect(mutedTextClass('reactor')).toBe('text-amber-200/70');
    });
});

describe('borderClass', () => {
    it('theme-aware border color for all 6 themes', () => {
        expect(borderClass('plain')).toBe('border-slate-200');
        expect(borderClass('warm')).toBe('border-amber-200');
        expect(borderClass('dark')).toBe('border-cyan-500/30');
        expect(borderClass('contrast')).toBe('border-black border-2');
        expect(borderClass('paper')).toBe('border-stone-400');
        expect(borderClass('reactor')).toBe('border-amber-500/30');
    });
});

describe('focusRingClass', () => {
    it('returns rgba string matching tokens.focusRing for all 6 themes', () => {
        expect(focusRingClass('plain')).toContain('rgba(124, 58, 237');
        expect(focusRingClass('warm')).toContain('rgba(245, 158, 11');
        expect(focusRingClass('dark')).toContain('rgba(6, 182, 212');
        expect(focusRingClass('contrast')).toContain('rgba(29, 78, 216');
        expect(focusRingClass('paper')).toContain('rgba(124, 45, 18');
        expect(focusRingClass('reactor')).toContain('rgba(245, 158, 11');
    });
});

describe('accentColor', () => {
    it('theme-aware primary accent color hex for all 6 themes', () => {
        expect(accentColor('plain')).toBe('#7c3aed');
        expect(accentColor('warm')).toBe('#f59e0b');
        expect(accentColor('dark')).toBe('#06b6d4');
        expect(accentColor('contrast')).toBe('#000000');
        expect(accentColor('paper')).toBe('#1c1917');
        expect(accentColor('reactor')).toBe('#f59e0b');
    });
});
