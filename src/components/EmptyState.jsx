import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, BookOpen, Target, Gamepad2, Trophy, BarChart3, FileText, AlertCircle } from 'lucide-react';
import { Card } from './ui.jsx';

// === v3.16.0 U2: EmptyState Component ===
// Reusable empty-state with lucide icon + encouragement text + primary CTA.
// Used at tab level (or sub-section level) to guide first-time users.
//
// Props:
//   icon: lucide icon component (e.g. Target)
//   title: short headline (e.g. '先設定工具名')
//   description: 1-line encouragement (e.g. '畀個名呢個工具，老師同學生先搵到')
//   ctaLabel: primary button text (e.g. '去基本資料填寫')
//   onCtaClick: () => void
//   ctaHint: optional secondary text under button
//   variant: 'plain' | 'amber' | 'cyan' (color theme)
export const EmptyState = ({
    icon: Icon,
    title,
    description,
    ctaLabel,
    onCtaClick,
    ctaHint,
    variant = 'plain',
}) => {
    const colorMap = {
        plain: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500', btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
        cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'text-cyan-600', btn: 'bg-cyan-500 hover:bg-cyan-600 text-white' },
    };
    const c = colorMap[variant] || colorMap.plain;
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card theme="plain" className={`p-8 text-center ${c.bg} ${c.border} border-2 border-dashed`}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${c.bg} ${c.icon}`}>
                    {Icon && <Icon size={32} strokeWidth={1.5} />}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${'text-slate-800'}`}>
                    {title}
                </h3>
                {description && (
                    <p className={`text-sm mb-4 max-w-md mx-auto ${'text-slate-600'}`}>
                        {description}
                    </p>
                )}
                {ctaLabel && onCtaClick && (
                    <button
                        onClick={onCtaClick}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors ${c.btn}`}
                    >
                        {ctaLabel}
                        <ArrowRight size={14} />
                    </button>
                )}
                {ctaHint && (
                    <p className={`text-xs mt-3 ${'text-slate-500'}`}>
                        {ctaHint}
                    </p>
                )}
            </Card>
        </motion.div>
    );
};

// === U2 preset configurations per tab ===
// 5 tabs: basic / content / rules / assessment / generate
// Each preset returns props for EmptyState — caller decides whether to render
// (e.g. based on formData fields being empty)
export const EMPTY_STATE_PRESETS = {
    basic: {
        icon: Target,
        title: '先設定你嘅教學工具',
        description: '畀個名呢個工具，揀埋範疇同科目 — 後面嘅步驟就會自動 fill 啱你嘅場景。',
        ctaLabel: '填寫工具名稱',
        ctaHint: '或者由「範本庫」載入一個現成範本更快',
        variant: 'plain',
        // 顯示條件: toolName + purpose 都空白
        isEmpty: (formData) => !formData.toolName?.trim() && !formData.purpose?.trim(),
    },
    content: {
        icon: BookOpen,
        title: '寫低核心用途 + 範例題目',
        description: 'AI 愈知道你想要咩，生成嘅工具就愈貼近你課堂需要。',
        ctaLabel: '去內容設定',
        ctaHint: '至少寫一句核心用途，再加 3 個難度嘅範例',
        variant: 'plain',
        isEmpty: (formData) => !formData.purpose?.trim() || (formData.examples || []).every(e => !e.text?.trim()),
    },
    rules: {
        icon: Gamepad2,
        title: '設定操作規則',
        description: '定義學生點樣用呢個工具 — 答啱 / 答錯 / 完成嘅回饋。',
        ctaLabel: '去規則設定',
        ctaHint: '預設有 3 條操作規則，可以直接用或者改寫',
        variant: 'plain',
        isEmpty: (formData) => {
            const userRules = (formData.rules || []).filter(r => r?.text?.trim() && !r.__isDefault);
            return userRules.length === 0;
        },
    },
    assessment: {
        icon: BarChart3,
        title: '記錄學生表現',
        description: '填寫評估數據後可以出奬狀、追蹤進步。',
        ctaLabel: '填寫評估',
        ctaHint: '之後可以喺「生成」tab 出一份客製化奬狀',
        variant: 'cyan',
        isEmpty: (formData) => !formData.assessment?.studentName?.trim() && !formData.assessment?.totalQuestions,
    },
    generate: {
        icon: Sparkles,
        title: '準備好就可以生成',
        description: '基本資料 + 內容填好後，撳「生成」就會出 prompt 設計同技術指引。',
        ctaLabel: '去基本資料',
        ctaHint: '或者由範本庫載入一個完整範本',
        variant: 'amber',
        isEmpty: (formData) => !formData.toolName?.trim() || !formData.purpose?.trim(),
    },
};

// Helper: given activeTab + formData, return preset (or null if not empty)
export const getEmptyStateForTab = (activeTab, formData) => {
    const preset = EMPTY_STATE_PRESETS[activeTab];
    if (!preset) return null;
    if (preset.isEmpty && !preset.isEmpty(formData)) return null;
    return preset;
};