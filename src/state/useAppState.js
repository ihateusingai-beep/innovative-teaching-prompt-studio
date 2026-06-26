// === useAppState Hook ===
// 集中 App 嘅所有 state + handlers + helpers
// 將 step3.jsx 嘅 L1-L2216 業務邏輯搬到呢度
// App.jsx 純 render 用
//
// 重要：useUndoRedo keyboard shortcuts / useAutosave / useFormData 已經喺 sub-hooks
// 呢度 join 埋 context 唔再重複

import { useState, useRef, useEffect, useCallback } from 'react';
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

// === Option arrays (kept inline because they reference icon components) ===
const categories = [
    { value: "教學工具", label: "📚 教學工具", icon: BookOpen },
    { value: "教學遊戲", label: "🎮 教學遊戲", icon: Gamepad2 },
    { value: "情緒支援", label: "❤️ 情緒支援", icon: HeartHandshake },
    { value: "溝通輔助", label: "🗣️ 溝通輔助", icon: MessageCircle },
    { value: "實驗模擬", label: "🧪 實驗模擬", icon: FlaskConical },
];

const subjects = ["語文", "數學", "英文", "人文", "科學", "生活技能", "電腦", "班主任課", "其他"];

export const useAppState = () => {
    // === Form state ===
    const formState = useFormData();
    const { formData, setFormData, updateField, toggleSelection, handleExampleChange, addExample, removeExample, handleRuleChange, addRule, removeRule } = formState;

    // === UI state ===
    const [step, setStep] = useState(1);
    const [copiedDesign, setCopiedDesign] = useState(false);
    const [copiedTech, setCopiedTech] = useState(false);
    const [showScoreDetail, setShowScoreDetail] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        part1: true,
        part2: false,
        part3: false,
    });
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewTab, setPreviewTab] = useState("design");
    const [theme, setTheme] = useState('cyber');
    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'cyber' ? 'plain' : 'cyber');
    }, []);
    const [onboardingStep, setOnboardingStep] = useState(null);
    const [onboardingActive, setOnboardingActive] = useState(false);
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);
    const [pendingSuggestion, setPendingSuggestion] = useState(null);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState('');
    const [aiError, setAiError] = useState(null);
    const [showApiSettings, setShowApiSettings] = useState(false);

    // === Persistent storage hooks ===
    const [userTemplates, setUserTemplates] = useLocalStorage('TDA_USER_TEMPLATES_V1', []);
    const [geminiApiKey, setGeminiApiKey] = useLocalStorage('TDA_GEMINI_API_KEY_V1', '');
    const [onboardingDone, setOnboardingDone] = useLocalStorage('TDA_ONBOARDING_DONE_V1', false);

    const fileInputRef = useRef(null);

    // === Theme sync to <body> className ===
    useEffect(() => {
        document.body.classList.remove('theme-cyber', 'theme-plain');
        document.body.classList.add('theme-' + theme);
    }, [theme]);

    // === Autosave + Recovery ===
    const { lastSavedAt, recoverySnapshot, acceptRecovery, dismissRecovery, clearAutosave } = useAutosave(formData);

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

    // === Save current as user template ===
    const handleSaveTemplate = useCallback(() => {
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

    // === Load template ===
    const handleLoadTemplate = useCallback((template) => {
        pushHistory();
        if (template.data) {
            setFormData({ ...getInitialFormData(), ...template.data });
        } else {
            // Built-in template — uses data shape { ...initial }
            setFormData({ ...getInitialFormData(), ...template });
        }
        setStep(1);
    }, [setFormData, pushHistory]);

    // === Delete user template ===
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

    // === Suggestions ===
    const handleGetSuggestions = useCallback((field) => {
        const candidates = getSuggestions(field, formData);
        if (candidates.length > 0) {
            setActiveSuggestionField(field);
        }
    }, [formData]);

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

    // === Part navigation (Step gate) ===
    const handleNext = useCallback(() => {
        pushHistory();
        setStep(s => Math.min(s + 1, 3));
    }, [pushHistory]);

    const handlePrev = useCallback(() => {
        setStep(s => Math.max(s - 1, 1));
    }, []);

    // === Reset all ===
    const handleReset = useCallback(() => {
        if (!confirm('確定要重設所有資料？')) return;
        pushHistory();
        setFormData(getInitialFormData());
        setStep(1);
        clearAutosave();
    }, [setFormData, pushHistory, clearAutosave]);

    // === File input trigger ===
    const triggerFileInput = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }, []);

    // === Computed values ===
    const designPrompt = step >= 2 ? generateDesignPrompt(formData) : '';
    const techPrompt = step >= 3 ? generateTechPrompt(formData) : '';
    const qualityScore = promptScorer(formData);

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
        // UI state
        step,
        setStep,
        copiedDesign,
        copiedTech,
        showScoreDetail,
        setShowScoreDetail,
        expandedSections,
        setExpandedSections,
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
        // Recovery / autosave
        lastSavedAt,
        recoverySnapshot,
        acceptRecovery,
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
        handleSaveTemplate,
        handleLoadTemplate,
        handleDeleteTemplate,
        handleImportJSON,
        handleExportJSON,
        handleGetSuggestions,
        handleSelectSuggestion,
        handleCoachNext,
        handleCoachSkip,
        handleNext,
        handlePrev,
        handleReset,
        // Computed
        designPrompt,
        techPrompt,
        qualityScore,
        // Constants
        categories,
        subjects,
        builtinTemplates: BUILTIN_TEMPLATES,
        triggerFileInput,
        showGameStyle: formData.category === '教學遊戲',
        showExamples: ['教學遊戲', '教學工具', '實驗模擬'].includes(formData.category),
    };
};