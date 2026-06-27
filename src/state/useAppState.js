// === useAppState Hook ===
// 集中 App 嘅所有 state + handlers + helpers
// App.jsx 純 render 用
//
// 重要：useUndoRedo keyboard shortcuts / useAutosave / useFormData 已經喺 sub-hooks
// 呢度 join 埋 context 唔再重複
//
// W1-2 refactor:
//   - activeTab (取代 step gate，always-mounted 4 tabs)
//   - lastVisitedTab 落 localStorage
//   - recovery snackbar auto-dismiss (10s) 而唔係 modal block
//   - 加返所有 v2 → v3 refactor 漏咗嘅 helper (toggleSection, applySuggestion,
//     saveAsUserTemplate, deleteUserTemplate, confirmReplace/Append/Cancel, saveApiKey)
//   - Quality Score always computed (for header badge)

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Gamepad2, HeartHandshake, MessageCircle, FlaskConical } from 'lucide-react';

import { getInitialFormData, migrateFormData } from '../data/schema.js';
import { getSuggestions } from '../data/suggestions.js';
import { BUILTIN_TEMPLATES } from '../data/templates.js';
import { getRecommendedA11y } from '../data/sen-a11y-map.js';
import { generateDesignPrompt, generateTechPrompt } from '../prompts/generators.jsx';
import promptScorer from '../data/scorer.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { generateWithGemini } from '../utils/gemini.js';
import { saveToStorage, loadFromStorage, removeFromStorage } from '../utils/storage.js';
import { formatTimeAgo } from '../utils/time.js';
import { handleExportDOCX } from '../utils/docx.js';

import { useFormData } from '../hooks/useFormData.js';
import { useAutosave } from '../hooks/useAutosave.js';
import { useUndoRedo } from '../hooks/useUndoRedo.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { usePromptVersions } from '../hooks/usePromptVersions.js';
import { useProfileBank } from '../hooks/useProfileBank.js';

// === Option arrays (kept inline because they reference icon components) ===
const categories = [
    { value: "教學工具", label: "📚 教學工具", icon: BookOpen },
    { value: "教學遊戲", label: "🎮 教學遊戲", icon: Gamepad2 },
    { value: "情緒支援", label: "❤️ 情緒支援", icon: HeartHandshake },
    { value: "溝通輔助", label: "🗣️ 溝通輔助", icon: MessageCircle },
    { value: "實驗模擬", label: "🧪 實驗模擬", icon: FlaskConical },
];

const subjects = ["語文", "數學", "英文", "人文", "科學", "生活技能", "電腦", "班主任課", "其他"];

// User-saved templates 數量上限（避免 localStorage quota）
const MAX_USER_TEMPLATES = 50;

// === Prompt Versions (W5-6) ===
// 老師 prompt snapshot — 支援 version history + diff view
// 由獨立 hook 管理（usePromptVersions）以保持 useAppState 嘅清晰度

// Tab keys — Tabs 模式取代 step gate
// 4 個 tab 對應原本 4 個 step，但永遠可以自由跳
const TAB_KEYS = ['basic', 'content', 'rules', 'generate'];
const DEFAULT_TAB = 'basic';
const LAST_TAB_STORAGE_KEY = 'TDA_LAST_TAB_V1';

// Tab 完成度計法 — 用嚟顯示 badge "N/12"
const TAB_FIELDS = {
    basic: ['teacherName', 'toolName', 'category', 'subjectCategory', 'grade', 'senTypes'],
    content: ['purpose', 'context', 'examples'],
    rules: ['rules', 'accessibility', 'learningDiversity', 'interactionType'],
    generate: [], // 完成 = 按下 "複製 Part 1/2" / "下載" → 無 input field 強制要求
};

// Field 算「填咗」嘅判斷
const isFieldFilled = (formData, key) => {
    const v = formData[key];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return true; // boolean 唔當 required
    return false;
};

