// === v3.15.0 A2: QualityScore 4-dim groups + live recompute ===
// Tests:
//   - scorer returns 5-dim internal (completeness/clarity/senFit/rulesDetail/examples)
//   - scorer returns 4-dim external groups (purpose/context/structure/accessibility)
//   - groups.total = sum of all group scores (== internal total)
//   - each group has score + max + label + icon
//   - live recompute: same data → same score; modified data → different score
//   - empty data → 0/100, all groups 0
//   - suggestions handle both string[] (legacy) and object[] (new) shapes
//   - QualityScoreDetail renders 4 groups not 2 dead ones (specificity/pedagogy)

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

import promptScorer from '../src/data/scorer.js';
import { QualityScoreDetail } from '../src/components/widgets.jsx';

const baseForm = {
    purpose: '讓學生透過互動練習鞏固數學概念',
    toolName: '數學練習工具',
    category: '學科',
    subjectCategory: '數學',
    grade: '小三',
    senLevel: '輕度 (Mild)',
    senTypes: ['ADHD'],
    accessibility: ['鍵盤導航', 'TTS', '減少動畫'],
    rules: [{ text: '答對顯示 ✅' }, { text: '答錯顯示重試' }, { text: '完成顯示總分' }],
    examples: [
        { text: '簡單加法' },
        { text: '進位加法' },
        { text: '應用題' },
    ],
};

describe('v3.15.0 A2 — scorer 5-dim internal + 4-dim external groups', () => {
    it('returns 5-dim internal breakdown (completeness / clarity / senFit / rulesDetail / examples)', () => {
        const score = promptScorer(baseForm);
        expect(score.breakdown).toBeDefined();
        expect(score.breakdown.completeness).toBeGreaterThan(0);
        expect(score.breakdown.clarity).toBeGreaterThan(0);
        expect(score.breakdown.senFit).toBeGreaterThan(0);
        expect(score.breakdown.rulesDetail).toBeGreaterThan(0);
        expect(score.breakdown.examples).toBeGreaterThan(0);
    });

    it('returns 4-dim external groups (purpose / context / structure / accessibility)', () => {
        const score = promptScorer(baseForm);
        expect(score.groups).toBeDefined();
        expect(Object.keys(score.groups).sort()).toEqual(['accessibility', 'context', 'purpose', 'structure']);
    });

    it('each group has score + max + label + icon', () => {
        const score = promptScorer(baseForm);
        for (const key of Object.keys(score.groups)) {
            const g = score.groups[key];
            expect(typeof g.score).toBe('number');
            expect(typeof g.max).toBe('number');
            expect(g.max).toBeGreaterThan(0);
            expect(typeof g.label).toBe('string');
            expect(typeof g.icon).toBe('string');
        }
    });

    it('group score mapping: purpose ← clarity, context ← completeness, structure ← rulesDetail + examples, accessibility ← senFit', () => {
        const score = promptScorer(baseForm);
        expect(score.groups.purpose.score).toBe(score.breakdown.clarity);
        expect(score.groups.context.score).toBe(score.breakdown.completeness);
        expect(score.groups.structure.score).toBe(score.breakdown.rulesDetail + score.breakdown.examples);
        expect(score.groups.accessibility.score).toBe(score.breakdown.senFit);
    });

    it('group max sum = 100 (purpose 25 + context 30 + structure 30 + accessibility 15)', () => {
        const score = promptScorer(baseForm);
        const totalMax = Object.values(score.groups).reduce((sum, g) => sum + g.max, 0);
        expect(totalMax).toBe(100);
    });

    it('group total scores sum = total (no double counting)', () => {
        const score = promptScorer(baseForm);
        const groupSum = Object.values(score.groups).reduce((sum, g) => sum + g.score, 0);
        expect(groupSum).toBe(score.total);
    });

    it('grade maps to label correctly (excellent/good/fair/poor)', () => {
        const full = promptScorer(baseForm);
        expect(full.grade).toMatch(/excellent|good|fair|poor/);
        expect(['優秀', '良好', '尚可', '需改善']).toContain(full.gradeLabel);

        const empty = promptScorer({});
        expect(empty.grade).toBe('poor');
        expect(empty.gradeLabel).toBe('需改善');
    });

    it('live recompute: same data → identical score (deterministic)', () => {
        const a = promptScorer(baseForm);
        const b = promptScorer(baseForm);
        expect(a).toEqual(b);
    });

    it('live recompute: modified data → different score', () => {
        const before = promptScorer(baseForm);
        const after = promptScorer({ ...baseForm, purpose: '' }); // drop purpose → clarity → 0
        expect(after.total).toBeLessThan(before.total);
        expect(after.groups.purpose.score).toBe(0);
    });

    it('empty formData → 0 score, all groups 0', () => {
        const score = promptScorer({});
        expect(score.total).toBe(0);
        for (const key of Object.keys(score.groups)) {
            expect(score.groups[key].score).toBe(0);
        }
    });
});

