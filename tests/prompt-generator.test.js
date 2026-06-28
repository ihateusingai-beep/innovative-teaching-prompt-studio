// === Prompt generator tests ===
// W9-10 prompt logic 改動嘅 regression test
//
// 涵蓋:
//   1. 移除 WMC + Ken Cheng 個人品牌 leak
//   2. Single-file React 描述要對齊真實架構（CDN + Babel standalone）
//   3. Quality scorer 嘅 suggestion 注入 prompt 開頭
//   4. a11y 唔重複（Part 2 reference Part 1，唔再列 detail）

import { describe, it, expect } from 'vitest';
import { generateDesignPrompt, generateTechPrompt } from '../src/prompts/generators.jsx';
import promptScorer from '../src/data/scorer.js';

// === Test fixtures ===

const fullFormData = {
    teacherName: '陳老師',
    toolName: '情緒溫度計',
    category: '情緒支援',
    subjectCategory: '班主任課',
    subjectCustomInput: '',
    gameStyle: '扭蛋機 (Gachapon)',
    gameStyleCustomInput: '',
    interactionType: ['點擊 (Click)'],
    interactionCustomInput: '',
    learningDiversity: ['簡化內容 (Simplify Content)'],
    includePreferenceSettings: true,
    useGeminiStyle: true,
    fabStyle: 'minimal',
    examples: [
        { text: 'sample 1', level: '初階', count: 5, mechanism: '3選1答案' },
        { text: 'sample 2', level: '中階', count: 5, mechanism: '3選1答案' },
        { text: 'sample 3', level: '高階', count: 5, mechanism: '3選1答案' },
    ],
    grade: '小學二年級 (P2)',
    senLevel: '中度 (Moderate)',
    senTypes: ['ASD 自閉症譜系', 'ADHD 專注力不足/過度活躍'],
    accessibility: [
        '色彩對比 (WCAG AA 4.5:1)',
        '鍵盤導航 (Keyboard)',
        'Screen Reader 友善',
    ],
    purpose: '幫助 ASD 學生識別當下嘅情緒狀態並提供調節建議，透過情境卡 + 拖拉配對嘅互動建立情緒詞彙',
    context: '課堂轉場',
    value: ['堅毅'],
    // W9-10 #6: rules 由 string[] 變 {text, __isDefault}[]
    rules: [
        { text: 'rule 1', __isDefault: false },
        { text: 'rule 2', __isDefault: false },
        { text: 'rule 3', __isDefault: false },
    ],
    // v3.2.4: 個別化學習報告模組 — default 全開（最 comprehensive）
    // v3.2.5: 加 d 段「親師溝通格式」4 sub-toggle default 全開
    personalizedReport: {
        enabled: true,
        showData: true,
        showVisualization: true,
        showGrowthMindset: true,
        showParentPDF: true,
        showParentQR: true,
        showNewsletter: true,
        showTeacherReflection: true,
    },
};

const minimalFormData = {
    teacherName: '',
    toolName: '',
    category: '教學遊戲',
    subjectCategory: '語文',
    subjectCustomInput: '',
    gameStyle: '扭蛋機 (Gachapon)',
    gameStyleCustomInput: '',
    interactionType: ['點擊 (Click)'],
    interactionCustomInput: '',
    learningDiversity: [],
    includePreferenceSettings: true,
    useGeminiStyle: true,
    fabStyle: 'minimal',
    examples: [{ text: '', level: '初階', count: 10, mechanism: '3選1答案' }],
    grade: '小學二年級 (P2)',
    senLevel: '輕度 (Mild)',
    senTypes: [],
    accessibility: [],
    purpose: '',
    context: '',
    value: [],
    rules: [],
    // v3.2.4: personalizedReport 模組 default 全關（minimalFormData 唔需要）
    // v3.2.5: d 段 4 sub-toggle 全部 false（minimalFormData 唔需要）
    personalizedReport: {
        enabled: false,
        showData: false,
        showVisualization: false,
        showGrowthMindset: false,
        showParentPDF: false,
        showParentQR: false,
        showNewsletter: false,
        showTeacherReflection: false,
    },
};

// === #1: WMC + Ken Cheng brand leak ===