export const useAppState = () => {
    // === Form state ===
    const formState = useFormData();
    const { formData, setFormData, updateField, toggleSelection, handleExampleChange, addExample, removeExample, handleRuleChange, addRule, removeRule } = formState;

    // === UI state ===
    const [activeTab, setActiveTab] = useState(() => {
        return loadFromStorage(LAST_TAB_STORAGE_KEY, DEFAULT_TAB);
    });
    const [copiedDesign, setCopiedDesign] = useState(false);
    const [copiedTech, setCopiedTech] = useState(false);
    const [showScoreDetail, setShowScoreDetail] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        // Phase 1.1 Tab 1 sub-section collapse state
        templateLibrary: true,
        basic: true,
        subject: true,
        gameStyle: true,
        examples: true,
        student: false, // 預設收埋（advanced）
    });
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTab, setPreviewTab] = useState("design");
    const [theme, setTheme] = useState('plain');
    // v3.2: 2-way cycle plain ↔ warm (cyber theme classes retained as noop aliases)
    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            if (prev === 'plain') return 'warm';
            return 'plain';
        });
    }, []);
    const [onboardingStep, setOnboardingStep] = useState(null);
    const [onboardingActive, setOnboardingActive] = useState(false);
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);
    const [pendingSuggestion, setPendingSuggestion] = useState(null);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState('');
    const [aiError, setAiError] = useState(null);
    const [showApiSettings, setShowApiSettings] = useState(false);

    // Recovery snackbar 狀態 — 用嚟 auto-dismiss
    const [recoveryDismissed, setRecoveryDismissed] = useState(false);

    // === Persistent storage hooks ===
    const [userTemplates, setUserTemplates] = useLocalStorage('TDA_USER_TEMPLATES_V1', []);
    const [geminiApiKey, setGeminiApiKey] = useLocalStorage('TDA_GEMINI_API_KEY_V1', '');
    const [onboardingDone, setOnboardingDone] = useLocalStorage('TDA_ONBOARDING_DONE_V1', false);

    // === W5-6: Prompt Versions hook ===
    const promptVersions = usePromptVersions();

    // === W5-6: Version panel modal state ===
    const [versionPanelOpen, setVersionPanelOpen] = useState(false);

    // === W7-8: SEN Student Profile Bank ===
    const profileBank = useProfileBank();
    const [profileBankOpen, setProfileBankOpen] = useState(false);

    const fileInputRef = useRef(null);

    // === Theme sync to <body> className === (W3-4.1: 3-way theme)
    useEffect(() => {
        document.body.classList.remove('theme-cyber', 'theme-plain', 'theme-warm');
        document.body.classList.add('theme-' + theme);
    }, [theme]);

    // === Active tab → localStorage ===
    useEffect(() => {
        saveToStorage(LAST_TAB_STORAGE_KEY, activeTab);
    }, [activeTab]);

    // === Autosave + Recovery ===
    const { lastSavedAt, recoverySnapshot, acceptRecovery, dismissRecovery, clearAutosave } = useAutosave(formData);

    // Recovery snackbar 自動消失 — 10 秒後默認 keep working
    useEffect(() => {
        if (!recoverySnapshot) {
            setRecoveryDismissed(false);
            return;
        }
        if (recoveryDismissed) return;
        const timer = setTimeout(() => {
            // 老師 10 秒冇反應 → 默認 keep current formData (auto-save 持續)
            // dismissRecovery 會清 localStorage entry，避免下次 reload 重複彈
            dismissRecovery();
            setRecoveryDismissed(true);
        }, 10000);
        return () => clearTimeout(timer);
    }, [recoverySnapshot, recoveryDismissed, dismissRecovery]);

    // === Undo/Redo ===
    const { canUndo, canRedo, pushHistory, undo, redo } = useUndoRedo(formData, setFormData);

    // === Onboarding gate ===
    useEffect(() => {
        if (onboardingDone === false) {
            setOnboardingActive(true);
            setOnboardingStep(0);
        }
    }, [onboardingDone]);

    // === A11y auto-fill ===
    useEffect(() => {
        const recommended = getRecommendedA11y(formData.senTypes || []);
        const current = formData.accessibility || [];
        const merged = Array.from(new Set([...current, ...recommended]));
        if (merged.length !== current.length) {
            updateField('accessibility', merged);
        }
    }, [formData.senTypes]);

    // === Tab navigation (取代 step gate) ===
    const setTab = useCallback((tab) => {
        if (!TAB_KEYS.includes(tab)) return;
        setActiveTab(tab);
        pushHistory(); // 每個 tab 切換 = milestone（用嚟 undo 跨 tab 嘅轉變）
    }, [pushHistory]);

    const handleNextTab = useCallback(() => {
        const idx = TAB_KEYS.indexOf(activeTab);
        if (idx < TAB_KEYS.length - 1) {
            setTab(TAB_KEYS[idx + 1]);
        }
    }, [activeTab, setTab]);

    const handlePrevTab = useCallback(() => {
        const idx = TAB_KEYS.indexOf(activeTab);
        if (idx > 0) {
            setTab(TAB_KEYS[idx - 1]);
        }
    }, [activeTab, setTab]);

    // === Section collapse toggle ===
    const toggleSection = useCallback((section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    }, []);

    // === Tab 完成度計算（每個 tab "N/M filled"） ===
    const tabCompletion = useMemo(() => {
        const result = {};
        for (const tab of TAB_KEYS) {
            const fields = TAB_FIELDS[tab];
            if (fields.length === 0) {
                result[tab] = { filled: 0, total: 0, complete: false };
                continue;
            }
            const filled = fields.filter(f => isFieldFilled(formData, f)).length;
            result[tab] = { filled, total: fields.length, complete: filled === fields.length };
        }
        return result;
    }, [formData]);

    // === Copy to clipboard helpers ===
    const handleCopyDesign = useCallback(async () => {
        const text = generateDesignPrompt(formData);
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedDesign(true);
            setTimeout(() => setCopiedDesign(false), 2000);
        }
    }, [formData]);

    const handleCopyTech = useCallback(async () => {
        const text = generateTechPrompt(formData);
        const ok = await copyToClipboard(text);
        if (ok) {
            setCopiedTech(true);
            setTimeout(() => setCopiedTech(false), 2000);
        }
    }, [formData]);

    // === DOCX export ===
    const handleExport = useCallback(async () => {
        try {
            await handleExportDOCX(formData);
        } catch (err) {
            alert('❌ DOCX 匯出失敗：' + err.message);
        }
    }, [formData]);

    // === Gemini direct generation ===
    const handleGeminiGenerate = useCallback(async () => {
        if (!geminiApiKey) {
            setShowApiSettings(true);
            return;
        }
        setAiGenerating(true);
        setAiError(null);
        setAiResult('');
        try {
            const fullPrompt = generateDesignPrompt(formData) + "\n\n---\n\n" + generateTechPrompt(formData);
            const result = await generateWithGemini(fullPrompt, geminiApiKey, (chunk) => {
                setAiResult(prev => prev + chunk);
            });
            setAiResult(result);
        } catch (err) {
            setAiError(err.message || 'Unknown error');
        } finally {
            setAiGenerating(false);
        }
    }, [formData, geminiApiKey]);

    // === Gemini API key save (for ApiSettingsModal) ===
    const saveApiKey = useCallback((newKey) => {
        setGeminiApiKey(newKey);
    }, [setGeminiApiKey]);

    // === Save current as user template ===
    const saveAsUserTemplate = useCallback((name, description) => {
        if (userTemplates.length >= MAX_USER_TEMPLATES) {
            alert(`已達上限 ${MAX_USER_TEMPLATES} 個範本，請刪除舊範本後再儲存。`);
            return false;
        }
        const newTemplate = {
            id: 'user_' + Date.now(),
            name,
            description: description || `${formData.category} · ${formData.subjectCategory}`,
            data: { ...formData },
            createdAt: Date.now(),
        };
        setUserTemplates([...userTemplates, newTemplate]);
        return true;
    }, [formData, userTemplates, setUserTemplates]);

    const handleSaveTemplate = useCallback(() => {
        // Legacy alias — 保留以防有舊 call site
        const name = prompt('為呢個 template 命名：');
        if (!name) return;
        const newTemplate = {
            id: 'user_' + Date.now(),
            name,
            icon: '⭐',
            description: `${formData.category} · ${formData.subjectCategory}`,
            data: { ...formData },
        };
        setUserTemplates([...userTemplates, newTemplate]);
    }, [formData, userTemplates, setUserTemplates]);

    // === Delete user template ===
    const deleteUserTemplate = useCallback((id) => {
        if (!confirm('刪除呢個 template？')) return;
        setUserTemplates(userTemplates.filter(t => t.id !== id));
    }, [userTemplates, setUserTemplates]);

    // === Load template ===
    const handleLoadTemplate = useCallback((template) => {
        pushHistory();
        if (template.data) {
            setFormData({ ...getInitialFormData(), ...template.data });
        } else {
            // Built-in template — uses data shape { ...initial }
            setFormData({ ...getInitialFormData(), ...template });
        }
        setActiveTab('basic');
    }, [setFormData, pushHistory]);

    const handleDeleteTemplate = useCallback((id) => {
        if (!confirm('刪除呢個 template？')) return;
        setUserTemplates(userTemplates.filter(t => t.id !== id));
    }, [userTemplates, setUserTemplates]);

    // === JSON import ===
    const handleImportJSON = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                const migrated = migrateFormData(parsed);
                const { __schema_version, __legacy_extra, __warnings, ...cleanFormData } = migrated;
                if (Object.keys(formData).some(k => formData[k] && (Array.isArray(formData[k]) ? formData[k].length > 0 : formData[k] !== ''))) {
                    // Has existing data — show replace/append dialog
                    setPendingSuggestion({
                        type: 'import',
                        data: cleanFormData,
                        warnings: __warnings,
                    });
                } else {
                    pushHistory();
                    setFormData(cleanFormData);
                    if (__warnings && __warnings.length > 0) {
                        alert('⚠️ Import 警告：\n' + __warnings.join('\n'));
                    }
                }
            } catch (err) {
                alert('❌ JSON 解析失敗：' + err.message);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset so same file can be re-imported
    }, [formData, setFormData, pushHistory]);

    // === Confirm replace/append dialog handlers ===
    const confirmReplace = useCallback(() => {
        if (!pendingSuggestion || pendingSuggestion.type !== 'import') return;
        pushHistory();
        setFormData(pendingSuggestion.data);
        if (pendingSuggestion.warnings && pendingSuggestion.warnings.length > 0) {
            alert('⚠️ Import 警告：\n' + pendingSuggestion.warnings.join('\n'));
        }
        setPendingSuggestion(null);
    }, [pendingSuggestion, pushHistory, setFormData]);

    const confirmAppend = useCallback(() => {
        if (!pendingSuggestion || pendingSuggestion.type !== 'import') return;
        pushHistory();
        // Append: 將 imported 嘅 arrays merge 入現有 data（不覆蓋已有 non-empty fields）
        setFormData(prev => {
            const merged = { ...prev };
            for (const [key, value] of Object.entries(pendingSuggestion.data)) {
                if (Array.isArray(value) && Array.isArray(prev[key])) {
                    merged[key] = Array.from(new Set([...prev[key], ...value]));
                } else if (typeof value === 'string' && (!prev[key] || prev[key].length === 0)) {
                    merged[key] = value;
                } else if (typeof value === 'boolean') {
                    // boolean 直接 overwrite
                    merged[key] = value;
                }
                // 其他情況（已有 value）→ 保留原值
            }
            return merged;
        });
        if (pendingSuggestion.warnings && pendingSuggestion.warnings.length > 0) {
            alert('⚠️ Import 警告：\n' + pendingSuggestion.warnings.join('\n'));
        }
        setPendingSuggestion(null);
    }, [pendingSuggestion, pushHistory, setFormData]);

    const cancelSuggestion = useCallback(() => {
        setPendingSuggestion(null);
    }, []);

    // === JSON export ===
    const handleExportJSON = useCallback(() => {
        const payload = {
            __schema_version: 2,
            ...formData,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tda_prompt_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [formData]);

    // === AI Suggestions (apply) ===
    const handleGetSuggestions = useCallback((field) => {
        const candidates = getSuggestions(field, formData);
        if (candidates.length > 0) {
            setActiveSuggestionField(field);
        }
    }, [formData]);

    const applySuggestion = useCallback((field, text) => {
        if (field === 'rules') {
            const newRules = [...formData.rules, text];
            updateField('rules', newRules);
        } else if (field === 'examples') {
            const newExamples = [...formData.examples, {
                text,
                level: formData.examples[formData.examples.length - 1]?.level || "初階",
                count: 10,
                mechanism: "3選1答案",
            }];
            updateField('examples', newExamples);
        } else {
            updateField(field, text);
        }
        setActiveSuggestionField(null);
    }, [formData, updateField]);

    const handleSelectSuggestion = useCallback((candidate) => {
        if (activeSuggestionField === 'rules') {
            const newRules = [...formData.rules, candidate.text];
            updateField('rules', newRules);
        } else if (activeSuggestionField === 'examples') {
            const newExamples = [...formData.examples, {
                text: candidate.text,
                level: formData.examples[formData.examples.length - 1]?.level || "初階",
                count: 10,
                mechanism: "3選1答案",
            }];
            updateField('examples', newExamples);
        } else {
            updateField(activeSuggestionField, candidate.text);
        }
        setActiveSuggestionField(null);
    }, [activeSuggestionField, formData, updateField]);

    // === CoachMark nav ===
    const handleCoachNext = useCallback((delta) => {
        setOnboardingStep(prev => {
            const next = (prev || 0) + delta;
            if (next >= 5) {
                setOnboardingActive(false);
                setOnboardingDone(true);
                return null;
            }
            return next;
        });
    }, [setOnboardingDone]);

    const handleCoachSkip = useCallback(() => {
        setOnboardingActive(false);
        setOnboardingDone(true);
    }, [setOnboardingDone]);

    // === Reset all ===
    const handleReset = useCallback(() => {
        if (!confirm('確定要重設所有資料？')) return;
        pushHistory();
        setFormData(getInitialFormData());
        setActiveTab('basic');
        clearAutosave();
    }, [setFormData, pushHistory, clearAutosave]);

    // === File input trigger ===
    const triggerJSONImport = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    // === Recovery snackbar handlers ===
    const handleAcceptRecovery = useCallback(() => {
        const result = acceptRecovery();
        if (result && result.cleanFormData) {
            setFormData(result.cleanFormData);
            if (result.warnings && result.warnings.length > 0) {
                alert('⚠️ 載入警告：\n' + result.warnings.join('\n'));
            }
        }
        setRecoveryDismissed(true);
    }, [acceptRecovery, setFormData]);

    // === W5-6: Restore version (set formData + push history) ===
    const restoreVersion = useCallback((version) => {
        if (!version || !version.snapshot || !version.snapshot.formData) {
            alert('呢個版本冇 formData snapshot，唔可以 restore。');
            return;
        }
        pushHistory();
        setFormData(version.snapshot.formData);
        // Auto-close panel after restore
        setVersionPanelOpen(false);
    }, [pushHistory, setFormData]);

    // === W7-8: Apply profile (merge preset into current formData) ===
    // Merge 規則：
    //   - arrays (senTypes, accessibility, learningDiversity) → union merge
    //   - strings (grade, subjectCategory, category) → 只喺現有空白時先覆蓋
    //   - customNotes → push 入 rules 作為備註（唔覆蓋 rules 已有內容）
    const applyProfile = useCallback((profile) => {
        if (!profile || !profile.preset) return;
        pushHistory();
        setFormData(prev => {
            const merged = { ...prev };
            for (const [key, value] of Object.entries(profile.preset)) {
                if (Array.isArray(value) && Array.isArray(prev[key])) {
                    merged[key] = Array.from(new Set([...prev[key], ...value]));
                } else if (typeof value === 'string') {
                    if (!prev[key] || prev[key].trim().length === 0) {
                        merged[key] = value;
                    }
                }
            }
            // customNotes → append to rules as a comment-like rule
            if (profile.customNotes && profile.customNotes.trim()) {
                const noteLine = `[Profile 備註：${profile.name}] ${profile.customNotes.trim()}`;
                merged.rules = Array.isArray(merged.rules) ? [...merged.rules, noteLine] : [noteLine];
            }
            return merged;
        });
        // Auto-close panel after apply
        setProfileBankOpen(false);
    }, [pushHistory, setFormData]);

    // === Computed values ===
    const designPrompt = useMemo(() => generateDesignPrompt(formData), [formData]);
    const techPrompt = useMemo(() => generateTechPrompt(formData), [formData]);
    const qualityScore = useMemo(() => promptScorer(formData), [formData]);

    return {
        // Form state
        formData,
        setFormData,
        updateField,
        toggleSelection,
        handleExampleChange,
        addExample,
        removeExample,
        handleRuleChange,
        addRule,
        removeRule,
        // Tab nav (W1-2 取代 step)
        activeTab,
        setActiveTab: setTab,
        setTab,
        handleNextTab,
        handlePrevTab,
        tabCompletion,
        TAB_KEYS,
        // UI state
        copiedDesign,
        copiedTech,
        showScoreDetail,
        setShowScoreDetail,
        expandedSections,
        setExpandedSections,
        toggleSection,
        previewOpen,
        setPreviewOpen,
        previewTab,
        setPreviewTab,
        theme,
        setTheme,
        toggleTheme,
        onboardingStep,
        onboardingActive,
        setOnboardingActive,
        activeSuggestionField,
        setActiveSuggestionField,
        pendingSuggestion,
        setPendingSuggestion,
        aiGenerating,
        aiResult,
        aiError,
        showApiSettings,
        setShowApiSettings,
        // Persistent
        userTemplates,
        geminiApiKey,
        setGeminiApiKey,
        fileInputRef,
        // Recovery / autosave (W1-2: snackbar 取代 modal)
        lastSavedAt,
        recoverySnapshot,
        acceptRecovery: handleAcceptRecovery,
        dismissRecovery,
        // Undo / Redo
        canUndo,
        canRedo,
        pushHistory,
        undo,
        redo,
        // Handlers
        handleCopyDesign,
        handleCopyTech,
        handleExport,
        handleGeminiGenerate,
        saveApiKey,
        handleSaveTemplate,
        saveAsUserTemplate,
        handleLoadTemplate,
        handleDeleteTemplate,
        deleteUserTemplate,
        handleImportJSON,
        handleExportJSON,
        handleGetSuggestions,
        applySuggestion,
        handleSelectSuggestion,
        handleCoachNext,
        handleCoachSkip,
        handleReset,
        confirmReplace,
        confirmAppend,
        cancelSuggestion,
        // W5-6: Prompt Versions
        promptVersions,
        versionPanelOpen,
        setVersionPanelOpen,
        restoreVersion,
        // W7-8: Student Profile Bank
        profileBank,
        profileBankOpen,
        setProfileBankOpen,
        applyProfile,
        // Computed
        designPrompt,
        techPrompt,
        qualityScore,
        // Constants
        categories,
        subjects,
        builtinTemplates: BUILTIN_TEMPLATES,
        MAX_USER_TEMPLATES,
        triggerJSONImport,
        showGameStyle: formData.category === '教學遊戲',
        showExamples: ['教學遊戲', '教學工具', '實驗模擬'].includes(formData.category),
    };
};