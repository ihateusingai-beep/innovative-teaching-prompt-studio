// === Award Certificate tests ===
// v3.14.0 — verify 6 styles render + schema defaults + print CSS presence

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { AwardCertificate, AWARD_STYLES, AWARD_STYLE_META } from '../src/components/AwardCertificate.jsx';

describe('AWARD_STYLES registry (v3.14.0)', () => {
    it('exposes exactly 6 styles', () => {
        expect(AWARD_STYLES).toHaveLength(6);
    });

    it('style set: rainbow, medal, galaxy, art, dino, flower', () => {
        expect(AWARD_STYLES).toEqual(['rainbow', 'medal', 'galaxy', 'art', 'dino', 'flower']);
    });

    it('each style has meta with emoji + label + desc', () => {
        for (const s of AWARD_STYLES) {
            expect(AWARD_STYLE_META[s]).toBeDefined();
            expect(AWARD_STYLE_META[s].emoji).toBeTruthy();
            expect(AWARD_STYLE_META[s].label).toBeTruthy();
            expect(AWARD_STYLE_META[s].desc).toBeTruthy();
        }
    });
});

describe('AwardCertificate render (v3.14.0)', () => {
    const defaultProps = {
        studentName: '小明',
        date: '2026-07-01',
        subject: '二年級數學',
        score: '85',
        strengths: ['加法運算', '圖形辨識'],
        teacherName: '陳老師',
    };

    it('renders default rainbow style with proper data-style attribute', () => {
        const html = renderToStaticMarkup(<AwardCertificate {...defaultProps} />);
        expect(html).toContain('award-cert');
        expect(html).toContain('cert-rainbow');
        expect(html).toContain('data-style="rainbow"');
    });

    it('renders all 6 styles without crashing', () => {
        for (const s of AWARD_STYLES) {
            const html = renderToStaticMarkup(<AwardCertificate style={s} {...defaultProps} />);
            expect(html).toContain(`cert-${s}`);
            expect(html).toContain(`data-style="${s}"`);
        }
    });

    it('unknown style falls back to rainbow (defensive)', () => {
        const html = renderToStaticMarkup(<AwardCertificate style="INVALID" {...defaultProps} />);
        expect(html).toContain('cert-rainbow');
        expect(html).toContain('data-style="rainbow"');
    });

    it('shows studentName when provided', () => {
        const html = renderToStaticMarkup(<AwardCertificate {...defaultProps} />);
        expect(html).toContain('小明');
    });

    it('falls back to default name "同學" when studentName omitted', () => {
        const html = renderToStaticMarkup(<AwardCertificate />);
        expect(html).toContain('同學');
    });

    it('shows strengths (top 3 max)', () => {
        const html = renderToStaticMarkup(<AwardCertificate
            {...defaultProps}
            strengths={['A', 'B', 'C', 'D', 'E']}
        />);
        expect(html).toContain('A');
        expect(html).toContain('C');
        expect(html).not.toContain('>D<');
        expect(html).not.toContain('>E<');
    });

    it('shows teacherName as signature', () => {
        const html = renderToStaticMarkup(<AwardCertificate {...defaultProps} />);
        expect(html).toContain('陳老師');
    });

    it('falls back to "老師簽名" when teacherName omitted', () => {
        const html = renderToStaticMarkup(<AwardCertificate studentName="X" />);
        expect(html).toContain('老師簽名');
    });

    it('renders all required certificate sections', () => {
        const html = renderToStaticMarkup(<AwardCertificate {...defaultProps} />);
        expect(html).toContain('cert-header');
        expect(html).toContain('cert-body');
        expect(html).toContain('cert-footer');
        expect(html).toContain('奬 狀');
        expect(html).toContain('特此頒授予');
    });

    it('does NOT render teacher message when not provided', () => {
        const html = renderToStaticMarkup(<AwardCertificate {...defaultProps} />);
        expect(html).not.toContain('cert-teacher-message');
    });

    it('renders teacher message when provided', () => {
        const html = renderToStaticMarkup(<AwardCertificate
            {...defaultProps}
            teacherMessage="小明這個月很努力！"
            showTeacherMessage={true}
        />);
        // showTeacherMessage flag isn't used in component directly — teacherMessage truthy triggers render
        expect(html).toContain('cert-teacher-message');
        expect(html).toContain('小明這個月很努力');
    });

    it('renders improvement text when provided', () => {
        const html = renderToStaticMarkup(<AwardCertificate
            {...defaultProps}
            improvement="+12%"
        />);
        expect(html).toContain('+12%');
        expect(html).toContain('cert-improvement');
    });
});

describe('Schema defaults for awardCertificate (v3.14.0)', () => {
    it('default enabled: false (opt-in)', async () => {
        const { getInitialFormData } = await import('../src/data/schema.js');
        const initial = getInitialFormData();
        expect(initial.awardCertificate.enabled).toBe(false);
    });

    it('default style: rainbow', async () => {
        const { getInitialFormData } = await import('../src/data/schema.js');
        const initial = getInitialFormData();
        expect(initial.awardCertificate.style).toBe('rainbow');
    });

    it('all 6 content sub-toggles default to safe values', async () => {
        const { getInitialFormData } = await import('../src/data/schema.js');
        const initial = getInitialFormData();
        const ac = initial.awardCertificate;
        expect(ac.showStudentName).toBe(true);
        expect(ac.showDate).toBe(true);
        expect(ac.showSubject).toBe(true);
        expect(ac.showScore).toBe(true);
        expect(ac.showStrengths).toBe(true);
        expect(ac.showImprovement).toBe(false);  // off by default — improvement == 6 content
        expect(ac.showTeacherMessage).toBe(false);
        expect(ac.teacherMessage).toBe('');
    });
});
