import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Save, Sparkles, Wand2, Eye, Copy, Download, Upload, RotateCcw, History, Key, Star, X, FileText, FileJson, Trash2, Sun, Moon, ChevronDown, ChevronLeft, ChevronRight, Plus, CheckCircle, CheckCircle2, ExternalLink, Github, Monitor, Bot, Zap, BookOpen, Gamepad2, HeartHandshake, MessageCircle, FlaskConical, Users, Accessibility, Code, BarChart3 } from 'lucide-react';

import { useAppState } from './state/useAppState.js';
import { formatTimeAgo } from './utils/time.js';
import { useTimeAgo } from './hooks/useTimeAgo.js';
import { SCHEMA_VERSION } from './data/schema.js';
import { BUILTIN_TEMPLATES } from './data/templates.js';
import { SEN_TO_A11Y_MAP, getRecommendedA11y } from './data/sen-a11y-map.js';
import { Card, Label, Input, TextArea, Select, CollapsibleSection } from './components/ui.jsx';
import { ApiSettingsModal, CoachMark, ConfirmReplaceDialog } from './components/modals.jsx';
import { QualityScoreBadge, QualityScoreDetail, TemplateCard, SuggestionPanel } from './components/widgets.jsx';
import { VersionPanel } from './components/VersionPanel.jsx';
import { DiffView } from './components/DiffView.jsx';
import { ProfileBankPanel } from './components/ProfileBankPanel.jsx';
import { AwardCertificateModal } from './components/AwardCertificateModal.jsx';
import personalLogo from '../assets/personal_logo.png';
import { mutedTextClass, pillClass, toggleClass, cardClass, ToggleSwitch } from './design-system/index.js';
import { themeMeta, themeOrder } from './design-system/tokens/colors.js';

// === Feature flags ===
// GEMINI_DIRECT_GENERATE_ENABLED: 控制 Gemini API 直接生成 HTML 嘅 UI 嘅顯隱
//   false → 隱藏：API settings button + 直接生成 HTML button + AI Result panel
//   true  → 顯示（原有 Gemini 直接 generate → download HTML 嘅 user flow）
// v3.13.0: re-enabled with F2 multi-variant 3-card side-by-side comparison UI
const GEMINI_DIRECT_GENERATE_ENABLED = true;

const categories = [
    { value: "教學工具", label: "📚 教學工具", icon: BookOpen },
    { value: "教學遊戲", label: "🎮 教學遊戲", icon: Gamepad2 },
    { value: "情緒支援", label: "❤️ 情緒支援", icon: HeartHandshake },
    { value: "溝通輔助", label: "🗣️ 溝通輔助", icon: MessageCircle },
    { value: "實驗模擬", label: "🧪 實驗模擬", icon: FlaskConical },
    { value: "生活技能", label: "🌱 生活技能", icon: Sparkles },
    { value: "評估回饋", label: "✅ 評估回饋", icon: CheckCircle2 },
];

const subjects = ["語文", "數學", "英文", "人文", "科學", "生活技能", "電腦", "班主任課", "其他"];

const gameStyles = [
    "扭蛋機 (Gachapon)", 
    "夾公仔機 (Claw Crane)", 
    "Candy Crush (消除類 / Match-3)",
    "老虎機 (Slot Machine)", 
    "轉盤抽獎 (Spin Wheel)", 
    "大富翁 / 骰子前進 (Board Game)", 
    "寶箱 / 神秘禮盒 (Mystery Box)", 
    "氣球戳破 (Pop the Balloon)", 
    "投幣許願池 (Wishing Well)", 
    "打地鼠 (Whack-a-Mole)", 
    "接水果 (Catching Fruit)", 
    "禮物盒 / 聖誕拆禮 (Gift Box)", 
    "飲料機 / 自助點餐機 (Vending Machine)", 
    "放天燈 / 孔明燈 (Sky Lantern)", 
    "祈福牆 / 願望板 (Wish Wall)", 
    "香爐 / 點香祈福 (Incense Offering)", 
    "找詞遊戲 (Word Search Puzzle)", 
    "翻卡 / 翻牌記憶配對 (Memory Flip Cards)",
    "其他"
];

const answerMechanismOptions = [
     { value: "3選1答案", label: "3選1答案" },
     { value: "4選1答案", label: "4選1答案" },
     { value: "多選題", label: "多選題" },
     { value: "輸入文字 (Text Input)", label: "輸入文字 (Text Input)" },
     { value: "其他", label: "其他" }
];

const interactionTypes = [
    // 基礎題型 REMOVED
    
    // 操作與排序
    "點擊 (Click)",
    "拖拉物件 (Drag & Drop)",
    "拖拉排序 (Drag & Drop Ordering)",
    "連線題 (Connect the Dots)",
    "圖詞配對 (Matching)",
    "翻卡 / 翻牌記憶配對 (Memory Flip Cards)",
    "滑桿調節 / 數值控制 (Slider Control)",
    "旋轉 / 放大物件",
    
    // 創作與藝術
    "畫布繪圖 / 自由創作 (Drawing Canvas)",
    "填色 / 上色 (Coloring)",
    "拼圖 / 拼合碎片 (Jigsaw Puzzle)",
    "角色換裝 / 文化服飾試穿 (Virtual Dress-Up)",
    
    // 模擬與探索
    "物理模擬 (Physics Simulation)",
    "模擬操作 (Simulation Control)",
    "地圖探索 / 點擊探索 (Map Exploration)",
    "隱藏物件尋找 (Hidden Object Game)",
    "角色裝備 / 升級系統 (Inventory / Upgrade)",
    
    // 敘事與情境
    "角色扮演 / 對話選擇 (Branching Dialogue)",
    "情境選擇 → 後果反饋 (Moral Dilemma)",
    "角色對話輪流朗讀 (Read-Aloud)",
    "故事接龍 / 共創文本 (Collaborative Story)",
    
    // 多感官與其他
    "手勢控制 / 感應器互動",
    "音頻辨識 / 錄音互動",
    "社交互動 / 分享成就",
    "時間限制挑戰",
    "其他"
];

const learningDiversityOptions = [
    { label: "簡化內容 (Simplify Content)", desc: "使用簡單詞彙、短句，避免冗長說明；一次只教一個概念。" },
    { label: "多感官輸入 (Multi-sensory)", desc: "結合圖片、聲音、動作、觸覺等多管道刺激，提升理解與記憶。" },
    { label: "結構化與重複 (Structure & Repetition)", desc: "提供清晰步驟、固定流程與反覆練習機會。" },
    { label: "即時回饋與獎勵 (Instant Feedback)", desc: "每完成一步即給予肯定（聲音、動畫、貼紙等），增強動機。" },
    { label: "視覺輔助 (Visual Aids)", desc: "使用圖卡、流程圖、顏色區分、大字體、高對比界面。" },
    { label: "生活化內容 (Real-life Context)", desc: "教學連結日常生活（如購物、交通、衛生），提升實用性。" },
    { label: "語音朗讀題目 (TTS Question - HK)", desc: "題目提供廣東話語音朗讀功能。" },
    { label: "語音朗讀答案 (TTS Answer - HK)", desc: "答案提供廣東話語音朗讀功能。" },
    { label: "視覺提示 (Visual Cues)", desc: "加入箭頭、色塊、進度條等視覺提示。" }
];

// SEN 類型 — 每個有對應嘅 design implication，AI 收到呢啲會針對性設計
// 香港 SEN 類別參考教育局「全校參與模式融合教育」分類
const senTypeOptions = [
    { id: "adhd", label: "ADHD 專注力不足/過度活躍", desc: "短任務、清晰指示、減少干擾、加入動態操作" },
    { id: "asd", label: "ASD 自閉症譜系", desc: "視覺時間表、避免抽象比喻、固定流程、減少感官過載" },
    { id: "dyslexia", label: "讀寫困難 (Dyslexia)", desc: "易讀字型 (OpenDyslexic / Noto Sans TC)、大行距、語音輔助" },
    { id: "dyscalculia", label: "數學障礙 (Dyscalculia)", desc: "具體教具圖示、分步驟拆解、避開抽象數字符號" },
    { id: "id", label: "智障 / 認知發展遲緩", desc: "簡化詞彙、圖卡為主、重複練習、生活化情境" },
    { id: "hearing", label: "聽障", desc: "視覺為主、字幕、手語影片空間、避純音訊反饋" },
    { id: "visual", label: "視障", desc: "高對比、大字體、語音導航、避純視覺線索" },
    { id: "physical", label: "肢體傷殘", desc: "大點擊區域、鍵盤導航、減少精細動作" },
    { id: "speech", label: "語言障礙", desc: "圖卡替代口語、文字輸入、避用語音評估" },
    { id: "behavioral", label: "情緒行為問題", desc: "正向強化、清楚後果、避免懲罰、社交故事" },
];

// 無障礙 (a11y) 維度 — 老師揀要執行嘅 a11y 維度，AI 會注入具體 checklist
// 預設揀晒 5 個核心項（取消剔 = 老師明示唔需要）
const accessibilityOptions = [
    { id: "contrast", label: "色彩對比 (WCAG AA 4.5:1)", desc: "文字/背景對比 ≥ 4.5:1，重要元素用高對比色塊" },
    { id: "keyboard", label: "鍵盤導航 (Keyboard)", desc: "全部功能可用 Tab/Enter/Esc/方向鍵操作，focus 樣式清晰" },
    { id: "screenReader", label: "Screen Reader 友善", desc: "語意化 HTML (button/nav/main)、aria-label、alt 文字" },
    { id: "reducedMotion", label: "減少動畫 (Reduced Motion)", desc: "respect prefers-reduced-motion，避 auto-play 動畫" },
    { id: "tts", label: "TTS 廣東話支援", desc: "Web Speech API lang='zh-HK'，所有文字內容可朗讀" },
    { id: "fontSize", label: "可調字體大小", desc: "提供 6 級字體調節（14/16/18/22/26/32px）" },
    { id: "highContrast", label: "高對比模式切換", desc: "提供 toggle 一鍵切到純黑白高對比配色" },
    { id: "captions", label: "字幕 / 視覺替代", desc: "所有音效配視覺替代（圖示/震動/文字），照顧聽障" },
];



const values = [
    "堅毅", "尊重他人", "責任感", "國民身份認同", "承擔精神", 
    "誠信", "仁愛", "守法", "同理心", "勤勞", "團結", "孝親"
];

const grades = [
    "小學一年級 (P1)", 
    "小學二年級 (P2)", 
    "小學三年級 (P3)", 
    "小學四年級 (P4)", 
    "小學五年級 (P5)", 
    "小學六年級 (P6)", 
    "中學一年級 (S1)", 
    "中學二年級 (S2)", 
    "中學三年級 (S3)", 
    "中學四年級 (S4)", 
    "中學五年級 (S5)", 
    "中學六年級 (S6)"
];

const difficultyLevels = [
    { value: "初階", label: "初階" },
    { value: "中階", label: "中階" },
    { value: "高階", label: "高階" }
];


const ONBOARDING_STEPS = ['templates', 'step1', 'step2', 'step3', 'step4'];

