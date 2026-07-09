import React from 'react';
import { X, FileJson, AlertCircle, CheckCircle2, ArrowRight, Undo2 } from 'lucide-react';
import { Card } from './ui.jsx';

// === v3.15.0 A3: ImportDiffModal ===
// Shows user what changed during JSON import. Renders per-field status:
//   ok / migrated / fallback / auto-fill / missing / failed
// Pure prop-driven — receives pre-computed diff data from parent.
export const ImportDiffModal = ({
    theme,
    fileName,
    fieldStatus = {},          // { key: 'ok' | 'migrated' | 'fallback' | 'auto-fill' | 'missing' | 'failed' }
    warnings = [],
    schemaVersion,
    legacyExtra = {},
    onConfirm,                  // user clicks "Apply" — calls parent's apply
    onClose,                    // user clicks "Cancel"
    onUndo,                     // user clicks "Undo" (only if already applied)
    isApplied = false,          // true = "Undo Import" instead of "Apply"
}) => {
    // Group fields by status for compact display
    const groups = {
        'migrated': [],
        'auto-fill': [],
        'fallback': [],
        'missing': [],
        'failed': [],
        'ok': [],
    };
    Object.entries(fieldStatus).forEach(([k, status]) => {
        if (groups[status]) groups[status].push(k);
    });
    const totalChanged = groups.migrated.length + groups['auto-fill'].length + groups.fallback.length + groups.failed.length;
    const labelMap = {
        migrated: { icon: '🔄', label: '自動轉換', color: 'amber' },
        'auto-fill': { icon: '🪄', label: '自動填入', color: 'cyan' },
        fallback: { icon: '⚠️', label: '用預設取代', color: 'red' },
        missing: { icon: '➖', label: '使用預設', color: 'slate' },
        failed: { icon: '❌', label: '失敗', color: 'red' },
        ok: { icon: '✓', label: '原樣匯入', color: 'emerald' },
    };
    return (
        <div
            className="tda-fade-in fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="tda-scale-in w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <Card theme={theme} className="p-6 flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${'text-slate-800'}`}>
                            <FileJson size={20} className="text-blue-600" />
                            匯入變更預覽 {schemaVersion ? `(v${schemaVersion})` : ''}
                        </h3>
                        <button onClick={onClose} className={`p-1 rounded ${'text-slate-500 hover:bg-slate-100'}`}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className={`text-xs mb-3 ${'text-slate-500'}`}>
                        <span className="font-bold">📄 {fileName || '未命名檔案'}</span>
                        {' · '}
                        <span>{Object.keys(fieldStatus).length} 個欄位</span>
                        {' · '}
                        <span className={totalChanged > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {totalChanged} 個有變化
                        </span>
                    </div>

                    {/* Warning messages section */}
                    {warnings.length > 0 && (
                        <div className={`p-2 rounded mb-3 text-xs ${'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                            <p className="font-bold mb-1 flex items-center gap-1">
                                <AlertCircle size={12} />
                                警告 ({warnings.length})
                            </p>
                            <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                                {warnings.slice(0, 10).map((w, i) => (
                                    <li key={i}>• {w}</li>
                                ))}
                                {warnings.length > 10 && <li className="italic">... 仲有 {warnings.length - 10} 項</li>}
                            </ul>
                        </div>
                    )}

                    {/* Per-field status — only show non-ok ones by default to keep compact */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {Object.entries(groups).map(([status, fields]) => {
                            if (fields.length === 0) return null;
                            const meta = labelMap[status];
                            return (
                                <div key={status} className={`p-2 rounded border ${'bg-slate-50 border-slate-200'}`}>
                                    <div className={`text-xs font-bold mb-1 flex items-center gap-1 ${'text-slate-700'}`}>
                                        <span>{meta.icon}</span>
                                        {meta.label} ({fields.length})
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {fields.map(f => (
                                            <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                                meta.color === 'red' ? 'bg-red-100 text-red-700' :
                                                meta.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                                                meta.color === 'cyan' ? 'bg-cyan-100 text-cyan-700' :
                                                meta.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-200 text-slate-700'
                                            }`}>
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Legacy extra fields (unknown to current schema) */}
                        {Object.keys(legacyExtra).length > 0 && (
                            <div className={`p-2 rounded border ${'bg-purple-50 border-purple-200'}`}>
                                <div className={`text-xs font-bold mb-1 ${'text-purple-700'}`}>
                                    📦 保留舊版未知欄位 ({Object.keys(legacyExtra).length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {Object.keys(legacyExtra).map(k => (
                                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-purple-100 text-purple-700">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200">
                        <button
                            onClick={onClose}
                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm ${'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                        >
                            取消
                        </button>
                        {isApplied && onUndo ? (
                            <button
                                onClick={onUndo}
                                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${'bg-orange-500 text-white hover:bg-orange-600'}`}
                            >
                                <Undo2 size={14} />
                                ↩️ 撤銷匯入
                            </button>
                        ) : (
                            <button
                                onClick={onConfirm}
                                disabled={groups.failed.length > 0}
                                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                                    groups.failed.length > 0
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {groups.failed.length > 0
                                    ? <>❌ 有 {groups.failed.length} 個失敗</>
                                    : <><ArrowRight size={14} />確認匯入</>}
                            </button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