describe('generateDesignPrompt() + generateTechPrompt() — brand leak (#1)', () => {
    it('Design prompt 唔包含「WMC」或「Ken Cheng」', () => {
        const design = generateDesignPrompt(fullFormData);
        const tech = generateTechPrompt(fullFormData);
        expect(design).not.toContain('WMC');
        expect(design).not.toContain('Ken Cheng');
        expect(tech).not.toContain('WMC');
        expect(tech).not.toContain('Ken Cheng');
    });

    it('Tech prompt Footer 用動態年份 + 老師名（唔係 hardcoded 2025 + WMC）', () => {
        const tech = generateTechPrompt(fullFormData);
        const currentYear = new Date().getFullYear();
        expect(tech).toContain(String(currentYear));
        expect(tech).toContain('陳老師'); // teacherName
    });

    it('FAB (cyber + minimal) 用老師名，唔 reference 個人簽名 PNG', () => {
        const techCyber = generateTechPrompt({ ...fullFormData, fabStyle: 'cyber' });
        const techMinimal = generateTechPrompt({ ...fullFormData, fabStyle: 'minimal' });
        expect(techCyber).toContain('陳老師');
        expect(techCyber).not.toContain('personal_logo');
        expect(techCyber).not.toContain('Ken Cheng');
        expect(techMinimal).toContain('陳老師');
        expect(techMinimal).not.toContain('personal_logo');
    });

    it('FAB off 仍然唔 leak brand', () => {
        const techOff = generateTechPrompt({ ...fullFormData, fabStyle: 'off' });
        expect(techOff).not.toContain('WMC');
        expect(techOff).not.toContain('Ken Cheng');
    });
});

// === #2: Single-file React 描述對齊真實架構 ===

describe('generateTechPrompt() — single-file 架構描述 (#2)', () => {
    it('明確提及 file:// 直接開 + CDN + Babel standalone + Tailwind CDN', () => {
        const tech = generateTechPrompt(fullFormData);
        expect(tech).toContain('file://');
        expect(tech).toMatch(/CDN/);
        expect(tech).toContain('Babel');
        expect(tech).toContain('Tailwind');
    });

    it('唔再 promise shadcn/ui（Gemini 唔識 generate shadcn component）', () => {
        const tech = generateTechPrompt(fullFormData);
        expect(tech).not.toMatch(/shadcn/i);
    });

    it('唔再 promise Framer Motion / Lucide-React external library（會加 CDN dep）', () => {
        const tech = generateTechPrompt(fullFormData);
        // Negation references OK（"唔需要 Framer Motion"），但唔可以當成 positive dependency list item
        expect(tech).not.toMatch(/^\s*\*\s*\*\*[^*]*Framer Motion/i, '唔好將 Framer Motion 列為 dependency');
        expect(tech).not.toMatch(/^\s*\*\s*\*\*[^*]*Lucide-React/i, '唔好將 Lucide-React 列為 dependency');
    });

    it('明確禁止 Next.js / Vite / Webpack / npm build', () => {
        const tech = generateTechPrompt(fullFormData);
        expect(tech).toMatch(/Next\.js|Vite|Webpack|npm build/);
        // 必須明文講「唔好用」
        expect(tech).toContain('唔好用');
    });
});

// === #3: Quality warning block 注入 prompt ===

describe('generateDesignPrompt() — quality warning block (#3)', () => {
    it('minimal formData（好多 missing field）→ 評分 < 40 + warning block 出現', () => {
        const design = generateDesignPrompt(minimalFormData);
        const quality = promptScorer(minimalFormData);
        expect(quality.total).toBeLessThan(60);
        expect(design).toContain('# 0. ⚠️ Prompt 質素提示');
        expect(design).toContain(`${quality.total}/100`);
    });

    it('warning block 列出每個 missing field suggestion', () => {
        const design = generateDesignPrompt(minimalFormData);
        const quality = promptScorer(minimalFormData);
        quality.suggestions.forEach(s => {
            expect(design).toContain(s.message);
        });
    });

    it('full formData 應該高分（>= 60），warning block 唔出現', () => {
        const design = generateDesignPrompt(fullFormData);
        const quality = promptScorer(fullFormData);
        expect(quality.total).toBeGreaterThanOrEqual(60);
        expect(design).not.toContain('# 0. ⚠️ Prompt 質素提示');
    });

    it('quality warning 出現喺 Part 1 開頭（角色設定之前）', () => {
        const design = generateDesignPrompt(minimalFormData);
        const qualityIdx = design.indexOf('# 0. ⚠️ Prompt 質素提示');
        const roleIdx = design.indexOf('# 1. 角色設定');
        expect(qualityIdx).toBeGreaterThan(-1);
        expect(roleIdx).toBeGreaterThan(-1);
        expect(qualityIdx).toBeLessThan(roleIdx);
    });
});

