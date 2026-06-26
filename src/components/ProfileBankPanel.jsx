import React, { useState, useRef } from 'react';
import { Users, Lock, Plus, Trash2, Edit3, X, Download, Upload, Check, Eye, EyeOff, Sparkles } from 'lucide-react';

// === ProfileBankPanel ===
// Full modal for managing encrypted SEN student profile bank.
//
// 3 個 view states:
//   1. GATE — 未設 vault / locked: 顯示 setup or unlock form
//   2. LIST — unlocked: 顯示 profile list + add / import / export / lock button
//   3. EDIT — 加新 / 改現有 profile form
//
// Props:
//   theme
//   bank: useProfileBank() return object
//   formData: current formData (用嚟 prefill preset)
//   onApplyProfile(profile): caller 負責 merge formData
//   onClose
//   asModal: centered modal vs inline (default true)

const SEN_LABELS = [
    'ADHD 專注力不足/過度活躍',
    'ASD 自閉症譜系',
    '讀寫困難 (Dyslexia)',
    '數學障礙 (Dyscalculia)',
    '智障 / 認知發展遲緩',
    '聽障',
    '視障',
    '肢體傷殘',
    '語言障礙',
    '情緒行為問題',
];

const GRADES = [
    "小學一年級 (P1)", "小學二年級 (P2)", "小學三年級 (P3)",
    "小學四年級 (P4)", "小學五年級 (P5)", "小學六年級 (P6)",
    "中學一年級 (S1)", "中學二年級 (S2)", "中學三年級 (S3)",
    "中學四年級 (S4)", "中學五年級 (S5)", "中學六年級 (S6)",
];

const PRESET_FIELDS = [
    { key: 'category', label: '範疇', type: 'text' },
    { key: 'subjectCategory', label: '科目', type: 'text' },
    { key: 'grade', label: '年級', type: 'select', options: GRADES },
    { key: 'senTypes', label: 'SEN 類型', type: 'multi-select', options: SEN_LABELS },
    { key: 'accessibility', label: 'a11y 維度', type: 'text' },
    { key: 'learningDiversity', label: '學習差異', type: 'text' },
];

