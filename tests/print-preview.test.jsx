// === v3.15.0 V2: Cert print CSS hardening + print preview toggle ===
// Tests:
//   - @page rule exists in CSS (A4 landscape, margin 0)
//   - @-webkit-document @page wrapper exists (Safari/Chrome prefix)
//   - .print-preview-frame class exists with dashed border treatment
//   - AwardCertificateModal: shows print preview toggle button
//   - Toggle button: click adds .print-preview-frame class to cert container
//   - Toggle: button label changes between '預覽列印' and '預覽中'
//   - aria-pressed reflects state

// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

afterEach(() => cleanup());

// Mock the AwardCertificate component to avoid pulling in framer-motion in tests
// (just need to confirm the modal's preview toggle behavior)
vi.mock('../src/components/AwardCertificate.jsx', () => ({
    AwardCertificate: (props) => <div data-testid="mock-cert" data-style={props.style}>MOCK CERT</div>,
    AWARD_STYLES: ['rainbow', 'medal', 'galaxy', 'art', 'dino', 'flower'],
    AWARD_STYLE_META: {
        rainbow: { label: '彩虹', emoji: '🌈', desc: '彩虹獎' },
        medal: { label: '獎牌', emoji: '🏅', desc: '獎牌獎' },
        galaxy: { label: '銀河', emoji: '🌌', desc: '銀河獎' },
        art: { label: '藝術', emoji: '🎨', desc: '藝術獎' },
        dino: { label: '恐龍', emoji: '🦕', desc: '恐龍獎' },
        flower: { label: '花', emoji: '🌸', desc: '花獎' },
    },
}));

import { AwardCertificateModal } from '../src/components/AwardCertificateModal.jsx';

describe('v3.15.0 V2 — print CSS hardening', () => {
    let css;
    beforeAll(() => {
        css = fs.readFileSync(
            path.resolve(process.cwd(), 'src/styles/index.css'),
            'utf8'
        );
    });

    it('@page rule declares A4 landscape with 0 margin', () => {
        expect(css).toMatch(/@page\s*\{[^}]*size:\s*A4\s+landscape/s);
        expect(css).toMatch(/@page\s*\{[^}]*margin:\s*0/s);
    });

    it('contains @-webkit-document @page prefix for Safari/Chrome', () => {
        expect(css).toMatch(/@-webkit-document\s+@page\s*\{[^}]*size:\s*A4\s+landscape/s);
    });

    it('contains .print-preview-frame class with dashed border', () => {
        expect(css).toMatch(/\.print-preview-frame\s*\{/);
        expect(css).toMatch(/print-preview-frame[\s\S]*?border:\s*2px\s+dashed/s);
    });
});

describe('v3.15.0 V2 — AwardCertificateModal print preview toggle', () => {
    it('renders preview toggle button when open', () => {
        render(<AwardCertificateModal open={true} onClose={() => {}} style="rainbow" />);
        expect(screen.getByText(/預覽列印/)).toBeTruthy();
    });

    it('clicking preview toggle changes button label and adds frame class', () => {
        const { container } = render(
            <AwardCertificateModal open={true} onClose={() => {}} style="rainbow" />
        );
        const btn = screen.getByText(/預覽列印/);
        fireEvent.click(btn);
        // Button label changes
        expect(screen.getByText(/預覽中/)).toBeTruthy();
        expect(screen.queryByText(/^👁️ 預覽列印$/)).toBeNull();
        // Frame class added to cert container
        const frame = container.querySelector('.print-preview-frame');
        expect(frame).toBeTruthy();
    });

    it('aria-pressed reflects preview state', () => {
        render(<AwardCertificateModal open={true} onClose={() => {}} style="rainbow" />);
        const btn = screen.getByText(/預覽列印/).closest('button');
        expect(btn.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(btn);
        const btn2 = screen.getByText(/預覽中/).closest('button');
        expect(btn2.getAttribute('aria-pressed')).toBe('true');
    });

    it('clicking preview toggle twice removes frame class', () => {
        const { container } = render(
            <AwardCertificateModal open={true} onClose={() => {}} style="rainbow" />
        );
        const btn = screen.getByText(/預覽列印/);
        fireEvent.click(btn);
        fireEvent.click(btn);
        // After 2 clicks, back to original state
        expect(container.querySelector('.print-preview-frame')).toBeNull();
        expect(screen.getByText(/預覽列印/)).toBeTruthy();
    });

    it('returns null when not open (no buttons rendered)', () => {
        const { container } = render(
            <AwardCertificateModal open={false} onClose={() => {}} style="rainbow" />
        );
        expect(container.firstChild).toBeNull();
    });
});
