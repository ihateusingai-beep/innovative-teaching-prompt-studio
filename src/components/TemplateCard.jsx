import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, X, FileText, Pencil, Trash2, Copy, Archive, ArchiveRestore } from 'lucide-react';
import { Card } from './ui.jsx';
import { formatTimeAgo } from '../utils/time.js';
import { TEMPLATE_CATEGORIES, MAX_USER_TAGS, MAX_NAME_LENGTH, MAX_DESC_LENGTH, MAX_TAG_LENGTH } from '../data/userTemplateSchema.js';

// === TemplateCard (F1) ===
// v3.15.0 F1: extracted from widgets.jsx, added category badge + tags + useCount + lastUsed
// + edit / duplicate / archive buttons (only when isUser=true).
// Backward compat: legacy templates without category/tags/useCount render without those badges.
export const TemplateCard = ({
    theme,
    template,
    onLoad,
    onEdit,
    onDuplicate,
    onArchive,
    onDelete,
    isUser = false,
    onShare,  // F1: base64-encoded export
}) => {
    const hasUsage = isUser && (template.useCount > 0 || template.lastUsed > 0);
    return (
        <div
            className={`p-token-4 rounded-xl border transition-all hover:scale-[1.02] ${
                'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
            }`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{template.icon || '⭐'}</span>
                    <h4 className={`text-sm font-bold truncate ${'text-slate-800'}`}>
                        {template.name}
                    </h4>
                    {isUser && (
                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${'bg-purple-100 text-purple-700'}`}>
                            自訂
                        </span>
                    )}
                    {template.archived && (
                        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${'bg-slate-200 text-slate-600'}`}>
                            已封存
                        </span>
                    )}
                </div>
            </div>
            {template.category && (
                <div className="mb-2">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-bold ${'bg-blue-100 text-blue-700'}`}>
                        📁 {template.category}
                    </span>
                </div>
            )}
            {template.description && (
                <p className={`text-xs mb-2 line-clamp-2 ${'text-slate-600'}`}>
                    {template.description}
                </p>
            )}
            {Array.isArray(template.tags) && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {template.tags.map((tag, i) => (
                        <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${'bg-emerald-100 text-emerald-700'}`}
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}
            {hasUsage && (
                <div className={`text-[10px] mb-2 flex items-center gap-2 ${'text-slate-500'}`}>
                    <span>📊 用咗 {template.useCount} 次</span>
                    {template.lastUsed > 0 && <span>· 上次 {formatTimeAgo(template.lastUsed)}</span>}
                </div>
            )}
            <div className="flex gap-1.5 flex-wrap">
                <button
                    onClick={() => onLoad(template)}
                    className={`flex-1 min-w-[60px] px-token-2 py-token-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                    <FileText size={12} />
                    載入
                </button>
                {isUser && onEdit && (
                    <button
                        onClick={() => onEdit(template)}
                        className={`px-token-2 py-token-1.5 rounded-lg text-xs ${'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                        title="編輯範本"
                    >
                        <Pencil size={12} />
                    </button>
                )}
                {isUser && onDuplicate && (
                    <button
                        onClick={() => onDuplicate(template.id)}
                        className={`px-token-2 py-token-1.5 rounded-lg text-xs ${'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'}`}
                        title="複製範本"
                    >
                        <Copy size={12} />
                    </button>
                )}
                {isUser && onArchive && (
                    <button
                        onClick={() => onArchive(template.id, !template.archived)}
                        className={`px-token-2 py-token-1.5 rounded-lg text-xs ${template.archived ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        title={template.archived ? '取消封存' : '封存範本'}
                    >
                        {template.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                    </button>
                )}
                {isUser && onShare && (
                    <button
                        onClick={() => onShare(template)}
                        className={`px-token-2 py-token-1.5 rounded-lg text-xs ${'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                        title="複製分享碼"
                    >
                        📤
                    </button>
                )}
                {isUser && onDelete && (
                    <button
                        onClick={() => onDelete(template.id)}
                        className={`px-token-2 py-token-1.5 rounded-lg text-xs ${'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        title="刪除範本"
                    >
                        <Trash2 size={12} />
                    </button>
                )}
            </div>
        </div>
    );
};

// === TemplateEditorModal (F1) ===
// Replaces native prompt()/alert() with proper form. Used for both create + edit.
export const TemplateEditorModal = ({
    theme,
    initialTemplate = null,  // null = create mode, object = edit mode
    onSave,
    onClose,
}) => {
    const isEdit = !!initialTemplate;
    const [name, setName] = useState(initialTemplate?.name || '');
    const [description, setDescription] = useState(initialTemplate?.description || '');
    const [category, setCategory] = useState(initialTemplate?.category || '');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState(initialTemplate?.tags || []);
    const [error, setError] = useState('');

    const handleAddTag = (raw) => {
        const t = String(raw || '').trim().slice(0, MAX_TAG_LENGTH);
        if (!t) return;
        if (tags.includes(t)) return;
        if (tags.length >= MAX_USER_TAGS) {
            setError(`最多 ${MAX_USER_TAGS} 個 tag`);
            return;
        }
        setTags([...tags, t]);
        setTagInput('');
        setError('');
    };

    const handleRemoveTag = (t) => setTags(tags.filter(x => x !== t));

    const handleSubmit = () => {
        const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed) {
            setError('請填範本名稱');
            return;
        }
        const result = onSave({
            name: trimmed,
            description: description.slice(0, MAX_DESC_LENGTH),
            category,
            tags,
        });
        if (result && result.ok === false) {
            setError(result.error || '儲存失敗');
            return;
        }
        onClose();
    };

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
                className="w-full max-w-md"
            >
                <Card theme={theme} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-bold flex items-center gap-2 ${'text-slate-800'}`}>
                            {isEdit ? <Pencil size={20} className="text-amber-600" /> : <Save size={20} className="text-blue-600" />}
                            {isEdit ? '編輯範本' : '新增範本'}
                        </h3>
                        <button onClick={onClose} className={`p-1 rounded ${'text-slate-500 hover:bg-slate-100'}`}>
                            <X size={18} />
                        </button>
                    </div>

                    {error && (
                        <div className={`mb-3 p-2 rounded text-xs font-bold ${'bg-red-50 text-red-700 border border-red-200'}`}>
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div>
                            <label className={`block text-xs font-bold mb-1 ${'text-slate-700'}`}>
                                範本名稱 * (最多 {MAX_NAME_LENGTH} 字)
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={MAX_NAME_LENGTH}
                                placeholder="例：ADHD 練習工具"
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${'border-slate-300 bg-white'}`}
                                autoFocus
                            />
                            <div className={`text-[10px] mt-1 text-right ${'text-slate-400'}`}>
                                {name.length}/{MAX_NAME_LENGTH}
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-bold mb-1 ${'text-slate-700'}`}>
                                簡短描述 (可選, 最多 {MAX_DESC_LENGTH} 字)
                            </label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={MAX_DESC_LENGTH}
                                rows={2}
                                placeholder="例：給小一專注力不足學生嘅加法練習"
                                className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${'border-slate-300 bg-white'}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold mb-1 ${'text-slate-700'}`}>
                                範疇 (可選)
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${'border-slate-300 bg-white'}`}
                            >
                                <option value="">— 揀一個 —</option>
                                {TEMPLATE_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-xs font-bold mb-1 ${'text-slate-700'}`}>
                                標籤 (最多 {MAX_USER_TAGS} 個, 每個 ≤ {MAX_TAG_LENGTH} 字)
                            </label>
                            <div className="flex gap-2 mb-2 flex-wrap">
                                {tags.map(t => (
                                    <span
                                        key={t}
                                        className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${'bg-emerald-100 text-emerald-700'}`}
                                    >
                                        #{t}
                                        <button
                                            onClick={() => handleRemoveTag(t)}
                                            className="hover:text-red-500"
                                        >
                                            ✕
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        handleAddTag(tagInput);
                                    }
                                }}
                                onBlur={() => tagInput && handleAddTag(tagInput)}
                                maxLength={MAX_TAG_LENGTH}
                                placeholder="輸入後撳 Enter 加 tag"
                                className={`w-full px-3 py-2 rounded-lg border text-sm ${'border-slate-300 bg-white'}`}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button
                            onClick={onClose}
                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm ${'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            <Save size={14} />
                            {isEdit ? '儲存變更' : '建立範本'}
                        </button>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
};
