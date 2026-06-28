// === Personalized Report module tests ===
// v3.2.4: 由 default rule 抽出做獨立 module 控制
// 老師可以 toggle master + 3 sub (a/b/c 對應原 rule 三段)
// Generator 用 composePersonalizedReportRule(formData.personalizedReport) 動態組裝

import { describe, it, expect } from 'vitest';
import { composePersonalizedReportRule, personalizedReportSections } from '../src/data/option-tables.js';

describe('composePersonalizedReportRule', () => {
    it('default config (全開) — output 等同舊 default rule', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
        });
        // 應該包含全部 3 段 + 順序正確
        expect(out).toContain('a. 個別化與數據化');
        expect(out).toContain('b. 可視化與兒童友善設計');
        expect(out).toContain('c. 正向語言與建設性建議');
        // 段間用 \n\n 分隔（trimEnd 確保唔會有 3 個 newline）
        // a 段內部有 \n 分隔多行文字，所以 search 「a 段最後一行 + \n\n + b 段開頭」
        // a 段最後一行：「數據需基於學生實際互動行為...而非僅二元對錯」
        expect(out).toMatch(/而非僅二元對錯\n\nb\. 可視化/);
        expect(out).toMatch(/確保低年級學生能一眼理解\n\nc\. 正向語言/);
    });

    it('enabled=false — 返回 null (generator filter 走)', () => {
        const out = composePersonalizedReportRule({
            enabled: false,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
        });
        expect(out).toBeNull();
    });

    it('只開 showData — 只有 a 段', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: false,
            showGrowthMindset: false,
        });
        expect(out).toContain('a. 個別化與數據化');
        expect(out).not.toContain('b. 可視化');
        expect(out).not.toContain('c. 正向語言');
    });

    it('只開 showVisualization — 只有 b 段', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: false,
            showVisualization: true,
            showGrowthMindset: false,
        });
        expect(out).toContain('b. 可視化');
        expect(out).not.toContain('a. 個別化');
        expect(out).not.toContain('c. 正向語言');
    });

    it('只開 showGrowthMindset — 只有 c 段', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: false,
            showVisualization: false,
            showGrowthMindset: true,
        });
        expect(out).toContain('c. 正向語言');
        expect(out).not.toContain('a. 個別化');
        expect(out).not.toContain('b. 可視化');
    });

    it('sub-toggle 全部關 — 返回 null', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: false,
            showVisualization: false,
            showGrowthMindset: false,
        });
        expect(out).toBeNull();
    });

    it('順序: a → b → c 唔變', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
        });
        const aIdx = out.indexOf('a. 個別化');
        const bIdx = out.indexOf('b. 可視化');
        const cIdx = out.indexOf('c. 正向語言');
        expect(aIdx).toBeGreaterThan(-1);
        expect(bIdx).toBeGreaterThan(aIdx);
        expect(cIdx).toBeGreaterThan(bIdx);
    });

    it('null config — 返回 null (defensive)', () => {
        expect(composePersonalizedReportRule(null)).toBeNull();
    });

    it('undefined config — 返回 null', () => {
        expect(composePersonalizedReportRule(undefined)).toBeNull();
    });

    it('config 唔係 object (例如 string / number) — 返回 null', () => {
        expect(composePersonalizedReportRule('on')).toBeNull();
        expect(composePersonalizedReportRule(1)).toBeNull();
    });

    it('personalizedReportSections exports 3 個 sections', () => {
        expect(Object.keys(personalizedReportSections).sort()).toEqual(
            ['showData', 'showGrowthMindset', 'showVisualization']
        );
    });

    it('backward compat: 老師舊 JSON import 冇 personalizedReport — generator 應該 forward-fill default', () => {
        // 模擬 getInitialFormData() forward-fill 嘅 default
        const defaultConfig = {
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
        };
        const out = composePersonalizedReportRule(defaultConfig);
        expect(out).not.toBeNull();
        expect(out).toContain('a. 個別化');
        expect(out).toContain('b. 可視化');
        expect(out).toContain('c. 正向語言');
    });
});
