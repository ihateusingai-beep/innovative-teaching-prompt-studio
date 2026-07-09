// === v3.16.0 F3: Quality Analyzer breakdown tests ===
// Tests:
//   - Panel renders collapse button + dim count
//   - Click button expands content (4 dim rows)
//   - Each dim shows score/max + progress bar + 一鍵改善 button (when sub-score < max)
//   - Suggestions list per dim with severity icon + message + improvement
//   - autoFixByDim dispatch:
//     * purpose empty → fills with template hint
//     * purpose filled → {changed: false}
//     * context empty → fills with subject+grade
//     * structure empty examples → fills 3 example slots
//     * accessibility empty senTypes/accessibility → fills defaults
//   - Legacy score shape (no groups) still renders via breakdown fallback

// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

import {
    QualityAnalyzerPanel,
    autoFixPurpose,
    autoFixContext,
    autoFixStructure,
    autoFixAccessibility,
    autoFixByDim,
} from '../src/components/QualityAnalyzerPanel.jsx';

afterEach(() => cleanup());

const baseF1Score = {
    total: 50,
    grade: 'fair',
    gradeLabel: '尚可',
    breakdown: {
        completeness: 20, clarity: 10, senFit: 5, rulesDetail: 8, examples: 7,
    },
    groups: {
        purpose:       { score: 10, max: 25, label: '核心用途', icon: '🎯' },
        context:       { score: 20, max: 30, label: '內容完整', icon: '📋' },
        structure:     { score: 15, max: 30, label: '結構', icon: '🏗️' },
        accessibility: { score: 5,  max: 15, label: '無障礙', icon: '♿' },
    },
    suggestions: [
        { key: 'clarity',      severity: 'info',    message: '核心用途太短', detail: '目前 5 字', improvement: '建議 30 字以上' },
        { key: 'completeness', severity: 'warning', message: '缺少必填欄位', detail: 'toolName / category', improvement: '填寫所有必填欄位' },
        { key: 'senFit',       severity: 'info',    message: 'SEN 適配設定偏少', detail: '建議勾選 SEN 類型', improvement: '勾選 ADHD / ASD 等' },
    ],
};

describe('v3.16.0 F3 — QualityAnalyzerPanel rendering', () => {
    it('renders collapse button + dim count when collapsed', () => {
        render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} />);
        expect(screen.getByText(/點解咁低/)).toBeTruthy();
        expect(screen.getByText(/個維度可改善/)).toBeTruthy();
    });

    it('does NOT render dim content when collapsed (default)', () => {
        render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} />);
        expect(screen.queryByText(/核心用途/)).toBeNull();
    });

    it('click expand button reveals 4 dim rows', () => {
        render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} />);
        fireEvent.click(screen.getByText(/點解咁低/));
        // All 4 dim labels visible
        expect(screen.getAllByText(/核心用途/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/內容完整/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/結構/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/無障礙/).length).toBeGreaterThanOrEqual(1);
    });

    it('defaultExpanded=true starts open', () => {
        render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} defaultExpanded={true} />);
        expect(screen.getAllByText(/核心用途/).length).toBeGreaterThanOrEqual(1);
    });

    it('shows sub-score "X/Y" for each dim', () => {
        render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} defaultExpanded={true} />);
        expect(screen.getByText('10/25')).toBeTruthy();
        expect(screen.getByText('20/30')).toBeTruthy();
        expect(screen.getByText('15/30')).toBeTruthy();
        expect(screen.getByText('5/15')).toBeTruthy();
    });

    it('renders suggestion message + improvement text per dim', () => {
        render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} defaultExpanded={true} />);
        expect(screen.getByText(/核心用途太短/)).toBeTruthy();
        expect(screen.getByText(/建議 30 字以上/)).toBeTruthy();
        expect(screen.getByText(/缺少必填欄位/)).toBeTruthy();
    });

    it('shows 一鍵改善 button for dim with sub-score < max', () => {
        const onAutoFix = vi.fn();
        const { container } = render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} defaultExpanded={true} onAutoFix={onAutoFix} />);
        // Buttons (not text mentions) — 4 dim rows each with 1 button
        const btns = container.querySelectorAll('button[title="套用此維度嘅一鍵改善建議"]');
        expect(btns.length).toBe(4);  // all 4 dims have sub-score < max
    });

    it('click 一鍵改善 triggers onAutoFix with dim key', () => {
        const onAutoFix = vi.fn();
        const { container } = render(<QualityAnalyzerPanel theme="plain" score={baseF1Score} defaultExpanded={true} onAutoFix={onAutoFix} />);
        const btns = container.querySelectorAll('button[title="套用此維度嘅一鍵改善建議"]');
        fireEvent.click(btns[0]);
        expect(onAutoFix).toHaveBeenCalledWith(expect.stringMatching(/^(accessibility|context|purpose|structure)$/));
    });

    it('shows ✓ 滿分 message when dim score == max AND no suggestions', () => {
        const perfectScore = {
            ...baseF1Score,
            suggestions: [],  // No suggestions so each dim shows 滿分 message
            groups: {
                purpose:       { score: 25, max: 25, label: '核心用途', icon: '🎯' },
                context:       { score: 30, max: 30, label: '內容完整', icon: '📋' },
                structure:     { score: 30, max: 30, label: '結構', icon: '🏗️' },
                accessibility: { score: 15, max: 15, label: '無障礙', icon: '♿' },
            },
        };
        const { container } = render(<QualityAnalyzerPanel theme="plain" score={perfectScore} defaultExpanded={true} />);
        expect(container.textContent.match(/滿分，無需改善/g)?.length).toBe(4);
    });

    it('renders legacy score shape (no groups) via breakdown fallback', () => {
        const legacyScore = {
            total: 30,
            grade: 'fair',
            gradeLabel: '尚可',
            breakdown: { completeness: 15, clarity: 5, senFit: 5, rulesDetail: 5, examples: 0 },
            suggestions: [],
        };
        render(<QualityAnalyzerPanel theme="plain" score={legacyScore} defaultExpanded={true} />);
        expect(screen.getAllByText(/核心用途/).length).toBeGreaterThanOrEqual(1);
    });

    it('returns null when score is null/undefined', () => {
        const { container } = render(<QualityAnalyzerPanel theme="plain" score={null} />);
        expect(container.firstChild).toBeNull();
    });
});

