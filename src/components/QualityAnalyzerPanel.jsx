import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles, AlertCircle, Info, AlertTriangle, CheckCircle2, Wand2 } from 'lucide-react';
import { Card } from './ui.jsx';

// === v3.16.0 F3: Quality Analyzer Panel ===
// Inline expandable panel shown on generate tab. Shows:
//   - 4-dim breakdown (purpose / context / structure / accessibility) with sub-scores
//   - List of suggestions per dim (from scorer.suggestions[])
//   - "📝 一鍵改善" button per dim — calls onAutoFix(dim) parent callback
//
// Why not inside QualityScoreDetail modal: spec 寫 inline expand button 喺生成 tab,
// not modal. Modal 是看 score, panel 是看 explainability + actions.
//
// Why "一鍵改善" not AI: heuristic-based auto-fix only (no Gemini call).
// Reason: heuristic 0-cost instant; AI costs quota + 5-10s latency + uncertain output.
// Defer AI-based autofill to F5 (Lesson Plan auto-fill).
const SEVERITY_ICON = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle2,
};
const SEVERITY_COLOR = {
    error:   'text-red-600 bg-red-50 border-red-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    info:    'text-blue-700 bg-blue-50 border-blue-200',
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};

export const QualityAnalyzerPanel = ({
    theme,
    score,
    onAutoFix,
    defaultExpanded = false,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    if (!score) return null;

    // Defensive: accept both F1+ shape (with groups) and legacy (with breakdown)
    const groups = score.groups || (
        score.breakdown && {
            purpose:       { score: score.breakdown.clarity      || 0, max: 25, label: '核心用途', icon: '🎯', suggestions: [] },
            context:       { score: score.breakdown.completeness || 0, max: 30, label: '內容完整', icon: '📋', suggestions: [] },
            structure:     { score: (score.breakdown.rulesDetail || 0) + (score.breakdown.examples || 0), max: 30, label: '結構', icon: '🏗️', suggestions: [] },
            accessibility: { score: score.breakdown.senFit       || 0, max: 15, label: '無障礙', icon: '♿', suggestions: [] },
        }
    );
    // Suggestions 分配到 4 個 dim
    const suggestionsByKey = (score.suggestions || []).reduce((acc, s) => {
        if (!s || !s.key) return acc;
        acc[s.key] = acc[s.key] || [];
        acc[s.key].push(s);
        return acc;
    }, {});
    // Map scorer key → analyzer dim key (scorer 用 clarity, completeness, rules, senFit, examples)
    const KEY_TO_DIM = {
        completeness: 'context',
        clarity:      'purpose',
        rules:        'structure',
        examples:     'structure',
        senFit:       'accessibility',
    };
    const allSuggestionsByDim = {};
    for (const [scorerKey, sugs] of Object.entries(suggestionsByKey)) {
        const dim = KEY_TO_DIM[scorerKey] || scorerKey;
        allSuggestionsByDim[dim] = (allSuggestionsByDim[dim] || []).concat(sugs);
    }
    // 計 hasIssue per dim (sub-score < max 即代表有改善空間)
    const dimHasIssue = (key) => {
        const g = groups[key];
        return g && g.max > 0 && g.score < g.max;
    };

    return (
        <Card theme={theme} className="mt-4 overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                aria-expanded={expanded}
                aria-controls="quality-analyzer-content"
            >
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-blue-600" />
                    <span className="text-sm font-bold text-slate-800">
                        🔍 點解咁低?
                    </span>
                    <span className="text-xs text-slate-500">
                        ({Object.keys(groups).filter(dimHasIssue).length} 個維度可改善)
                    </span>
                </div>
                {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            {expanded && (
                <div
                    id="quality-analyzer-content"
                    className="tda-fade-in border-t border-slate-200 p-4 space-y-3"
                >
                    {Object.entries(groups).map(([key, group]) => {
                        const pct = group.max > 0 ? Math.round((group.score / group.max) * 100) : 0;
                        const sugs = allSuggestionsByDim[key] || [];
                        const hasIssue = dimHasIssue(key);
                        return (
                            <div key={key} className={`p-3 rounded-lg border ${hasIssue ? 'bg-amber-50/40 border-amber-200' : 'bg-emerald-50/40 border-emerald-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">{group.icon}</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            {group.label}
                                        </span>
                                        <span className={`text-xs font-mono ${hasIssue ? 'text-amber-700' : 'text-emerald-700'}`}>
                                            {group.score}/{group.max}
                                        </span>
                                    </div>
                                    {hasIssue && onAutoFix && (
                                        <button
                                            onClick={() => onAutoFix(key)}
                                            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1 transition-colors"
                                            title="套用此維度嘅一鍵改善建議"
                                        >
                                            <Wand2 size={12} />
                                            📝 一鍵改善
                                        </button>
                                    )}
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                                    <div
                                        className={`h-full transition-all ${hasIssue ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                {sugs.length > 0 ? (
                                    <ul className="space-y-1">
                                        {sugs.map((s, i) => {
                                            const SevIcon = SEVERITY_ICON[s.severity] || Info;
                                            return (
                                                <li key={i} className={`text-xs p-2 rounded border ${SEVERITY_COLOR[s.severity] || SEVERITY_COLOR.info}`}>
                                                    <div className="flex items-start gap-1.5">
                                                        <SevIcon size={12} className="flex-shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <div className="font-bold">{s.message}</div>
                                                            {s.detail && <div className="opacity-80 mt-0.5">{s.detail}</div>}
                                                            {s.improvement && (
                                                                <div className="mt-1 italic opacity-90">
                                                                    💡 {s.improvement}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : hasIssue ? (
                                    <p className="text-xs text-slate-500 italic">
                                        呢個維度仲有改善空間但未提供具體建議。試下撳「一鍵改善」用 heuristic auto-fill。
                                    </p>
                                ) : (
                                    <p className="text-xs text-emerald-700">✓ 滿分，無需改善</p>
                                )}
                            </div>
                        );
                    })}
                    <div className="text-xs text-slate-400 text-center pt-2">
                        一鍵改善係 heuristic 自動填 (0 quota / 即時), 唔係 AI 生成。如要 AI 建議 → 撳 AI 按鈕。
                    </div>
                </div>
            )}
        </Card>
    );
};

// === F3 auto-fix helpers ===
// Pure functions, easy to test.
// Each takes current formData + returns new formData with one heuristic improvement.
// Goal: not perfect, but a meaningful nudge per dimension.
export const autoFixPurpose = (formData) => {
    if (formData.purpose?.trim()) return { changed: false };
    return { changed: true, patch: { purpose: '讓學生透過互動練習鞏固所學內容，並獲得即時回饋' } };
};

export const autoFixContext = (formData) => {
    if (formData.context?.trim()) return { changed: false };
    return { changed: true, patch: { context: `適用於${formData.subjectCategory || '本科'}課堂，目標年級為${formData.grade || '指定年級'}` } };
};

export const autoFixStructure = (formData) => {
    const patches = {};
    let changed = false;
    // Fill missing examples: ensure 3 example slots have text
    const examples = (formData.examples || []).slice(0, 3);
    if (examples.length === 0) {
        patches.examples = [
            { text: '簡單例子：基礎題目', level: '初階', count: 10, mechanism: '3選1答案' },
            { text: '中等例子：應用題目', level: '中階', count: 10, mechanism: '4選1答案' },
            { text: '困難例子：延伸題目', level: '高階', count: 10, mechanism: '輸入文字' },
        ];
        changed = true;
    }
    return { changed, patch: patches };
};

export const autoFixAccessibility = (formData) => {
    const patches = {};
    let changed = false;
    // If no SEN types selected, suggest ADHD (most common)
    if (!formData.senTypes || formData.senTypes.length === 0) {
        patches.senTypes = ['ADHD'];
        changed = true;
    }
    // If accessibility < 3, add common defaults
    if (!formData.accessibility || formData.accessibility.length < 3) {
        patches.accessibility = [
            '色彩對比 (WCAG AA 4.5:1)',
            '鍵盤導航 (Keyboard)',
            'Screen Reader 友善 (語意化 HTML + aria-label)',
        ];
        changed = true;
    }
    return { changed, patch: patches };
};

// Dispatch table for QualityAnalyzerPanel
export const autoFixByDim = (dim, formData) => {
    switch (dim) {
        case 'purpose':       return autoFixPurpose(formData);
        case 'context':       return autoFixContext(formData);
        case 'structure':     return autoFixStructure(formData);
        case 'accessibility': return autoFixAccessibility(formData);
        default:              return { changed: false };
    }
};