describe('v3.15.0 A2 — QualityScoreDetail modal renders 4 groups (not 2 dead cats)', () => {
    it('renders 4 group rows for purpose / context / structure / accessibility', () => {
        const score = promptScorer(baseForm);
        // Empty suggestions to avoid label-collision (核心用途 appears in group + clarity suggestion)
        const scoreNoSuggestions = { ...score, suggestions: [] };
        const { getByText } = render(
            <QualityScoreDetail theme="plain" score={scoreNoSuggestions} onClose={() => {}} />
        );
        expect(getByText(/🎯 核心用途/)).toBeTruthy();
        expect(getByText(/📋 內容完整/)).toBeTruthy();
        expect(getByText(/🏗️ 結構/)).toBeTruthy();
        expect(getByText(/♿ 無障礙/)).toBeTruthy();
    });

    it('does NOT render the old dead "具體度 / 教學度" categories', () => {
        const score = promptScorer(baseForm);
        const { queryByText } = render(
            <QualityScoreDetail theme="plain" score={score} onClose={() => {}} />
        );
        expect(queryByText(/具體度/)).toBeNull();
        expect(queryByText(/教學度/)).toBeNull();
    });

    it('shows group scores in "X/Y" format (e.g. 25/25, 30/30)', () => {
        const score = promptScorer(baseForm);
        const { container } = render(
            <QualityScoreDetail theme="plain" score={score} onClose={() => {}} />
        );
        // Should contain "score/max" formatted strings
        expect(container.textContent).toMatch(/\d+\/\d+/);
    });

    it('handles legacy score shape (no `groups` key) — falls back to breakdown mapping', () => {
        const legacyScore = {
            total: 60,
            grade: 'good',
            gradeLabel: '良好',
            breakdown: {
                completeness: 30,
                clarity: 15,
                senFit: 5,
                rulesDetail: 8,
                examples: 2,
            },
            suggestions: ['填寫核心用途'], // string array (legacy)
        };
        const { getAllByText } = render(
            <QualityScoreDetail theme="plain" score={legacyScore} onClose={() => {}} />
        );
        // Should still render 4 groups + suggestion
        expect(getAllByText(/核心用途/).length).toBeGreaterThanOrEqual(1);
    });

    it('handles new object[] suggestion shape', () => {
        const newScore = {
            total: 50,
            grade: 'fair',
            gradeLabel: '尚可',
            breakdown: { completeness: 20, clarity: 10, senFit: 5, rulesDetail: 8, examples: 7 },
            groups: {
                purpose: { score: 10, max: 25, label: '核心用途', icon: '🎯' },
                context: { score: 20, max: 30, label: '內容完整', icon: '📋' },
                structure: { score: 15, max: 30, label: '結構', icon: '🏗️' },
                accessibility: { score: 5, max: 15, label: '無障礙', icon: '♿' },
            },
            suggestions: [
                { key: 'clarity', severity: 'info', message: '目前 5 字偏短', detail: '建議 30 字以上', improvement: '用具體動詞' },
            ],
        };
        const { getByText } = render(
            <QualityScoreDetail theme="plain" score={newScore} onClose={() => {}} />
        );
        expect(getByText(/目前 5 字偏短/)).toBeTruthy();
    });
});