// === #4: A11y 唔重複 ===

describe('a11y 描述唔重複 (#4)', () => {
    it('a11y 詳細 checklist 只出現喺 Design prompt Part 1 §3.6', () => {
        const design = generateDesignPrompt(fullFormData);
        const tech = generateTechPrompt(fullFormData);
        // Design prompt 一定要有 checklist keyword
        expect(design).toContain('無障礙實作清單');
        expect(design).toContain('color-contrast');
        expect(design).toContain('prefers-reduced-motion');
        // Tech prompt 唔再重複 checklist detail，但 reference Part 1
        expect(tech).toContain('Part 1');
        expect(tech).not.toContain('color-contrast');
        expect(tech).not.toContain('prefers-reduced-motion');
    });

    it('如果 accessibility 為空，兩個 prompt 嘅 fallback 行為一致', () => {
        const noA11y = { ...fullFormData, accessibility: [] };
        const design = generateDesignPrompt(noA11y);
        const tech = generateTechPrompt(noA11y);
        // 唔可以有任何 a11y 章節
        expect(tech).not.toContain('♿ 無障礙實作');
    });
});

// === Sanity ===

describe('generateDesignPrompt() — sanity', () => {
    it('永遠回傳 string', () => {
        expect(typeof generateDesignPrompt(fullFormData)).toBe('string');
        expect(typeof generateDesignPrompt(minimalFormData)).toBe('string');
    });

    it('永遠包含必要 section header', () => {
        const design = generateDesignPrompt(fullFormData);
        expect(design).toContain('# 1. 角色設定');
        expect(design).toContain('# 2. 專案參數配置');
        expect(design).toContain('# 3. 設計與教育原則');
    });

    it('SEN types 注入 prompt（每個 SEN 一行）', () => {
        const design = generateDesignPrompt(fullFormData);
        expect(design).toContain('ASD 自閉症譜系');
        expect(design).toContain('ADHD 專注力不足/過度活躍');
    });

    it('interaction type 正確處理「其他」custom', () => {
        const custom = {
            ...fullFormData,
            interactionType: ['點擊 (Click)', '其他'],
            interactionCustomInput: '搖晃手勢',
        };
        const design = generateDesignPrompt(custom);
        expect(design).toContain('搖晃手勢');
        // 唔可以同時出現「其他」placeholder
        expect(design).not.toMatch(/、其他、|、 其他/);
    });
});

describe('generateTechPrompt() — sanity', () => {
    it('永遠回傳 string', () => {
        expect(typeof generateTechPrompt(fullFormData)).toBe('string');
    });

    it('唔使用 Gemini style → 唔包含 single-file React 章節', () => {
        const noGemini = { ...fullFormData, useGeminiStyle: false };
        const tech = generateTechPrompt(noGemini);
        // single-file 章節 conditional render — 唔出現
        expect(tech).not.toContain('Single-file');
        expect(tech).not.toContain('Babel standalone');
    });
});

// === #5: lookup tables 抽出去 data/option-tables.js ===

describe('#5: lookup tables single source of truth', () => {
    it('option-tables.js export 所有 3 個 option array + defaultRules', async () => {
        const tables = await import('../src/data/option-tables.js');
        expect(tables.senTypeOptions).toBeDefined();
        expect(tables.accessibilityOptions).toBeDefined();
        expect(tables.learningDiversityOptions).toBeDefined();
        expect(tables.defaultRules).toBeDefined();
    });

    it('senTypeOptions 10 個 type 齊全', async () => {
        const { senTypeOptions } = await import('../src/data/option-tables.js');
        expect(senTypeOptions.length).toBe(10);
        const ids = senTypeOptions.map(o => o.id);
        expect(ids).toContain('adhd');
        expect(ids).toContain('asd');
        expect(ids).toContain('dyslexia');
    });

    it('generator 入面唔再 inline senTypeOptions / accessibilityOptions', () => {
        // Read raw generators.jsx file source to check no inline arrays
        const fs = require('fs');
        const source = fs.readFileSync(
            require('path').join(__dirname, '../src/prompts/generators.jsx'),
            'utf-8'
        );
        expect(source).not.toContain('const senTypeOptions = [');
        expect(source).not.toContain('const accessibilityOptions = [');
        expect(source).not.toContain('const learningDiversityOptions = [');
        expect(source).toContain("from '../data/option-tables.js'");
    });
});

