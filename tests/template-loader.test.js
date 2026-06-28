// === Template loader tests ===
// v3.2.1 fix: built-in templates 用 `template.formData` 包 fields,
// 但 handleLoadTemplate 之前 assume `template.data`，導致 built-in load 完全無效果。
// 同時 pre-v3.2 user-saved templates 用 direct spread 形式 (冇 wrapper)。
// extractTemplateFields 統一抽 fields 處理 3 種 shape。

import { describe, it, expect } from 'vitest';
import { extractTemplateFields } from '../src/utils/template-loader.js';

describe('extractTemplateFields', () => {
    it('built-in shape (v3.0+) — 用 template.formData', () => {
        const tpl = {
            id: 'math-add-gacha-p1',
            name: '加法扭蛋樂園',
            description: '扭蛋機風格嘅 10 以內加法遊戲',
            icon: '🎰',
            category: '教學遊戲',  // template metadata
            preview: '學生扭蛋 → 答加法題 → 收集獎勵角色',
            formData: {
                toolName: '加法扭蛋樂園',
                category: '教學遊戲',  // form field (同 metadata 同 value — design smell but not blocking)
                subjectCategory: '數學',
                purpose: '透過扭蛋機互動遊戲',
            },
        };
        const fields = extractTemplateFields(tpl);
        // formData 內容必須完整取用 (包括 form field `category`)
        expect(fields).toEqual({
            toolName: '加法扭蛋樂園',
            category: '教學遊戲',
            subjectCategory: '數學',
            purpose: '透過扭蛋機互動遊戲',
        });
        // 重要：top-level metadata 唔可以 leak 入 formData
        // 注意 formData 本身可以有 `category` form field，所以 check 係「top-level 嘅 metadata」冇混入
        // 用 Object.keys 對比先穩陣
        expect(Object.keys(fields).sort()).toEqual(
            ['category', 'purpose', 'subjectCategory', 'toolName'].sort()
        );
    });

    it('user-saved shape (v3.0+) — 用 template.data', () => {
        const tpl = {
            id: 'user_1234567890',
            name: '我嘅範本',
            description: '情緒支援 · 班主任課',
            data: {
                toolName: '我嘅工具',
                purpose: '我嘅目的',
            },
            createdAt: 1234567890,
        };
        const fields = extractTemplateFields(tpl);
        expect(fields).toEqual({
            toolName: '我嘅工具',
            purpose: '我嘅目的',
        });
        expect(fields).not.toHaveProperty('id');
        expect(fields).not.toHaveProperty('name');
        expect(fields).not.toHaveProperty('description');
        expect(fields).not.toHaveProperty('createdAt');
    });

    it('legacy shape (pre-v3.2) — template 本身就係 fields', () => {
        const tpl = {
            toolName: '舊版 template',
            purpose: 'legacy purpose',
        };
        const fields = extractTemplateFields(tpl);
        expect(fields).toEqual({
            toolName: '舊版 template',
            purpose: 'legacy purpose',
        });
    });

    it('legacy shape with mixed metadata — strip 已知 metadata keys', () => {
        const tpl = {
            id: 'legacy_1',
            name: '舊名',
            description: '舊描述',
            icon: '⭐',
            category: '舊分類',
            preview: '舊 preview',
            createdAt: 999,
            toolName: '真正嘅 tool name',
            purpose: '真正嘅 purpose',
        };
        const fields = extractTemplateFields(tpl);
        expect(fields).toEqual({
            toolName: '真正嘅 tool name',
            purpose: '真正嘅 purpose',
        });
    });

    it('null / undefined — return empty object', () => {
        expect(extractTemplateFields(null)).toEqual({});
        expect(extractTemplateFields(undefined)).toEqual({});
    });

    it('empty object — return empty object', () => {
        expect(extractTemplateFields({})).toEqual({});
    });

    it('priority: formData 贏 data (defensive — 唔應該撞但保護)', () => {
        const tpl = {
            formData: { toolName: 'from formData' },
            data: { toolName: 'from data' },
        };
        expect(extractTemplateFields(tpl).toolName).toBe('from formData');
    });

    it('priority: data 贏 legacy spread (defensive)', () => {
        const tpl = {
            toolName: 'top-level',
            data: { toolName: 'from data' },
        };
        expect(extractTemplateFields(tpl).toolName).toBe('from data');
    });
});
