// === Design System Primitives tests ===
// v3.8.0 Path B.3 — basic component primitive rendering + theme propagation
//
// Test strategy: 唔 mock DOM，直接用 @testing-library/react render primitives
// + 抽 className 內容 verify theme-aware class 注入。
// 為咗 keep 唔引新 dependency (jsdom + @testing-library)，用 React 嘅
// React.createElement + renderToString via react-dom/server。

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { GlassCard } from '../src/design-system/primitives/GlassCard.jsx';
import { GlassButton } from '../src/design-system/primitives/GlassButton.jsx';
import { GlassInput } from '../src/design-system/primitives/GlassInput.jsx';
import { Pill } from '../src/design-system/primitives/Pill.jsx';
import { ToggleSwitch } from '../src/design-system/primitives/ToggleSwitch.jsx';
import { SegmentedControl } from '../src/design-system/primitives/SegmentedControl.jsx';

describe('GlassCard', () => {
    it('renders plain theme with glass-card class', () => {
        const html = renderToStaticMarkup(<GlassCard theme="plain">content</GlassCard>);
        expect(html).toContain('glass-card');
        expect(html).toContain('content');
        expect(html).toContain('<div');  // no onClick → div, not button
    });

    it('renders warm theme with theme-aware border', () => {
        const html = renderToStaticMarkup(<GlassCard theme="warm">content</GlassCard>);
        expect(html).toContain('glass-card');
        // v3.12.0: cardClass now adds theme-specific border for ALL variants (default/flat/elevated)
        expect(html).toContain('border-amber-200');
    });

    it('renders dark/contrast/paper/reactor with theme-specific borders', () => {
        const dark = renderToStaticMarkup(<GlassCard theme="dark">x</GlassCard>);
        expect(dark).toContain('border-cyan-500/40');

        const contrast = renderToStaticMarkup(<GlassCard theme="contrast">x</GlassCard>);
        expect(contrast).toContain('border-black');

        const paper = renderToStaticMarkup(<GlassCard theme="paper">x</GlassCard>);
        expect(paper).toContain('border-stone-400');

        const reactor = renderToStaticMarkup(<GlassCard theme="reactor">x</GlassCard>);
        expect(reactor).toContain('border-amber-500/40');
    });

    it('renders elevated variant with glass-card-elevated class', () => {
        const html = renderToStaticMarkup(<GlassCard theme="plain" variant="elevated">x</GlassCard>);
        expect(html).toContain('glass-card-elevated');
    });

    it('renders flat variant with glass-card-flat class', () => {
        const html = renderToStaticMarkup(<GlassCard theme="warm" variant="flat">x</GlassCard>);
        expect(html).toContain('glass-card-flat');
        expect(html).toContain('border-amber-200');
    });

    it('with onClick renders <button> with interactive classes', () => {
        const html = renderToStaticMarkup(<GlassCard theme="plain" onClick={() => {}}>click</GlassCard>);
        expect(html).toContain('<button');
        expect(html).toContain('cursor-pointer');
        expect(html).toContain('hover:-translate-y-0.5');
    });
});

describe('GlassButton', () => {
    it('renders primary plain theme', () => {
        const html = renderToStaticMarkup(<GlassButton theme="plain" variant="primary">Click</GlassButton>);
        expect(html).toContain('bg-blue-600');
        expect(html).toContain('text-white');
        expect(html).toContain('Click');
    });

    it('renders primary warm theme (amber)', () => {
        const html = renderToStaticMarkup(<GlassButton theme="warm" variant="primary">Click</GlassButton>);
        expect(html).toContain('bg-amber-500');
        expect(html).toContain('hover:bg-amber-600');
    });

    it('renders secondary variant', () => {
        const html = renderToStaticMarkup(<GlassButton theme="plain" variant="secondary">X</GlassButton>);
        expect(html).toContain('bg-slate-50');
        expect(html).toContain('border border-slate-200');
    });

    it('renders ghost variant', () => {
        const html = renderToStaticMarkup(<GlassButton theme="warm" variant="ghost">X</GlassButton>);
        expect(html).toContain('text-amber-700');
        expect(html).toContain('hover:bg-amber-50');
    });

    it('disabled state with neutral gray', () => {
        const html = renderToStaticMarkup(<GlassButton theme="plain" disabled>X</GlassButton>);
        expect(html).toContain('disabled');
        expect(html).toContain('cursor-not-allowed');
        expect(html).toContain('opacity-60');
    });

    it('size variants (sm/md/lg)', () => {
        const sm = renderToStaticMarkup(<GlassButton size="sm">X</GlassButton>);
        const md = renderToStaticMarkup(<GlassButton size="md">X</GlassButton>);
        const lg = renderToStaticMarkup(<GlassButton size="lg">X</GlassButton>);
        expect(sm).toContain('px-3 py-1.5');
        expect(md).toContain('px-4 py-2');
        expect(lg).toContain('px-6 py-3');
    });
});

