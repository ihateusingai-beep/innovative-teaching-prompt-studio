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
//     saveAsUserTemplate, deleteUserTemplate, saveApiKey)
//   - Quality Score always computed (for header badge)
//
// PATCH 2026-07-12 (drift cleanup):
//   - Removed dead `handleGetSuggestions` (declared but never called — App.jsx
//     toggles suggestion panels via `setActiveSuggestionField` directly)
//   - Removed dead `pendingSuggestion` state + `confirmReplace/Append/cancelSuggestion`
//     handlers + the ConfirmReplaceDialog mount. v3.15.0 A3 ImportDiffModal replaced
//     the legacy import-conflict flow; nothing sets pendingSuggestion any more.
//   - Removed duplicate `handleDeleteTemplate` (identical body to `deleteUserTemplate`)
//   - Replaced native `confirm()` in 3 destructive-action handlers
//     (handleReset / removeStudent / deleteUserTemplate) with the new
//     `askConfirm()` flow → `<ConfirmDialog>` modal. This is the W9-10 Q3
//     migration finalised: every blocking dialog now goes through either
//     `pushWarning` (info) or `askConfirm` (destructive). The two remaining
//     `alert()` sites in handleExport / restoreVersion also moved to pushWarning.

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import { getInitialFormData, migrateFormData } from '../data/schema.js';
import { BUILTIN_TEMPLATES } from '../data/templates.js';
import { getRecommendedA11y } from '../data/sen-a11y-map.js';
// PATCH 2026-07-12 (P2-d): categories + subjects now imported from the
// single source of truth (data/option-tables.js). App.jsx also imports from
// the same file — there is no longer a local copy in this module.
import { categories, subjects } from '../data/option-tables.js';
import { generateDesignPrompt, generateTechPrompt } from '../prompts/generators.jsx';
import promptScorer from '../data/scorer.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { generateWithGemini, VARIANT_CONFIG, VARIANT_KEYS } from '../utils/gemini.js';
import { saveToStorage, loadFromStorage, removeFromStorage } from '../utils/storage.js';
import { formatTimeAgo } from '../utils/time.js';
import { handleExportDOCX } from '../utils/docx.js';
import { extractTemplateFields } from '../utils/template-loader.js';
import { migrateUserTemplate, migrateUserTemplates, MAX_NAME_LENGTH, MAX_DESC_LENGTH, MAX_USER_TAGS, MAX_TAG_LENGTH } from '../data/userTemplateSchema.js';
import {
    migrateStudent,
    migrateRoster,
    validateStudentName,
    MAX_ROSTER_STUDENTS,
} from '../data/studentRosterSchema.js';

import { useFormData } from '../hooks/useFormData.js';
import { useAutosave } from '../hooks/useAutosave.js';
import { useUndoRedo } from '../hooks/useUndoRedo.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { usePromptVersions } from '../hooks/usePromptVersions.js';
import { useProfileBank } from '../hooks/useProfileBank.js';

// User-saved templates 數量上限（避免 localStorage quota）
const MAX_USER_TEMPLATES = 50;

// === Prompt Versions (W5-6) ===
// 老師 prompt snapshot — 支援 version history + diff view
// 由獨立 hook 管理（usePromptVersions）以保持 useAppState 嘅清晰度

// Tab keys — Tabs 模式取代 step gate
// 4 個 tab 對應原本 4 個 step，但永遠可以自由跳
// v3.14.0: 5 tabs — 加 'assessment' (評估) before 'generate'
const TAB_KEYS = ['basic', 'content', 'rules', 'assessment', 'generate'];
const DEFAULT_TAB = 'basic';
const LAST_TAB_STORAGE_KEY = 'TDA_LAST_TAB_V1';