export function App() {
    const s = useAppState();
    const {
// Tab nav (W1-2)
        activeTab, setActiveTab, handleNextTab, handlePrevTab, tabCompletion, TAB_KEYS,
// Theme
        toggleTheme, theme, setTheme,
// v3.15.0 V1: Reduced-motion override
        motionPref, setMotionPref, cycleMotionPref, motionPrefLoaded,
// Quality / preview
        copiedDesign, copiedTech, showScoreDetail, setShowScoreDetail, previewOpen, setPreviewOpen, previewTab, setPreviewTab,
// W5-6 Prompt Versions
        promptVersions, versionPanelOpen, setVersionPanelOpen, restoreVersion,
        // W7-8 Student Profile Bank
        profileBank, profileBankOpen, setProfileBankOpen, applyProfile,
        // Sections
        expandedSections, setExpandedSections, toggleSection,
        // Onboarding
        onboardingStep, onboardingActive, setOnboardingActive,
        // Suggestion
        activeSuggestionField, setActiveSuggestionField, pendingSuggestion, setPendingSuggestion,
        // AI
        aiGenerating, aiResult, aiError, showApiSettings, setShowApiSettings,
        // Form data
        formData, setFormData, updateField, toggleSelection, handleExampleChange, addExample, removeExample, handleRuleChange, addRule, removeRule,
        // Templates + Gemini key
        userTemplates, geminiApiKey, setGeminiApiKey, fileInputRef, MAX_USER_TEMPLATES,
        // Recovery
        lastSavedAt, recoverySnapshot, acceptRecovery, dismissRecovery,
        // W9-10 Q3: inline warning banner
        warnings, dismissWarning,
        // Undo / Redo
        canUndo, canRedo, pushHistory, undo, redo,
        // Handlers
        handleCopyDesign, handleCopyTech, handleExport, handleGeminiGenerate,
        // v3.13.0 F2: Multi-variant
        variants, handleMultiVariantGenerate, useVariantAsFinal, VARIANT_CONFIG, VARIANT_KEYS,
        // v3.14.0: Award Certificate
        awardCertOpen, setAwardCertOpen,
        saveApiKey, saveAsUserTemplate, deleteUserTemplate, handleLoadTemplate,
        handleDeleteTemplate, handleImportJSON, handleExportJSON,
        handleGetSuggestions, applySuggestion, handleSelectSuggestion,
        handleCoachNext, handleCoachSkip, handleReset,
        confirmReplace, confirmAppend, cancelSuggestion,
        // Computed
        designPrompt, techPrompt, qualityScore,
        // Constants
        categories, subjects, builtinTemplates, triggerJSONImport,
        showGameStyle, showExamples,
    } = s;
    // v3.15.0 A1: live "X 秒前" badge — must be top-level hook call
    const savedLabel = useTimeAgo(lastSavedAt);
const renderStep1 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-token-4">
        {/* === Sub-section 0: 範本庫（快速開始） === */}
        <CollapsibleSection
            theme={theme}
            title="📚 範本庫 (Template Library)"
            badge="快速開始"
            isOpen={expandedSections.templateLibrary}
            onToggle={() => toggleSection('templateLibrary')}
            hint={`${BUILTIN_TEMPLATES.length} 個內建 + ${userTemplates.length} 個自訂`}
        >
            <div className="space-y-token-4">
                <div className={`p-token-3 rounded-lg text-sm ${
                    'bg-blue-50 border border-blue-200 text-blue-800'
                }`}>
                    💡 第一次用？揀一個範本開始最快。所有範本都經 schema migration pipeline，舊 JSON 範本都 work。
                </div>

                <div>
                    <h4 className={`text-sm font-bold mb-2 ${'text-slate-700'}`}>
                        🌟 內建範本 ({BUILTIN_TEMPLATES.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-token-3">
                        {BUILTIN_TEMPLATES.map(t => (
                            <TemplateCard
                                key={t.id}
                                theme={theme}
                                template={t}
                                onLoad={handleLoadTemplate}
                                isUser={false}
                            />
                        ))}
                    </div>
                </div>

                {userTemplates.length > 0 && (
                    <div>
                        <h4 className={`text-sm font-bold mb-2 ${'text-amber-700'}`}>
                            ⭐ 我嘅範本 ({userTemplates.length} / {MAX_USER_TEMPLATES})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-token-3">
                            {userTemplates.map(t => (
                                <TemplateCard
                                    key={t.id}
                                    theme={theme}
                                    template={t}
                                    onLoad={handleLoadTemplate}
                                    onDelete={deleteUserTemplate}
                                    isUser={true}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className={`p-token-3 rounded-lg border-2 border-dashed text-center ${
                    'border-slate-300 bg-slate-50'
                }`}>
                    <button
                        onClick={() => {
                            const name = prompt('為當前設定命名範本：', formData.toolName || '我嘅範本');
                            if (name && name.trim()) {
                                const description = prompt('（可選）簡短描述呢個範本：', '');
                                if (saveAsUserTemplate(name.trim(), description || '')) {
                                    alert(`✅ 範本「${name.trim()}」已儲存！`);
                                }
                            }
                        }}
                        disabled={!formData.toolName && !formData.purpose}
                        className={`px-token-4 py-token-2 rounded-lg font-bold text-sm transition-all ${
                            (!formData.toolName && !formData.purpose)
                                ? ('bg-slate-200 text-slate-400 cursor-not-allowed')
                                : ('bg-amber-500 text-white hover:bg-amber-600')
                        }`}
                    >
                        💾 將當前設定儲存為範本
                    </button>
                    {(!formData.toolName && !formData.purpose) && (
                        <p className={`text-xs mt-2 ${'text-slate-500'}`}>
                            先填寫工具名稱或核心用途先可以儲存範本
                        </p>
                    )}
                </div>
            </div>
        </CollapsibleSection>

        {/* === Sub-section 1: 基本資料 === */}
        <CollapsibleSection
            theme={theme}
            title="📋 基本資料 (1.1–1.2)"
            badge="必填"
            isOpen={expandedSections.basic}
            onToggle={() => toggleSection('basic')}
            hint="老師名 + 工具名"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-token-4">
                <div>
                    <Label theme={theme}>1.1 教職員名字 (Teacher Name)</Label>
                    <Input
                        theme={theme}
                        placeholder="請輸入您的名字 (例如: 陳老師)"
                        value={formData.teacherName}
                        onChange={(e) => updateField('teacherName', e.target.value)}
                    />
                </div>
                <div>
                    <Label theme={theme}>1.2 工具名稱 (Tool Name)</Label>
                    <Input
                        theme={theme}
                        placeholder="例如：快樂農場加法練習、課堂情緒溫度計..."
                        value={formData.toolName}
                        onChange={(e) => updateField('toolName', e.target.value)}
                    />
                </div>
            </div>
        </CollapsibleSection>

        {/* === Sub-section 2: 學科設定 === */}
        <CollapsibleSection
            theme={theme}
            title="📚 學科設定 (1.3–1.4)"
            badge="必填"
            isOpen={expandedSections.subject}
            onToggle={() => toggleSection('subject')}
            hint="範疇 + 科目"
        >
            <div className="space-y-token-4">
                <div>
                    <Label theme={theme}>1.3 工具範疇 (Category)</Label>
                    <div className={`text-xs mb-2 ${'text-slate-500'}`}>
                        💡 範疇決定下面嘅 sub-section：
                        <span className="font-bold"> 教學遊戲 </span>→ 遊戲風格 + 範例題目，
                        <span className="font-bold"> 教學工具 / 實驗模擬 </span>→ 範例題目，
                        <span className="font-bold"> 情緒支援 / 溝通輔助 </span>→ 兩者皆不適用。
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-token-2">
                        {categories.map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => updateField('category', cat.value)}
                                className={`ripple-effect flex flex-col items-center p-token-3 rounded-xl border transition-token-base hover:scale-105 ${
                                    formData.category === cat.value
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 shadow-token-md'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:border-blue-300'
                                }`}
                            >
                                <cat.icon size={22} className="mb-1" />
                                <span className="text-xs font-medium text-center">{cat.label.replace(/^[^\s]+\s/, '')}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label theme={theme}>1.4 科目 (Subject)</Label>
                    <Select
                        theme={theme}
                        options={subjects.map(s => ({value: s, label: s}))}
                        value={formData.subjectCategory}
                        onChange={(e) => updateField('subjectCategory', e.target.value)}
                    />
                    {formData.subjectCategory === "其他" && (
                        <div className="mt-2">
                            <Input
                                theme={theme}
                                placeholder="請輸入科目名稱..."
                                value={formData.subjectCustomInput}
                                onChange={(e) => updateField('subjectCustomInput', e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleSection>

        {/* === Sub-section 2b: 遊戲風格 (only for 教學遊戲) === */}
        {showGameStyle && (
            <CollapsibleSection
                theme={theme}
                title="🎮 遊戲風格 (1.5)"
                badge="教學遊戲限定"
                isOpen={expandedSections.gameStyle}
                onToggle={() => toggleSection('gameStyle')}
                hint="主要嘅視覺隱喻同互動包裝"
            >
                <div className="space-y-token-3">
                    <Label theme={theme}>1.5 遊戲風格 (Game Style)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-token-2">
                        {gameStyles.map(style => (
                            <button
                                key={style}
                                onClick={() => updateField('gameStyle', style)}
                                className={`p-token-2 rounded-lg text-sm font-medium transition-all border text-left ${
                                    formData.gameStyle === style
                                        ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                    {formData.gameStyle === "其他" && (
                        <div className="mt-2">
                            <Input
                                theme={theme}
                                placeholder="請輸入遊戲風格 (例如：射擊遊戲、迷宮)..."
                                value={formData.gameStyleCustomInput}
                                onChange={(e) => updateField('gameStyleCustomInput', e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </CollapsibleSection>
        )}

        {/* === Sub-section 3: 範例題目 (教學遊戲 / 教學工具 / 實驗模擬) === */}
        {showExamples && (
        <CollapsibleSection
            theme={theme}
            title="📝 範例題目 (1.6)"
            badge={`${formData.examples.length} 條`}
            isOpen={expandedSections.examples}
            onToggle={() => toggleSection('examples')}
            hint="初 / 中 / 高 三階題目"
        >
            <div className="space-y-token-4">
                <Label theme={theme}>1.6 範例題目 (Example Questions)</Label>
                {formData.examples.map((ex, index) => (
                    <div key={index} className={`p-token-4 rounded-xl border ${'border-slate-200 bg-white'} space-y-token-3`}>
                        <div className="w-full">
                            <div className={`text-xs mb-1 opacity-70 ${'text-slate-600'}`}>題目內容</div>
                            <textarea
                                className={`w-full px-token-4 py-token-3 rounded-xl outline-none min-h-[80px] resize-y ${'plain-input'}`}
                                placeholder={`例如：蘋果是甚麼顏色？`}
                                value={ex.text}
                                onChange={(e) => handleExampleChange(index, 'text', e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-token-2 items-center">
                            <div className="w-24">
                                <div className={`text-xs mb-1 opacity-70 ${'text-slate-600'}`}>難度</div>
                                <Select
                                    theme={theme}
                                    options={difficultyLevels}
                                    value={ex.level}
                                    onChange={(e) => handleExampleChange(index, 'level', e.target.value)}
                                />
                            </div>
                            <div className="flex-1 min-w-[140px]">
                                <div className={`text-xs mb-1 opacity-70 ${'text-slate-600'}`}>答題機制</div>
                                <Select
                                    theme={theme}
                                    options={answerMechanismOptions}
                                    value={ex.mechanism}
                                    onChange={(e) => handleExampleChange(index, 'mechanism', e.target.value)}
                                />
                            </div>
                            <div className="w-20">
                                <div className={`text-xs mb-1 opacity-70 ${'text-slate-600'}`}>數量</div>
                                <Input
                                    theme={theme}
                                    type="number"
                                    min="1"
                                    max="100"
                                    placeholder="數量"
                                    value={ex.count}
                                    onChange={(e) => handleExampleChange(index, 'count', e.target.value)}
                                />
                            </div>
                            <div className="flex items-end pb-1">
                                <button
                                    onClick={() => removeExample(index)}
                                    className={`p-token-3 rounded-xl transition-colors border border-transparent ${
                                        'text-red-500 hover:bg-red-50 hover:border-red-200'
                                    }`}
                                    disabled={formData.examples.length === 1}
                                    title="移除範例"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                <button
                    onClick={addExample}
                    className={`text-sm font-bold flex items-center px-token-4 py-token-2 rounded-lg border border-transparent transition-all ${
                        'text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                    }`}
                >
                    <Plus size={16} className="mr-1" /> 新增範例
                </button>
            </div>
        </CollapsibleSection>
        )}

        {/* === Sub-section 4: 學生設定 (advanced, 預設收埋) === */}
        <CollapsibleSection
            theme={theme}
            title="🎓 學生設定 (1.7–1.12)"
            badge="進階"
            isOpen={expandedSections.student}
            onToggle={() => toggleSection('student')}
            hint="年級 / SEN / a11y / 互動"
        >
            <div className="space-y-token-6">
                {/* Category-driven callout — 提示當前範疇特別設計要點 */}
                {['情緒支援', '溝通輔助'].includes(formData.category) && (
                    <div className={`p-token-3 rounded-lg border-l-4 text-sm ${
                        'bg-blue-50 border-blue-500 text-blue-900'
                    }`}>
                        💡 <strong>{formData.category}</strong> 工具通常唔需要答題機制，
                        學生用呢類工具表達 / 探索感受。請特別注意 a11y 設定（減少動畫、簡化內容、TTS）對
                        {formData.category === '情緒支援' ? '情緒調節' : '溝通表達'}嘅支援。
                    </div>
                )}
                {formData.category === '教學遊戲' && (
                    <div className={`p-token-3 rounded-lg border-l-4 text-sm ${
                        'bg-emerald-50 border-emerald-500 text-emerald-900'
                    }`}>
                        💡 <strong>教學遊戲</strong> 嘅核心係「動機調節」：遊戲階段純玩（無知識），
                        知識傳遞只發生於問答彈窗。請喺 1.12 互動機制啟用「拖拉」+「點擊」混合操作。
                    </div>
                )}
                {formData.category === '實驗模擬' && (
                    <div className={`p-token-3 rounded-lg border-l-4 text-sm ${
                        'bg-amber-50 border-amber-500 text-amber-900'
                    }`}>
                        💡 <strong>實驗模擬</strong> 通常用 slider 調參數 + 視覺化結果。請加入「重置」按鈕方便學生反覆試驗唔同組合。
                    </div>
                )}
                <div>
                    <Label theme={theme}>1.7 目標年級 (Target Grade)</Label>
                    <Select
                        theme={theme}
                        options={grades.map(g => ({value: g, label: g}))}
                        value={formData.grade}
                        onChange={(e) => updateField('grade', e.target.value)}
                    />
                </div>

                <div>
                    <Label theme={theme}>1.8 支援程度 (SEN Level)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-token-3">
                        <button
                            onClick={() => updateField('senLevel', "輕度 (Mild)")}
                            className={`p-token-4 rounded-xl border text-left transition-all ${
                                formData.senLevel === "輕度 (Mild)"
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <div className={`font-bold tracking-wide ${''}`}>輕度需求 (Mild)</div>
                            <div className="text-xs opacity-70 mt-1">適合一般理解力，可包含較多文字說明與引導。</div>
                        </button>
                        <button
                            onClick={() => updateField('senLevel', "中度 (Moderate)")}
                            className={`p-token-4 rounded-xl border text-left transition-all ${
                                formData.senLevel === "中度 (Moderate)"
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <div className={`font-bold tracking-wide ${''}`}>中度需求 (Moderate)</div>
                            <div className="text-xs opacity-70 mt-1">需要高強度視覺輔助，少字多圖，詞彙簡單直接。</div>
                        </button>
                    </div>
                </div>

                <div>
                    <Label theme={theme}>1.9 SEN 類型 (SEN Type) <span className={`text-xs ml-1 font-normal ${'text-blue-500'}`}>[可多選]</span></Label>
                    <div className={`text-xs mb-2 ${'text-slate-500'}`}>
                        學生有邊啲特殊教育需要？AI 會根據所選類型調整設計（例如 ADHD → 短任務；ASD → 視覺時間表）。
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-token-2">
                        {senTypeOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => toggleSelection('senTypes', opt.label)}
                                className={`p-token-3 rounded-lg text-sm font-medium transition-all border text-left flex flex-col gap-token-1 h-full ${
                                    formData.senTypes.includes(opt.label)
                                    ? ('border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500')
                                    : ('border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                                }`}
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-xs opacity-70 font-light">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label theme={theme}>1.10 無障礙設定 (Accessibility) <span className={`text-xs ml-1 font-normal ${'text-blue-500'}`}>[可多選]</span></Label>
                    <div className={`text-xs mb-2 ${'text-slate-500'}`}>
                        預設全選核心項。取消剔 = 呢項毋須嚴格執行（例如唔需要 TTS 就取消剔）。
                    </div>
                    {/* Smart Recommend chip — 根據 SEN types 自動推薦 a11y */}
                    {formData.senTypes.length > 0 && (() => {
                        const recommended = getRecommendedA11y(formData.senTypes).filter(r => !formData.accessibility.includes(r) && !r.includes('概念：'));
                        if (recommended.length === 0) return null;
                        return (
                            <div className={`mb-3 p-token-3 rounded-lg border-2 border-dashed ${
                                'bg-emerald-50 border-emerald-300'
                            }`}>
                                <div className="flex items-start justify-between gap-token-3">
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold mb-1 ${'text-emerald-800'}`}>
                                            💡 智能推薦（根據 SEN 類型）
                                        </div>
                                        <div className={`text-xs mb-2 ${'text-emerald-700'}`}>
                                            為「{formData.senTypes.join('、')}」推薦以下 a11y 維度：
                                        </div>
                                        <div className="flex flex-wrap gap-token-1">
                                            {recommended.map(r => (
                                                <span key={r} className={`text-xs px-token-2 py-0.5 rounded-full ${
                                                    'bg-white border border-emerald-300 text-emerald-800'
                                                }`}>
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            // Merge recommended (only existing accessibilityOptions labels)
                                            const validLabels = accessibilityOptions.map(o => o.label);
                                            const toAdd = recommended.filter(r => validLabels.includes(r));
                                            if (toAdd.length === 0) {
                                                alert('推薦項目冇對應嘅 a11y 維度（部分係設計建議）。手動啟用合適嘅維度。');
                                                return;
                                            }
                                            setFormData(prev => ({
                                                ...prev,
                                                accessibility: [...new Set([...prev.accessibility, ...toAdd])],
                                            }));
                                        }}
                                        className={`flex-none px-token-3 py-token-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                            'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                    >
                                        ⚡ 一鍵啟用
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-token-2">
                        {accessibilityOptions.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => toggleSelection('accessibility', opt.label)}
                                className={`p-token-3 rounded-lg text-sm font-medium transition-all border text-left flex flex-col gap-token-1 h-full ${
                                    formData.accessibility.includes(opt.label)
                                    ? ('border-cyan-500 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-500')
                                    : ('border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                                }`}
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-xs opacity-70 font-light">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label theme={theme}>1.11 照顧學習差異 (Learning Diversity) <span className={`text-xs ml-1 font-normal ${'text-blue-500'}`}>[可多選]</span></Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-token-2">
                        {learningDiversityOptions.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => toggleSelection('learningDiversity', opt.label)}
                                className={`p-token-3 rounded-lg text-sm font-medium transition-all border text-left flex flex-col gap-token-1 h-full ${
                                    formData.learningDiversity.includes(opt.label)
                                    ? ('border-cyan-500 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-500')
                                    : ('border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                                }`}
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-xs opacity-70 font-light">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label theme={theme}>1.12 互動類型 (Interaction Types) <span className={`text-xs ml-1 font-normal ${'text-blue-500'}`}>[可多選]</span></Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-token-2">
                        {interactionTypes.map(type => (
                            <button
                                key={type}
                                onClick={() => toggleSelection('interactionType', type)}
                                className={`p-token-2 rounded-lg text-sm font-medium transition-all border text-left ${
                                    formData.interactionType.includes(type)
                                        ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    {formData.interactionType.includes("其他") && (
                        <div className="mt-2">
                            <Input
                                theme={theme}
                                placeholder="請輸入互動方式 (例如：連連看、填空)..."
                                value={formData.interactionCustomInput}
                                onChange={(e) => updateField('interactionCustomInput', e.target.value)}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleSection>
    </motion.div>
);


const renderStep2 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-token-6">
        <div>
            <div className="flex items-center justify-between">
                <Label theme={theme}>2.1 核心用途 (Core Purpose) <span className="text-red-500">*</span></Label>
                <button
                    onClick={() => setActiveSuggestionField(activeSuggestionField === 'purpose' ? null : 'purpose')}
                    className={`flex items-center gap-token-1 px-token-2 py-token-1 rounded-md text-xs font-bold transition-all ${
                        activeSuggestionField === 'purpose'
                            ? ('bg-blue-100 text-blue-700 border border-blue-300')
                            : ('text-slate-500 hover:text-blue-600 hover:bg-slate-100')
                    }`}
                    title="AI 根據所選範疇智能推薦核心用途"
                >
                    <Sparkles size={12} />
                    {activeSuggestionField === 'purpose' ? '關閉建議' : '✨ AI 幫我諗'}
                </button>
            </div>
            <div className={`text-xs mb-2 ${'text-slate-500'}`}>請簡述這個工具要解決什麼問題？(必填)</div>
            <TextArea
                theme={theme}
                placeholder="例如：讓學生透過拖放蘋果來練習 10 以內的加法，或是幫助自閉症學生指認當下的情緒..."
                value={formData.purpose}
                onChange={(e) => updateField('purpose', e.target.value)}
                className={!formData.purpose && activeTab === 'content' ? "border-red-500/50" : ""}
            />
            {activeSuggestionField === 'purpose' && (
                <SuggestionPanel
                    theme={theme}
                    field="purpose"
                    candidates={getSuggestions('purpose', formData)}
                    onSelect={(text) => applySuggestion('purpose', text)}
                    onClose={() => setActiveSuggestionField(null)}
                />
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-token-6">
            <div>
                <div className="flex items-center justify-between">
                    <Label theme={theme}>2.2 生活情境設定 (Context)</Label>
                    <button
                        onClick={() => setActiveSuggestionField(activeSuggestionField === 'context' ? null : 'context')}
                        className={`flex items-center gap-token-1 px-token-2 py-token-1 rounded-md text-xs font-bold transition-all ${
                            activeSuggestionField === 'context'
                                ? ('bg-blue-100 text-blue-700 border border-blue-300')
                                : ('text-slate-500 hover:text-blue-600 hover:bg-slate-100')
                        }`}
                        title="AI 根據所選範疇智能推薦生活情境"
                    >
                        <Sparkles size={12} />
                        {activeSuggestionField === 'context' ? '關閉建議' : '✨ AI 幫我諗'}
                    </button>
                </div>
                <Input
                    theme={theme}
                    placeholder="例如：超級市場購物、搭乘地鐵、種植花朵..."
                    value={formData.context}
                    onChange={(e) => updateField('context', e.target.value)}
                />
                {activeSuggestionField === 'context' && (
                    <SuggestionPanel
                        theme={theme}
                        field="context"
                        candidates={getSuggestions('context', formData)}
                        onSelect={(text) => applySuggestion('context', text)}
                        onClose={() => setActiveSuggestionField(null)}
                    />
                )}
            </div>
            <div>
                <Label theme={theme}>2.3 融入價值觀 (Values) <span className={`text-xs ml-1 font-normal ${'text-blue-500'}`}>[可多選]</span></Label>
                <div className="grid grid-cols-2 gap-token-2 mt-2">
                    {values.map(val => (
                        <button
                            key={val}
                            onClick={() => toggleSelection('value', val)}
                            className={`p-token-2 rounded-lg text-sm font-medium transition-all border text-left ${
                                formData.value.includes(val)
                                    ? 'border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            {val}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </motion.div>
);


const renderStep3 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-token-6">
        <div>
            <div className="flex items-center justify-between">
                <Label theme={theme}>3.1 具體規則與邏輯 (Rules)</Label>
                <button
                    onClick={() => setActiveSuggestionField(activeSuggestionField === 'rules' ? null : 'rules')}
                    className={`flex items-center gap-token-1 px-token-2 py-token-1 rounded-md text-xs font-bold transition-all ${
                        activeSuggestionField === 'rules'
                            ? ('bg-blue-100 text-blue-700 border border-blue-300')
                            : ('text-slate-500 hover:text-blue-600 hover:bg-slate-100')
                    }`}
                    title="AI 推薦通用嘅教學工具規則（會直接 append 到 rules list）"
                >
                    <Sparkles size={12} />
                    {activeSuggestionField === 'rules' ? '關閉建議' : '✨ AI 幫我加規則'}
                </button>
            </div>
            <div className={`text-xs mb-2 ${'text-slate-500'}`}>請列出這個工具必須遵守的規則（例如：計分方式、匯入功能等）。</div>

            {activeSuggestionField === 'rules' && (
                <SuggestionPanel
                    theme={theme}
                    field="rules"
                    candidates={getSuggestions('rules', formData)}
                    onSelect={(text) => applySuggestion('rules', text)}
                    onClose={() => setActiveSuggestionField(null)}
                />
            )}

            <div className="space-y-token-3">
                {formData.rules.map((rule, index) => {
                    // W9-10 #6: rule 由 string → {text, __isDefault}
                    const ruleText = typeof rule === 'string' ? rule : (rule?.text || '');
                    const isDefault = typeof rule === 'object' && rule !== null && rule.__isDefault === true;
                    return (
                        <div key={index} className="flex gap-token-2">
                            <div className={`flex-none pt-3 font-bold text-sm w-6 ${'text-blue-600'}`}>
                                {index + 1}.
                            </div>
                            <div className="flex-1">
                                <TextArea
                                    theme={theme}
                                    value={ruleText}
                                    onChange={(e) => handleRuleChange(index, e.target.value)}
                                    placeholder={`規則 ${index + 1} (例如：答錯時要播放提示音)`}
                                    className="min-h-[80px]"
                                />
                                {isDefault && (
                                    <div className={`text-xs mt-1 ${'text-slate-400'}`}>
                                        📋 預設範例 — 改一下就會自動標記為「自訂規則」
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => removeRule(index)}
                                className={`flex-none h-12 mt-1 p-token-3 rounded-xl transition-colors border border-transparent ${
                                    'text-red-500 hover:bg-red-50 hover:border-red-200'
                                }`}
                                disabled={formData.rules.length === 1}
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
            
            <button 
                onClick={addRule}
                className={`mt-3 text-sm font-bold flex items-center px-token-4 py-token-2 rounded-lg border border-transparent transition-all ${
                    'text-blue-600 hover:bg-blue-50 hover:border-blue-200'
                }`}
            >
                + 新增一條規則
            </button>
        </div>

        {/* New Technical Features Section */}
        <div>
            <Label theme={theme}>技術功能設定 (Technical Features)</Label>
            <div className={`p-token-4 rounded-xl border ${
                'border-slate-200 bg-slate-50'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-token-3">
                        <div className={`p-token-2 rounded-lg ${
                            'bg-blue-100 text-blue-600'
                        }`}>
                            <Accessibility size={20} />
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${'text-slate-800'}`}>加入偏好設定模組</div>
                            <div className={`text-xs ${'text-slate-500'}`}>包含字體大小 (6級) 與 語音速度 (6級) 調整功能</div>
                        </div>
                    </div>
                    <ToggleSwitch
                        theme={theme}
                        on={!!formData.includePreferenceSettings}
                        onChange={(next) => updateField('includePreferenceSettings', next)}
                        size="md"
                        ariaLabel="啟用偏好設定"
                    />
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-token-3">
                        <div className={`p-token-2 rounded-lg ${
                            'bg-purple-100 text-purple-600'
                        }`}>
                            <Code size={20} />
                        </div>
                        <div>
                            <div className={`font-bold text-sm ${'text-slate-800'}`}>Gemini 風格輸出格式</div>
                            <div className={`text-xs ${'text-slate-500'}`}>若開啟，Part 2 會注入「生成單一 HTML 檔案 + Gemini 美學風格」指令。關閉則 prompt 由 AI 自由決定 stack / output。</div>
                        </div>
                    </div>
                    <ToggleSwitch
                        theme={theme}
                        on={!!formData.useGeminiStyle}
                        onChange={(next) => updateField('useGeminiStyle', next)}
                        size="md"
                        ariaLabel="啟用 Gemini 風格輸出"
                    />
                </div>

                {/* v3.2.4: 個別化學習報告模組 — 由 3.1 default rule 抽出嚟做獨立 toggle 控制 */}
                {/* Master toggle + 3 sub-toggles (a/b/c 對應原 rule 三段) */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-token-3">
                            <div className={`p-token-2 rounded-lg ${
                                'bg-amber-100 text-amber-600'
                            }`}>
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${'text-slate-800'}`}>📊 個別化學習報告模組</div>
                                <div className={`text-xs ${'text-slate-500'}`}>完成任務後嘅學習報告：包含學習數據、視覺化、與成長型思維建議</div>
                            </div>
                        </div>
                        <ToggleSwitch
                            theme={theme}
                            on={formData.personalizedReport?.enabled !== false}
                            onChange={(next) => updateField('personalizedReport', { ...formData.personalizedReport, enabled: next })}
                            size="md"
                            ariaLabel="啟用個別化學習報告模組"
                        />
                    </div>

                    {/* Sub-toggles: a/b/c 三段 + d 段「親師溝通」4 個 sub-features — 跟 master toggle 啟用狀態 */}
                    <div className={`mt-3 ml-2 space-y-2 ${formData.personalizedReport?.enabled === false ? 'opacity-40 pointer-events-none' : ''}`}>
                        {[
                            { key: 'showData', label: 'a. 個別化與數據化', desc: '答對率、最熟練／需加強項目、錯誤模式分析' },
                            { key: 'showVisualization', label: 'b. 可視化與兒童友善', desc: '長條圖／進度條、大字體、Emoji 圖示' },
                            { key: 'showGrowthMindset', label: 'c. 正向語言與建議', desc: '成長型思維措辭、具體可操作建議' },
                            // v3.2.5: d 段「親師溝通格式」— 深化 b 段視覺化嘅延伸
                            { key: 'showParentPDF', label: 'd1. 可列印 PDF 摘要', desc: 'A4 一頁格式：學生頭像 + 數據 + 長條圖 + 教師／家長欄' },
                            { key: 'showParentQR', label: 'd2. QR code 畀家長', desc: '掃描即睇答題 timeline + 情緒 emoji 日誌 + 家長回饋' },
                            { key: 'showNewsletter', label: 'd3. 班級學習電子報', desc: 'MVP 學生榜 + 需關注名單 + 班級趨勢 + 教學建議' },
                            { key: 'showTeacherReflection', label: 'd4. 教師反思 prompt', desc: 'KWL 反思框架：知道 / 想知 / 學到（摺疊筆記欄）' },
                        ].map(sub => (
                            <div key={sub.key} className="flex items-center justify-between py-1">
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className={`text-xs font-bold ${'text-slate-700'}`}>{sub.label}</div>
                                    <div className={`text-[10px] ${'text-slate-500'}`}>{sub.desc}</div>
                                </div>
                                <ToggleSwitch
                                    theme={theme}
                                    on={formData.personalizedReport?.[sub.key] !== false}
                                    onChange={(next) => updateField('personalizedReport', {
                                        ...formData.personalizedReport,
                                        [sub.key]: next,
                                    })}
                                    size="sm"
                                    ariaLabel={`啟用 ${sub.label}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* New: FAB style 選擇 — 控制生成出嚟嘅 HTML 工具嘅右下角 FAB 風格 */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-token-3">
                            <div className={`p-token-2 rounded-lg ${
                                'bg-pink-100 text-pink-600'
                            }`}>
                                <Monitor size={20} />
                            </div>
                            <div>
                                <div className={`font-bold text-sm ${'text-slate-800'}`}>右下角 FAB 風格 (FAB Style)</div>
                                <div className={`text-xs ${'text-slate-500'}`}>控制生成工具右下角浮動標籤嘅視覺風格</div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-token-2 mt-3">
                        {[
                            { value: "cyber", label: "🪩 Cyber", desc: "全息漸變 + 簽名圖" },
                            { value: "minimal", label: "⚪ Minimal", desc: "白底簡約按鈕" },
                            { value: "off", label: "🚫 關閉", desc: "唔加 FAB" },
                        ].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => updateField('fabStyle', opt.value)}
                                className={`p-token-3 rounded-lg text-sm font-medium transition-all border text-left flex flex-col gap-token-1 h-full ${
                                    formData.fabStyle === opt.value
                                    ? ('border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500')
                                    : ('border-slate-200 bg-white hover:bg-slate-50 text-slate-600')
                                }`}
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-xs opacity-70 font-light">{opt.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ============================================================
                   v3.14.0: e. 奬狀模組 (Award Certificate)
                   從 formData.assessment 拉學生數據 → 生成 6 風格奬狀
                   Modal preview + browser print (Cmd+P)
                   ============================================================ */}
                <div className="mt-token-6 pt-token-4 border-t border-slate-200">
                    <div className="flex items-start gap-token-3">
                        <ToggleSwitch
                            theme={theme}
                            on={formData.awardCertificate?.enabled === true}
                            onChange={(next) => updateField('awardCertificate', { ...formData.awardCertificate, enabled: next })}
                            ariaLabel="啟用奬狀生成模組"
                        />
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base ${
                            theme === 'warm' ? 'bg-pink-100 text-pink-700' : theme === 'dark' ? 'bg-pink-500/20 text-pink-300' : theme === 'contrast' ? 'bg-white border-2 border-black text-pink-600' : theme === 'paper' ? 'bg-pink-50 text-pink-700' : theme === 'reactor' ? 'bg-pink-500/20 text-pink-300' : 'bg-pink-100 text-pink-700'
                        }`}>
                            🏆
                        </div>
                        <div className="flex-1">
                            <div className={`font-bold text-sm ${'text-slate-800'}`}>🏆 奬狀模組 (Award Certificate)</div>
                            <div className={`text-xs ${'text-slate-500'}`}>從「📊 評估」tab 拉學生數據 → 生成 6 風格奬狀。Modal preview + browser 列印 (Cmd+P)。</div>
                        </div>
                    </div>
                    <div className={`mt-3 ml-2 space-y-3 ${formData.awardCertificate?.enabled !== true ? 'opacity-40 pointer-events-none' : ''}`}>
                        {/* Style picker */}
                        <div>
                            <Label theme={theme}>奬狀風格</Label>
                            <div className="grid grid-cols-3 gap-token-2 mt-2">
                                {[
                                    { value: 'rainbow', emoji: '🌈', label: '彩虹', desc: '鮮色 + emoji' },
                                    { value: 'medal',   emoji: '🏅', label: '獎牌', desc: '金屬 ribbon' },
                                    { value: 'galaxy',  emoji: '🌌', label: '星空', desc: '深色 + glow' },
                                    { value: 'art',     emoji: '🎨', label: '藝術', desc: '粉彩 + 筆觸' },
                                    { value: 'dino',    emoji: '🦕', label: '恐龍', desc: '粗獷 + 綠色' },
                                    { value: 'flower',  emoji: '🌸', label: '花漾', desc: '粉色 + 植物' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateField('awardCertificate', { ...formData.awardCertificate, style: opt.value })}
                                        className={`p-token-2 rounded-lg text-xs font-medium transition-all border text-left flex flex-col gap-token-1 h-full ${
                                            (formData.awardCertificate?.style || 'rainbow') === opt.value
                                            ? 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500'
                                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <span className="text-lg">{opt.emoji}</span>
                                        <span className="font-bold text-sm">{opt.label}</span>
                                        <span className="text-xs opacity-70">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Content sub-toggles */}
                        <div className="grid grid-cols-2 gap-token-2">
                            {[
                                { key: 'showStudentName',    label: '學生姓名', defaultOn: true },
                                { key: 'showDate',           label: '日期',     defaultOn: true },
                                { key: 'showSubject',        label: '科目',     defaultOn: true },
                                { key: 'showScore',          label: '分數',     defaultOn: true },
                                { key: 'showStrengths',      label: '強項主題', defaultOn: true },
                                { key: 'showImprovement',   label: '進步幅度', defaultOn: false },
                            ].map(t => {
                                const currentVal = formData.awardCertificate?.[t.key];
                                const isOn = currentVal === undefined ? t.defaultOn : currentVal;
                                return (
                                    <label key={t.key} className="flex items-center gap-token-2 px-token-3 py-token-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                                        <ToggleSwitch
                                            theme={theme}
                                            size="sm"
                                            on={isOn}
                                            onChange={(next) => updateField('awardCertificate', { ...formData.awardCertificate, [t.key]: next })}
                                            ariaLabel={t.label}
                                        />
                                        <span className="text-sm text-slate-700">{t.label}</span>
                                    </label>
                                );
                            })}
                            {/* Teacher message toggle — full width */}
                            <label className="col-span-2 flex items-center gap-token-2 px-token-3 py-token-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                                <ToggleSwitch
                                    theme={theme}
                                    size="sm"
                                    on={formData.awardCertificate?.showTeacherMessage === true}
                                    onChange={(next) => updateField('awardCertificate', { ...formData.awardCertificate, showTeacherMessage: next })}
                                    ariaLabel="老師個人訊息"
                                />
                                <span className="text-sm text-slate-700">老師個人訊息</span>
                            </label>
                        </div>
                        {formData.awardCertificate?.showTeacherMessage === true && (
                            <TextArea
                                theme={theme}
                                value={formData.awardCertificate?.teacherMessage || ''}
                                onChange={(e) => updateField('awardCertificate', { ...formData.awardCertificate, teacherMessage: e.target.value })}
                                placeholder="例: 小明這個月在加法應用題上有顯著進步, 繼續加油!"
                            />
                        )}
                        {/* Preview button */}
                        <button
                            onClick={() => setAwardCertOpen(true)}
                            className={`w-full px-token-4 py-token-3 rounded-lg text-sm font-bold flex items-center justify-center gap-token-2 transition-all ${
                                theme === 'warm' ? 'bg-pink-500 text-white hover:bg-pink-600' : theme === 'dark' ? 'bg-pink-500 text-white hover:bg-pink-400' : theme === 'contrast' ? 'bg-black text-white border-2 border-white hover:bg-white hover:text-black' : theme === 'paper' ? 'bg-pink-700 text-white hover:bg-pink-800' : theme === 'reactor' ? 'bg-pink-500 text-zinc-950 hover:bg-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.4)]' : 'bg-pink-600 text-white hover:bg-pink-700'
                            }`}
                        >
                            👁️ 預覽奬狀 + 列印
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);


const renderStep4 = (formData, designPrompt, techPrompt, qualityScore) => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-token-4">
        <div className={`border p-token-6 rounded-2xl flex items-start gap-token-4 ${
            'bg-white border-blue-200 shadow-md'
        }`}>
            <div className={`p-token-3 rounded-full shadow-sm ${
                'bg-blue-100 text-blue-600'
            }`}>
                <Sparkles size={24} />
            </div>
            <div>
                <h3 className={`text-lg font-bold ${
                    'text-slate-800'
                }`}>提詞已生成！</h3>
                <div className={`text-sm mt-2 space-y-token-1 ${
                    'text-slate-600'
                }`}>
                    <p>1. 請點擊下方按鈕複製 PART 1 設計與邏輯，然後貼給 AI 進行構思。</p>
                    <p>2. 待 AI 回應後，請複製 PART 2 技術與執行讓 AI 生成 MVP 專案（最小可行產品）。</p>
                </div>
            </div>
            <QualityScoreBadge
                theme={theme}
                score={qualityScore}
                onClick={() => setShowScoreDetail(prev => !prev)}
            />
        </div>

        {showScoreDetail && (
            <QualityScoreDetail
                theme={theme}
                score={qualityScore}
                onClose={() => setShowScoreDetail(false)}
            />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-token-4 md:h-[600px]">
            {/* Left Side: Design Prompt */}
            <div className="flex flex-col h-full">
                <div className={`flex items-center justify-between mb-2 ${'text-slate-700'}`}>
                    <span className="text-sm font-bold orbitron">Part 1: 設計與邏輯</span>
                    <button
                        onClick={handleCopyDesign}
                        className={`px-token-3 py-token-1 rounded-lg flex items-center gap-token-2 text-xs font-bold transition-all border shadow-sm ${
                            'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {copiedDesign ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copiedDesign ? "已複製" : "複製 Part 1"}
                    </button>
                </div>
                <textarea
                    readOnly
                    value={designPrompt}
                    className={`flex-1 w-full font-mono text-xs p-token-4 rounded-xl outline-none resize-none leading-relaxed border shadow-inner ${
                        'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                />
            </div>

            {/* Right Side: Technical Prompt */}
            <div className="flex flex-col h-full">
                <div className={`flex items-center justify-between mb-2 ${'text-slate-700'}`}>
                    <span className="text-sm font-bold orbitron">Part 2: 技術與執行</span>
                    <button
                        onClick={handleCopyTech}
                        className={`px-token-3 py-token-1 rounded-lg flex items-center gap-token-2 text-xs font-bold transition-all border shadow-sm ${
                            'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {copiedTech ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copiedTech ? "已複製" : "複製 Part 2"}
                    </button>
                </div>
                <textarea
                    readOnly
                    value={techPrompt}
                    className={`flex-1 w-full font-mono text-xs p-token-4 rounded-xl outline-none resize-none leading-relaxed border shadow-inner ${
                        'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                />
            </div>
        </div>
        
        <div className="flex justify-end gap-token-2 mt-4">
                 <button
                    onClick={() => setVersionPanelOpen(true)}
                    className={`px-token-3 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm ${
                        theme === 'warm' ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300' : theme === 'dark' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : theme === 'contrast' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : theme === 'paper' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : theme === 'reactor' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                    }`}
                    title="管理 Prompt 版本 + Diff View (W5-6)"
                >
                    <History size={16} />
                    <span className="hidden sm:inline">📚 版本 ({promptVersions.versions.length})</span>
                </button>
                {GEMINI_DIRECT_GENERATE_ENABLED && (
                <>
                <button
                    onClick={() => setShowApiSettings(true)}
                    className={`px-token-3 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm ${
                        'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                    }`}
                    title={geminiApiKey ? 'AI API 已設定' : '設定 Gemini API key'}
                >
                    <img src={personalLogo} alt="NT-D" className="h-4 w-4" />
                    <span className="hidden sm:inline">{geminiApiKey ? '✓ API' : '⚙️ API'}</span>
                </button>
                <button
                    onClick={async () => {
                        if (aiGenerating) return;
                        try {
                            setAiError(null);
                            setAiResult('');
                            setAiGenerating(true);
                            // techPrompt 由 params 傳入（已 compute 過）
                            const text = await generateWithGemini('tech', techPrompt);
                            setAiResult(text);
                        } catch (err) {
                            setAiError(err.message || String(err));
                        } finally {
                            setAiGenerating(false);
                        }
                    }}
                    disabled={aiGenerating || !geminiApiKey}
                    className={`px-token-4 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm text-white ${
                        aiGenerating
                            ? 'bg-slate-400 cursor-wait'
                            : !geminiApiKey
                                ? 'bg-slate-300 cursor-not-allowed'
                                : ('bg-purple-600 hover:bg-purple-700')
                    }`}
                    title={geminiApiKey ? '直接 send Part 2 prompt 畀 Gemini 生成 HTML' : '請先設定 API key'}
                >
                    {aiGenerating ? '⏳ 生成中...' : '🚀 直接生成 HTML'}
                </button>
                {/* v3.13.0 F2: Multi-variant parallel generation (3 lengths side-by-side) */}
                <button
                    onClick={() => handleMultiVariantGenerate()}
                    disabled={aiGenerating || !geminiApiKey || variants.short.loading || variants.standard.loading || variants.long.loading}
                    className={`px-token-3 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm text-white ${
                        aiGenerating || variants.short.loading || variants.standard.loading || variants.long.loading
                            ? 'bg-slate-400 cursor-wait'
                            : !geminiApiKey
                                ? 'bg-slate-300 cursor-not-allowed'
                                : (theme === 'dark' ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                                    : theme === 'reactor' ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500')
                    }`}
                    title={geminiApiKey ? '同時生成 簡短/標準/完整 3 個版本並排比較 (3x Gemini calls)' : '請先設定 API key'}
                >
                    <Sparkles size={16} />
                    {variants.short.loading || variants.standard.loading || variants.long.loading
                        ? '⏳ 3 個生成中...'
                        : '✨ 3 版本並排'}
                </button>
                </>
                )}
                 <button
                    onClick={handleExportJSON}
                    className={`px-token-3 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm ${
                        'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                    title="儲存為 JSON 檔案"
                >
                    <FileJson size={16} />
                    <span className="hidden sm:inline">JSON</span>
                </button>
                <button
                    onClick={handleExport}
                    className={`px-token-3 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm ${
                        'bg-white hover:bg-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                    title="匯出為 DOCX 檔案"
                >
                    <FileText size={16} />
                    <span className="hidden sm:inline">DOCX</span>
                </button>
                <button 
                    onClick={() => setActiveTab('rules')} // Return to 規則 tab
                    className={`px-token-4 py-token-2 rounded-lg flex items-center gap-token-2 text-sm font-bold transition-all border shadow-sm ${
                        'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                    title="返回上一步 (Step 3)"
                >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">上一步</span>
                </button>
        </div>
    </motion.div>
);

// AI Result Panel — 顯示 Gemini response（HTML code）
const renderAiResult = () => (
    <Card theme={theme} className="mt-4 p-token-4">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-token-2">
                <img src={personalLogo} alt="NT-D" className={`h-5 w-5 ${''}`} />
                <h3 className={`text-sm font-bold ${'text-slate-800'}`}>
                    NT-D Gemini 生成嘅 HTML
                </h3>
            </div>
            <button
                onClick={() => setAiResult('')}
                className={`text-xs px-token-2 py-token-1 rounded ${
                    'text-slate-500 hover:bg-slate-100'
                }`}
            >
                ✕ 清除
            </button>
        </div>
        {aiError && (
            <div className={`p-token-3 rounded-lg text-sm mb-3 ${
                'bg-red-50 border border-red-200 text-red-700'
            }`}>
                ❌ {aiError}
            </div>
        )}
        {aiGenerating && !aiResult && (
            <div className="p-token-4 space-y-token-3">
                {/* Phase 3.4.3: Skeleton loading pulse */}
                <div className={`text-center text-sm mb-2 ${'text-blue-600'}`}>
                    <span className="animate-pulse">⏳ Gemini 諗緊度...通常 5-30 秒</span>
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        className={`skeleton h-3 rounded ${
                            i === 5 ? 'w-3/4' : 'w-full'
                        } ${'bg-slate-200'}`}
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>
        )}
        {aiResult && (
            <>
                <textarea
                    readOnly
                    value={aiResult}
                    className={`w-full font-mono text-xs p-token-3 rounded-lg outline-none resize-y ${
                        'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                    style={{ minHeight: '400px' }}
                />
                <div className="flex gap-token-2 mt-2">
                    <button
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(aiResult);
                                alert('✅ 已複製到 clipboard！貼去 IDE 或儲存為 .html。');
                            } catch (err) {
                                // Fallback
                                const ta = document.createElement('textarea');
                                ta.value = aiResult;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand('copy');
                                document.body.removeChild(ta);
                                alert('✅ 已複製（fallback）');
                            }
                        }}
                        className={`px-token-3 py-token-1.5 rounded-lg text-xs font-bold ${
                            'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                    >
                        📋 複製代碼
                    </button>
                    <button
                        onClick={() => {
                            const blob = new Blob([aiResult], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `tda-generated-${Date.now()}.html`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className={`px-token-3 py-token-1.5 rounded-lg text-xs font-bold ${
                            'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                    >
                        ⬇️ 下載 .html
                    </button>
                    <a
                        href={`data:text/html;charset=utf-8,${encodeURIComponent(aiResult)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-token-3 py-token-1.5 rounded-lg text-xs font-bold ${
                            'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                    >
                        🪟 喺新 tab 開
                    </a>
                </div>
            </>
        )}
    </Card>
);

// === v3.13.0 F2: Multi-variant result panel (3 cards side-by-side) ===
const renderMultiVariant = () => {
    // Only show if at least one variant has been triggered
    const hasAny = VARIANT_KEYS.some(k => variants[k].loading || variants[k].text || variants[k].error);
    if (!hasAny) return null;

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-bold flex items-center gap-token-2 ${
                    theme === 'warm' ? 'text-amber-900' : theme === 'dark' ? 'text-cyan-100' : theme === 'contrast' ? 'text-black' : theme === 'paper' ? 'text-stone-900' : theme === 'reactor' ? 'text-amber-100' : 'text-slate-800'
                }`}>
                    <Sparkles size={16} />
                    3 版本並排比較 (Multi-variant comparison)
                </h3>
                <button
                    onClick={() => setVariants({
                        short:    { text: '', error: null, tokenCount: 0, durationMs: 0, loading: false },
                        standard: { text: '', error: null, tokenCount: 0, durationMs: 0, loading: false },
                        long:     { text: '', error: null, tokenCount: 0, durationMs: 0, loading: false },
                    })}
                    className={`text-xs px-token-2 py-token-1 rounded ${
                        theme === 'warm' ? 'text-amber-700 hover:bg-amber-100' : theme === 'dark' ? 'text-cyan-300 hover:bg-slate-800' : theme === 'contrast' ? 'text-black hover:bg-black hover:text-white' : theme === 'paper' ? 'text-stone-700 hover:bg-stone-100' : theme === 'reactor' ? 'text-amber-300 hover:bg-zinc-900' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    ✕ 清除全部
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-token-3">
                {VARIANT_KEYS.map(variantKey => {
                    const variant = variants[variantKey];
                    const cfg = VARIANT_CONFIG[variantKey];
                    return (
                        <Card key={variantKey} theme={theme} className="p-token-3 flex flex-col">
                            {/* Header: emoji + label + length badge */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-token-2">
                                    <span className="text-xl">{cfg.emoji}</span>
                                    <div>
                                        <h4 className={`text-sm font-bold ${
                                            theme === 'warm' ? 'text-amber-900' : theme === 'dark' ? 'text-cyan-100' : theme === 'contrast' ? 'text-black' : theme === 'paper' ? 'text-stone-900' : theme === 'reactor' ? 'text-amber-100' : 'text-slate-800'
                                        }`}>{cfg.label}</h4>
                                        <p className={`text-xs ${mutedTextClass(theme)}`}>{cfg.desc}</p>
                                    </div>
                                </div>
                                {variant.tokenCount > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        theme === 'warm' ? 'bg-amber-100 text-amber-700' : theme === 'dark' ? 'bg-cyan-500/20 text-cyan-300' : theme === 'contrast' ? 'bg-black text-white' : theme === 'paper' ? 'bg-stone-200 text-stone-700' : theme === 'reactor' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {variant.tokenCount}字
                                    </span>
                                )}
                            </div>
                            {/* Content: loading / error / text */}
                            {variant.loading && (
                                <div className="flex-1 flex items-center justify-center p-token-4">
                                    <div className="text-center">
                                        <div className="animate-pulse text-2xl mb-2">⏳</div>
                                        <p className={`text-xs ${mutedTextClass(theme)}`}>
                                            Gemini 生成中... ({Math.round(variant.durationMs / 100) / 10}s)
                                        </p>
                                    </div>
                                </div>
                            )}
                            {variant.error && !variant.loading && (
                                <div className={`flex-1 p-token-3 rounded-lg text-xs ${
                                    theme === 'warm' ? 'bg-red-50 border border-red-200 text-red-700' : theme === 'dark' ? 'bg-red-500/20 border border-red-500/40 text-red-300' : theme === 'contrast' ? 'bg-white border-2 border-black text-black' : theme === 'paper' ? 'bg-red-50 border border-red-300 text-red-700' : theme === 'reactor' ? 'bg-red-500/20 border border-red-500/40 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
                                }`}>
                                    ❌ {variant.error}
                                </div>
                            )}
                            {variant.text && !variant.loading && (
                                <textarea
                                    readOnly
                                    value={variant.text}
                                    className={`flex-1 w-full font-mono text-xs p-token-3 rounded-lg outline-none resize-none leading-relaxed border min-h-[200px] ${
                                        theme === 'warm' ? 'bg-amber-50/50 text-amber-900 border-amber-200' : theme === 'dark' ? 'bg-slate-900/50 text-cyan-100 border-cyan-500/30' : theme === 'contrast' ? 'bg-white text-black border-black' : theme === 'paper' ? 'bg-stone-50 text-stone-900 border-stone-400' : theme === 'reactor' ? 'bg-zinc-950/50 text-amber-100 border-amber-500/30' : 'bg-slate-50 text-slate-700 border-slate-200'
                                    }`}
                                />
                            )}
                            {/* Actions: Use / Copy / Download */}
                            {variant.text && !variant.loading && (
                                <div className="flex flex-col gap-token-1 mt-token-2">
                                    <button
                                        onClick={() => useVariantAsFinal(variantKey)}
                                        className={`w-full px-token-2 py-token-1.5 rounded text-xs font-bold ${
                                            theme === 'warm' ? 'bg-amber-500 hover:bg-amber-600 text-white' : theme === 'dark' ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900' : theme === 'contrast' ? 'bg-black text-white border-2 border-white hover:bg-white hover:text-black' : theme === 'paper' ? 'bg-stone-800 hover:bg-stone-700 text-stone-50' : theme === 'reactor' ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                    >
                                        ✓ 用呢個版本 (Use as final)
                                    </button>
                                    <div className="flex gap-token-1">
                                        <button
                                            onClick={() => navigator.clipboard.writeText(variant.text)}
                                            className={`flex-1 px-token-2 py-token-1 rounded text-xs ${
                                                theme === 'warm' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : theme === 'dark' ? 'bg-slate-800 text-cyan-200 hover:bg-slate-700' : theme === 'contrast' ? 'bg-white text-black border border-black hover:bg-black hover:text-white' : theme === 'paper' ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' : theme === 'reactor' ? 'bg-zinc-900 text-amber-200 hover:bg-zinc-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            📋 複製
                                        </button>
                                        <button
                                            onClick={() => {
                                                const blob = new Blob([variant.text], { type: 'text/html' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `prompt-${variantKey}-${Date.now()}.html`;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            }}
                                            className={`flex-1 px-token-2 py-token-1 rounded text-xs ${
                                                theme === 'warm' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : theme === 'dark' ? 'bg-slate-800 text-cyan-200 hover:bg-slate-700' : theme === 'contrast' ? 'bg-white text-black border border-black hover:bg-black hover:text-white' : theme === 'paper' ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' : theme === 'reactor' ? 'bg-zinc-900 text-amber-200 hover:bg-zinc-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                        >
                                            💾 下載
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};


    return (
        <div className="min-h-screen p-token-4 md:p-token-8 relative z-10 transition-colors duration-500">
            {/* AI API Settings modal */}
            {showApiSettings && (
                <ApiSettingsModal
                    theme={theme}
                    currentKey={geminiApiKey}
                    onSave={saveApiKey}
                    onClose={() => setShowApiSettings(false)}
                />
            )}

            {/* v3.14.0: Award Certificate preview modal */}
            {awardCertOpen && (
                <AwardCertificateModal
                    open={awardCertOpen}
                    onClose={() => setAwardCertOpen(false)}
                    style={formData.awardCertificate?.style || 'rainbow'}
                    onStyleChange={(s) => updateField('awardCertificate', { ...formData.awardCertificate, style: s })}
                    certificateProps={{
                        studentName: (formData.awardCertificate?.showStudentName !== false) ? (formData.assessment?.studentName || '同學') : '',
                        date: (formData.awardCertificate?.showDate !== false) ? (formData.assessment?.date || new Date().toLocaleDateString('zh-HK')) : '',
                        subject: (formData.awardCertificate?.showSubject !== false) ? (formData.subjectCategory || '') : '',
                        score: (formData.awardCertificate?.showScore !== false) ? (formData.assessment?.currentScore || '') : '',
                        strengths: (formData.awardCertificate?.showStrengths !== false) ? (formData.assessment?.strengths || []) : [],
                        improvement: (formData.awardCertificate?.showImprovement === true) ? (
                            formData.assessment?.previousScore > 0 && formData.assessment?.currentScore > 0
                                ? `+${formData.assessment.currentScore - formData.assessment.previousScore} 分`
                                : ''
                        ) : '',
                        teacherName: formData.teacherName || '',
                        teacherMessage: (formData.awardCertificate?.showTeacherMessage === true) ? (formData.awardCertificate?.teacherMessage || '') : '',
                    }}
                />
            )}

            {/* Onboarding Tour — 第一次用嘅 coach marks */}
            {onboardingStep !== null && (
                <CoachMark
                    theme={theme}
                    step={ONBOARDING_STEPS[onboardingStep]}
                    onNext={handleCoachNext}
                    onSkip={handleCoachSkip}
                    total={ONBOARDING_STEPS.length}
                    index={onboardingStep}
                />
            )}

            {/* Confirm replace/append modal — AI Suggestion apply 嘅決策 */}
            {pendingSuggestion && (
                <ConfirmReplaceDialog
                    theme={theme}
                    pendingText={pendingSuggestion.text}
                    onReplace={confirmReplace}
                    onAppend={confirmAppend}
                    onCancel={cancelSuggestion}
                />
            )}

            {/* W5-6: Prompt Version Panel modal */}
            {versionPanelOpen && (
                <VersionPanel
                    theme={theme}
                    versions={promptVersions.versions}
                    currentDesignPrompt={designPrompt}
                    currentTechPrompt={techPrompt}
                    formData={formData}
                    onSave={promptVersions.saveVersion}
                    onRestore={restoreVersion}
                    onDelete={promptVersions.deleteVersion}
                    onClose={() => setVersionPanelOpen(false)}
                    asModal={true}
                />
            )}

            {/* W7-8: Student Profile Bank modal */}
            {profileBankOpen && (
                <ProfileBankPanel
                    theme={theme}
                    bank={profileBank}
                    formData={formData}
                    onApplyProfile={applyProfile}
                    onClose={() => setProfileBankOpen(false)}
                    asModal={true}
                />
            )}

            {/* W9-10 Q3: Inline warning banner stack (top-right, dismissible) */}
            <div className="fixed top-4 right-4 z-50 w-[min(90vw,400px)] space-y-2 pointer-events-none">
                <AnimatePresence>
                    {warnings.map(w => (
                        <motion.div
                            key={w.id}
                            initial={{ opacity: 0, x: 30, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 30, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className={`pointer-events-auto rounded-xl border-2 p-token-3 shadow-2xl backdrop-blur-md ${
                                w.severity === 'error'
                                    ? (theme === 'warm' ? 'bg-red-50/95 border-red-400 text-red-900' : theme === 'dark' ? 'bg-red-50/95 border-red-400 text-red-900' : theme === 'contrast' ? 'bg-red-50/95 border-red-400 text-red-900' : theme === 'paper' ? 'bg-red-50/95 border-red-400 text-red-900' : theme === 'reactor' ? 'bg-red-50/95 border-red-400 text-red-900' : 'bg-red-50/95 border-red-400 text-red-900')
                                    : w.severity === 'warning'
                                        ? (theme === 'warm' ? 'bg-amber-50/95 border-amber-400 text-amber-900' : theme === 'dark' ? 'bg-amber-50/95 border-amber-400 text-amber-900' : theme === 'contrast' ? 'bg-amber-50/95 border-amber-400 text-amber-900' : theme === 'paper' ? 'bg-amber-50/95 border-amber-400 text-amber-900' : theme === 'reactor' ? 'bg-amber-50/95 border-amber-400 text-amber-900' : 'bg-amber-50/95 border-amber-400 text-amber-900')
                                        : (theme === 'warm' ? 'bg-blue-50/95 border-blue-400 text-blue-900' : theme === 'dark' ? 'bg-blue-50/95 border-blue-400 text-blue-900' : theme === 'contrast' ? 'bg-blue-50/95 border-blue-400 text-blue-900' : theme === 'paper' ? 'bg-blue-50/95 border-blue-400 text-blue-900' : theme === 'reactor' ? 'bg-blue-50/95 border-blue-400 text-blue-900' : 'bg-blue-50/95 border-blue-400 text-blue-900')
                            }`}
                        >
                            <div className="flex items-start gap-token-2 mb-1">
                                <span className="text-lg flex-none">
                                    {w.severity === 'error' ? '❌' : w.severity === 'warning' ? '⚠️' : 'ℹ️'}
                                </span>
                                <h4 className="font-bold text-sm flex-1 min-w-0">{w.title}</h4>
                                <button
                                    onClick={() => dismissWarning(w.id)}
                                    className="flex-none opacity-60 hover:opacity-100 transition-opacity p-0.5"
                                    aria-label="關閉警告"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            {w.messages && w.messages.length > 0 && (
                                <ul className="text-xs space-y-0.5 pl-7 opacity-90">
                                    {w.messages.map((m, i) => (
                                        <li key={i} className="leading-snug">• {m}</li>
                                    ))}
                                </ul>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Recovery snackbar — bottom-right, 10s auto-dismiss (W1-2) */}
            {recoverySnapshot && (
                <motion.div
                    initial={{ opacity: 0, y: 30, x: 30 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 30, x: 30 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-6 right-6 z-50 w-[min(90vw,360px)]"
                >
                    <div className={`p-token-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
                        'bg-white border-blue-300'
                    }`}>
                        <div className="flex items-start gap-token-3 mb-3">
                            <div className={`flex-none p-token-2 rounded-full ${
                                'bg-blue-100 text-blue-600'
                            }`}>
                                <RotateCcw size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold ${
                                    'text-slate-800'
                                }`}>
                                    載入上次未完成？
                                </h4>
                                <p className={`text-xs mt-0.5 ${'text-slate-500'}`}>
                                    {new Date(recoverySnapshot.savedAt).toLocaleString('zh-HK')}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-token-2">
                            <button
                                onClick={dismissRecovery}
                                className={`flex-1 px-token-3 py-token-2 rounded-lg text-xs font-bold transition-all ${
                                    'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                忽略
                            </button>
                            <button
                                onClick={acceptRecovery}
                                className={`flex-1 px-token-3 py-token-2 rounded-lg text-xs font-bold transition-all text-white ${
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                📂 載入
                            </button>
                        </div>
                        {/* Auto-dismiss countdown bar */}
                        <div className={`mt-2 h-0.5 rounded-full overflow-hidden ${'bg-slate-200'}`}>
                            <motion.div
                                className={`h-full ${'bg-blue-500'}`}
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 10, ease: 'linear' }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}

            <div className="max-w-6xl mx-auto pb-20"> {/* Increased width for dual columns */}
                
                {/* Header — v3.3 modern typography polish */}
                <header className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-start justify-between gap-token-6 relative animate-fade-in">
                    <div>
                         <h1 className="text-3xl md:text-5xl font-black flex items-start gap-token-4 justify-center md:justify-start leading-none">
                            <img src={personalLogo} alt="NT-D" className="h-12 w-12 md:h-14 md:w-14 mt-1 rounded-xl shadow-md" />
                            <div className="flex flex-col gap-2">
                                <span className={`font-black tracking-tight text-2xl md:text-4xl gradient-text`}>
                                    創意教學 Prompt Studio
                                </span>
                            </div>
                        </h1>
                        <p className={`mt-4 font-medium text-base pl-0 md:pl-[4rem] flex items-center gap-token-2 ${mutedTextClass(theme)}`}>
                            <Zap size={16} className="text-yellow-400" />
                            3 分鐘將 SEN 學生需要轉成結構化 prompt
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-token-2">
                        {/* v3.12.0: Theme dropdown selector (6 themes) */}
                        <label className={`flex items-center gap-token-1 px-token-3 py-token-1.5 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer border ${pillClass(theme, { active: true })}`}
                            title="揀主題">
                            <span className="text-base">{themeMeta[theme]?.emoji || '☀️'}</span>
                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                aria-label="選擇主題"
                                className="bg-transparent border-none outline-none cursor-pointer font-medium"
                                style={{ colorScheme: theme === 'dark' || theme === 'reactor' ? 'dark' : 'light' }}
                            >
                                {themeOrder.map(t => (
                                    <option key={t} value={t} className="bg-white text-slate-800">
                                        {themeMeta[t]?.emoji} {themeMeta[t]?.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {/* v3.15.0 V1: Reduced-motion override (3-state cycle) */}
                        <button
                            onClick={cycleMotionPref}
                            aria-label={`動畫偏好：${motionPref === 'system' ? '跟系統' : motionPref === 'on' ? '強制關' : '強制開'} — 撳一下切換`}
                            title={
                                motionPref === 'system' ? '🎬 動畫：跟系統 (撳一下強制關)'
                                : motionPref === 'on'    ? '🔇 動畫：強制關 (撳一下強制開)'
                                                    : '✨ 動畫：強制開 (撳一下跟系統)'
                            }
                            className={`p-token-2 rounded-full transition-all duration-200 border ${
                                motionPref === 'on'  ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                                : motionPref === 'off' ? 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200'
                                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                        >
                            <span className="text-base">
                                {motionPref === 'on' ? '🔇' : motionPref === 'off' ? '✨' : '🎬'}
                            </span>
                        </button>
                        <div
                            className={`hidden md:flex px-token-4 py-token-2 rounded-full text-sm font-bold flex items-center gap-token-2 tracking-wider ${
                            'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                            title={`JSON Schema 版本 v${SCHEMA_VERSION}（決定 import 時嘅 migration 行為）`}
                        >
                            <img src={personalLogo} alt="NT-D" className="h-4 w-4" />
                            Schema v{SCHEMA_VERSION}
                        </div>
<button
                            onClick={triggerJSONImport}
                            className={`px-token-4 py-token-2 rounded-full text-sm font-bold flex items-center gap-token-2 tracking-wider transition-all ${
                                'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                            }`}
                            title="匯入 JSON 設定檔"
                        >
                            <Upload size={16} />
                            匯入 JSON
                        </button>
                        {/* W7-8: Student Profile Bank button */}
                        <button
                            onClick={() => setProfileBankOpen(true)}
                            className={`px-token-4 py-token-2 rounded-full text-sm font-bold flex items-center gap-token-2 tracking-wider transition-all ${
                                theme === 'warm' ? 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200' : theme === 'dark' ? 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200' : theme === 'contrast' ? 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200' : theme === 'paper' ? 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200' : theme === 'reactor' ? 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200' : 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200'
                            }`}
                            title="學生 Profile Bank — 加密儲存個別學生 preset"
                        >
                            <Users size={16} />
                            👤 學生 Profile
                        </button>
                        {/* Undo / Redo */}
                        <div className="flex gap-token-1">
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className={`p-token-2 rounded-full transition-all ${
                                    canUndo
                                        ? ('bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm')
                                        : ('bg-slate-50 text-slate-300 border border-slate-100')
                                }`}
                                title="復原 (Ctrl/Cmd+Z)"
                            >
                                ↩️
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className={`p-token-2 rounded-full transition-all ${
                                    canRedo
                                        ? ('bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm')
                                        : ('bg-slate-50 text-slate-300 border border-slate-100')
                                }`}
                                title="重做 (Ctrl/Cmd+Shift+Z)"
                            >
                                ↪️
                            </button>
                        </div>
                        {/* Auto-save indicator — v3.15.0 A1: live 'X 秒前' refresh (1s tick) */}
                        <motion.div
                            key={lastSavedAt || 'idle'} // re-mount 觸發 pulse animation on save
                            initial={lastSavedAt ? { scale: 1.15 } : { scale: 1 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                            className={`hidden md:flex px-token-3 py-token-1.5 rounded-full text-xs font-bold flex items-center gap-token-1.5 tracking-wide ${
                                lastSavedAt
                                    ? (theme === 'warm' ? 'text-emerald-700 bg-emerald-50' : theme === 'dark' ? 'text-emerald-700 bg-emerald-50' : theme === 'contrast' ? 'text-emerald-700 bg-emerald-50' : theme === 'paper' ? 'text-emerald-700 bg-emerald-50' : theme === 'reactor' ? 'text-emerald-700 bg-emerald-50' : 'text-emerald-700 bg-emerald-50')
                                    : (theme === 'warm' ? 'text-slate-500' : theme === 'dark' ? 'text-slate-400' : theme === 'contrast' ? 'text-slate-400' : theme === 'paper' ? 'text-slate-400' : theme === 'reactor' ? 'text-slate-400' : 'text-slate-400')
                            }`}
                            title={lastSavedAt ? `上次儲存: ${new Date(lastSavedAt).toLocaleTimeString('zh-HK')}` : '尚未儲存'}
                        >
                            <Save size={12} />
                            {lastSavedAt && savedLabel ? `已儲存 ${savedLabel}` : '儲存中...'}
                        </motion.div>
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImportJSON} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </div>
                </header>

                {/* Tab Nav — W1-2 取代 step gate (任何 tab 隨時跳) — W3-4.1 加 warm 第三 case */}
                <div className="mb-6 max-w-3xl mx-auto">
                    <div className={`flex gap-token-1 p-token-1 rounded-xl border ${
                        theme === 'warm' ? 'border-amber-200 bg-amber-50/60' : theme === 'dark' ? 'border-slate-200 bg-slate-50' : theme === 'contrast' ? 'border-slate-200 bg-slate-50' : theme === 'paper' ? 'border-slate-200 bg-slate-50' : theme === 'reactor' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-slate-50'
                    }`}>
                        {[
                            { key: 'basic',     label: '基本', icon: '📋' },
                            { key: 'content',   label: '內容', icon: '📝' },
                            { key: 'rules',     label: '規則', icon: '⚙️' },
                            // v3.14.0: 新增評估 tab
                            { key: 'assessment', label: '評估', icon: '📊' },
                            { key: 'generate',  label: '生成', icon: '✨' },
                        ].map(tab => {
                            const comp = tabCompletion[tab.key];
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex-1 px-token-3 py-token-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-token-2 ${
                                        isActive
                                            ? (theme === 'warm' ? 'bg-amber-200/80 text-amber-900 ring-1 ring-amber-400' : theme === 'dark' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : theme === 'contrast' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : theme === 'paper' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : theme === 'reactor' ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-blue-100 text-blue-700 ring-1 ring-blue-300')
                                            : (theme === 'warm' ? 'text-amber-800 hover:text-amber-900 hover:bg-amber-100' : theme === 'dark' ? 'text-slate-600 hover:bg-white hover:shadow-sm' : theme === 'contrast' ? 'text-slate-600 hover:bg-white hover:shadow-sm' : theme === 'paper' ? 'text-slate-600 hover:bg-white hover:shadow-sm' : theme === 'reactor' ? 'text-slate-600 hover:bg-white hover:shadow-sm' : 'text-slate-600 hover:bg-white hover:shadow-sm')
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span className={'hidden sm:inline'}>
                                        {tab.label}
                                    </span>
                                    {comp.total > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                                            comp.complete
                                                ? (theme === 'warm' ? 'bg-emerald-200 text-emerald-800' : theme === 'dark' ? 'bg-emerald-100 text-emerald-700' : theme === 'contrast' ? 'bg-emerald-100 text-emerald-700' : theme === 'paper' ? 'bg-emerald-100 text-emerald-700' : theme === 'reactor' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-100 text-emerald-700')
                                                : isActive
                                                    ? (theme === 'warm' ? 'bg-amber-300 text-amber-900' : theme === 'dark' ? 'bg-blue-200 text-blue-700' : theme === 'contrast' ? 'bg-blue-200 text-blue-700' : theme === 'paper' ? 'bg-blue-200 text-blue-700' : theme === 'reactor' ? 'bg-blue-200 text-blue-700' : 'bg-blue-200 text-blue-700')
                                                    : (theme === 'warm' ? 'bg-amber-100 text-amber-700' : theme === 'dark' ? 'bg-slate-200 text-slate-600' : theme === 'contrast' ? 'bg-slate-200 text-slate-600' : theme === 'paper' ? 'bg-slate-200 text-slate-600' : theme === 'reactor' ? 'bg-slate-200 text-slate-600' : 'bg-slate-200 text-slate-600')
                                        }`}>
                                            {comp.filled}/{comp.total}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Quality Score Badge — always visible (W1-2) */}
                <div className="mb-4 max-w-3xl mx-auto flex items-center justify-between gap-token-3">
                    <div className={`text-xs ${'text-slate-400'}`}>
                        💡 Tabs 模式：任何 tab 隨時跳。改動自動儲存。
                    </div>
                    <QualityScoreBadge
                        theme={theme}
                        score={qualityScore}
                        onClick={() => setShowScoreDetail(prev => !prev)}
                    />
                </div>

                {/* Wizard Card - Adjust width for tabs (W1-2: Tabs mode 取代 step gate) */}
                {activeTab !== 'generate' && (
                    <Card theme={theme} className="min-h-[500px] flex flex-col max-w-3xl mx-auto">
                        <div className="p-token-4 md:p-token-6 flex-1">
                            <AnimatePresence mode="wait">
                                {activeTab === 'basic' && (
                                    <motion.div key="basic" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        {renderStep1()}
                                    </motion.div>
                                )}
                                {activeTab === 'content' && (
                                    <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        {renderStep2()}
                                    </motion.div>
                                )}
                                {activeTab === 'rules' && (
                                    <motion.div key="rules" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                        {renderStep3()}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Controls */}
                        <div className={`p-token-6 flex justify-between items-center backdrop-blur-sm border-t ${
                            'bg-slate-50 border-slate-100'
                        }`}>
                            {/* Left Side: Previous Button */}
                            <div className="w-1/3 flex justify-start">
                                {TAB_KEYS.indexOf(activeTab) > 0 && (
                                    <button
                                        onClick={handlePrevTab}
                                        className={`flex items-center gap-token-2 px-token-6 py-token-3 rounded-xl font-bold transition-all ${
                                            'text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200'
                                        }`}
                                    >
                                        <ChevronLeft size={20} />
                                        上一步
                                    </button>
                                )}
                            </div>

                            {/* Center: Preview Toggle */}
                            <div className="w-1/3 flex justify-center">
                                <button
                                    onClick={() => setPreviewOpen(prev => !prev)}
                                    className={`flex items-center gap-token-2 px-token-4 py-token-2 rounded-xl font-bold transition-all border ${
                                        previewOpen
                                        ? ('bg-blue-50 border-blue-300 text-blue-700')
                                        : ('border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600')
                                    }`}
                                    title="即時預覽當前設定生成的 prompt output"
                                >
                                    <Eye size={18} />
                                    {previewOpen ? "隱藏預覽" : "預覽"}
                                </button>
                            </div>

                            {/* Right Side: Next Button */}
                            <div className="w-1/3 flex justify-end">
                                <button 
                                    onClick={handleNextTab}
                                    className={`flex items-center gap-token-2 px-token-8 py-token-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 group text-white ${
                                        'bg-blue-600 hover:bg-blue-700 shadow-md'
                                    }`}
                                >
                                    下一步
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </Card>
                )}
                
                {/* Live Preview Panel — 任何 step 都可叫出嚟即時睇 prompt output */}
                {previewOpen && activeTab !== 'generate' && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-6 left-6 z-40 w-[min(90vw,560px)] max-h-[70vh] flex flex-col"
                    >
                        <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden border shadow-2xl ${
                            'bg-white border-slate-300'
                        }`}>
                            {/* Panel header + tabs */}
                            <div className={`flex items-center justify-between p-token-3 border-b ${
                                'border-slate-200 bg-slate-50'
                            }`}>
                                <div className="flex items-center gap-token-2">
                                    <Eye size={16} className={'text-blue-600'} />
                                    <span className={`text-sm font-bold tracking-wide ${
                                        'text-slate-800'
                                    }`}>即時預覽 (Live Preview)</span>
                                </div>
                                <div className="flex gap-token-1">
                                    <button
                                        onClick={() => setPreviewTab('design')}
                                        className={`px-token-3 py-token-1 rounded text-xs font-bold transition-all ${
                                            previewTab === 'design'
                                            ? ('bg-blue-100 text-blue-700')
                                            : ('text-slate-600 hover:bg-slate-100')
                                        }`}
                                    >
                                        Part 1: 設計
                                    </button>
                                    <button
                                        onClick={() => setPreviewTab('tech')}
                                        className={`px-token-3 py-token-1 rounded text-xs font-bold transition-all ${
                                            previewTab === 'tech'
                                            ? ('bg-blue-100 text-blue-700')
                                            : ('text-slate-600 hover:bg-slate-100')
                                        }`}
                                    >
                                        Part 2: 技術
                                    </button>
                                </div>
                                <button
                                    onClick={() => setPreviewOpen(false)}
                                    className={`p-token-1 rounded transition-colors ${
                                        'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                    title="關閉預覽"
                                >
                                    ✕
                                </button>
                            </div>
                            {/* Preview content */}
                            {(() => {
                                const previewText = previewTab === 'design' ? designPrompt : techPrompt;
                                // Empty state — 當 prompt 太短時顯示引導
                                const isEmpty = previewText.length < 200;
                                if (isEmpty) {
                                    return (
                                        <div className={`flex-1 flex flex-col items-center justify-center p-token-8 text-center ${
                                            'text-slate-500'
                                        }`} style={{ minHeight: '300px' }}>
                                            <div className="text-5xl mb-3 opacity-50">📝</div>
                                            <p className="text-sm mb-2">Prompt 仲未填寫完成</p>
                                            <p className="text-xs">填寫表單後，呢度會即時顯示 Part {previewTab === 'design' ? '1' : '2'} prompt 嘅完整內容</p>
                                            <p className="text-xs mt-2 opacity-70">建議：先填寫 2.1 核心用途</p>
                                        </div>
                                    );
                                }
                                return (
                                    <textarea
                                        readOnly
                                        value={previewText}
                                        className={`flex-1 w-full font-mono text-xs p-token-4 outline-none resize-none leading-relaxed ${
                                            'bg-white text-slate-700'
                                        }`}
                                        style={{ minHeight: '300px' }}
                                    />
                                );
                            })()}
                            <div className={`text-xs px-token-3 py-token-2 border-t ${
                                'border-slate-200 text-slate-500 bg-slate-50'
                            }`}>
                                💡 Tip: 任何輸入改動都會即時更新預覽。去到 Step 4 可正式複製。
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* v3.14.0: Assessment Tab Rendering — 評估數據 form (學生姓名 + 分數 + 強項 + 改善範疇) */}
                {activeTab === 'assessment' && (
                    <motion.div
                        key="step-assessment"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card theme={theme} className="p-token-6">
                            <h2 className={`text-xl font-bold mb-token-4 flex items-center gap-token-2 ${
                                theme === 'warm' ? 'text-amber-900' : theme === 'dark' ? 'text-cyan-100' : theme === 'contrast' ? 'text-black' : theme === 'paper' ? 'text-stone-900' : theme === 'reactor' ? 'text-amber-100' : 'text-slate-800'
                            }`}>
                                📊 4. 學生評估數據 (Student Assessment)
                                <span className="text-sm font-normal text-slate-500">— 奬狀生成嘅 data source</span>
                            </h2>
                            <p className={`mb-token-4 text-sm ${mutedTextClass(theme)}`}>
                                填寫學生姓名、學習時數、答對率同強項等資料。呢啲數據會用喺 v3.14.0 嘅奬狀生成 (Award Certificate) 功能。
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-token-4">
                                {/* 學生姓名 */}
                                <div>
                                    <Label theme={theme}>學生姓名</Label>
                                    <Input
                                        theme={theme}
                                        type="text"
                                        value={formData.assessment?.studentName || ''}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, studentName: e.target.value })}
                                        placeholder="例: 小明"
                                    />
                                </div>
                                {/* 日期 */}
                                <div>
                                    <Label theme={theme}>評估日期</Label>
                                    <Input
                                        theme={theme}
                                        type="date"
                                        value={formData.assessment?.date || ''}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, date: e.target.value })}
                                    />
                                </div>
                                {/* 總練習時間 */}
                                <div>
                                    <Label theme={theme} optional>總學習時間 (分鐘)</Label>
                                    <Input
                                        theme={theme}
                                        type="number"
                                        min="0"
                                        value={formData.assessment?.totalMinutes || 0}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, totalMinutes: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                {/* 總題數 */}
                                <div>
                                    <Label theme={theme} optional>練習總題數</Label>
                                    <Input
                                        theme={theme}
                                        type="number"
                                        min="0"
                                        value={formData.assessment?.totalQuestions || 0}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, totalQuestions: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                {/* 答對題數 */}
                                <div>
                                    <Label theme={theme} optional>答對題數</Label>
                                    <Input
                                        theme={theme}
                                        type="number"
                                        min="0"
                                        value={formData.assessment?.correctCount || 0}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, correctCount: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                {/* 答對率（自動計算） */}
                                <div>
                                    <Label theme={theme}>答對率 (自動計算)</Label>
                                    <div className={`w-full px-4 py-3 radius-token-md border ${
                                        theme === 'warm' ? 'bg-amber-50/50 border-amber-200 text-amber-900' : theme === 'dark' ? 'bg-slate-800/50 border-cyan-500/30 text-cyan-100' : theme === 'contrast' ? 'bg-white border-black text-black' : theme === 'paper' ? 'bg-stone-50 border-stone-400 text-stone-900' : theme === 'reactor' ? 'bg-zinc-900/50 border-amber-500/30 text-amber-100' : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}>
                                        {formData.assessment?.totalQuestions > 0
                                            ? `${Math.round((formData.assessment.correctCount / formData.assessment.totalQuestions) * 100)}%`
                                            : '— 填咗題數同答對題數就會自動計'}
                                    </div>
                                </div>
                                {/* 上次分數 (for improvement %) */}
                                <div>
                                    <Label theme={theme} optional>上次分數 (0-100)</Label>
                                    <Input
                                        theme={theme}
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.assessment?.previousScore || 0}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, previousScore: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                {/* 今次分數 */}
                                <div>
                                    <Label theme={theme} optional>今次分數 (0-100)</Label>
                                    <Input
                                        theme={theme}
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.assessment?.currentScore || 0}
                                        onChange={(e) => updateField('assessment', { ...formData.assessment, currentScore: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            {/* 強項 multi-line */}
                            <div className="mt-token-4">
                                <Label theme={theme} optional>強項主題 (每行一個)</Label>
                                <TextArea
                                    theme={theme}
                                    value={(formData.assessment?.strengths || []).join('\n')}
                                    onChange={(e) => updateField('assessment', { ...formData.assessment, strengths: e.target.value.split('\n').filter(s => s.trim()) })}
                                    placeholder="例:&#10;加法運算&#10;圖形辨識&#10;顏色識別"
                                />
                            </div>
                            <div className="mt-token-4">
                                <Label theme={theme} optional>改善範疇 (每行一個)</Label>
                                <TextArea
                                    theme={theme}
                                    value={(formData.assessment?.improvementAreas || []).join('\n')}
                                    onChange={(e) => updateField('assessment', { ...formData.assessment, improvementAreas: e.target.value.split('\n').filter(s => s.trim()) })}
                                    placeholder="例:&#10;減法&#10;應用題"
                                />
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Generate Tab Rendering (Wide Layout) — W1-2: 由 step 4 改 activeTab === 'generate' */}
                {activeTab === 'generate' && (
                    <>
                        {renderStep4(formData, designPrompt, techPrompt, qualityScore)}
                        {GEMINI_DIRECT_GENERATE_ENABLED && renderAiResult()}
                        {GEMINI_DIRECT_GENERATE_ENABLED && renderMultiVariant()}
                    </>
                )}


                {/* Extra Links Above Footer */}
                {/* v3.3.3: 10 個 AI platform links (10 active — base44 / emergent / v0 / gemini / lovable / bolt.new / qwen / manus / genspark / 豆包) — flex-wrap 自動換行，唔加描述只係 platform name */}
                <div className="mt-12 flex flex-wrap justify-center gap-token-3">
                    {/* Base44 Link */}
                    <a href="https://base44.com/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm'
                    }`}>
                        Base44 <ExternalLink size={14} />
                    </a>

                    {/* Emergent Link */}
                    <a href="https://app.emergent.sh/home" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-purple-600 shadow-sm'
                    }`}>
                        Emergent <ExternalLink size={14} />
                    </a>

                    {/* v0.app Link */}
                    <a href="https://v0.app/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                    }`}>
                        v0.app <ExternalLink size={14} />
                    </a>

                    {/* Gemini Link */}
                    <a href="https://gemini.google.com/gem/brainstormer" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 shadow-sm'
                    }`}>
                        Gemini <ExternalLink size={14} />
                    </a>

                    {/* Lovable Link — v3.3.2: 移除 del disabled 狀態，restore active link */}
                    <a href="https://lovable.dev/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-pink-600 shadow-sm'
                    }`}>
                        Lovable <ExternalLink size={14} />
                    </a>

                    {/* Bolt.new Link — v3.3.3 新增 — AI app builder (StackBlitz WebContainer) */}
                    <a href="https://bolt.new/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-orange-600 shadow-sm'
                    }`}>
                        Bolt.new <ExternalLink size={14} />
                    </a>

                    {/* Qwen Link — v3.3.1 新增 */}
                    <a href="https://qwen.ai/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-violet-600 shadow-sm'
                    }`}>
                        Qwen <ExternalLink size={14} />
                    </a>

                    {/* Manus Link — v3.3.1 新增 */}
                    <a href="https://manus.im/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 shadow-sm'
                    }`}>
                        Manus <ExternalLink size={14} />
                    </a>

                    {/* GenSpark Link — v3.3.1 新增 */}
                    <a href="https://www.genspark.ai/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-orange-600 shadow-sm'
                    }`}>
                        GenSpark <ExternalLink size={14} />
                    </a>

                    {/* 豆包 Doubao Link — v3.3.1 新增 */}
                    <a href="https://www.doubao.com/chat/" target="_blank" rel="noopener noreferrer" className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium flex items-center gap-2 ${
                        'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-red-600 shadow-sm'
                    }`}>
                        豆包 <ExternalLink size={14} />
                    </a>
                </div>

                {/* Footer */}
                <footer className={`mt-6 py-token-6 text-center text-xs font-medium tracking-widest ${
                    'text-slate-400'
                }`}>
                    © 2026 創意教學 Prompt Studio · designed by Ken Cheng
                </footer>

                {/* Floating Action Button (FAB) */}
                <div className="fixed bottom-6 right-6 z-50">
                    {/* FAB conditional render — 按 formData.fabStyle 切換風格，預覽生成工具嘅效果 */}
                    {formData.fabStyle === "cyber" && (
                        <div
                            className={`flex items-center gap-token-2 px-token-4 py-token-2 rounded-full border backdrop-blur-md transition-all group ${
                                'bg-white border-slate-200 text-slate-700 shadow-lg'
                            }`}>
                            <Monitor size={20} className={""} />
                            <span className="font-bold text-sm tracking-wide text-shadow-sm">{formData.teacherName ? `${formData.teacherName} 設計` : 'Ken Cheng 設計'}</span>
                            {/* Personal logo — 用 ES module import，Vite dev server + build 都識處理 */}
                            <img src={personalLogo} alt="NT-D Emblem" className="h-6 w-auto ml-1" />
                        </div>
                    )}
                    {formData.fabStyle === "minimal" && (
                        <div
                            className={`flex items-center gap-token-2 px-token-4 py-token-2 rounded-full border transition-all group ${
                                'bg-white border-slate-200 text-slate-700 shadow-lg'
                            }`}>
                            <Monitor size={18} className={""} />
                            <span className="font-medium text-sm tracking-wide">{formData.teacherName ? `${formData.teacherName} 設計` : 'Ken Cheng 設計'}</span>
                        </div>
                    )}
                    {/* formData.fabStyle === "off" → 完全唔 render */}
                </div>

            </div>
        </div>
    );
}