export const ProfileBankPanel = ({
    theme,
    bank,
    formData,
    onApplyProfile,
    onClose,
    asModal = true,
}) => {
    const {
        vaultExists,
        isLocked,
        profiles,
        hasProfiles,
        MAX_PROFILES,
        lastError,
        setup,
        unlock,
        lock,
        addProfile,
        updateProfile,
        deleteProfile,
        exportEncrypted,
        importEncrypted,
    } = bank;

    const [view, setView] = useState(isLocked ? 'gate' : 'list');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [gateError, setGateError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', senTypes: [], grade: '', customNotes: '' });
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const [applyCandidate, setApplyCandidate] = useState(null);

    const fileInputRef = useRef(null);

    // === Theme tokens ===
    const cardBg = theme === 'cyber' ? 'bg-slate-900 border-cyan-500/30'
                  : theme === 'warm' ? 'bg-white border-amber-300'
                  : 'bg-white border-slate-300';
    const textPri = theme === 'cyber' ? 'text-slate-200' : theme === 'warm' ? 'text-amber-900' : 'text-slate-800';
    const textSec = theme === 'cyber' ? 'text-slate-400' : theme === 'warm' ? 'text-amber-700' : 'text-slate-600';
    const inputBorder = theme === 'cyber' ? 'border-slate-700 bg-slate-800/50 text-cyan-100'
                       : theme === 'warm' ? 'border-amber-300 bg-white text-amber-900'
                       : 'border-slate-300 bg-white text-slate-800';
    const btnPri = theme === 'cyber' ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400'
                  : theme === 'warm' ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700';
    const btnSec = theme === 'cyber' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : theme === 'warm' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200';

    const wrapperClass = asModal
        ? 'fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-token-4'
        : '';

    // === Gate: setup or unlock ===
    const handleSetup = async () => {
        setGateError(null);
        if (passphrase.length < 8) {
            setGateError('Passphrase 至少 8 個字元。');
            return;
        }
        if (passphrase !== confirmPassphrase) {
            setGateError('兩次輸入嘅 passphrase 唔一致。');
            return;
        }
        setSubmitting(true);
        const result = await setup(passphrase);
        setSubmitting(false);
        if (result.success) {
            setPassphrase('');
            setConfirmPassphrase('');
            setView('list');
        } else {
            setGateError(result.error);
        }
    };

    const handleUnlock = async () => {
        setGateError(null);
        if (!passphrase) {
            setGateError('請輸入 passphrase。');
            return;
        }
        setSubmitting(true);
        const result = await unlock(passphrase);
        setSubmitting(false);
        if (result.success) {
            setPassphrase('');
            setView('list');
        } else {
            setGateError(result.error);
        }
    };

    // === List view: add new ===
    const handleStartAdd = () => {
        setEditForm({
            name: '',
            senTypes: formData.senTypes ? [...formData.senTypes] : [],
            grade: formData.grade || '',
            customNotes: '',
        });
        setEditingId('__new__');
    };

    const handleStartEdit = (profile) => {
        setEditForm({
            name: profile.name,
            senTypes: profile.preset?.senTypes ? [...profile.preset.senTypes] : [],
            grade: profile.preset?.grade || '',
            customNotes: profile.customNotes || '',
        });
        setEditingId(profile.id);
    };

    const handleSaveEdit = async () => {
        if (!editForm.name.trim()) {
            alert('請輸入 profile 名（學生全名 / 代號）。');
            return;
        }
        setSubmitting(true);
        const preset = {
            senTypes: editForm.senTypes,
            grade: editForm.grade,
        };
        let result;
        if (editingId === '__new__') {
            result = await addProfile(editForm.name, preset, editForm.customNotes);
        } else {
            result = await updateProfile(editingId, {
                name: editForm.name,
                preset,
                customNotes: editForm.customNotes,
            });
        }
        setSubmitting(false);
        if (result.success) {
            setEditingId(null);
            setEditForm({ name: '', senTypes: [], grade: '', customNotes: '' });
        } else {
            alert('儲存失敗：' + result.error);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteCandidate) return;
        const result = await deleteProfile(deleteCandidate.id);
        setDeleteCandidate(null);
        if (!result.success) {
            alert('刪除失敗：' + result.error);
        }
    };

    const handleApplyConfirm = () => {
        if (!applyCandidate || !onApplyProfile) return;
        onApplyProfile(applyCandidate);
        setApplyCandidate(null);
    };

    // === Export ===
    const handleExport = () => {
        const data = exportEncrypted();
        if (!data) {
            alert('冇 vault 可以 export。');
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tda_profile_bank_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // === Import ===
    const handleImport = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleImportFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                const mode = confirm(
                    '選擇 Import 模式：\n\n' +
                    '• 按確定 = Replace（完全覆蓋現有 vault）\n' +
                    '• 按取消 = Merge（暫未實作）\n\n' +
                    '⚠️ Replace 會清空當前 vault 嘅所有 profile。'
                ) ? 'replace' : 'merge';
                const result = await importEncrypted(parsed, mode);
                if (result.success) {
                    if (result.mode === 'replace' && result.requiresUnlock) {
                        alert('✅ Vault 已替換。請重新輸入新 vault 嘅 passphrase 解鎖。');
                        setView('gate');
                        setEditingId(null);
                    }
                } else {
                    alert('❌ Import 失敗：' + result.error);
                }
            } catch (err) {
                alert('❌ JSON 解析失敗：' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // === Render gate view ===
    const renderGate = () => (
        <div className="space-y-token-4">
            <div className={`p-token-3 rounded-lg border ${
                theme === 'cyber' ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100'
                : theme === 'warm' ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
                <div className="flex items-start gap-token-2">
                    <Lock size={16} className="flex-none mt-0.5" />
                    <div className="text-sm">
                        <strong>{vaultExists ? '解鎖 Profile Bank' : '設定 Profile Bank Passphrase'}</strong>
                        <p className="text-xs mt-1 opacity-80">
                            {vaultExists
                                ? '輸入你之前設定嘅 passphrase 嚟解鎖已加密嘅 profile。'
                                : '第一次使用需要設定 passphrase。Profile 嘅名稱、SEN 設定、自訂備註 全部會用呢個 passphrase 加密。'}
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <label className={`block text-xs font-bold mb-1 ${textSec}`}>
                    Passphrase (至少 8 個字元)
                </label>
                <div className="relative">
                    <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={passphrase}
                        onChange={e => setPassphrase(e.target.value)}
                        placeholder="例如：student-bank-2026"
                        className={`w-full px-token-3 py-token-2 pr-10 rounded-lg border text-sm outline-none ${inputBorder}`}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassphrase(s => !s)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded ${textSec} hover:opacity-80`}
                        aria-label={showPassphrase ? '隱藏 passphrase' : '顯示 passphrase'}
                    >
                        {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            </div>

            {!vaultExists && (
                <div>
                    <label className={`block text-xs font-bold mb-1 ${textSec}`}>
                        確認 Passphrase
                    </label>
                    <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={confirmPassphrase}
                        onChange={e => setConfirmPassphrase(e.target.value)}
                        placeholder="再輸入一次"
                        className={`w-full px-token-3 py-token-2 rounded-lg border text-sm outline-none ${inputBorder}`}
                    />
                </div>
            )}

            {gateError && (
                <div className={`p-token-3 rounded-lg text-sm ${
                    theme === 'cyber' ? 'bg-red-900/30 border border-red-500/40 text-red-200'
                    : theme === 'warm' ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                    ❌ {gateError}
                </div>
            )}

            <button
                onClick={vaultExists ? handleUnlock : handleSetup}
                disabled={submitting}
                className={`w-full px-token-4 py-token-2 rounded-lg font-bold flex items-center justify-center gap-token-2 ${btnPri} ${submitting ? 'opacity-50 cursor-wait' : ''}`}
            >
                {submitting ? '⏳ 處理中...' : (vaultExists ? '🔓 解鎖' : '🔐 設定並解鎖')}
            </button>

            {!vaultExists && (
                <p className={`text-xs ${textSec} text-center`}>
                    ⚠️ Passphrase 唔會儲存。如果你忘記咗，所有 profile 都無法復原。
                </p>
            )}
        </div>
    );

    // === Render list view ===
    const renderList = () => (
        <div className="space-y-token-4">
            {/* Toolbar */}
            <div className={`flex flex-wrap gap-token-2 p-token-3 rounded-lg border ${
                theme === 'cyber' ? 'border-slate-700 bg-slate-800/30'
                : theme === 'warm' ? 'border-amber-200 bg-amber-50/40'
                : 'border-slate-200 bg-slate-50'
            }`}>
                <button
                    onClick={handleStartAdd}
                    disabled={profiles.length >= MAX_PROFILES}
                    className={`flex-1 min-w-[120px] px-token-3 py-token-2 rounded-lg text-sm font-bold flex items-center justify-center gap-token-2 ${btnPri} ${profiles.length >= MAX_PROFILES ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Plus size={14} />
                    新增 Profile
                </button>
                <button
                    onClick={handleImport}
                    className={`px-token-3 py-token-2 rounded-lg text-sm font-bold flex items-center gap-token-2 ${btnSec}`}
                    title="從 JSON 檔案 import 外部 vault"
                >
                    <Upload size={14} />
                    Import
                </button>
                <button
                    onClick={handleExport}
                    disabled={profiles.length === 0}
                    className={`px-token-3 py-token-2 rounded-lg text-sm font-bold flex items-center gap-token-2 ${btnSec} ${profiles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Export 當前 vault 做加密 JSON"
                >
                    <Download size={14} />
                    Export
                </button>
                <button
                    onClick={() => { lock(); setView('gate'); }}
                    className={`px-token-3 py-token-2 rounded-lg text-sm font-bold flex items-center gap-token-2 ${theme === 'cyber' ? 'bg-red-900/40 text-red-300 hover:bg-red-900/60' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                    title="Lock vault (清 key，但唔清 vault data)"
                >
                    <Lock size={14} />
                    Lock
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                />
            </div>

            {/* Profile list */}
            <div>
                <label className={`block text-xs font-bold mb-2 ${textSec}`}>
                    已儲存 Profile ({profiles.length} / {MAX_PROFILES})
                </label>
                {profiles.length === 0 ? (
                    <div className={`p-token-6 text-center text-sm rounded-lg border-2 border-dashed ${
                        theme === 'cyber' ? 'border-slate-700 text-slate-500'
                        : theme === 'warm' ? 'border-amber-300 text-amber-700'
                        : 'border-slate-300 text-slate-500'
                    }`}>
                        <div className="text-3xl mb-2">👤</div>
                        <p>仲未儲存任何 profile</p>
                        <p className="text-xs mt-1 opacity-70">撳「新增 Profile」開始儲存第一個學生設定</p>
                    </div>
                ) : (
                    <div className="space-y-token-2 max-h-[40vh] overflow-y-auto">
                        {profiles.map(p => (
                            <div
                                key={p.id}
                                className={`p-token-3 rounded-lg border ${
                                    theme === 'cyber' ? 'border-slate-700 bg-slate-800/40'
                                    : theme === 'warm' ? 'border-amber-200 bg-amber-50/40'
                                    : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-token-2">
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold truncate ${textPri}`}>{p.name}</div>
                                        <div className={`text-xs ${textSec} mt-0.5`}>
                                            {p.preset?.grade || '未設年級'} ·
                                            {p.preset?.senTypes?.length
                                                ? ` ${p.preset.senTypes.length} 個 SEN`
                                                : ' 未設 SEN'}
                                        </div>
                                        {p.customNotes && (
                                            <div className={`text-xs mt-1 italic ${textSec} line-clamp-2`}>
                                                "{p.customNotes}"
                                            </div>
                                        )}
                                        <div className={`text-[10px] mt-1 ${textSec} opacity-70`}>
                                            {new Date(p.updatedAt).toLocaleString('zh-HK')}
                                        </div>
                                    </div>
                                    <div className="flex gap-token-1 flex-none">
                                        <button
                                            onClick={() => setApplyCandidate(p)}
                                            className={`p-token-2 rounded-lg ${btnSec}`}
                                            title="套用呢個 profile 到當前 form"
                                        >
                                            <Sparkles size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleStartEdit(p)}
                                            className={`p-token-2 rounded-lg ${btnSec}`}
                                            title="編輯"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteCandidate(p)}
                                            className={`p-token-2 rounded-lg ${theme === 'cyber' ? 'text-red-400 hover:bg-red-900/30' : theme === 'warm' ? 'text-red-600 hover:bg-red-100' : 'text-red-600 hover:bg-red-50'}`}
                                            title="刪除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Apply confirm dialog */}
            {applyCandidate && (
                <div className={`p-token-3 rounded-lg border-2 ${theme === 'cyber' ? 'border-amber-500/50 bg-amber-900/20' : theme === 'warm' ? 'border-orange-400 bg-orange-50' : 'border-orange-300 bg-orange-50'}`}>
                    <p className={`text-sm font-bold mb-2 ${textPri}`}>
                        ✨ 套用 Profile「{applyCandidate.name}」？
                    </p>
                    <p className={`text-xs mb-3 ${textSec}`}>
                        會將 SEN 類型 + 年級 merge 到當前 formData（已有嘅設定會保留）。Custom notes 唔會自動填入。
                    </p>
                    <div className="flex gap-token-2 justify-end">
                        <button onClick={() => setApplyCandidate(null)} className={`px-token-3 py-token-1.5 rounded-lg text-xs ${btnSec}`}>
                            取消
                        </button>
                        <button onClick={handleApplyConfirm} className={`px-token-3 py-token-1.5 rounded-lg text-xs ${btnPri}`}>
                            ✓ 套用
                        </button>
                    </div>
                </div>
            )}

            {/* Delete confirm dialog */}
            {deleteCandidate && (
                <div className={`p-token-3 rounded-lg border-2 ${theme === 'cyber' ? 'border-red-500/50 bg-red-900/20' : theme === 'warm' ? 'border-red-400 bg-red-50' : 'border-red-300 bg-red-50'}`}>
                    <p className={`text-sm font-bold mb-2 ${textPri}`}>
                        ⚠️ 確認刪除 Profile「{deleteCandidate.name}」？
                    </p>
                    <p className={`text-xs mb-3 ${textSec}`}>
                        此動作無法復原（push 入 undo history 但無法 undo 加密 vault 嘅修改）。
                    </p>
                    <div className="flex gap-token-2 justify-end">
                        <button onClick={() => setDeleteCandidate(null)} className={`px-token-3 py-token-1.5 rounded-lg text-xs ${btnSec}`}>
                            取消
                        </button>
                        <button onClick={handleDeleteConfirm} className={`px-token-3 py-token-1.5 rounded-lg text-xs ${theme === 'cyber' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                            🗑 刪除
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    // === Render edit form ===
    const renderEdit = () => {
        const isNew = editingId === '__new__';
        return (
            <div className="space-y-token-4">
                <div className={`p-token-3 rounded-lg border ${
                    theme === 'cyber' ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-100'
                    : theme === 'warm' ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                    <div className="text-sm">
                        <strong>{isNew ? '新增 Profile' : '編輯 Profile'}</strong>
                        <p className="text-xs mt-1 opacity-80">
                            Profile 會加密儲存喺本地 browser vault。
                        </p>
                    </div>
                </div>

                <div>
                    <label className={`block text-xs font-bold mb-1 ${textSec}`}>學生名 / 代號</label>
                    <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="例如：小明 (P3 ADHD)"
                        className={`w-full px-token-3 py-token-2 rounded-lg border text-sm outline-none ${inputBorder}`}
                        autoFocus
                    />
                </div>

                <div>
                    <label className={`block text-xs font-bold mb-1 ${textSec}`}>年級</label>
                    <select
                        value={editForm.grade}
                        onChange={e => setEditForm(prev => ({ ...prev, grade: e.target.value }))}
                        className={`w-full px-token-3 py-token-2 rounded-lg border text-sm ${inputBorder}`}
                    >
                        <option value="">未指定</option>
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>

                <div>
                    <label className={`block text-xs font-bold mb-2 ${textSec}`}>
                        SEN 類型 [可多選]
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-token-2">
                        {SEN_LABELS.map(label => (
                            <button
                                key={label}
                                onClick={() => {
                                    setEditForm(prev => ({
                                        ...prev,
                                        senTypes: prev.senTypes.includes(label)
                                            ? prev.senTypes.filter(s => s !== label)
                                            : [...prev.senTypes, label],
                                    }));
                                }}
                                className={`p-token-2 rounded-lg text-xs font-medium transition-all border text-left ${
                                    editForm.senTypes.includes(label)
                                        ? (theme === 'cyber'
                                            ? 'border-emerald-500 bg-emerald-900/30 text-emerald-200 ring-1 ring-emerald-500'
                                            : 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500')
                                        : (theme === 'cyber'
                                            ? 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-emerald-500/40'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300')
                                }`}
                            >
                                {editForm.senTypes.includes(label) && <Check size={12} className="inline mr-1" />}
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={`block text-xs font-bold mb-1 ${textSec}`}>
                        自訂備註 (Custom Notes)
                    </label>
                    <textarea
                        value={editForm.customNotes}
                        onChange={e => setEditForm(prev => ({ ...prev, customNotes: e.target.value }))}
                        placeholder="例如：專注力短，要分段；唔食藥；..."
                        rows={3}
                        className={`w-full px-token-3 py-token-2 rounded-lg border text-sm outline-none resize-y ${inputBorder}`}
                    />
                </div>

                <div className="flex gap-token-2 justify-end">
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setEditForm({ name: '', senTypes: [], grade: '', customNotes: '' });
                        }}
                        className={`px-token-4 py-token-2 rounded-lg text-sm font-bold ${btnSec}`}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSaveEdit}
                        disabled={submitting}
                        className={`px-token-4 py-token-2 rounded-lg text-sm font-bold flex items-center gap-token-2 ${btnPri} ${submitting ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {submitting ? '⏳ 加密中...' : '🔒 加密並儲存'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={wrapperClass} onClick={asModal ? onClose : undefined}>
            <div
                className={`${asModal ? 'w-full max-w-2xl max-h-[90vh] overflow-y-auto' : 'w-full'} rounded-2xl border p-token-6 ${cardBg} ${asModal ? 'shadow-2xl' : ''}`}
                onClick={asModal ? e => e.stopPropagation() : undefined}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-token-4">
                    <h3 className={`text-lg font-bold flex items-center gap-token-2 ${theme === 'cyber' ? 'text-cyan-200 orbitron' : textPri}`}>
                        <Users size={20} />
                        👤 學生 Profile Bank
                    </h3>
                    <div className="flex items-center gap-token-2">
                        {!isLocked && (
                            <span className={`text-xs px-token-2 py-0.5 rounded-full ${
                                theme === 'cyber' ? 'bg-emerald-900/50 text-emerald-300'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                🔓 已解鎖
                            </span>
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                className={`p-1 rounded ${textSec} hover:opacity-80`}
                                aria-label="關閉 Profile Bank"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content by view */}
                {view === 'gate' && renderGate()}
                {view === 'list' && (editingId ? renderEdit() : renderList())}
            </div>
        </div>
    );
};