describe('v3.16.0 F3 — auto-fix helpers', () => {
    describe('autoFixPurpose', () => {
        it('fills empty purpose with template hint', () => {
            const r = autoFixPurpose({ purpose: '' });
            expect(r.changed).toBe(true);
            expect(r.patch.purpose).toMatch(/讓學生透過互動/);
        });

        it('returns changed:false when purpose filled', () => {
            expect(autoFixPurpose({ purpose: '我嘅目的' }).changed).toBe(false);
        });
    });

    describe('autoFixContext', () => {
        it('fills empty context using subject + grade', () => {
            const r = autoFixContext({ subjectCategory: '數學', grade: '小三', context: '' });
            expect(r.changed).toBe(true);
            expect(r.patch.context).toContain('數學');
            expect(r.patch.context).toContain('小三');
        });

        it('returns changed:false when context filled', () => {
            expect(autoFixContext({ context: '已填' }).changed).toBe(false);
        });
    });

    describe('autoFixStructure', () => {
        it('fills 3 example slots when examples empty', () => {
            const r = autoFixStructure({ examples: [] });
            expect(r.changed).toBe(true);
            expect(r.patch.examples.length).toBe(3);
            expect(r.patch.examples[0].level).toBe('初階');
            expect(r.patch.examples[2].level).toBe('高階');
        });
    });

    describe('autoFixAccessibility', () => {
        it('adds ADHD to empty senTypes', () => {
            const r = autoFixAccessibility({ senTypes: [], accessibility: [] });
            expect(r.changed).toBe(true);
            expect(r.patch.senTypes).toEqual(['ADHD']);
        });

        it('adds 3 default accessibility when < 3', () => {
            const r = autoFixAccessibility({ senTypes: ['ASD'], accessibility: ['鍵盤'] });
            expect(r.changed).toBe(true);
            expect(r.patch.accessibility.length).toBeGreaterThanOrEqual(3);
        });

        it('returns changed:false when both populated (senTypes + accessibility)', () => {
            const r = autoFixAccessibility({
                senTypes: ['ASD', 'ADHD'],
                accessibility: ['色彩對比', '鍵盤導航', 'TTS', '減少動畫'],
            });
            expect(r.changed).toBe(false);
        });
    });

    describe('autoFixByDim dispatch', () => {
        it('dispatches purpose to autoFixPurpose', () => {
            const r = autoFixByDim('purpose', { purpose: '' });
            expect(r.changed).toBe(true);
            expect(r.patch.purpose).toBeDefined();
        });

        it('dispatches context to autoFixContext', () => {
            const r = autoFixByDim('context', { context: '' });
            expect(r.changed).toBe(true);
        });

        it('dispatches structure to autoFixStructure', () => {
            const r = autoFixByDim('structure', { examples: [] });
            expect(r.changed).toBe(true);
        });

        it('dispatches accessibility to autoFixAccessibility', () => {
            const r = autoFixByDim('accessibility', { senTypes: [], accessibility: [] });
            expect(r.changed).toBe(true);
        });

        it('returns {changed:false} for unknown dim', () => {
            expect(autoFixByDim('unknown_dim', {}).changed).toBe(false);
        });
    });
});