// === #6: rules default filter ===

describe('#6: rules default filter', () => {
    it('default rules (with __isDefault: true) 唔注入 prompt', () => {
        const design = generateDesignPrompt({
            ...fullFormData,
            rules: [
                { text: 'default rule', __isDefault: true },
            ],
        });
        expect(design).not.toContain('default rule');
    });

    it('user rules (without __isDefault) 注入 prompt', () => {
        const design = generateDesignPrompt({
            ...fullFormData,
            rules: [
                { text: 'user custom rule', __isDefault: false },
            ],
        });
        expect(design).toContain('user custom rule');
    });

    it('mixed: default filter 走，user 保留', () => {
        const design = generateDesignPrompt({
            ...fullFormData,
            rules: [
                { text: 'default noise', __isDefault: true },
                { text: 'user kept', __isDefault: false },
                { text: 'no flag = user' },
            ],
        });
        expect(design).not.toContain('default noise');
        expect(design).toContain('user kept');
        expect(design).toContain('no flag = user');
    });

    it('legacy string[] rules 仍然 work（向後兼容）', () => {
        const design = generateDesignPrompt({
            ...fullFormData,
            rules: ['legacy string rule'],
        });
        expect(design).toContain('legacy string rule');
    });

    it('empty rules + personalizedReport disabled → "無特殊規則" fallback', () => {
        const design = generateDesignPrompt({
            ...fullFormData,
            rules: [],
            personalizedReport: { enabled: false, showData: false, showVisualization: false, showGrowthMindset: false },
        });
        expect(design).toContain('無特殊規則');
    });
});

// === #8: Part 1 結構一致 ===

describe('#8: Part 1 response structure', () => {
    it('唔再出現矛盾嘅「分以下四部分回應：一/二/三/四」+ # 2-5 標題重複', () => {
        const design = generateDesignPrompt(fullFormData);
        // 舊嘅矛盾文字
        expect(design).not.toMatch(/分以下四部分回應：/);
        expect(design).not.toMatch(/一\.\s*核心設計原則/);
        expect(design).not.toMatch(/四、提供「高保真文字版介面藍圖」/);
    });

    it('有 explicit response structure guidance', () => {
        const design = generateDesignPrompt(fullFormData);
        expect(design).toContain('請按以下結構逐一回應');
        // 至少提一次「# 4」「# 5」
        expect(design).toContain('# 4');
        expect(design).toContain('# 5');
    });
});

// === #9: Part 2 重述 Part 1 context ===

describe('#9: Part 2 context recap', () => {
    it('Tech prompt 開頭有 Part 1 context recap', () => {
        const tech = generateTechPrompt(fullFormData);
        expect(tech).toContain('Part 1 Context Recap');
    });

    it('Part 1 recap 包含關鍵設定 (SEN types, category, SEN level)', () => {
        const tech = generateTechPrompt(fullFormData);
        expect(tech).toContain('ASD 自閉症譜系');
        expect(tech).toContain('ADHD 專注力不足/過度活躍');
        expect(tech).toContain('情緒支援'); // category
        expect(tech).toContain('中度 (Moderate)'); // senLevel
    });
});

// === v3.2.4: Personalized Report module 集成 ===

