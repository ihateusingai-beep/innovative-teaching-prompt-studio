// === Schema migration round-trip tests ===
// W9-10 Quick Win Q4: 防止 silent breakage 當 SCHEMA_VERSION bump
//
// 覆蓋 cases:
//   1. legacy v1 (isGemini → useGeminiStyle) rename
//   2. v1 gameStyle array → v2 string transform
//   3. type mismatch fallback (e.g. purpose 傳 number)
//   4. required field missing → throws Error with user-friendly message
//   5. unknown fields 收集去 __legacy_extra
//   6. round-trip: 完整 default → export → re-import = 相同 shape
//
// 點解唔 import 全個 App：純 function test, 唔需要 jsdom / React.

import { describe, it, expect } from 'vitest';
import {
    SCHEMA_VERSION,
    migrateFormData,
    matchesType,
    getInitialFormData,
} from '../src/data/schema.js';

describe('schema.js — constants', () => {
    it('SCHEMA_VERSION 必須係當前 3 (v3.14.0 — awardCertificate + assessment)', () => {
        expect(SCHEMA_VERSION).toBe(3);
    });

    it('getInitialFormData() 必須有所有 required fields', () => {
        const initial = getInitialFormData();
        expect(initial).toHaveProperty('teacherName');
        expect(initial).toHaveProperty('toolName');
        expect(initial).toHaveProperty('purpose'); // required
        expect(initial).toHaveProperty('senTypes');
        expect(initial).toHaveProperty('accessibility');
        expect(initial).toHaveProperty('rules');
        expect(Array.isArray(initial.rules)).toBe(true);
        expect(Array.isArray(initial.examples)).toBe(true);
    });
});

describe('matchesType()', () => {
    it('validates string', () => {
        expect(matchesType('hi', 'string')).toBe(true);
        expect(matchesType(123, 'string')).toBe(false);
        expect(matchesType(null, 'string')).toBe(false);
    });

    it('validates array (rejects array-like objects / strings)', () => {
        expect(matchesType([1, 2], 'array')).toBe(true);
        expect(matchesType('abc', 'array')).toBe(false);
        expect(matchesType({ 0: 'a', length: 1 }, 'array')).toBe(false);
    });

    it('validates object (rejects arrays / null)', () => {
        expect(matchesType({ a: 1 }, 'object')).toBe(true);
        expect(matchesType([1, 2], 'object')).toBe(false);
        expect(matchesType(null, 'object')).toBe(false);
    });

    it('validates boolean', () => {
        expect(matchesType(true, 'boolean')).toBe(true);
        expect(matchesType('true', 'boolean')).toBe(false);
        expect(matchesType(1, 'boolean')).toBe(false);
    });

    it('unknown type → permissive (true)', () => {
        // Avoid throwing on new types not yet handled
        expect(matchesType('anything', 'future-type')).toBe(true);
    });
});

describe('migrateFormData() — input validation', () => {
    it('throws on null / non-object / array input', () => {
        expect(() => migrateFormData(null)).toThrow();
        expect(() => migrateFormData(undefined)).toThrow();
        expect(() => migrateFormData('string')).toThrow();
        expect(() => migrateFormData([1, 2, 3])).toThrow();
        expect(() => migrateFormData(42)).toThrow();
    });
});

describe('migrateFormData() — legacy rename (v1 → v2)', () => {
    it('isGemini → useGeminiStyle', () => {
        const result = migrateFormData({ isGemini: true, purpose: 'x' });
        // 既唔再保留 isGemini，又將 useGeminiStyle = true
        expect(result.useGeminiStyle).toBe(true);
        expect(result).not.toHaveProperty('isGemini');
        expect(result.__warnings.some(w => w.includes('isGemini'))).toBe(true);
    });

    it('如果新 key 已經有 value, 唔覆蓋（保留 user explicit value）', () => {
        const result = migrateFormData({ isGemini: true, useGeminiStyle: false, purpose: 'x' });
        expect(result.useGeminiStyle).toBe(false); // 用新 value，唔係 legacy
    });
});

describe('migrateFormData() — value transforms (v1 → v2)', () => {
    it('gameStyle array → string (first element)', () => {
        const result = migrateFormData({
            gameStyle: ['扭蛋機', '夾公仔機'],
            purpose: 'x',
        });
        expect(result.gameStyle).toBe('扭蛋機');
        expect(result.__warnings.some(w => w.includes('gameStyle'))).toBe(true);
    });

    it('gameStyle string 維持 string', () => {
        const result = migrateFormData({
            gameStyle: '扭蛋機 (Gachapon)',
            purpose: 'x',
        });
        expect(result.gameStyle).toBe('扭蛋機 (Gachapon)');
    });
});