describe('GlassInput', () => {
    it('renders input element by default', () => {
        const html = renderToStaticMarkup(<GlassInput theme="plain" placeholder="name" />);
        expect(html).toContain('<input');
        expect(html).toContain('placeholder="name"');
        expect(html).toContain('glass-input');
    });

    it('renders textarea when as=textarea', () => {
        const html = renderToStaticMarkup(<GlassInput theme="plain" as="textarea" minHeight="200px" />);
        expect(html).toContain('<textarea');
        expect(html).toContain('min-h-[200px]');
        expect(html).toContain('resize-y');
    });

    it('renders select with options when as=select', () => {
        const html = renderToStaticMarkup(
            <GlassInput theme="plain" as="select" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />
        );
        expect(html).toContain('<select');
        expect(html).toContain('<option value="a"');
        expect(html).toContain('>A<');
        expect(html).toContain('>B<');
        expect(html).toContain('appearance-none');
    });
});

describe('Pill', () => {
    it('inactive pill — plain theme muted', () => {
        const html = renderToStaticMarkup(<Pill theme="plain">Basic</Pill>);
        expect(html).toContain('text-slate-600');
        expect(html).toContain('hover:bg-white');
        expect(html).toContain('aria-pressed="false"');
    });

    it('active pill — plain theme accent', () => {
        const html = renderToStaticMarkup(<Pill theme="plain" active>Active</Pill>);
        expect(html).toContain('bg-blue-100');
        expect(html).toContain('text-blue-700');
        expect(html).toContain('ring-1 ring-blue-300');
        expect(html).toContain('aria-pressed="true"');
    });

    it('active pill — warm theme amber', () => {
        const html = renderToStaticMarkup(<Pill theme="warm" active>Active</Pill>);
        expect(html).toContain('bg-amber-200/80');
        expect(html).toContain('text-amber-900');
        expect(html).toContain('ring-amber-400');
    });
});

describe('ToggleSwitch', () => {
    it('off state — gray track + knob left', () => {
        const html = renderToStaticMarkup(<ToggleSwitch theme="plain" on={false} onChange={() => {}} />);
        expect(html).toContain('bg-slate-300');
        expect(html).toContain('aria-checked="false"');
        expect(html).toContain('role="switch"');
        expect(html).toContain('translate-x-1');  // knob left position
    });

    it('on state — blue track + knob right', () => {
        const html = renderToStaticMarkup(<ToggleSwitch theme="plain" on={true} onChange={() => {}} />);
        expect(html).toContain('bg-blue-600');
        expect(html).toContain('aria-checked="true"');
        expect(html).toContain('translate-x-6');  // knob right position
    });

    it('on state — warm theme amber track', () => {
        const html = renderToStaticMarkup(<ToggleSwitch theme="warm" on={true} onChange={() => {}} />);
        expect(html).toContain('bg-amber-500');
    });
});

describe('SegmentedControl', () => {
    const options = [
        { value: 'cyber', label: '🪩 Cyber', desc: 'full' },
        { value: 'minimal', label: '⚪ Minimal', desc: 'simple' },
        { value: 'off', label: '🚫 關閉', desc: 'none' },
    ];

    it('renders all 3 options', () => {
        const html = renderToStaticMarkup(
            <SegmentedControl theme="plain" options={options} value="cyber" onChange={() => {}} />
        );
        expect(html).toContain('Cyber');
        expect(html).toContain('Minimal');
        expect(html).toContain('關閉');
    });

    it('active option has accent ring (plain → pink)', () => {
        const html = renderToStaticMarkup(
            <SegmentedControl theme="plain" options={options} value="cyber" onChange={() => {}} />
        );
        expect(html).toContain('border-pink-500');
        expect(html).toContain('bg-pink-50');
        expect(html).toContain('ring-pink-500');
    });

    it('active option uses amber theme colors', () => {
        const html = renderToStaticMarkup(
            <SegmentedControl theme="warm" options={options} value="cyber" onChange={() => {}} />
        );
        expect(html).toContain('border-amber-500');
        expect(html).toContain('bg-amber-50');
    });

    it('inactive options have muted styling', () => {
        const html = renderToStaticMarkup(
            <SegmentedControl theme="plain" options={options} value="cyber" onChange={() => {}} />
        );
        expect(html).toContain('border-slate-200');  // inactive options
        expect(html).toContain('text-slate-600');
    });

    it('uses grid with columns CSS', () => {
        const html = renderToStaticMarkup(
            <SegmentedControl theme="plain" options={options} value="x" columns={3} onChange={() => {}} />
        );
        expect(html).toContain('grid');
        // React renders minmax with spaces
        expect(html).toMatch(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    });
});
