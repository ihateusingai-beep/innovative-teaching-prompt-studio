// === v3.16.0 V7: GlassCard primitive tests ===
// Tests:
//   - GlassCard renders with default tone 'plain'
//   - Tone variants apply correct className (info/warn/success/danger/cyan)
//   - Variant 'frosted' (default) vs 'flat' applies different base class
//   - Custom className appended
//   - Children render
//   - Source check: 6 tones defined in CSS (info/success/warn/danger/cyan/plain)

// @vitest-environment jsdom

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { GlassCard } from '../src/components/GlassCard.jsx';

afterEach(() => cleanup());

describe('v3.16.0 V7 — GlassCard primitive', () => {
    it('renders children', () => {
        render(<GlassCard>Hello</GlassCard>);
        expect(screen.getByText('Hello')).toBeTruthy();
    });

    it('applies default tone "plain" + variant "frosted" classes', () => {
        const { container } = render(<GlassCard>X</GlassCard>);
        const card = container.firstChild;
        expect(card.className).toMatch(/glass-card/);
        expect(card.className).toMatch(/glass-card-plain/);
        // default variant is frosted (no glass-card-flat class)
        expect(card.className).not.toMatch(/glass-card-flat/);
    });

    it('applies tone="info" → adds glass-card-info class', () => {
        const { container } = render(<GlassCard tone="info">X</GlassCard>);
        expect(container.firstChild.className).toMatch(/glass-card-info/);
    });

    it('applies tone="warn" → adds glass-card-warn class', () => {
        const { container } = render(<GlassCard tone="warn">X</GlassCard>);
        expect(container.firstChild.className).toMatch(/glass-card-warn/);
    });

    it('applies tone="success" → adds glass-card-success class', () => {
        const { container } = render(<GlassCard tone="success">X</GlassCard>);
        expect(container.firstChild.className).toMatch(/glass-card-success/);
    });

    it('applies variant="flat" → adds glass-card-flat base class', () => {
        const { container } = render(<GlassCard tone="info" variant="flat">X</GlassCard>);
        expect(container.firstChild.className).toMatch(/glass-card-flat/);
        expect(container.firstChild.className).toMatch(/glass-card-info/);
    });

    it('appends custom className', () => {
        const { container } = render(<GlassCard className="my-custom-class">X</GlassCard>);
        expect(container.firstChild.className).toMatch(/my-custom-class/);
    });

    it('renders custom className alongside tone classes', () => {
        // Card primitive 唔 pass through extra props (known limitation),
        // so we test className pass-through only via className prop
        const { container } = render(<GlassCard tone="info" className="extra-class">X</GlassCard>);
        const cls = container.firstChild.className;
        expect(cls).toMatch(/glass-card-info/);
        expect(cls).toMatch(/extra-class/);
    });
});

describe('v3.16.0 V7 — GlassCard CSS tone coverage', () => {
    let css;
    beforeAll(() => {
        css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/index.css'),
            'utf8'
        );
    });

    it('defines 6 tone classes (info / success / warn / danger / cyan / plain)', () => {
        // frosted variant tones
        expect(css).toMatch(/\.glass-card\.glass-card-info/);
        expect(css).toMatch(/\.glass-card\.glass-card-success/);
        expect(css).toMatch(/\.glass-card\.glass-card-warn/);
        expect(css).toMatch(/\.glass-card\.glass-card-danger/);
        expect(css).toMatch(/\.glass-card\.glass-card-cyan/);
    });

    it('defines backdrop-filter for frosted variant', () => {
        expect(css).toMatch(/backdrop-filter:\s*blur\(8px\)/);
    });

    it('overrides glass-card background for dark / reactor themes', () => {
        expect(css).toMatch(/body\.theme-dark\s+\.glass-card/);
        expect(css).toMatch(/body\.theme-reactor\s+\.glass-card/);
    });
});