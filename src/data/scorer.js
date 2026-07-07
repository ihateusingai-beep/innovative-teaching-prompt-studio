// === Prompt Quality Scorer ===
// 計算 0-100 分 + 改善建議（純 local heuristic，唔駁 AI API）
// 維度：
//   completeness (30) — required fields 填寫率
//   clarity (25)      — purpose 字數 + 動詞具體度
//   senFit (15)       — SEN 適配設定
//   rulesDetail (15)  — rules 條數
//   examples (15)     — examples 填寫率
//
// grade:
//   excellent (>=80) / good (>=60) / fair (>=40) / poor (<40)

const promptScorer = (data) => {
    const scores = {};
    const suggestions = [];

    // 1. Completeness
    const requiredFields = ['purpose', 'toolName', 'category', 'subjectCategory', 'grade'];
    const filled = requiredFields.filter(f => data[f] && data[f].toString().trim()).length;
    scores.completeness = Math.round((filled / requiredFields.length) * 30);
    if (filled < requiredFields.length) {
        const missing = requiredFields.filter(f => !data[f] || !data[f].toString().trim());
        suggestions.push({
            key: 'completeness',
            severity: 'warning',
            message: `缺少必填欄位`,
            detail: missing.map(f => {
                const labels = { purpose: '2.1 核心用途', toolName: '1.2 工具名稱', category: '1.3 工具範疇', subjectCategory: '1.4 科目', grade: '1.7 目標年級' };
                return labels[f] || f;
            }).join('、'),
            improvement: '填寫所有必填欄位可令 AI 更準確理解需求。',
        });
    }

    // 2. Clarity
    const purpose = (data.purpose || '').trim();
    let clarity = 0;
    if (purpose.length >= 30) clarity += 15;
    else if (purpose.length >= 15) clarity += 8;
    // 動詞具體度 — 避免太虛嘅動詞
    const vagueVerbs = ['練習', '學習', '教', '幫助', '讓學生', '讓'];
    const hasVague = vagueVerbs.some(v => purpose.includes(v));
    if (purpose && !hasVague) clarity += 10;
    scores.clarity = clarity;
    if (purpose.length < 30) {
        suggestions.push({
            key: 'clarity',
            severity: 'info',
            message: '核心用途太短或太抽象',
            detail: `目前 ${purpose.length} 字，建議 30 字以上`,
            improvement: '建議用具體動詞 + 學習目標，例如「讓學生透過 10 條加法題鞏固進位概念」。',
        });
    } else if (hasVague) {
        suggestions.push({
            key: 'clarity',
            severity: 'info',
            message: '核心用途嘅動詞偏抽象',
            detail: '檢測到「練習 / 學習 / 教 / 幫助 / 讓」等虛詞',
            improvement: '用具體動詞：「鞏固」「辨識」「應用」「創作」等。',
        });
    }

    // 3. SEN 適配
    let senScore = 0;
    if (data.senLevel && data.senLevel !== '輕度 (Mild)') senScore += 5;
    if (data.senTypes && data.senTypes.length > 0) senScore += 5;
    if (data.accessibility && data.accessibility.length >= 3) senScore += 5;
    scores.senFit = senScore;
    if (senScore < 10) {
        suggestions.push({
            key: 'senFit',
            severity: 'info',
            message: 'SEN 適配設定偏少',
            detail: '建議勾選 SEN 類型 + 無障礙維度',
            improvement: '勾選 ADHD / ASD 等 SEN 類型 + 鍵盤導航 / TTS / 減少動畫 等 a11y 維度。',
        });
    }

    // 4. Rules 具體度
    // W9-10 #6: rules 形狀 {text, __isDefault}？要做 normalize
    const normalizeRuleText = (r) => typeof r === 'string' ? r : (r?.text || '');
    const filledRules = (data.rules || []).filter(r => normalizeRuleText(r).trim()).length;
    let rulesScore = 0;
    if (filledRules >= 3) rulesScore = 15;
    else if (filledRules >= 1) rulesScore = 8;
    scores.rulesDetail = rulesScore;
    if (filledRules < 3) {
        suggestions.push({
            key: 'rules',
            severity: 'info',
            message: `只有 ${filledRules} 條規則`,
            detail: '建議 3-5 條',
            improvement: '加具體規則，例如「答對時顯示 ✅ + 鼓勵語」、「加入重玩按鈕」、「首頁有名字輸入框」。',
        });
    }

    // 5. Examples
    const filledExamples = (data.examples || []).filter(e => e.text && e.text.trim()).length;
    let exampleScore = 0;
    if (filledExamples >= 3) exampleScore = 15;
    else if (filledExamples >= 1) exampleScore = 8;
    scores.examples = exampleScore;
    if (filledExamples < 3) {
        suggestions.push({
            key: 'examples',
            severity: 'info',
            message: `範例題目只有 ${filledExamples} 條`,
            detail: '建議填齊 3 階難度（初 / 中 / 高）',
            improvement: 'AI 會根據範例生成更貼近嘅題目，3 階難度範例幫助 AI 理解 scaffolding。',
        });
    }

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const grade = total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'fair' : 'poor';
    const gradeLabel = { excellent: '優秀', good: '良好', fair: '尚可', poor: '需改善' }[grade];

    // v3.15.0 A2: 4 external groups mapped from 5 internal dimensions.
    // - purpose       ← clarity        (purpose 字數 + 動詞具體度)
    // - context       ← completeness   (required fields 填寫率)
    // - structure     ← rulesDetail + examples  (合併兩個結構維度)
    // - accessibility ← senFit         (SEN 適配 + a11y 設定)
    // UI 顯示 4-dim (per spec); internal 仍係 5-dim (heuristic 唔重 tune)。
    const groups = {
        purpose:       { score: scores.clarity,       max: 25, label: '核心用途', icon: '🎯' },
        context:       { score: scores.completeness,  max: 30, label: '內容完整', icon: '📋' },
        structure:     { score: scores.rulesDetail + scores.examples, max: 30, label: '結構', icon: '🏗️' },
        accessibility: { score: scores.senFit,        max: 15, label: '無障礙',   icon: '♿' },
    };

    return { total, grade, gradeLabel, breakdown: scores, groups, suggestions };
};

export default promptScorer;
