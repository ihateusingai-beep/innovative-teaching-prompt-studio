// === Design System Variants tests ===
// v3.7.0 Path B.2 — theme-aware variant helpers

import { describe, it, expect } from 'vitest';
import {
    normalizeTheme,
    cardClass, inputClass, labelClass,
    buttonClass, toggleClass, pillClass,
    mutedTextClass, borderClass, focusRingClass, accentColor,
} from '../src/design-system/variants/themeClass.js';

describe('normalizeTheme', () => {
    it('returns "warm" for warm theme', () => {
        expect(normalizeTheme('warm')).toBe('warm');
    });

    it('returns "plain" for plain + cyber alias + invalid', () => {
        expect(normalizeTheme('plain')).toBe('plain');
        expect(normalizeTheme('cyber')).toBe('plain');  // alias retired
        expect(normalizeTheme('invalid')).toBe('plain');
        expect(normalizeTheme(undefined)).toBe('plain');
    });
});

describe('cardClass', () => {
    it('default variant — same glass-card across themes (warm adds border-amber-200)', () => {
        expect(cardClass('plain')).toBe('glass-card');
        expect(cardClass('warm')).toBe('glass-card');
        expect(cardClass('cyber')).toBe('glass-card');
    });

    it('flat variant (no hover lift)', () => {
        expect(cardClass('plain', 'flat')).toBe('glass-card-flat');
        expect(cardClass('warm', 'flat')).toBe('glass-card-flat border-amber-200');
    });

    it('elevated variant (deeper shadow)', () => {
        expect(cardClass('plain', 'elevated')).toBe('glass-card-elevated');
        expect(cardClass('warm', 'elevated')).toBe('glass-card-elevated border-amber-300');
    });
});

describe('inputClass', () => {
    it('returns glass-input across themes (warm tones via body override)', () => {
        expect(inputClass('plain')).toBe('glass-input');
        expect(inputClass('warm')).toBe('glass-input');
    });
});

describe('labelClass', () => {
    it('returns warm amber for warm theme', () => {
        expect(labelClass('warm')).toBe('text-amber-900');
    });

    it('returns slate for plain theme', () => {
        expect(labelClass('plain')).toBe('text-slate-700');
    });
});

describe('buttonClass', () => {
    it('primary button — theme-aware bg + hover', () => {
        expect(buttonClass('plain', 'primary')).toBe('bg-blue-600 text-white hover:bg-blue-700');
        expect(buttonClass('warm', 'primary')).toBe('bg-amber-500 text-white hover:bg-amber-600');
    });

    it('secondary button — theme-aware border + bg', () => {
        expect(buttonClass('plain', 'secondary')).toBe('bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100');
        expect(buttonClass('warm', 'secondary')).toBe('bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100');
    });

    it('ghost button — no background', () => {
        expect(buttonClass('plain', 'ghost')).toBe('text-slate-700 hover:bg-slate-50');
        expect(buttonClass('warm', 'ghost')).toBe('text-amber-700 hover:bg-amber-50');
    });

    it('disabled state — neutral gray regardless of theme', () => {
        expect(buttonClass('plain', 'primary', { disabled: true }))
            .toBe('bg-slate-200 text-slate-400 cursor-not-allowed');
        expect(buttonClass('warm', 'primary', { disabled: true }))
            .toBe('bg-slate-200 text-slate-400 cursor-not-allowed');
    });
});

describe('toggleClass', () => {
    it('on state — theme-aware on color', () => {
        expect(toggleClass('plain', true)).toBe('bg-blue-600');
        expect(toggleClass('warm', true)).toBe('bg-amber-500');
    });

    it('off state — same gray across themes', () => {
        expect(toggleClass('plain', false)).toBe('bg-slate-300');
        expect(toggleClass('warm', false)).toBe('bg-slate-300');
    });
});

describe('pillClass', () => {
    it('active pill — theme-aware accent bg + ring', () => {
        expect(pillClass('plain', { active: true }))
            .toBe('bg-blue-100 text-blue-700 ring-1 ring-blue-300');
        expect(pillClass('warm', { active: true }))
            .toBe('bg-amber-200/80 text-amber-900 ring-1 ring-amber-400');
    });

    it('inactive pill — theme-aware hover', () => {
        expect(pillClass('plain')).toBe('text-slate-600 hover:bg-white hover:shadow-sm');
        expect(pillClass('warm')).toBe('text-amber-800 hover:text-amber-900 hover:bg-amber-100');
    });
});

describe('mutedTextClass', () => {
    it('theme-aware muted text', () => {
        expect(mutedTextClass('plain')).toBe('text-slate-500');
        expect(mutedTextClass('warm')).toBe('text-amber-700');
    });
});

describe('borderClass', () => {
    it('theme-aware border color', () => {
        expect(borderClass('plain')).toBe('border-slate-200');
        expect(borderClass('warm')).toBe('border-amber-200');
    });
});

describe('focusRingClass', () => {
    it('returns rgba string matching tokens.focusRing', () => {
        expect(focusRingClass('plain')).toContain('rgba(124, 58, 237');
        expect(focusRingClass('warm')).toContain('rgba(245, 158, 11');
    });
});

describe('accentColor', () => {
    it('theme-aware primary accent color hex', () => {
        expect(accentColor('plain')).toBe('#7c3aed');
        expect(accentColor('warm')).toBe('#f59e0b');
    });
});