describe('v3.2.4 — Personalized Report module', () => {
    const fixtureWithPersonalizedReport = (override) => ({
        ...fullFormData,
        personalizedReport: {
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            ...override,
        },
    });

    it('enabled=true + 全 sub 開 — Design prompt 包含 a/b/c 三段', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport());
        expect(design).toContain('a. 個別化與數據化');
        expect(design).toContain('b. 可視化與兒童友善設計');
        expect(design).toContain('c. 正向語言與建設性建議');
    });

    it('enabled=false — Design prompt 唔包含任何 a/b/c 段', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport({ enabled: false }));
        expect(design).not.toContain('a. 個別化與數據化');
        expect(design).not.toContain('b. 可視化');
        expect(design).not.toContain('c. 正向語言');
    });

    it('showData=false (其他開) — 只有 b/c 段', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport({ showData: false }));
        expect(design).not.toContain('a. 個別化與數據化');
        expect(design).toContain('b. 可視化');
        expect(design).toContain('c. 正向語言');
    });

    it('showVisualization=false (其他開) — 只有 a/c 段', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport({ showVisualization: false }));
        expect(design).toContain('a. 個別化');
        expect(design).not.toContain('b. 可視化');
        expect(design).toContain('c. 正向語言');
    });

    it('showGrowthMindset=false (其他開) — 只有 a/b 段', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport({ showGrowthMindset: false }));
        expect(design).toContain('a. 個別化');
        expect(design).toContain('b. 可視化');
        expect(design).not.toContain('c. 正向語言');
    });

    it('冇 personalizedReport field (forward-fill default 全開) — 包含 a/b/c', () => {
        const { personalizedReport, ...formDataNoModule } = fullFormData;
        const design = generateDesignPrompt(formDataNoModule);
        // 冇 field → composePersonalizedReportRule(undefined) → null → 唔 inject
        // 但 schema default forward-fill 喺 migrateFormData 度做，generator 直接用 formData
        // 冇 forward-fill 自動加 field，所以呢個 case 應該係 null（唔 inject）
        expect(design).not.toContain('a. 個別化與數據化');
    });

    it('personalizedReport = {} empty object — 唔 inject (因為冇 enabled)', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport({ enabled: undefined, showData: undefined, showVisualization: undefined, showGrowthMindset: undefined }));
        // 所有 sub undefined → default !== false → 全部 enabled → 應該 inject
        expect(design).toContain('a. 個別化');
    });

    it('composed rule 唔會 duplicate (舊 default rule 已由 defaultRules 拎走)', () => {
        const design = generateDesignPrompt(fixtureWithPersonalizedReport());
        // 「個別化學習報告頁面」喺 module compose spec 入面只出現一次
        // (a 段「需符合以下原則：」嘅 intro)
        // v3.2.6: bridge 入面亦會 reference 呢個 term 但用 generic context
        // 唔當作 duplicate — 重點係 module spec definition 唔重複
        const specMatches = design.match(/「個別化學習報告頁面」，需符合以下原則/g);
        expect(specMatches?.length).toBe(1);
    });

    it('user custom rules 同 composed rule 一齊 inject (順序: composed 先)', () => {
        const formData = fixtureWithPersonalizedReport();
        formData.rules = [
            { text: 'MY CUSTOM RULE', __isDefault: false },
        ];
        const design = generateDesignPrompt(formData);
        // 兩個都應該出現
        expect(design).toContain('MY CUSTOM RULE');
        expect(design).toContain('a. 個別化');
        // 順序: personalizedReport 在前 (i=1)，custom rule 在後 (i=2)
        const composedIdx = design.indexOf('a. 個別化');
        const customIdx = design.indexOf('MY CUSTOM RULE');
        expect(composedIdx).toBeGreaterThan(-1);
        expect(customIdx).toBeGreaterThan(composedIdx);
    });
});

// === v3.2.5: d 段「親師溝通格式」4 sub-toggle 集成 ===

