// === Design System Tokens tests ===
// v3.6.0 Path B.1 — verify tokens module exports match CSS :root variables
// 唔郁 App.jsx behavior，只係 structure / consistency test

import { describe, it, expect } from 'vitest';
import {
    spacing, spacingTokens, space,
    radius, radiusTokens, radiusOf,
    elevation, shadow, elevationOf,
    easing, transition, transitionCss,
    accent, warmAccent, darkAccent, contrastAccent, paperAccent, reactorAccent,
    focusRing, background, themePrimary, getThemePrimary,
    gradient, gradientFor,
    themeMeta, themeOrder,
    fontFamily, fontSize, fontWeight, lineHeight, letterSpacing,
} from '../src/design-system/tokens/index.js';

describe('spacing tokens', () => {
    it('exports 8 spacing keys (1..16 with gaps at 5/7/9/10/11/13/14/15)', () => {
        expect(Object.keys(spacing)).toEqual(['1', '2', '3', '4', '6', '8', '12', '16']);
    });

    it('spacing values follow 8px base with 4px floor', () => {
        expect(spacing['1']).toBe(4);   // 4px floor
        expect(spacing['2']).toBe(8);
        expect(spacing['4']).toBe(16);
        expect(spacing['8']).toBe(32);
        expect(spacing['16']).toBe(64);
    });

    it('spacingTokens 列出 key names (for runtime iteration)', () => {
        expect(spacingTokens).toEqual(['1', '2', '3', '4', '6', '8', '12', '16']);
    });

    it('space(key) helper returns value or default (16px)', () => {
        expect(space('4')).toBe(16);
        expect(space('8')).toBe(32);
        expect(space('invalid')).toBe(16);  // default to spacing[4] = 16px
    });
});

describe('radius tokens', () => {
    it('exports 6 radius keys (sm/md/lg/xl/2xl/full)', () => {
        expect(Object.keys(radius)).toEqual(['sm', 'md', 'lg', 'xl', '2xl', 'full']);
    });

    it('radius values follow progressive scale', () => {
        expect(radius.sm).toBe(6);
        expect(radius.md).toBe(10);
        expect(radius.lg).toBe(14);
        expect(radius.xl).toBe(20);
        expect(radius['2xl']).toBe(28);
        expect(radius.full).toBe(9999);
    });

    it('radiusOf(key) helper returns value or default md', () => {
        expect(radiusOf('lg')).toBe(14);
        expect(radiusOf('invalid')).toBe(10);
    });
});

describe('elevation tokens', () => {
    it('exports 4 elevation levels (1..4)', () => {
        expect(Object.keys(elevation)).toEqual(['1', '2', '3', '4']);
    });

    it('elevation values are CSS box-shadow strings', () => {
        for (const key of Object.keys(elevation)) {
            expect(elevation[key]).toMatch(/^0 \d+px .* rgba\(.*\)$/);
        }
    });

    it('shadow aliases map to elevation (legacy compat)', () => {
        expect(shadow.sm).toBe(elevation['1']);
        expect(shadow.md).toBe(elevation['2']);
        expect(shadow.lg).toBe(elevation['3']);
        expect(shadow.xl).toBe(elevation['4']);
    });

    it('elevationOf(level) helper', () => {
        expect(elevationOf('2')).toBe(elevation['2']);
        expect(elevationOf('invalid')).toBe(elevation['1']);
    });
});

describe('motion tokens', () => {
    it('exports 4 easing curves', () => {
        expect(Object.keys(easing)).toEqual(['out', 'inOut', 'spring']);
        expect(easing.out).toContain('cubic-bezier');
        expect(easing.spring).toContain('cubic-bezier');
    });

    it('exports 4 framer-motion transition variants', () => {
        expect(Object.keys(transition)).toEqual(['fast', 'base', 'slow', 'spring']);
        // framer-motion 用 array ease format
        for (const key of Object.keys(transition)) {
            expect(Array.isArray(transition[key].ease)).toBe(true);
            expect(transition[key].ease.length).toBe(4);
            expect(typeof transition[key].duration).toBe('number');
        }
    });

    it('exports CSS-friendly transition strings', () => {
        for (const key of Object.keys(transitionCss)) {
            expect(transitionCss[key]).toMatch(/^\d+ms /);
        }
    });
});

