// === Personalized Report module tests ===
// v3.2.4: 由 default rule 抽出做獨立 module 控制
// 老師可以 toggle master + 3 sub (a/b/c 對應原 rule 三段)
// Generator 用 composePersonalizedReportRule(formData.personalizedReport) 動態組裝

import { describe, it, expect } from 'vitest';
import { composePersonalizedReportRule, composeDashboardReportBridge, personalizedReportSections } from '../src/data/option-tables.js';

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

    it('sub-toggle 全部關 (a/b/c + d1-d4) — 返回 null', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: false,
            showVisualization: false,
            showGrowthMindset: false,
            showParentPDF: false,
            showParentQR: false,
            showNewsletter: false,
            showTeacherReflection: false,
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

    it('personalizedReportSections exports 7 個 sections (a/b/c + d1-d4)', () => {
        expect(Object.keys(personalizedReportSections).sort()).toEqual(
            ['showData', 'showGrowthMindset', 'showNewsletter', 'showParentPDF', 'showParentQR', 'showTeacherReflection', 'showVisualization']
        );
    });

    it('d1-d4 sections 都有對應 marker text (verify content not stub)', () => {
        expect(personalizedReportSections.showParentPDF).toContain('d1.');
        expect(personalizedReportSections.showParentPDF).toContain('A4');
        expect(personalizedReportSections.showParentQR).toContain('d2.');
        expect(personalizedReportSections.showParentQR).toContain('QR code');
        expect(personalizedReportSections.showNewsletter).toContain('d3.');
        expect(personalizedReportSections.showNewsletter).toContain('電子報');
        expect(personalizedReportSections.showTeacherReflection).toContain('d4.');
        // d4 反思 prompt 引用 K-W-L 三條問題
        expect(personalizedReportSections.showTeacherReflection).toContain('What I Knew');
        expect(personalizedReportSections.showTeacherReflection).toContain('What I Wonder');
        expect(personalizedReportSections.showTeacherReflection).toContain('What I Learned');
    });

    // === v3.2.5: d 段 sub-toggle 獨立控制 ===

    it('關 showParentPDF (其他開) — 唔包含 d1 但包含 d2-d4', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: false,
            showParentQR: true,
            showNewsletter: true,
            showTeacherReflection: true,
        });
        expect(out).toContain('a. 個別化');
        expect(out).not.toContain('d1.');
        expect(out).toContain('d2.');
        expect(out).toContain('d3.');
        expect(out).toContain('d4.');
    });

    it('關 showParentQR — 唔包含 d2 但其他 d 段在', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: true,
            showParentQR: false,
            showNewsletter: true,
            showTeacherReflection: true,
        });
        expect(out).toContain('d1.');
        expect(out).not.toContain('d2.');
        expect(out).toContain('d3.');
        expect(out).toContain('d4.');
    });

    it('關 showNewsletter — 唔包含 d3', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: true,
            showParentQR: true,
            showNewsletter: false,
            showTeacherReflection: true,
        });
        expect(out).toContain('d1.');
        expect(out).toContain('d2.');
        expect(out).not.toContain('d3.');
        expect(out).toContain('d4.');
    });

    it('關 showTeacherReflection — 唔包含 d4', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: true,
            showParentQR: true,
            showNewsletter: true,
            showTeacherReflection: false,
        });
        expect(out).toContain('d1.');
        expect(out).toContain('d2.');
        expect(out).toContain('d3.');
        expect(out).not.toContain('d4.');
    });

    it('全部 d 段關但 a/b/c 開 — output 唔包含任何 d 段', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: false,
            showParentQR: false,
            showNewsletter: false,
            showTeacherReflection: false,
        });
        expect(out).toContain('a.');
        expect(out).toContain('b.');
        expect(out).toContain('c.');
        expect(out).not.toContain('d1.');
        expect(out).not.toContain('d2.');
        expect(out).not.toContain('d3.');
        expect(out).not.toContain('d4.');
    });

    it('順序: a → b → c → d1 → d2 → d3 → d4', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: true,
            showParentQR: true,
            showNewsletter: true,
            showTeacherReflection: true,
        });
        const order = [
            'a. 個別化',
            'b. 可視化',
            'c. 正向語言',
            'd1. 可列印 PDF',
            'd2. QR code',
            'd3. 每週／每月',
            'd4. 教師反思',
        ];
        const indices = order.map(marker => out.indexOf(marker));
        // 所有 marker 都搵到
        indices.forEach(idx => expect(idx).toBeGreaterThan(-1));
        // 順序遞增
        for (let i = 1; i < indices.length; i++) {
            expect(indices[i]).toBeGreaterThan(indices[i - 1]);
        }
    });

    it('冇 d 段 sub-toggle field (舊 v3.2.4 JSON) — backward compat: 當 enabled=true 其他唔指定嘅 d 段都默認開', () => {
        const out = composePersonalizedReportRule({
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            // 冇 d 段 field
        });
        // backward compat: d 段 default 開，全部 d1-d4 應該出現
        expect(out).toContain('d1.');
        expect(out).toContain('d2.');
        expect(out).toContain('d3.');
        expect(out).toContain('d4.');
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

// === v3.2.6: Dashboard ↔ Report Bridge (cross-reference) ===

describe('composeDashboardReportBridge', () => {
    it('enabled=true (default) — 返回 bridge text', () => {
        const out = composeDashboardReportBridge({ enabled: true });
        expect(out).not.toBeNull();
        expect(out).toContain('儀表板');
        expect(out).toContain('報告');
        expect(out).toContain('localStorage');
        // 強調 single source of truth
        expect(out).toContain('同一份');
    });

    it('enabled=false — 返回 null (關咗 Report module 就唔需要 bridge)', () => {
        const out = composeDashboardReportBridge({ enabled: false });
        expect(out).toBeNull();
    });

    it('null / undefined config — 返回 null', () => {
        expect(composeDashboardReportBridge(null)).toBeNull();
        expect(composeDashboardReportBridge(undefined)).toBeNull();
    });

    it('唔係 object (string / number) — 返回 null (defensive)', () => {
        expect(composeDashboardReportBridge('on')).toBeNull();
        expect(composeDashboardReportBridge(1)).toBeNull();
    });

    it('empty object (冇 enabled field) — 視為 enabled (truthy !== false 默認行為)', () => {
        const out = composeDashboardReportBridge({});
        expect(out).not.toBeNull();
    });

    it('bridge text 獨立可讀，唔假設 Rule 1 存在 (即使老師刪走 Rule 1 都仍 work)', () => {
        const out = composeDashboardReportBridge({ enabled: true });
        // Bridge 唔引用 Rule 1 嘅原文 — 只講架構原則
        expect(out).not.toContain('右上角加上學習儀表版');  // 唔 reference Rule 1 原文
        expect(out).toContain('儀表板');                  // 但講到概念
        expect(out).toContain('報告頁面');
    });
});