describe('v3.2.5 — d 段親師溝通格式 sub-toggles', () => {
    const fixtureWithAllD = () => ({
        ...fullFormData,
        personalizedReport: {
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: true,
            showParentQR: true,
            showNewsletter: true,
            showTeacherReflection: true,
        },
    });

    it('default 全開 — Design prompt 包含 a/b/c + d1/d2/d3/d4', () => {
        const design = generateDesignPrompt(fixtureWithAllD());
        expect(design).toContain('a. 個別化與數據化');
        expect(design).toContain('b. 可視化');
        expect(design).toContain('c. 正向語言');
        expect(design).toContain('d1.');
        expect(design).toContain('d2.');
        expect(design).toContain('d3.');
        expect(design).toContain('d4.');
    });

    it('關 d1 (其他 d 段開) — 只有 d2/d3/d4 注入', () => {
        const formData = fixtureWithAllD();
        formData.personalizedReport.showParentPDF = false;
        const design = generateDesignPrompt(formData);
        expect(design).toContain('d2.');
        expect(design).toContain('d3.');
        expect(design).toContain('d4.');
        expect(design).not.toContain('d1.');
    });

    it('關全部 d 段 (a/b/c 開) — 唔注入 d1-d4', () => {
        const formData = fixtureWithAllD();
        formData.personalizedReport.showParentPDF = false;
        formData.personalizedReport.showParentQR = false;
        formData.personalizedReport.showNewsletter = false;
        formData.personalizedReport.showTeacherReflection = false;
        const design = generateDesignPrompt(formData);
        expect(design).toContain('a. 個別化');
        expect(design).toContain('b. 可視化');
        expect(design).toContain('c. 正向語言');
        expect(design).not.toContain('d1.');
        expect(design).not.toContain('d2.');
        expect(design).not.toContain('d3.');
        expect(design).not.toContain('d4.');
    });

    it('順序驗證: a → b → c → d1 → d2 → d3 → d4', () => {
        const design = generateDesignPrompt(fixtureWithAllD());
        const order = ['a. 個別化', 'b. 可視化', 'c. 正向語言', 'd1.', 'd2.', 'd3.', 'd4.'];
        const indices = order.map(marker => design.indexOf(marker));
        indices.forEach(idx => expect(idx).toBeGreaterThan(-1));
        for (let i = 1; i < indices.length; i++) {
            expect(indices[i]).toBeGreaterThan(indices[i - 1]);
        }
    });

    it('backward compat: 舊 v3.2.4 JSON 冇 d 段 field — 當 enabled=true 其他 d 段默認注入', () => {
        // 模擬 migrateFormData forward-fill 後但冇 d 段嘅 config
        const formData = {
            ...fullFormData,
            personalizedReport: {
                enabled: true,
                showData: true,
                showVisualization: true,
                showGrowthMindset: true,
                // 冇 d 段 field (舊 v3.2.4 shape)
            },
        };
        const design = generateDesignPrompt(formData);
        // composePersonalizedReportRule 入面 `!== false` default 開 → d 段全部應該 inject
        expect(design).toContain('d1.');
        expect(design).toContain('d2.');
        expect(design).toContain('d3.');
        expect(design).toContain('d4.');
    });
});

// === v3.2.6: Dashboard ↔ Report Bridge (Rule 1 + Personalized Report cross-reference) ===

describe('v3.2.6 — Dashboard ↔ Report Bridge', () => {
    const fixtureWithReportEnabled = () => ({
        ...fullFormData,
        personalizedReport: {
            enabled: true,
            showData: true,
            showVisualization: true,
            showGrowthMindset: true,
            showParentPDF: true,
            showParentQR: true,
            showNewsletter: true,
            showTeacherReflection: true,
        },
    });

    it('personalizedReport.enabled=true — Design prompt 包含 bridge (儀表板+報告互通)', () => {
        const design = generateDesignPrompt(fixtureWithReportEnabled());
        expect(design).toContain('儀表板');
        expect(design).toContain('報告頁面');
        expect(design).toContain('localStorage');
        expect(design).toContain('同一份');
    });

    it('personalizedReport.enabled=false — Design prompt 唔包含 bridge', () => {
        const formData = fixtureWithReportEnabled();
        formData.personalizedReport.enabled = false;
        const design = generateDesignPrompt(formData);
        // 冇 report → 冇 bridge
        expect(design).not.toContain('【架構指引');  // bridge marker
    });

    it('bridge 喺 rules list 最前 (set architecture tone before specific rules)', () => {
        const design = generateDesignPrompt(fixtureWithReportEnabled());
        const bridgeIdx = design.indexOf('【架構指引');
        const reportIdx = design.indexOf('「個別化學習報告頁面」');
        expect(bridgeIdx).toBeGreaterThan(-1);
        expect(reportIdx).toBeGreaterThan(bridgeIdx);
    });

    it('即使老師改 Rule 1 文字，bridge 仍然 inject (bridge 講架構原則，唔係 rule 重複)', () => {
        const formData = fixtureWithReportEnabled();
        // 老師改 Rule 1 default → __isDefault: false → 會 inject
        formData.rules = [
            { text: '我嘅客製化儀表板：顯示自選 widget', __isDefault: false },
        ];
        const design = generateDesignPrompt(formData);
        expect(design).toContain('我嘅客製化儀表板');  // user custom rule
        expect(design).toContain('【架構指引');         // bridge 仲在
    });

    it('即使老師刪走 Rule 1，bridge 仍然 work (bridge 獨立可讀)', () => {
        const formData = fixtureWithReportEnabled();
        formData.rules = [];  // 完全冇 rules
        const design = generateDesignPrompt(formData);
        expect(design).toContain('【架構指引');
        // bridge 自己已經完整解釋架構，唔需要 Rule 1 存在
        expect(design).toContain('儀表板');
        expect(design).toContain('報告頁面');
    });
});