describe('migrateFormData() — type mismatch fallback', () => {
    it('type 唔啱 → fallback default + warning（唔 throw）', () => {
        const result = migrateFormData({
            purpose: 'x',
            senTypes: 'ADHD ASD', // 期望 array, 收到 string
            accessibility: 'contrast', // 期望 array
        });
        expect(Array.isArray(result.senTypes)).toBe(true);
        expect(Array.isArray(result.accessibility)).toBe(true);
        // 警告要提呢個
        expect(result.__warnings.some(w => w.includes('senTypes'))).toBe(true);
        expect(result.__warnings.some(w => w.includes('accessibility'))).toBe(true);
    });

    it('required field 缺失 → throws Error with userMessage', () => {
        try {
            migrateFormData({ teacherName: 'Tom' }); // 冇 purpose
            // 唔應該到呢度
            expect.fail('Expected throw');
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            expect(err.userMessage).toContain('缺少必填欄位');
            expect(err.userMessage).toContain('purpose');
        }
    });
});

describe('migrateFormData() — forward-fill + extra fields', () => {
    it('missing optional fields forward-fill from defaults', () => {
        const result = migrateFormData({ purpose: 'x' });
        // optional 全部 forward-fill
        expect(result).toHaveProperty('teacherName');
        expect(result).toHaveProperty('toolName');
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('gameStyle');
        expect(result).toHaveProperty('examples');
        expect(Array.isArray(result.examples)).toBe(true);
    });

    it('unknown fields 收集去 __legacy_extra（唔丟失 user data）', () => {
        const result = migrateFormData({
            purpose: 'x',
            customField: 'user custom value',
            anotherUnknown: 42,
        });
        expect(result.__legacy_extra.customField).toBe('user custom value');
        expect(result.__legacy_extra.anotherUnknown).toBe(42);
    });

    it('attach __schema_version metadata', () => {
        const result = migrateFormData({ purpose: 'x' });
        expect(result.__schema_version).toBe(SCHEMA_VERSION);
    });
});

describe('migrateFormData() — round-trip stability', () => {
    it('default → migrateFormData → 保持 shape + 唔丟 data', () => {
        const initial = getInitialFormData();
        // 模擬 export → import cycle
        const exported = {
            __schema_version: 2,
            ...initial,
        };
        const reImported = migrateFormData(exported);
        // 每個 top-level FORM_SCHEMA key 都應該存在
        const sampleKeys = ['teacherName', 'toolName', 'category', 'purpose', 'rules', 'examples'];
        sampleKeys.forEach(k => {
            expect(reImported).toHaveProperty(k);
            expect(JSON.stringify(reImported[k])).toBe(JSON.stringify(initial[k]));
        });
        // Round-trip 唔應該產生 warning
        expect(reImported.__warnings.length).toBe(0);
    });

    it('user 修改後嘅完整 formData → migrateFormData 仍 work', () => {
        const userData = {
            teacherName: '陳老師',
            toolName: '情緒溫度計',
            category: '情緒支援',
            subjectCategory: '班主任課',
            purpose: '幫助 ASD 學生識別情緒',
            context: '課堂轉場',
            senLevel: '中度 (Moderate)',
            senTypes: ['ASD 自閉症譜系', 'ADHD 專注力不足/過度活躍'],
            accessibility: ['色彩對比 (WCAG AA 4.5:1)', '減少動畫 (Reduced Motion)'],
            // W9-10 #6: rules 支援 string[] (legacy) 及 {text, __isDefault}[] (v3)
            rules: ['rule 1', 'rule 2'],
            examples: [{ text: 'sample', level: '初階', count: 5, mechanism: '3選1答案' }],
            interactionType: ['點擊 (Click)'],
            gameStyle: '扭蛋機 (Gachapon)',
        };
        const result = migrateFormData(userData);
        expect(result.teacherName).toBe('陳老師');
        expect(result.toolName).toBe('情緒溫度計');
        expect(result.senTypes).toEqual(['ASD 自閉症譜系', 'ADHD 專注力不足/過度活躍']);
        expect(result.examples[0].text).toBe('sample');
        // String rules → normalize 做 {text, __isDefault: false}
        expect(result.rules).toEqual([
            { text: 'rule 1', __isDefault: false },
            { text: 'rule 2', __isDefault: false },
        ]);
    });

    it('W9-10 #6: rules 接受 {text, __isDefault} object shape', () => {
        const result = migrateFormData({
            purpose: 'x',
            rules: [
                { text: 'user rule', __isDefault: false },
                { text: 'default rule', __isDefault: true },
            ],
        });
        expect(result.rules).toEqual([
            { text: 'user rule', __isDefault: false },
            { text: 'default rule', __isDefault: true },
        ]);
    });

    it('W9-10 #6: rules 入面有 invalid entry (non-string, non-object) → filter 走', () => {
        const result = migrateFormData({
            purpose: 'x',
            rules: ['valid', 42, null, { text: 'object rule' }, { noText: 'broken' }],
        });
        expect(result.rules).toEqual([
            { text: 'valid', __isDefault: false },
            { text: 'object rule' },
        ]);
    });
});