describe('color tokens', () => {
    it('plain theme accent palette (violet/cyan/pink)', () => {
        expect(accent.primary).toBe('#7c3aed');
        expect(accent.secondary).toBe('#06b6d4');
        expect(accent.tertiary).toBe('#ec4899');
    });

    it('warm theme accent palette (amber/orange)', () => {
        expect(warmAccent.primary).toBe('#f59e0b');
        expect(warmAccent.secondary).toBe('#fb923c');
    });

    it('focus ring colors are rgba strings', () => {
        expect(focusRing.plain).toContain('rgba(124, 58, 237');
        expect(focusRing.warm).toContain('rgba(245, 158, 11');
    });

    it('theme → primary mapping covers plain + warm + cyber alias', () => {
        expect(themePrimary.plain).toBe(accent.primary);
        expect(themePrimary.warm).toBe(warmAccent.primary);
        expect(themePrimary.cyber).toBe(accent.primary);  // alias retired
    });

    it('getThemePrimary helper handles all 3 themes + invalid', () => {
        expect(getThemePrimary('plain')).toBe(accent.primary);
        expect(getThemePrimary('warm')).toBe(warmAccent.primary);
        expect(getThemePrimary('cyber')).toBe(accent.primary);
        expect(getThemePrimary('invalid')).toBe(accent.primary);  // default
    });
});

