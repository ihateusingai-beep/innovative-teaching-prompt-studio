import React, { useState } from 'react';
import { Users, Plus, Trash2, FileText, ChevronDown, ChevronUp, Sparkles, AlertCircle, Check } from 'lucide-react';
import { Card } from './ui.jsx';
import { COMMON_SEN_TYPES, MAX_NAME_LENGTH, MAX_NOTES_LENGTH, MAX_ROSTER_STUDENTS } from '../data/studentRosterSchema.js';

// === v3.16.0 F2: Class Roster Panel ===
// Inline collapsible panel shown on Assessment tab. Lets teacher:
//   - Add new student (name + senType + notes)
//   - View list of students with edit/delete
//   - Click a student → apply to current formData.assessment (populates fields)
//   - Bulk "Generate all prompts" (v3.16.0 F2 MVP — setFormData for each student sequentially)
//   - Bulk "Print all certs" (calls onPrintAllCerts — sequential cert modal renders)
//
// Deferred to Phase 3: CSV import, IndexedDB queue, sort + filter, drag-reorder.
export const RosterPanel = ({
    theme,
    roster = [],
    onAdd,
    onUpdate,
    onRemove,
    onApplyStudent,
    onBulkGenerateAll,
    onBulkPrintAllCerts,
}) => {
    const [expanded, setExpanded] = useState(true);
    const [addMode, setAddMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [name, setName] = useState('');
    const [senType, setSenType] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const reset = () => {
        setName('');
        setSenType('');
        setNotes('');
        setError('');
        setAddMode(false);
        setEditingId(null);
    };

    const handleSave = () => {
        const result = editingId
            ? onUpdate(editingId, { name, senType, notes })
            : onAdd(name, senType, notes);
        if (result?.ok === false) {
            setError(result.error || '儲存失敗');
            return;
        }
        reset();
    };

    const handleEdit = (student) => {
        setName(student.name);
        setSenType(student.senType || '');
        setNotes(student.notes || '');
        setEditingId(student.id);
        setAddMode(true);
        setError('');
    };

    return (
        <Card theme={theme} className="mt-4 overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                aria-expanded={expanded}
                aria-controls="roster-content"
            >
                <div className="flex items-center gap-2">
                    <Users size={16} className="text-purple-600" />
                    <span className="text-sm font-bold text-slate-800">
                        👥 班級 roster
                    </span>
                    <span className="text-xs text-slate-500">
                        ({roster.length} / {MAX_ROSTER_STUDENTS} 學生)
                    </span>
                </div>
                {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            {expanded && (
                <div id="roster-content" className="tda-fade-in border-t border-slate-200 p-4 space-y-3">
                    {/* Bulk action buttons */}
                    {roster.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-100">
                            {onBulkGenerateAll && (
                                <button
                                    onClick={onBulkGenerateAll}
                                    className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold flex items-center gap-1 transition-colors"
                                    title="逐一將每位學生嘅 assessment data 填入 formData，並 regen prompts"
                                >
                                    <Sparkles size={12} />
                                    ✨ 全部 generate ({roster.length} 人)
                                </button>
                            )}
                            {onBulkPrintAllCerts && (
                                <button
                                    onClick={onBulkPrintAllCerts}
                                    className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1 transition-colors"
                                    title="依序列印全班嘅奬狀"
                                >
                                    <FileText size={12} />
                                    🖨️ 全部列印奬狀 ({roster.length} 份)
                                </button>
                            )}
                        </div>
                    )}

                    {/* Add / Edit form */}
                    {addMode ? (
                        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                            {error && (
                                <div className="p-2 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                                    ⚠️ {error}
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-700">
                                        學生姓名 * (最多 {MAX_NAME_LENGTH} 字)
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        maxLength={MAX_NAME_LENGTH}
                                        placeholder="例: 張小明"
                                        className="w-full px-2 py-1.5 rounded border text-sm border-slate-300 bg-white"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 text-slate-700">
                                        SEN 類型 (可選)
                                    </label>
                                    <select
                                        value={senType}
                                        onChange={e => setSenType(e.target.value)}
                                        className="w-full px-2 py-1.5 rounded border text-sm border-slate-300 bg-white"
                                    >
                                        <option value="">— 揀一個 —</option>
                                        {COMMON_SEN_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-700">
                                    備註 (可選, 最多 {MAX_NOTES_LENGTH} 字)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    maxLength={MAX_NOTES_LENGTH}
                                    rows={2}
                                    placeholder="例: 課堂表現 / 學習風格 / 個別化目標"
                                    className="w-full px-2 py-1.5 rounded border text-sm resize-none border-slate-300 bg-white"
                                />
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={reset}
                                    className="flex-1 px-3 py-1.5 rounded font-bold text-sm bg-slate-200 text-slate-700 hover:bg-slate-300"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 px-3 py-1.5 rounded font-bold text-sm flex items-center justify-center gap-1 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Check size={12} />
                                    {editingId ? '儲存變更' : '新增學生'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setAddMode(true)}
                            disabled={roster.length >= MAX_ROSTER_STUDENTS}
                            className={`w-full px-3 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 transition-colors ${
                                roster.length >= MAX_ROSTER_STUDENTS
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 border-dashed'
                            }`}
                        >
                            <Plus size={14} />
                            {roster.length >= MAX_ROSTER_STUDENTS ? `已達上限 ${MAX_ROSTER_STUDENTS} 個學生` : '新增學生'}
                        </button>
                    )}

                    {/* Roster list */}
                    {roster.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center italic py-4">
                            班級 roster 空空如也。新增學生後可以一次過 generate + 列印全班奬狀。
                        </p>
                    ) : (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto">
                            {roster.map(student => {
                                const a = student.assessment || {};
                                const hasAssessment = a.totalQuestions > 0 || a.currentScore > 0;
                                return (
                                    <div
                                        key={student.id}
                                        className={`p-2 rounded-lg border ${hasAssessment ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'} flex items-center justify-between gap-2`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-800 truncate">{student.name}</span>
                                                {student.senType && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">
                                                        {student.senType}
                                                    </span>
                                                )}
                                                {hasAssessment && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                                                        ✓ 已評估 ({a.accuracyPercent || 0}%)
                                                    </span>
                                                )}
                                            </div>
                                            {student.notes && (
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{student.notes}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => onApplyStudent && onApplyStudent(student.id)}
                                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-bold"
                                                title="將呢位學生嘅 assessment 載入當前 formData"
                                            >
                                                <FileText size={10} className="inline mr-0.5" />
                                                載入
                                            </button>
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="text-xs px-2 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded"
                                                title="編輯姓名/SEN/備註"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={() => onRemove && onRemove(student.id)}
                                                className="text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded"
                                                title="刪除此學生"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};