// Tab 完成度計法 — 用嚟顯示 badge "N/12"
const TAB_FIELDS = {
    basic: ['teacherName', 'toolName', 'category', 'subjectCategory', 'grade', 'senTypes'],
    content: ['purpose', 'context', 'examples'],
    rules: ['rules', 'accessibility', 'learningDiversity', 'interactionType'],
    // v3.14.0: 評估 tab — student assessment data (optional, but required if Award Certificate enabled)
    assessment: ['assessment'],
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
    // v3.12.0: 6 themes via dropdown selector (plain/warm/dark/contrast/paper/reactor)
    // setTheme is now called directly by dropdown onChange — no binary toggle needed
    const toggleTheme = useCallback(() => {
        // Keep for backward compat — cycles through all 6 themes in order
        setTheme(prev => {
            const order = ['plain', 'warm', 'dark', 'contrast', 'paper', 'reactor'];
            const idx = order.indexOf(prev);
            return order[(idx + 1) % order.length];
        });
    }, []);
    const [onboardingStep, setOnboardingStep] = useState(null);
    const [onboardingActive, setOnboardingActive] = useState(false);
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);
    // v3.15.0 A3: Import diff state — shows per-field status, supports undo (5 min window)
    const [importDiff, setImportDiff] = useState(null);  // { fileName, cleanFormData, fieldStatus, warnings, schemaVersion, legacyExtra, appliedAt }
    const UNDO_WINDOW_MS = 5 * 60 * 1000;
    const canUndoImport = importDiff?.appliedAt && (Date.now() - importDiff.appliedAt) < UNDO_WINDOW_MS;
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState('');
    const [aiError, setAiError] = useState(null);
    // v3.13.0: Multi-variant state (F2 — side-by-side 3 lengths)
    // Each variant: { text, error, tokenCount, durationMs, loading }
    const [variants, setVariants] = useState({
        short:    { text: '', error: null, tokenCount: 0, durationMs: 0, loading: false },
        standard: { text: '', error: null, tokenCount: 0, durationMs: 0, loading: false },
        long:     { text: '', error: null, tokenCount: 0, durationMs: 0, loading: false },
    });
    const [showApiSettings, setShowApiSettings] = useState(false);
    // v3.14.0: Award certificate preview modal
    const [awardCertOpen, setAwardCertOpen] = useState(false);

    // Recovery snackbar 狀態 — 用嚟 auto-dismiss
    const [recoveryDismissed, setRecoveryDismissed] = useState(false);

    // Inline warning banner queue — W9-10 Q3: 取代 alert() 阻住 UI
    // Each item: { id, severity: 'info'|'warning'|'error', title, messages: [] }
    const [warnings, setWarnings] = useState([]);
    const pushWarning = useCallback((severity, title, messages) => {
        const id = 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        setWarnings(prev => [...prev, { id, severity, title, messages: messages || [] }]);
    }, []);
    const dismissWarning = useCallback((id) => {
        setWarnings(prev => prev.filter(w => w.id !== id));
    }, []);

    // === PATCH 2026-07-12: askConfirm flow ===
    // Replaces native `confirm()` in destructive handlers (handleReset /
    // removeStudent / deleteUserTemplate). Caller passes an `onConfirm` fn that
    // does the actual mutation; we only drive the modal lifecycle.
    // Shape: { title, message, danger?, onConfirm }
    const [confirmAction, setConfirmAction] = useState(null);
    const askConfirm = useCallback(({ title, message, danger = false, onConfirm }) => {
        setConfirmAction({ title, message, danger, onConfirm });
    }, []);
    const resolveConfirm = useCallback(() => {
        // Capture-then-clear: prevents double-fire if the user mashes the button
        // before React unmounts the modal after the state change.
        setConfirmAction(prev => {
            if (prev?.onConfirm) prev.onConfirm();
            return null;
        });
    }, []);
    const cancelConfirm = useCallback(() => {
        setConfirmAction(null);
    }, []);

    // === Persistent storage hooks ===
    // v3.15.0 F1: user templates now migrated on read (legacy shape → F1 shape)
    // 儲存仲係 'TDA_USER_TEMPLATES_V1' (key 唔變); 載入時用 migrateUserTemplates 升級
    const [userTemplatesRaw, setUserTemplatesRaw] = useLocalStorage('TDA_USER_TEMPLATES_V1', []);
    const [userTemplatesMigrated, setUserTemplatesMigrated] = useState(false);
    const userTemplates = useMemo(
        () => userTemplatesMigrated ? migrateUserTemplates(userTemplatesRaw) : userTemplatesRaw,
        [userTemplatesRaw, userTemplatesMigrated]
    );
    // Marker effect: 第一次 mount 已經 migrate 過即用戶係 F1 之前
    // 用 setUserTemplatesRaw 入返 F1 shape (寫返 localStorage)
    useEffect(() => {
        if (userTemplatesMigrated) return;
        const migrated = migrateUserTemplates(userTemplatesRaw);
        if (migrated.length !== userTemplatesRaw.length ||
            migrated.some((t, i) => t.updatedAt !== userTemplatesRaw[i]?.updatedAt)) {
            setUserTemplatesRaw(migrated);
        }
        setUserTemplatesMigrated(true);
    }, [userTemplatesRaw, userTemplatesMigrated, setUserTemplatesRaw]);
    // Note: setUserTemplates 仲可以直接用 (e.g. deleteUserTemplate); 寫入時用 F1 shape
    const setUserTemplates = setUserTemplatesRaw;

    // === v3.16.0 F2: Class Roster (multi-student) ===
    // Same migration pattern: legacy shape → F2 shape on read.
    const [studentRosterRaw, setStudentRosterRaw] = useLocalStorage('TDA_STUDENT_ROSTER_V1', []);
    const [studentRosterMigrated, setStudentRosterMigrated] = useState(false);
    const studentRoster = useMemo(
        () => studentRosterMigrated ? migrateRoster(studentRosterRaw) : studentRosterRaw,
        [studentRosterRaw, studentRosterMigrated]
    );
    useEffect(() => {
        if (studentRosterMigrated) return;
        const migrated = migrateRoster(studentRosterRaw);
        if (migrated.length !== studentRosterRaw.length ||
            migrated.some((s, i) => s.updatedAt !== studentRosterRaw[i]?.updatedAt)) {
            setStudentRosterRaw(migrated);
        }
        setStudentRosterMigrated(true);
    }, [studentRosterRaw, studentRosterMigrated, setStudentRosterRaw]);
    const setStudentRoster = setStudentRosterRaw;
    const [geminiApiKey, setGeminiApiKey] = useLocalStorage('TDA_GEMINI_API_KEY_V1', '');
    const [onboardingDone, setOnboardingDone] = useLocalStorage('TDA_ONBOARDING_DONE_V1', false);

    // === W5-6: Prompt Versions hook ===
    const promptVersions = usePromptVersions();

    // === W5-6: Version panel modal state ===
    const [versionPanelOpen, setVersionPanelOpen] = useState(false);

    // === W7-8: SEN Student Profile Bank ===
    const profileBank = useProfileBank();
    const [profileBankOpen, setProfileBankOpen] = useState(false);

    // === v3.17.0 1.1: Auto-Fill from Default Student Profile ===
    // defaultProfileId points to a profile in profileBank.profiles. On app mount
    // (and when defaultProfileId / profileBank.profiles change), if the default
    // exists AND formData is at initial state (toolName + purpose empty) AND
    // the user has not opted out, auto-apply the profile's preset into formData.
    // This shaves ~5-10 min off a teacher's daily flow (one common profile reused
    // across all 30 students in a class).
    //
    // Clobber protection: if formData already has content, do NOT auto-apply.
    // This prevents surprise overwrites of in-progress work on app reload.
    //
    // Persisted in localStorage so the choice survives reload + browser restart.
    const [defaultProfileId, setDefaultProfileId] = useLocalStorage('TDA_DEFAULT_PROFILE_ID_V1', null);
    const [autoApplyEnabled, setAutoApplyEnabled] = useLocalStorage('TDA_AUTO_FILL_ENABLED_V1', true);
    const clearDefaultProfile = useCallback(() => {
        setDefaultProfileId(null);
    }, [setDefaultProfileId]);

    const fileInputRef = useRef(null);

    // === v3.15.0 (V1): Reduced-motion override ===
    // States: 'system' (follow OS) | 'on' (force reduce) | 'off' (force allow)
    // Persisted in localStorage so user choice survives reload.
    const [motionPref, setMotionPref, motionPrefLoaded] = useLocalStorage('TDA_MOTION_PREF_V1', 'system');
    const cycleMotionPref = useCallback(() => {
        setMotionPref(prev => {
            if (prev === 'system') return 'on';
            if (prev === 'on') return 'off';
            return 'system'; // 'off' → 'system'
        });
    }, [setMotionPref]);

    // === Theme sync to <body> className === (v3.12.0: 6 themes)
    useEffect(() => {
        const ALL_THEMES = ['theme-cyber', 'theme-plain', 'theme-warm', 'theme-dark', 'theme-contrast', 'theme-paper', 'theme-reactor'];
        document.body.classList.remove(...ALL_THEMES);
        document.body.classList.add('theme-' + theme);
    }, [theme]);

    // === v3.15.0 (V1): Motion pref sync — add body class so CSS can override
    //   - tda-motion-on:  force all animations off (override prefers-reduced-motion: no-preference)
    //   - tda-motion-off: force animations on (override prefers-reduced-motion: reduce)
    //   - (no class):     follow system media query
    useEffect(() => {
        document.body.classList.remove('tda-motion-on', 'tda-motion-off');
        if (motionPref === 'on')  document.body.classList.add('tda-motion-on');
        if (motionPref === 'off') document.body.classList.add('tda-motion-off');
    }, [motionPref]);

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
            // PATCH 2026-07-12: alert → pushWarning (W9-10 Q3 non-blocking migration).
            pushWarning('error', '❌ DOCX 匯出失敗', [err.message || '未知錯誤']);
        }
    }, [formData, pushWarning]);

    // === Gemini direct generation ===
    // BUGFIX 2026-07-11: args order was (fullPrompt, geminiApiKey, cb) — wrong!
    // generateWithGemini signature is (apiKey, prompt, options). Old call sent
    // the full prompt string as apiKey and the actual key as prompt, then put
    // the chunk callback in the options slot. Streaming callback was never fired
    // and Gemini would always 400 (invalid key = the prompt text).
    // Note: generateWithGemini is non-streaming today, so onChunk is best-effort
    // and only fires when the final result is available.
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
            const result = await generateWithGemini(geminiApiKey, fullPrompt, {
                onChunk: (chunk) => setAiResult(prev => prev + chunk),
            });
            setAiResult(result);
        } catch (err) {
            setAiError(err.message || 'Unknown error');
        } finally {
            setAiGenerating(false);
        }
    }, [formData, geminiApiKey]);

    // === v3.13.0: F2 Multi-variant generation (3x Gemini calls in parallel) ===
    // Generates short/standard/long variants simultaneously for side-by-side compare.
    // variantFilter: undefined = all 3, or ['short'] | ['standard'] | ['long'] | ['short', 'standard'] etc.
    const handleMultiVariantGenerate = useCallback(async (variantFilter) => {
        if (!geminiApiKey) {
            setShowApiSettings(true);
            return;
        }
        const fullPrompt = generateDesignPrompt(formData) + "\n\n---\n\n" + generateTechPrompt(formData);
        // Mark selected variants as loading
        const targetVariants = variantFilter && variantFilter.length > 0
            ? variantFilter
            : ['short', 'standard', 'long'];
        setVariants(prev => {
            const next = { ...prev };
            targetVariants.forEach(v => {
                next[v] = { text: '', error: null, tokenCount: 0, durationMs: 0, loading: true };
            });
            return next;
        });

        try {
            // Generate only requested variants
            const tasks = targetVariants.map(async (variant) => {
                const cfg = VARIANT_CONFIG[variant];
                const lengthPrefixes = {
                    short:    '[請用 ≤ 200 字回應, 精簡扼要, 1-on-1 學生用]\n\n',
                    standard: '[請用 400-600 字回應, 標準長度, 班房用]\n\n',
                    long:     '[請用最完整版本回應, 含 rationale + 教學建議, 適合 IEP 報告]\n\n',
                };
                const lengthPrefixedPrompt = lengthPrefixes[variant] + fullPrompt;
                const t0 = performance.now();
                try {
                    // BUGFIX 2026-07-12 (Drift #4): was hardcoded temperature 0.7
                    // for every variant — short/standard/long were effectively
                    // length-only. Now reads cfg.temperature (0.9/0.7/0.3) so
                    // each variant samples a distinct point on the creativity
                    // vs. determinism axis (see VARIANT_CONFIG comment).
                    const text = await generateWithGemini(geminiApiKey, lengthPrefixedPrompt, {
                        maxOutputTokens: cfg.maxOutputTokens,
                        temperature: cfg.temperature,
                    });
                    setVariants(prev => ({
                        ...prev,
                        [variant]: { text, error: null, tokenCount: text.length, durationMs: performance.now() - t0, loading: false },
                    }));
                } catch (err) {
                    setVariants(prev => ({
                        ...prev,
                        [variant]: { text: '', error: err.message || String(err), tokenCount: 0, durationMs: performance.now() - t0, loading: false },
                    }));
                }
            });
            await Promise.all(tasks);
        } catch (err) {
            // Global fallback (per-variant already handles its own errors)
            console.error('Multi-variant generation error:', err);
        }
    }, [formData, geminiApiKey]);

    // === v3.13.0: F2 Use a variant as final output (set aiResult + switch to standard output) ===
    const useVariantAsFinal = useCallback((variant) => {
        const text = variants[variant]?.text;
        if (text) {
            setAiResult(text);
            setAiError(null);
        }
    }, [variants]);

    // === Gemini API key save (for ApiSettingsModal) ===
    const saveApiKey = useCallback((newKey) => {
        setGeminiApiKey(newKey);
    }, [setGeminiApiKey]);

    // === Save current as user template ===
    // v3.15.0 F1: 接受 name / description / category / tags, 寫入 F1 shape
    const saveAsUserTemplate = useCallback((name, description, category = '', tags = []) => {
        if (userTemplates.length >= MAX_USER_TEMPLATES) {
            return { ok: false, error: `已達上限 ${MAX_USER_TEMPLATES} 個範本，請刪除舊範本後再儲存。` };
        }
        const now = Date.now();
        const newTemplate = migrateUserTemplate({
            id: 'user_' + now,
            name: name.slice(0, MAX_NAME_LENGTH),
            description: (description || `${formData.category} · ${formData.subjectCategory}`).slice(0, MAX_DESC_LENGTH),
            category,
            tags: tags.slice(0, MAX_USER_TAGS).map(t => t.slice(0, MAX_TAG_LENGTH)),
            icon: '⭐',
            data: { ...formData },
            createdAt: now,
            updatedAt: now,
            lastUsed: 0,
            useCount: 0,
            archived: false,
        });
        setUserTemplates([...userTemplates, newTemplate]);
        return { ok: true, id: newTemplate.id };
    }, [formData, userTemplates, setUserTemplates]);

    // === v3.15.0 F1: Update existing user template (edit) ===
    // Returns same shape as saveAsUserTemplate. 用 updatedAt 標記 last edit time.
    const updateUserTemplate = useCallback((id, updates) => {
        const idx = userTemplates.findIndex(t => t.id === id);
        if (idx === -1) return { ok: false, error: '找不到此範本' };
        const next = [...userTemplates];
        const merged = migrateUserTemplate({
            ...next[idx],
            ...updates,
            // Truncate string fields defensively
            name: (updates.name || next[idx].name).slice(0, MAX_NAME_LENGTH),
            description: (updates.description !== undefined ? updates.description : next[idx].description).slice(0, MAX_DESC_LENGTH),
            tags: Array.isArray(updates.tags)
                ? updates.tags.slice(0, MAX_USER_TAGS).map(t => String(t).slice(0, MAX_TAG_LENGTH))
                : next[idx].tags,
            updatedAt: Date.now(),
        });
        next[idx] = merged;
        setUserTemplates(next);
        return { ok: true, id };
    }, [userTemplates, setUserTemplates]);

    // === v3.15.0 F1: Duplicate user template ===
    // 複製整個 template 改 name 加 (副本), reset useCount / lastUsed
    const duplicateUserTemplate = useCallback((id) => {
        const src = userTemplates.find(t => t.id === id);
        if (!src) return { ok: false, error: '找不到此範本' };
        if (userTemplates.length >= MAX_USER_TEMPLATES) {
            return { ok: false, error: `已達上限 ${MAX_USER_TEMPLATES} 個範本` };
        }
        const now = Date.now();
        const copy = migrateUserTemplate({
            ...src,
            id: 'user_' + now,
            name: src.name + ' (副本)',
            createdAt: now,
            updatedAt: now,
            lastUsed: 0,
            useCount: 0,
            archived: false,
        });
        setUserTemplates([...userTemplates, copy]);
        return { ok: true, id: copy.id };
    }, [userTemplates, setUserTemplates]);

    // === v3.15.0 F1: Archive (soft delete) / Unarchive ===
    const archiveUserTemplate = useCallback((id, archived = true) => {
        const next = userTemplates.map(t =>
            t.id === id ? { ...t, archived, updatedAt: Date.now() } : t
        );
        setUserTemplates(next);
        return { ok: true };
    }, [userTemplates, setUserTemplates]);

    // === v3.16.0 F2: Class Roster CRUD ===
    const addStudent = useCallback((name, senType = '', notes = '', assessment = null) => {
        const validation = validateStudentName(name);
        if (!validation.ok) return validation;
        if (studentRoster.length >= MAX_ROSTER_STUDENTS) {
            return { ok: false, error: `已達上限 ${MAX_ROSTER_STUDENTS} 個學生` };
        }
        // Duplicate name check
        if (studentRoster.some(s => s.name === validation.name)) {
            return { ok: false, error: `已有同名學生「${validation.name}」` };
        }
        const now = Date.now();
        const newStudent = migrateStudent({
            id: `student_${now}_${Math.random().toString(36).slice(2, 7)}`,
            name: validation.name,
            senType,
            notes,
            assessment,
            createdAt: now,
            updatedAt: now,
        });
        setStudentRoster([...studentRoster, newStudent]);
        return { ok: true, id: newStudent.id };
    }, [studentRoster, setStudentRoster]);

    const updateStudent = useCallback((id, updates) => {
        const idx = studentRoster.findIndex(s => s.id === id);
        if (idx === -1) return { ok: false, error: '找不到此學生' };
        const next = [...studentRoster];
        next[idx] = migrateStudent({
            ...next[idx],
            ...updates,
            updatedAt: Date.now(),
        });
        setStudentRoster(next);
        return { ok: true, id };
    }, [studentRoster, setStudentRoster]);

    const removeStudent = useCallback((id) => {
        // PATCH 2026-07-12: confirm → askConfirm (non-blocking modal).
        const target = studentRoster.find(s => s.id === id);
        if (!target) return { ok: false };
        askConfirm({
            title: '🗑 刪除此學生？',
            message: `「${target.name}」嘅 assessment data 都會一齊刪除。呢個動作會儲存喺 history，可以 undo。`,
            danger: true,
            confirmLabel: '刪除',
            onConfirm: () => {
                // Updater form — if the user adds a student between ask & confirm,
                // the new student is preserved (no stale-list overwrites).
                setStudentRoster(prev => prev.filter(s => s.id !== id));
                pushWarning('info', '🗑 已刪除學生', [`「${target.name}」已從 roster 拎走`]);
            },
        });
        return { ok: true };  // ok: true means "we asked" — actual deletion fires on confirm
    }, [studentRoster, setStudentRoster, askConfirm, pushWarning]);

    const applyStudentToAssessment = useCallback((studentId) => {
        const student = studentRoster.find(s => s.id === studentId);
        if (!student) return { ok: false, error: '找不到此學生' };
        pushHistory();
        const assessment = {
            ...formData.assessment,
            studentName: student.name,
            date: student.assessment.date || new Date().toLocaleDateString('zh-HK'),
            totalMinutes: student.assessment.totalMinutes,
            totalQuestions: student.assessment.totalQuestions,
            correctCount: student.assessment.correctCount,
            accuracyPercent: student.assessment.accuracyPercent,
            strengths: [...student.assessment.strengths],
            improvementAreas: [...student.assessment.improvementAreas],
            previousScore: student.assessment.previousScore,
            currentScore: student.assessment.currentScore,
        };
        setFormData({ ...formData, assessment });
        pushWarning('success', `已載入「${student.name}」嘅評估資料`, [
            '已自動填入 studentName / date / 答對題數 / 強項 / 改善範圍',
        ]);
        return { ok: true };
    }, [studentRoster, formData, pushHistory, setFormData, pushWarning]);

    // === Delete user template ===
    // PATCH 2026-07-12: confirm → askConfirm (non-blocking modal). Also: the
    // previous duplicate `handleDeleteTemplate` is removed in the same batch —
    // it had an identical body to this fn and was never called.
    const deleteUserTemplate = useCallback((id) => {
        const target = userTemplates.find(t => t.id === id);
        if (!target) return;
        askConfirm({
            title: '🗑 刪除此範本？',
            message: `「${target.name}」會永久刪除。內建範本唔受影響。`,
            danger: true,
            confirmLabel: '刪除',
            onConfirm: () => {
                // Updater form — preserves any templates added between ask & confirm.
                setUserTemplates(prev => prev.filter(t => t.id !== id));
                pushWarning('info', '🗑 已刪除範本', [`「${target.name}」已拎走`]);
            },
        });
    }, [userTemplates, setUserTemplates, askConfirm, pushWarning]);

    // === Load template ===
    // 3-shape 兼容邏輯抽咗去 src/utils/template-loader.js (extractTemplateFields)，
    // 純 function 易 unit test；呢度只負責 push history + setFormData + jump tab.
    // v3.15.0 F1: usage tracking — increment useCount + update lastUsed for user templates
    const handleLoadTemplate = useCallback((template) => {
        pushHistory();
        const fields = extractTemplateFields(template);
        setFormData({ ...getInitialFormData(), ...fields });
        setActiveTab('basic');
        // F1: track usage on user template load (id starts with 'user_')
        if (template && typeof template.id === 'string' && template.id.startsWith('user_')) {
            setUserTemplates(prev => prev.map(t =>
                t.id === template.id
                    ? { ...t, useCount: (t.useCount || 0) + 1, lastUsed: Date.now() }
                    : t
            ));
        }
    }, [setFormData, pushHistory, setUserTemplates]);

    // === JSON import ===
    const handleImportJSON = useCallback((event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                const migrated = migrateFormData(parsed);
                const { __schema_version, __legacy_extra, __warnings, __field_status, ...cleanFormData } = migrated;
                // v3.15.0 A3: 永遠顯示 ImportDiffModal — 用戶可以 review 變化 + 撤銷 (5 min)
                setImportDiff({
                    fileName: file.name,
                    cleanFormData,
                    fieldStatus: __field_status || {},
                    warnings: __warnings || [],
                    schemaVersion: __schema_version,
                    legacyExtra: __legacy_extra || {},
                    appliedAt: null,  // null until user confirms
                });
            } catch (err) {
                // F4 (audit v3.14.2): improved error UX — combine multi-line errors into single summary
                const raw = err.message || String(err);
                const errorLines = raw.split('\n').filter(Boolean).map(s => s.replace(/^匯入失敗：\s*/, '').trim());
                pushWarning('error', '❌ JSON 解析失敗', errorLines.length > 0 ? errorLines : [raw]);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset so same file can be re-imported
    }, [pushWarning]);

    // v3.15.0 A3: Confirm import from diff modal — applies + stores undo snapshot
    const confirmImportFromDiff = useCallback(() => {
        if (!importDiff) return;
        pushHistory();
        setFormData(importDiff.cleanFormData);
        setImportDiff(prev => prev ? { ...prev, appliedAt: Date.now() } : null);
        if (importDiff.warnings && importDiff.warnings.length > 0) {
            pushWarning('warning', '匯入完成（' + importDiff.warnings.length + ' 項警告）', importDiff.warnings);
        } else {
            const v = importDiff.schemaVersion ? `v${importDiff.schemaVersion}` : '已匯入';
            pushWarning('success', `✓ 匯入成功 (${v})`, [`已載入 ${importDiff.fileName} · 5 分鐘內可撤銷`]);
        }
    }, [importDiff, setFormData, pushHistory, pushWarning]);

    // v3.15.0 A3: Undo import (within 5 min window)
    const undoImport = useCallback(() => {
        if (!importDiff || !importDiff.appliedAt) return;
        const ageMs = Date.now() - importDiff.appliedAt;
        if (ageMs > UNDO_WINDOW_MS) {
            pushWarning('warning', '已過咗 5 分鐘撤銷期限', ['undo 視窗已過']);
            setImportDiff(null);
            return;
        }
        // v3.15.0 A3: undo 透過 undo system 而唔係直接 setFormData
        // 因為 import 前 pushHistory 咗，undo() 會 pop 入 history
        undo();
        setImportDiff(null);
        pushWarning('info', '↩️ 已撤銷匯入', [`${importDiff.fileName} 嘅變更已還原`]);
    }, [importDiff, undo, pushWarning]);

    // PATCH 2026-07-12: removed dead confirmReplace / confirmAppend / cancelSuggestion.
    // These were the F4 (audit v3.14.2) import-conflict path — replaced by v3.15.0 A3
    // ImportDiffModal in commit 05cfb4a. Nothing in the codebase sets `pendingSuggestion`
    // any more, so the type guard always returns early. Removed entirely.

    // === JSON export ===
    const handleExportJSON = useCallback(() => {
        // W9-10 #6: export 時 strip 走 rules 嘅 __isDefault metadata
        // 老師 share 嘅 JSON 唔應該洩漏 internal flags
        const exportRules = (formData.rules || []).map(r => typeof r === 'string' ? r : (r?.text || ''));
        const payload = {
            __schema_version: 2,
            ...formData,
            rules: exportRules,
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
    // PATCH 2026-07-12: removed dead `handleGetSuggestions` — declared but never
    // called. App.jsx toggles suggestion panels via `setActiveSuggestionField`
    // directly, bypassing the candidates-check this wrapper would have provided.
    // (Re-introduce later if a "no candidates → silent no-op" UX is wanted.)
    const applySuggestion = useCallback((field, text) => {
        if (field === 'rules') {
            // W9-10 #6: AI 建議加入嘅 rule 預設係 user 自訂（非 default）
            const newRules = [...formData.rules, { text, __isDefault: false }];
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

    // === CoachMark nav ===
    // BUGFIX 2026-07-11: was `next >= 5` — hard-coded magic number that drifted
    // from ONBOARDING_STEPS.length (5 today, but adding a step would silently
    // break "next" on the last-but-one step). The actual off-by-one risk is
    // that `prev || 0` resets to 0 if already-null, so an extra `next` of 0
    // could re-trigger step 0 — harmless given setOnboardingActive is already
    // false, but still worth guarding. Now accepts an optional `total` so the
    // caller (App.jsx) controls the bound instead of hardcoding 5 here.
    const handleCoachNext = useCallback((delta, total) => {
        const totalSteps = typeof total === 'number' && total > 0 ? total : 5;
        setOnboardingStep(prev => {
            const next = (prev || 0) + delta;
            if (next >= totalSteps) {
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
    // PATCH 2026-07-12: confirm → askConfirm (non-blocking modal). User now
    // sees a real dialog matching the other destructive actions in the app.
    const handleReset = useCallback(() => {
        askConfirm({
            title: '⚠️ 重設所有資料？',
            message: '所有 tab 嘅填寫內容、學生評估、自訂範本、自訂規則等都會清空。呢個動作會儲存喺 history（可以 undo），但 localStorage 嘅 recovery snapshot 都會清埋。',
            danger: true,
            confirmLabel: '重設',
            onConfirm: () => {
                pushHistory();
                setFormData(getInitialFormData());
                setActiveTab('basic');
                clearAutosave();
                pushWarning('info', '🔄 已重設', ['已回到預設空白狀態']);
            },
        });
    }, [setFormData, pushHistory, clearAutosave, askConfirm, pushWarning]);

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
                pushWarning('warning', '載入 recovery（' + result.warnings.length + ' 項警告）', result.warnings);
            }
        }
        setRecoveryDismissed(true);
    }, [acceptRecovery, setFormData, pushWarning]);

    // === W5-6: Restore version (set formData + push history) ===
    const restoreVersion = useCallback((version) => {
        if (!version || !version.snapshot || !version.snapshot.formData) {
            // PATCH 2026-07-12: alert → pushWarning.
            pushWarning('warning', '⚠️ 唔可以 restore 呢個版本', ['可能係早期儲存嘅版本，冇 formData snapshot']);
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
    //   - strings (grade, subjectCategory, category) → 預設只喺空白時覆蓋；
    //     auto-apply 傳 overwriteStrings:true，因為 schema 初始 grade 唔係 blank
    //     （例如「小學二年級 (P2)」），否則預設 profile 嘅年級永遠套唔入
    //   - customNotes → push 入 rules 作為備註（唔覆蓋 rules 已有內容）
    const applyProfile = useCallback((profile, opts = {}) => {
        if (!profile || !profile.preset) return;
        const overwriteStrings = opts.overwriteStrings === true;
        pushHistory();
        setFormData(prev => {
            const merged = { ...prev };
            for (const [key, value] of Object.entries(profile.preset)) {
                if (Array.isArray(value) && Array.isArray(prev[key])) {
                    merged[key] = Array.from(new Set([...prev[key], ...value]));
                } else if (typeof value === 'string') {
                    if (overwriteStrings || !prev[key] || prev[key].trim().length === 0) {
                        merged[key] = value;
                    }
                }
            }
            // customNotes → append to rules as a comment-like rule (W9-10 #6: wrap 為 user rule)
            if (profile.customNotes && profile.customNotes.trim()) {
                const noteLine = `[Profile 備註：${profile.name}] ${profile.customNotes.trim()}`;
                merged.rules = Array.isArray(merged.rules)
                    ? [...merged.rules, { text: noteLine, __isDefault: false }]
                    : [{ text: noteLine, __isDefault: false }];
            }
            return merged;
        });
        // Auto-close panel after apply
        setProfileBankOpen(false);
    }, [pushHistory, setFormData]);

    // === v3.17.0 1.1: Auto-apply default profile on mount / when default changes ===
    // Re-runs when:
    //   - defaultProfileId changes (user sets/clears a default)
    //   - profileBank.profiles changes (vault unlocked + profiles load)
    //   - autoApplyEnabled toggles off
    //
    // Clobber gate: formData.toolName AND formData.purpose must both be empty.
    // If either has content, the teacher is mid-work and we DO NOT overwrite.
    // Reset to a clean slate → both empty → next mount auto-applies (decision 2).
    //
    // Stale-id recovery: if defaultProfileId points to a deleted profile, clear
    // the localStorage entry + warn. Silent stale-id would make "Reset 預設"
    // confusing ("cleared, but next reload still tries to apply...").
    useEffect(() => {
        if (!defaultProfileId || !autoApplyEnabled) return;
        const profiles = profileBank.profiles || [];
        if (profiles.length === 0) return;  // vault locked OR no profiles yet
        const profile = profiles.find(p => p.id === defaultProfileId);
        if (!profile) {
            setDefaultProfileId(null);
            pushWarning('warning', '⚠️ 預設 profile 唔見咗', [
                '之前設定嘅預設 profile 已經被刪除。',
                '可以喺 Profile Bank 揀過另一個設為預設。',
            ]);
            return;
        }
        if (formData.toolName && formData.toolName.trim()) return;
        if (formData.purpose && formData.purpose.trim()) return;
        // Clobber gate passed → apply.
        // overwriteStrings: schema 預設 grade/category 唔係空字串，auto-apply 必須強制帶入 profile 值
        applyProfile(profile, { overwriteStrings: true });
        pushWarning('info', '✨ 已自動套用預設 profile', [
            `「${profile.name}」嘅 SEN 類型 + 年級 已帶入當前 form`,
            '想換: 喺 Profile Bank 揀另一個設為預設,或者關閉「自動套用」toggle',
        ]);
    }, [defaultProfileId, autoApplyEnabled, profileBank.profiles]);

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
        // v3.15.0 V1: Reduced-motion override
        motionPref,
        setMotionPref,
        cycleMotionPref,
        motionPrefLoaded,
        onboardingStep,
        onboardingActive,
        setOnboardingActive,
        activeSuggestionField,
        setActiveSuggestionField,
        aiGenerating,
        aiResult,
        aiError,
        // v3.13.0 F2: Multi-variant state + handler
        variants,
        handleMultiVariantGenerate,
        useVariantAsFinal,
        VARIANT_CONFIG,
        VARIANT_KEYS,
        showApiSettings,
        setShowApiSettings,
        // v3.14.0: Award Certificate
        awardCertOpen,
        setAwardCertOpen,
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
        // W9-10 Q3: inline warning banner queue (取代 alert())
        warnings,
        pushWarning,
        dismissWarning,
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
        saveAsUserTemplate,
        handleLoadTemplate,
        deleteUserTemplate,
        // v3.15.0 F1: extended user template handlers
        updateUserTemplate,
        duplicateUserTemplate,
        archiveUserTemplate,
        // v3.16.0 F2: class roster
        studentRoster, setStudentRoster,
        addStudent, updateStudent, removeStudent, applyStudentToAssessment,
        handleImportJSON,
        handleExportJSON,
        // v3.15.0 A3: import diff + undo
        importDiff, setImportDiff,
        confirmImportFromDiff, undoImport, canUndoImport, UNDO_WINDOW_MS,
        applySuggestion,
        handleCoachNext,
        handleCoachSkip,
        handleReset,
        // PATCH 2026-07-12: askConfirm flow — drives <ConfirmDialog> modal
        confirmAction,
        askConfirm,
        resolveConfirm,
        cancelConfirm,
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
        // v3.17.0 1.1: auto-fill from default profile
        defaultProfileId,
        setDefaultProfileId,
        clearDefaultProfile,
        autoApplyEnabled,
        setAutoApplyEnabled,
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