describe('gradient tokens', () => {
    it('exports 9 gradient keys (plain alias + 5 themes + primary/background/soft)', () => {
        expect(Object.keys(gradient)).toContain('primary');
        expect(Object.keys(gradient)).toContain('background');
        expect(Object.keys(gradient)).toContain('soft');
        expect(Object.keys(gradient)).toContain('warm');
        expect(Object.keys(gradient)).toContain('dark');
        expect(Object.keys(gradient)).toContain('contrast');
        expect(Object.keys(gradient)).toContain('paper');
        expect(Object.keys(gradient)).toContain('reactor');
        expect(Object.keys(gradient)).toContain('plain');  // alias for primary
        expect(Object.keys(gradient).length).toBe(9);
    });

    it('all gradients are linear-gradient(...) strings', () => {
        for (const key of Object.keys(gradient)) {
            expect(gradient[key]).toMatch(/^linear-gradient\(/);
        }
    });

    it('warm gradient uses amber/orange', () => {
        expect(gradient.warm).toContain('#f59e0b');
        expect(gradient.warm).toContain('#fb923c');
    });

    it('dark gradient uses cyan/purple (neon)', () => {
        expect(gradient.dark).toContain('#06b6d4');
        expect(gradient.dark).toContain('#a855f7');
    });

    it('contrast gradient is pure black (no gradient — accessibility)', () => {
        expect(gradient.contrast).toContain('#000000');
    });

    it('paper gradient uses cream/stone palette', () => {
        expect(gradient.paper).toContain('#fefce8');
        expect(gradient.paper).toContain('#fef3c7');
    });

    it('reactor gradient uses amber/sky/red (Iron Man HUD)', () => {
        expect(gradient.reactor).toContain('#f59e0b');
        expect(gradient.reactor).toContain('#0ea5e9');
        expect(gradient.reactor).toContain('#ef4444');
    });

    it('gradientFor(theme) returns theme-specific gradient for primary/background/soft', () => {
        expect(gradientFor('warm', 'primary')).toBe(gradient.warm);
        expect(gradientFor('warm', 'background')).toBe(gradient.warm);
        expect(gradientFor('warm', 'soft')).toBe(gradient.warm);
        expect(gradientFor('plain', 'primary')).toBe(gradient.primary);
        expect(gradientFor('plain', 'background')).toBe(gradient.background);
        expect(gradientFor('dark', 'primary')).toBe(gradient.dark);
        expect(gradientFor('contrast', 'primary')).toBe(gradient.contrast);
        expect(gradientFor('paper', 'primary')).toBe(gradient.paper);
        expect(gradientFor('reactor', 'primary')).toBe(gradient.reactor);
    });

    it('gradientFor falls back to plain for invalid theme', () => {
        expect(gradientFor('invalid', 'primary')).toBe(gradient.primary);
    });

    it('gradientFor handles invalid name (default to primary)', () => {
        expect(gradientFor('plain', 'invalid')).toBe(gradient.primary);
    });
});

describe('theme metadata', () => {
    it('themeMeta covers all 6 themes with label/emoji/description', () => {
        expect(Object.keys(themeMeta).sort()).toEqual(['contrast', 'dark', 'paper', 'plain', 'reactor', 'warm']);
        for (const t of themeOrder) {
            expect(themeMeta[t].label).toBeTruthy();
            expect(themeMeta[t].emoji).toBeTruthy();
            expect(themeMeta[t].description).toBeTruthy();
        }
    });

    it('themeOrder lists all 6 themes in display order', () => {
        expect(themeOrder).toEqual(['plain', 'warm', 'dark', 'contrast', 'paper', 'reactor']);
    });

    it('themePrimary covers all 6 themes', () => {
        expect(themePrimary.plain).toBe(accent.primary);
        expect(themePrimary.warm).toBe(warmAccent.primary);
        expect(themePrimary.dark).toBe(darkAccent.primary);
        expect(themePrimary.contrast).toBe(contrastAccent.primary);
        expect(themePrimary.paper).toBe(paperAccent.primary);
        expect(themePrimary.reactor).toBe(reactorAccent.primary);
    });

    it('accent palette: 4 new themes', () => {
        expect(darkAccent.primary).toBe('#06b6d4');
        expect(contrastAccent.primary).toBe('#000000');
        expect(paperAccent.primary).toBe('#1c1917');
        expect(reactorAccent.primary).toBe('#f59e0b');
    });
});

describe('typography tokens', () => {
    it('fontFamily has 3 stacks (sans/mono/display)', () => {
        expect(Object.keys(fontFamily)).toEqual(['sans', 'mono', 'display']);
        expect(fontFamily.sans).toContain('Inter');
        expect(fontFamily.sans).toContain('Noto Sans TC');
    });

    it('fontSize scale (xs..5xl in rem)', () => {
        expect(fontSize.xs).toBe('0.75rem');
        expect(fontSize.base).toBe('1rem');
        expect(fontSize['5xl']).toBe('3rem');
    });

    it('fontWeight covers 400-900', () => {
        expect(fontWeight.normal).toBe(400);
        expect(fontWeight.bold).toBe(700);
        expect(fontWeight.black).toBe(900);
    });

    it('lineHeight + letterSpacing helpers', () => {
        expect(lineHeight.tight).toBe(1.1);
        expect(letterSpacing.tight).toBe('-0.01em');
    });
});

describe('barrel export (tokens/index.js)', () => {
    it('exports all 7 token modules (re-export individual symbols, not aggregate)', async () => {
        const tokens = await import('../src/design-system/tokens/index.js');
        // 個別 module 嘅 named exports 透過 barrel re-export
        expect(tokens.spacing).toBeDefined();
        expect(tokens.radius).toBeDefined();
        expect(tokens.elevation).toBeDefined();
        expect(tokens.shadow).toBeDefined();
        expect(tokens.easing).toBeDefined();
        expect(tokens.transition).toBeDefined();
        expect(tokens.transitionCss).toBeDefined();
        expect(tokens.accent).toBeDefined();
        expect(tokens.warmAccent).toBeDefined();
        expect(tokens.focusRing).toBeDefined();
        expect(tokens.background).toBeDefined();
        expect(tokens.themePrimary).toBeDefined();
        expect(tokens.getThemePrimary).toBeDefined();
        expect(tokens.gradient).toBeDefined();
        expect(tokens.gradientFor).toBeDefined();
        expect(tokens.fontFamily).toBeDefined();
        expect(tokens.fontSize).toBeDefined();
        expect(tokens.fontWeight).toBeDefined();
        expect(tokens.lineHeight).toBeDefined();
        expect(tokens.letterSpacing).toBeDefined();
    });

    it('design-system/index.js re-exports tokens', async () => {
        const ds = await import('../src/design-system/index.js');
        expect(ds.spacing).toBeDefined();
        expect(ds.accent).toBeDefined();
        expect(ds.gradient).toBeDefined();
        expect(ds.fontFamily).toBeDefined();
    });
});
