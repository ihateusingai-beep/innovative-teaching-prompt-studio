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

    it('empty rules → "無特殊規則" fallback', () => {
        const design = generateDesignPrompt({
            ...fullFormData,
            rules: [],
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
