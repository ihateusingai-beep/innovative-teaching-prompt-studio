import React from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, FileText, Sparkles } from 'lucide-react';
import { Card } from './ui.jsx';

// === Quality Score Badge ===
// Compact score badge shown in bottom-right corner of each section
// Click to open QualityScoreDetail modal
// W3-4.1: 加 warm third case (amber palette)
const scoreColor = (grade, theme) => {
    if (grade === 'S' || grade === 'A') return theme === 'warm' ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : theme === 'dark' ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : theme === 'contrast' ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : theme === 'paper' ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : theme === 'reactor' ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : 'bg-emerald-100 text-emerald-700 border-emerald-500';
    if (grade === 'B') return theme === 'warm' ? 'bg-amber-100 text-amber-800 border-amber-400' : theme === 'dark' ? 'bg-cyan-100 text-cyan-700 border-cyan-500' : theme === 'contrast' ? 'bg-cyan-100 text-cyan-700 border-cyan-500' : theme === 'paper' ? 'bg-cyan-100 text-cyan-700 border-cyan-500' : theme === 'reactor' ? 'bg-cyan-100 text-cyan-700 border-cyan-500' : 'bg-cyan-100 text-cyan-700 border-cyan-500';
    if (grade === 'C') return theme === 'warm' ? 'bg-orange-100 text-orange-800 border-orange-400' : theme === 'dark' ? 'bg-amber-100 text-amber-700 border-amber-500' : theme === 'contrast' ? 'bg-amber-100 text-amber-700 border-amber-500' : theme === 'paper' ? 'bg-amber-100 text-amber-700 border-amber-500' : theme === 'reactor' ? 'bg-amber-100 text-amber-700 border-amber-500' : 'bg-amber-100 text-amber-700 border-amber-500';
    return theme === 'warm' ? 'bg-orange-50 text-orange-700 border-orange-300' : theme === 'dark' ? 'bg-slate-100 text-slate-600 border-slate-400' : theme === 'contrast' ? 'bg-slate-100 text-slate-600 border-slate-400' : theme === 'paper' ? 'bg-slate-100 text-slate-600 border-slate-400' : theme === 'reactor' ? 'bg-slate-100 text-slate-600 border-slate-400' : 'bg-slate-100 text-slate-600 border-slate-400';
};

export const QualityScoreBadge = ({ theme, score, onClick }) => (
    <button
        onClick={onClick}
        className={`px-token-3 py-token-2 rounded-xl font-bold text-sm border transition-all hover:scale-105 ${scoreColor(score.grade, theme)}`}
        title="Click 睇詳細評分"
    >
        <Star size={14} className="inline mr-1" />
        {score.grade} · {score.total}/100
    </button>
);

// === Quality Score Detail Modal ===
export const QualityScoreDetail = ({ theme, score, onClose }) => {
    const categories = [
        { key: 'completeness', label: '完整度', icon: '📋' },
        { key: 'clarity', label: '清晰度', icon: '💡' },
        { key: 'specificity', label: '具體度', icon: '🎯' },
        { key: 'pedagogy', label: '教學度', icon: '📚' },
    ];
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-md p-6 rounded-2xl ${'plain-border bg-white'}`}
            >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${'text-slate-800'}`}>
                    <Star size={20} className={'text-blue-600'} />
                    品質評分詳情
                </h3>
                <div className={`text-4xl font-bold mb-4 text-center ${'text-blue-700'}`}>
                    {score.grade} · {score.total}/100
                </div>
                <div className="space-y-3 mb-4">
                    {categories.map(cat => (
                        <div key={cat.key} className={`flex items-center justify-between p-token-3 rounded-lg ${'bg-slate-50'}`}>
                            <span className={`text-sm font-bold ${'text-slate-700'}`}>
                                {cat.icon} {cat.label}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className={`w-32 h-2 rounded-full overflow-hidden ${'bg-slate-200'}`}>
                                    <div
                                        className={`h-full transition-all ${scoreColor(score.grade, theme).split(' ')[0]}`}
                                        style={{ width: `${score[cat.key] || 0}%` }}
                                    ></div>
                                </div>
                                <span className={`text-sm font-bold w-10 text-right ${'text-blue-700'}`}>
                                    {score[cat.key] || 0}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                {score.suggestions && score.suggestions.length > 0 && (
                    <div className={`p-token-3 rounded-lg ${'bg-amber-50 border border-amber-200'}`}>
                        <p className={`text-xs font-bold mb-1 ${'text-amber-700'}`}>
                            💡 改善建議
                        </p>
                        <ul className={`text-xs space-y-1 ${'text-slate-600'}`}>
                            {score.suggestions.map((s, i) => (
                                <li key={i}>• {s}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <button
                    onClick={onClose}
                    className={`w-full mt-4 px-4 py-2 rounded-lg font-bold ${'bg-blue-600 text-white'}`}
                >
                    知道了
                </button>
            </motion.div>
        </motion.div>
    );
};

// === Template Card ===
export const TemplateCard = ({ theme, template, onLoad, onDelete, isUser }) => (
    <div
        className={`p-token-4 rounded-xl border transition-all hover:scale-[1.02] ${
            'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
        }`}
    >
        <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
                <span className="text-xl">{template.icon}</span>
                <h4 className={`text-sm font-bold ${'text-slate-800'}`}>
                    {template.name}
                </h4>
                {isUser && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${'bg-purple-100 text-purple-700'}`}>
                        自訂
                    </span>
                )}
            </div>
        </div>
        <p className={`text-xs mb-3 line-clamp-2 ${'text-slate-600'}`}>
            {template.description}
        </p>
        <div className="flex gap-2">
            <button
                onClick={() => onLoad(template)}
                className={`flex-1 px-token-3 py-token-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
            >
                <FileText size={12} />
                載入
            </button>
            {isUser && onDelete && (
                <button
                    onClick={() => onDelete(template.id)}
                    className={`px-token-2 py-token-1.5 rounded-lg text-xs ${'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    title="刪除 template"
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    </div>
);

// === AI Suggestion Panel ===
export const SuggestionPanel = ({ theme, field, candidates, onSelect, onClose }) => (
    <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`mt-2 p-token-3 rounded-lg border ${'bg-blue-50 border-blue-300'}`}
    >
        <div className="flex justify-between items-center mb-2">
            <span className={`text-xs font-bold flex items-center gap-1 ${'text-blue-700'}`}>
                <Sparkles size={12} />
                AI 建議 ({candidates.length})
            </span>
            <button
                onClick={onClose}
                className={`text-xs ${'text-slate-500 hover:text-slate-700'}`}
                aria-label="關閉"
            >
                ✕
            </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
            {candidates.map((c, i) => (
                <button
                    key={i}
                    onClick={() => onSelect(c)}
                    className={`w-full text-left p-token-2 rounded-lg text-xs transition-colors ${'bg-white hover:bg-blue-100 text-slate-700'}`}
                >
                    <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 ${'text-blue-600'}`}>{i + 1}.</span>
                        <span className="flex-1">{c.text}</span>
                    </div>
                </button>
            ))}
        </div>
    </motion.div>
);