// v3.19.0 — answer mechanisms + retro game styles
import { describe, it, expect } from 'vitest';
import {
    answerMechanismOptions,
    GAME_STYLE_GROUPS,
    gameStyles,
    composeMechanismHints,
    composeGameStyleSpec,
} from '../src/data/option-tables.js';
import { generateDesignPrompt } from '../src/prompts/generators.jsx';
import { getInitialFormData } from '../src/data/schema.js';
import { BUILTIN_TEMPLATES } from '../src/data/templates.js';

describe('v3.19.0 answer mechanisms', () => {
    it('includes 2選1 and 是非題', () => {
        const values = answerMechanismOptions.map((o) => o.value);
        expect(values).toContain('2選1答案');
        expect(values).toContain('是非題 (True/False)');
        expect(values[0]).toBe('2選1答案');
    });

    it('composeMechanismHints injects specs for used mechanisms', () => {
        const text = composeMechanismHints([
            { mechanism: '2選1答案' },
            { mechanism: '是非題 (True/False)' },
        ]);
        expect(text).toContain('答題機制實作規格');
        expect(text).toContain('兩個超大選項');
        expect(text).toContain('✓ 是');
    });
});

describe('v3.19.0 retro game styles', () => {
    it('has retro group with 6 styles', () => {
        const retro = GAME_STYLE_GROUPS.find((g) => g.id === 'retro');
        expect(retro).toBeTruthy();
        expect(retro.styles).toHaveLength(6);
        expect(retro.styles).toContain('太空侵略者 (Space Invaders)');
        expect(gameStyles).toContain('復古街機跑酷 (Pixel Runner)');
    });

    it('composeGameStyleSpec only for retro', () => {
        expect(composeGameStyleSpec('扭蛋機 (Gachapon)')).toBe('');
        const s = composeGameStyleSpec('太空侵略者 (Space Invaders)');
        expect(s).toContain('Retro 遊戲實作');
        expect(s).toContain('pixel');
        expect(s).toContain('Retro 街機共通規格');
    });
});

describe('v3.19.0 generator + defaults + template', () => {
    it('design prompt includes mechanism + retro blocks', () => {
        const fd = getInitialFormData();
        fd.category = '教學遊戲';
        fd.gameStyle = '小精靈 / 食豆 (Pac-Man)';
        fd.purpose = 'test';
        fd.examples = [
            { text: '2+1=?', level: '初階', count: 5, mechanism: '2選1答案' },
            { text: '火是熱的？', level: '中階', count: 5, mechanism: '是非題 (True/False)' },
        ];
        const p = generateDesignPrompt(fd);
        expect(p).toContain('2選1答案');
        expect(p).toContain('是非題 (True/False)');
        expect(p).toContain('答題機制實作規格');
        expect(p).toContain('Pac-Man');
        expect(p).toContain('Retro 遊戲實作');
    });

    it('default examples start with 2選1 / 是非', () => {
        const fd = getInitialFormData();
        expect(fd.examples[0].mechanism).toBe('2選1答案');
        expect(fd.examples[1].mechanism).toBe('是非題 (True/False)');
    });

    it('builtin invaders template exists', () => {
        const t = BUILTIN_TEMPLATES.find((x) => x.id === 'life-tf-invaders-mid');
        expect(t).toBeTruthy();
        expect(t.formData.gameStyle).toBe('太空侵略者 (Space Invaders)');
        expect(t.formData.examples.some((e) => e.mechanism === '2選1答案')).toBe(true);
        expect(t.formData.examples.some((e) => e.mechanism.includes('是非'))).toBe(true);
    });
});
