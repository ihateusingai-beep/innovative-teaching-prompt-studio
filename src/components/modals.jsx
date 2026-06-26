import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, X } from 'lucide-react';

// === Modals: API Settings + Coach Mark + Confirm Replace ===

export const ApiSettingsModal = ({ theme, currentKey, onSave, onClose }) => {
    const [draftKey, setDraftKey] = useState(currentKey || '');
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
                className={`relative w-full max-w-md p-6 rounded-2xl ${theme === 'cyber' ? 'tech-border bg-slate-900' : 'plain-border bg-white'}`}
            >
                <button
                    onClick={onClose}
                    className={`absolute top-3 right-3 ${theme === 'cyber' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    aria-label="關閉"
                >
                    <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <Key size={24} className={theme === 'cyber' ? 'text-cyan-400' : 'text-blue-600'} />
                    <h3 className={`text-lg font-bold ${theme === 'cyber' ? 'text-cyan-200 orbitron' : 'text-slate-800'}`}>
                        Gemini API Key 設定
                    </h3>
                </div>
                <p className={`text-sm mb-4 ${theme === 'cyber' ? 'text-slate-400' : 'text-slate-600'}`}>
                    請輸入你的 Google Gemini API Key。Key 只會儲存喺你嘅瀏覽器 localStorage，唔會上傳任何 server。
                </p>
                <input
                    type="password"
                    value={draftKey}
                    onChange={e => setDraftKey(e.target.value)}
                    placeholder="AIza..."
                    className={`w-full px-4 py-3 rounded-xl outline-none mb-4 ${theme === 'cyber' ? 'tech-input' : 'plain-input'}`}
                />
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg font-bold ${theme === 'cyber' ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                    >
                        取消
                    </button>
                    <button
                        onClick={() => { onSave(draftKey); onClose(); }}
                        className={`px-4 py-2 rounded-lg font-bold ${theme === 'cyber' ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        儲存
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export const CoachMark = ({ theme, step, onNext, onSkip, total, index }) => {
    const steps = [
        {
            title: "👋 歡迎使用 TDA Prompt Builder",
            desc: "呢個工具幫助老師設計 AI 遊戲嘅詳細 prompt。等我哋 5 步帶你睇一圈，每步都唔使睇完可以隨時跳過。"
        },
        {
            title: "📋 一、形式與結構",
            desc: "第一區填基本設定：科目、類別、年級、學習目標。填完標題先可以解鎖 Part 2。"
        },
        {
            title: "🎮 二、遊戲設計",
            desc: "第二區填遊戲玩法、互動類型、規則、例子。AI 建議會自動出現喺右邊 — 唔需要識寫 prompt。"
        },
        {
            title: "✨ 三、優化與匯出",
            desc: "完成後右下角睇到品質分數（Quality Score），再 Copy / Download .docx 就可以用。"
        },
        {
            title: "🚀 自動儲存 + 復原",
            desc: "你嘅輸入每 1 秒自動儲存。唔小心關咗 browser？下次開返會問你要唔要復原。"
        }
    ];
    if (index >= steps.length) return null;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-5 rounded-2xl shadow-2xl ${theme === 'cyber' ? 'tech-border bg-slate-900' : 'plain-border bg-white'}`}
        >
            <div className="flex justify-between items-start mb-3">
                <h4 className={`font-bold ${theme === 'cyber' ? 'text-cyan-200 orbitron' : 'text-slate-800'}`}>
                    {steps[index].title}
                </h4>
                <span className={`text-xs ${theme === 'cyber' ? 'text-slate-500' : 'text-slate-400'}`}>
                    {index + 1} / {total}
                </span>
            </div>
            <p className={`text-sm mb-4 ${theme === 'cyber' ? 'text-slate-300' : 'text-slate-600'}`}>
                {steps[index].desc}
            </p>
            <div className="flex justify-between items-center">
                <button
                    onClick={onSkip}
                    className={`text-sm ${theme === 'cyber' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    跳過導覽
                </button>
                <div className="flex gap-2">
                    {index > 0 && (
                        <button
                            onClick={() => onNext(-1)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold ${theme === 'cyber' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'}`}
                        >
                            上一步
                        </button>
                    )}
                    <button
                        onClick={() => onNext(1)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold ${theme === 'cyber' ? 'bg-cyan-500 text-slate-900' : 'bg-blue-600 text-white'}`}
                    >
                        {index === total - 1 ? '完成' : '下一步'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export const ConfirmReplaceDialog = ({ theme, pendingText, onReplace, onAppend, onCancel }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
        onClick={onCancel}
    >
        <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-sm p-6 rounded-2xl ${theme === 'cyber' ? 'tech-border bg-slate-900' : 'plain-border bg-white'}`}
        >
            <h4 className={`font-bold mb-3 ${theme === 'cyber' ? 'text-cyan-200 orbitron' : 'text-slate-800'}`}>
                匯入衝突
            </h4>
            <p className={`text-sm mb-5 ${theme === 'cyber' ? 'text-slate-300' : 'text-slate-600'}`}>
                已有內容。要<span className="font-bold"> 取代 </span>現有資料，定<span className="font-bold"> 附加 </span>喺現有資料之後？
            </p>
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onCancel}
                    className={`px-3 py-1.5 rounded-lg text-sm ${theme === 'cyber' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'}`}
                >
                    取消
                </button>
                <button
                    onClick={onAppend}
                    className={`px-3 py-1.5 rounded-lg text-sm ${theme === 'cyber' ? 'bg-amber-500 text-slate-900' : 'bg-amber-500 text-white'}`}
                >
                    附加
                </button>
                <button
                    onClick={onReplace}
                    className={`px-3 py-1.5 rounded-lg text-sm ${theme === 'cyber' ? 'bg-cyan-500 text-slate-900' : 'bg-blue-600 text-white'}`}
                >
                    取代
                </button>
            </div>
        </motion.div>
    </motion.div>
);