import React, { useState } from 'react';
import { History, Save, Trash2, GitCompare, X, RotateCcw } from 'lucide-react';
import { DiffView } from './DiffView.jsx';

// === VersionPanel ===
// Full modal/section for managing prompt versions:
//   - List existing versions (sortable by date desc)
//   - Save current (with custom label)
//   - Restore version → confirm dialog → setFormData + pushHistory
//   - Compare 2 versions → opens inline diff view
//
// Props:
//   theme
//   versions: array from usePromptVersions()
//   currentDesignPrompt, currentTechPrompt: live values
//   formData: current formData (for snapshot)
//   onSave(label, kind, snapshot)
//   onRestore(version): caller handles setFormData + pushHistory
//   onDelete(id)
//   onClose: close panel/modal
//   asModal: if true, render as centered modal; else inline section

export const VersionPanel = ({
    theme,
    versions = [],
    currentDesignPrompt,
    currentTechPrompt,
    formData,
    onSave,
    onRestore,
    onDelete,
    onClose,
    asModal = true,
}) => {
    const [saveLabel, setSaveLabel] = useState('');
    const [saveKind, setSaveKind] = useState('both');
    const [compareAId, setCompareAId] = useState('');
    const [compareBId, setCompareBId] = useState('');
    const [restoreCandidate, setRestoreCandidate] = useState(null);

    const handleSave = () => {
        if (!currentDesignPrompt && !currentTechPrompt) {
            alert('當前 design / tech prompt 都係空，冇嘢可以儲存。');
            return;
        }
        const id = onSave(saveLabel, saveKind, {
            designPrompt: currentDesignPrompt,
            techPrompt: currentTechPrompt,
            formData,
        });
        if (id) setSaveLabel('');
    };

    const compareA = versions.find(v => v.id === compareAId);
    const compareB = versions.find(v => v.id === compareBId);

    const handleRestoreClick = (version) => {
        if (!version.snapshot?.formData) {
            alert('呢個 version 冇 formData snapshot（早期儲存嘅），唔可以 restore。');
            return;
        }
        setRestoreCandidate(version);
    };

    const confirmRestore = () => {
        if (restoreCandidate && onRestore) {
            onRestore(restoreCandidate);
            setRestoreCandidate(null);
        }
    };

    // Theme tokens
    const cardBg = theme === 'warm' ? 'bg-white border-amber-300'
                  : 'bg-white border-slate-300';
    const textPri = theme === 'warm' ? 'text-amber-900' : 'text-slate-800';
    const textSec = theme === 'warm' ? 'text-amber-700' : 'text-slate-600';
    const inputBorder = 'border-slate-300 bg-white text-slate-800';
    const btnPri = 'bg-blue-600 text-white hover:bg-blue-700';
    const btnSec = 'bg-slate-100 text-slate-700 hover:bg-slate-200';

    const Wrapper = asModal ? 'div' : 'div';
    const wrapperClass = asModal
        ? 'fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-token-4'
        : '';

    return (
        <Wrapper className={wrapperClass} onClick={asModal ? onClose : undefined}>
            <div
                className={`${asModal ? 'w-full max-w-3xl max-h-[90vh] overflow-y-auto' : 'w-full'} rounded-2xl border p-token-6 ${cardBg} ${asModal ? 'shadow-2xl' : ''}`}
                onClick={asModal ? e => e.stopPropagation() : undefined}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-token-4">
                    <h3 className={`text-lg font-bold flex items-center gap-token-2 ${textPri}`}>
                        <History size={20} />
                        📚 Prompt 版本管理
                    </h3>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className={`p-1 rounded ${textSec} hover:opacity-80`}
                            aria-label="關閉版本管理"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Save new version */}
                <div className={`mb-token-4 p-token-3 rounded-lg border ${theme === 'warm' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50'}`}>
                    <label className={`block text-xs font-bold mb-2 ${textSec}`}>儲存當前 prompt 為新版本</label>
                    <div className="flex gap-token-2">
                        <input
                            type="text"
                            value={saveLabel}
                            onChange={e => setSaveLabel(e.target.value)}
                            placeholder={`例如：v1 初稿、加入 a11y 後、...`}
                            className={`flex-1 px-token-3 py-token-2 rounded-lg border text-sm outline-none ${inputBorder}`}
                        />
                        <select
                            value={saveKind}
                            onChange={e => setSaveKind(e.target.value)}
                            className={`px-token-2 py-token-2 rounded-lg border text-sm ${inputBorder}`}
                            aria-label="儲存範圍"
                        >
                            <option value="both">兩者</option>
                            <option value="design">Part 1 設計</option>
                            <option value="tech">Part 2 技術</option>
                        </select>
                        <button
                            onClick={handleSave}
                            className={`px-token-4 py-token-2 rounded-lg text-sm font-bold flex items-center gap-token-2 ${btnPri}`}
                        >
                            <Save size={14} />
                            儲存
                        </button>
                    </div>
                </div>

                {/* Compare 2 versions */}
                {versions.length >= 2 && (
                    <div className={`mb-token-4 p-token-3 rounded-lg border ${theme === 'warm' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50'}`}>
                        <label className={`block text-xs font-bold mb-2 flex items-center gap-token-2 ${textSec}`}>
                            <GitCompare size={14} />
                            比較兩個版本
                        </label>
                        <div className="flex gap-token-2 items-center flex-wrap">
                            <select
                                value={compareAId}
                                onChange={e => setCompareAId(e.target.value)}
                                className={`flex-1 min-w-[180px] px-token-2 py-token-2 rounded-lg border text-sm ${inputBorder}`}
                                aria-label="選擇版本 A"
                            >
                                <option value="">A: 揀版本...</option>
                                {versions.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.label} ({v.kind})
                                    </option>
                                ))}
                            </select>
                            <span className={textSec}>vs</span>
                            <select
                                value={compareBId}
                                onChange={e => setCompareBId(e.target.value)}
                                className={`flex-1 min-w-[180px] px-token-2 py-token-2 rounded-lg border text-sm ${inputBorder}`}
                                aria-label="選擇版本 B"
                            >
                                <option value="">B: 揀版本...</option>
                                {versions.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.label} ({v.kind})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Diff render */}
                {compareA && compareB && (
                    <div className="mb-token-4">
                        <DiffView
                            theme={theme}
                            textA={
                                compareA.snapshot.designPrompt + '\n\n--- Part 2 ---\n\n' + compareA.snapshot.techPrompt
                            }
                            textB={
                                compareB.snapshot.designPrompt + '\n\n--- Part 2 ---\n\n' + compareB.snapshot.techPrompt
                            }
                            labelA={compareA.label}
                            labelB={compareB.label}
                        />
                    </div>
                )}

                {/* Version list */}
                <div>
                    <label className={`block text-xs font-bold mb-2 ${textSec}`}>
                        已儲存版本 ({versions.length})
                    </label>
                    {versions.length === 0 ? (
                        <div className={`p-token-6 text-center text-sm rounded-lg border-2 border-dashed ${theme === 'warm' ? 'border-amber-300 text-amber-700' : 'border-slate-300 text-slate-500'}`}>
                            <div className="text-3xl mb-2">📚</div>
                            <p>仲未儲存任何版本</p>
                            <p className="text-xs mt-1 opacity-70">填完 form 後喺上面輸入標籤 + 撳「儲存」</p>
                        </div>
                    ) : (
                        <div className="space-y-token-2 max-h-[40vh] overflow-y-auto">
                            {versions.map(v => (
                                <div
                                    key={v.id}
                                    className={`p-token-3 rounded-lg border flex items-center justify-between gap-token-2 ${theme === 'warm' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold truncate ${textPri}`}>{v.label}</div>
                                        <div className={`text-xs ${textSec}`}>
                                            {new Date(v.createdAt).toLocaleString('zh-HK')} · {v.kind}
                                        </div>
                                    </div>
                                    <div className="flex gap-token-1 flex-none">
                                        {v.snapshot?.formData && (
                                            <button
                                                onClick={() => handleRestoreClick(v)}
                                                className={`p-token-2 rounded-lg ${btnSec}`}
                                                title="Restore formData 入當前 form"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (confirm(`刪除版本「${v.label}」？此動作無法復原。`)) {
                                                    onDelete(v.id);
                                                }
                                            }}
                                            className={`p-token-2 rounded-lg ${theme === 'warm' ? 'text-red-600 hover:bg-red-100' : 'text-red-600 hover:bg-red-50'}`}
                                            title="刪除版本"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Restore confirm dialog */}
                {restoreCandidate && (
                    <div className={`mt-token-4 p-token-3 rounded-lg border-2 ${theme === 'warm' ? 'border-orange-400 bg-orange-50' : 'border-orange-300 bg-orange-50'}`}>
                        <p className={`text-sm font-bold mb-2 ${textPri}`}>
                            ⚠️ 確認 Restore 版本「{restoreCandidate.label}」？
                        </p>
                        <p className={`text-xs mb-3 ${textSec}`}>
                            會將當前 formData 完整覆蓋成呢個版本嘅 formData（push 入 undo history）。Design / Tech prompt 都會重新計算。
                        </p>
                        <div className="flex gap-token-2 justify-end">
                            <button onClick={() => setRestoreCandidate(null)} className={`px-token-3 py-token-1.5 rounded-lg text-xs ${btnSec}`}>
                                取消
                            </button>
                            <button onClick={confirmRestore} className={`px-token-3 py-token-1.5 rounded-lg text-xs ${btnPri}`}>
                                ✓ Restore
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Wrapper>
    );};