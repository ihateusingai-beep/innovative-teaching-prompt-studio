// === Shared option tables ===
// W9-10 #5: 抽出原本 inline 喺 App.jsx + generators.jsx 兩處重複嘅 option arrays
// 兩邊 import 同一個 source of truth，避免 drift
//
// 結構：每個 entry 有 `id`, `label` (full Chinese label)，`desc` (implication for prompt)
// App.jsx 用全份做 UI dropdown / multi-select
// generators.jsx 用 desc 嚟 inject prompt context

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

// PATCH 2026-07-12 (P2-d): categories + subjects moved here from App.jsx +
// useAppState.js so there is exactly one source of truth. Previously both files
// declared their own local copies — useAppState.js had 5 categories, App.jsx
// had 7 (with 生活技能 + 評估回饋) but the App.jsx one was shadowed by the
// destructure, so users only ever saw 5. Templates in data/templates.js
// reference the 5 — that's the canonical set; the App.jsx 7 was drift.
import { BookOpen, Gamepad2, HeartHandshake, MessageCircle, FlaskConical } from 'lucide-react';
const categories = [
    { value: "教學工具", label: "📚 教學工具", icon: BookOpen },
    { value: "教學遊戲", label: "🎮 教學遊戲", icon: Gamepad2 },
    { value: "情緒支援", label: "❤️ 情緒支援", icon: HeartHandshake },
    { value: "溝通輔助", label: "🗣️ 溝通輔助", icon: MessageCircle },
    { value: "實驗模擬", label: "🧪 實驗模擬", icon: FlaskConical },
];

// PATCH 2026-07-12 (P2-d): same single-source treatment as categories.
const subjects = ["語文", "數學", "英文", "人文", "科學", "生活技能", "電腦", "班主任課", "其他"];

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

const learningDiversityOptions = [
    { label: "簡化內容 (Simplify Content)", desc: "使用簡單詞彙、短句，避免冗長說明；一次只教一個概念。" },
    { label: "多感官輸入 (Multi-sensory)", desc: "結合圖片、聲音、動作、觸覺等多管道刺激，提升理解與記憶。" },
    { label: "結構化與重複 (Structure & Repetition)", desc: "提供清晰步驟、固定流程與反覆練習機會。" },
    { label: "即時回饋與獎勵 (Instant Feedback)", desc: "每完成一步即給予肯定（聲音、動畫、貼紙等），增強動機。" },
    { label: "視覺輔助 (Visual Aids)", desc: "使用圖卡、流程圖、顏色區分、大字體、高對比界面。" },
    { label: "生活化內容 (Real-life Context)", desc: "教學連結日常生活（如購物、交通、衛生），提升實用性。" },
    { label: "語音朗讀題目 (TTS Question - HK)", desc: "題目提供廣東話語音朗讀功能。" },
    { label: "語音朗讀答案 (TTS Answer - HK)", desc: "答案提供廣東話語音朗讀功能。" },
    { label: "視覺提示 (Visual Cues)", desc: "加入箭頭、色塊、進度條等視覺提示。" },
];

// 預設 rules（schema.js 用嚟初始化 formData.rules）
// W9-10 #6: 加 __isDefault flag，等 generator 可以 filter 走未經老師改過嘅 default rules
// v3.2.4: 拎走「個別化學習報告」rule (a/b/c 三段) — 改由 formData.personalizedReport
// module toggle 控制（master + 3 sub-toggles），generator 動態 compose
// v3.2.6: 第 1 條「右上角儀表板」Rule 1 同 Personalized Report module 加 cross-ref bridge，
// 確保兩者用同一份 localStorage schema，數據互通，唔做兩個分離系統
const defaultRules = [
    { text: "在右上角加上學習儀表版功能,讓學生能夠自我檢測, 成績要能存在本機", __isDefault: true },
    { text: "答對時給予 提示音及對應的知識理論，為何該答案是正確", __isDefault: true },
    { text: "首頁輸入框提示：請輸入你的名字開始遊戲： 例如：小明, 行動按鈕：開始遊戲", __isDefault: true },
    { text: "增加一個 自學模式，用戶能自行設定問題給自己, 例子(x - y) 然後自行解答。", __isDefault: true },
    { text: "🎉 慶祝特效: 任務完成時觸發 canvas-confetti（特效只會觸發一次，重置後才會再次觸發）。", __isDefault: true },
];

// v3.2.6: Dashboard ↔ Report Bridge (cross-reference)
// 將 Rule 1 嘅「右上角儀表板」同 Personalized Report module 嘅「完成後報告頁面」
// 綁去同一份 localStorage schema，確保兩者數據互通，AI 唔做兩個分離系統
//
// 設計：
//   - 純獨立可讀，唔假設 Rule 1 存在與否（即使老師刪走 Rule 1 都仍 work）
//   - conditional inject：personalizedReport.enabled === true 先 inject
//   - 即使老師改 Rule 1 文字（__isDefault: false），bridge 仍然 inject（bridge 講嘅係架構原則，唔係 rule 重複）
export const composeDashboardReportBridge = (config) => {
    if (!config || typeof config !== 'object') return null;
    if (config.enabled === false) return null;
    return `【架構指引 — 儀表板與報告頁面數據互通】
右上角儀表板（即時 self-check widget）同完成任務後嘅「個別化學習報告頁面」必須共用同一份 localStorage schema（例如 learningLog_${'{studentName}'} 或類似結構），確保：
- 學生邊做邊睇嘅即時反饋（儀表板）同完成後詳細總結（報告）係同一份數據嘅兩種 view
- 報告頁面可以彙總儀表板整個 session 嘅數據（唔重新計算）
- 兩者修改任何一處嘅「答對／答錯／時間戳」都會同步（單一 source of truth）
- 避免做兩個獨立 widget 各自儲存，導致數據唔一致`;
};

// === Personalized Report Module ===
// v3.2.4: 由原 defaultRules 抽出嘅 3 段 rule 內容 (a/b/c)
// v3.2.5: 加 d 段「親師溝通格式」— 深化 b 段視覺化嘅延伸（家長/老師 export + 反思）
// generator 用呢幾段根據 formData.personalizedReport.* 動態 compose rule text 注入 prompt
// 設計：每段都係 closed spec（user 列嘅 spec），老師唔應該改文字，
// 只能 toggle on/off — 因此獨立成 module 唔混入 free-form rules editor
const personalizedReportSections = {
    showData: `「個別化學習報告頁面」，需符合以下原則：
a. 個別化與數據化
顯示具體學習數據，例如：答對題數／總題數、平均嘗試次數、完成時間（若適用）
標示「最熟練項目」與「需加強項目」（例如：最易／最難的數字、詞彙或題型）
數據需基於學生實際互動行為（如錯誤模式、重試次數）而非僅二元對錯`,

    showVisualization: `b. 可視化與兒童友善設計
使用簡易長條圖、圓餅圖或進度條呈現關鍵數據，避免複雜座標軸
採用柔和配色、大字體、Emoji 或插畫風格圖示（如🌟、💡、🚀）
避免文字密集，多用圖示與留白，確保低年級學生能一眼理解`,

    showGrowthMindset: `c. 正向語言與建設性建議
以成長型思維（growth mindset）措辭：強調「努力」「進步」「小專家」「再試一次就更厲害」
提供 1–2 條具體、可操作的建議（例如：「你可以每天練習 3 次『7 的分解』，就像搭積木一樣！」）
避免負面標籤（如「你不會」「錯誤太多」）`,

    // v3.2.5: d 段「親師溝通格式」— 深化 b 段視覺化嘅延伸
    // 4 sub-features 各自獨立 toggle，老師按需要揀
    showParentPDF: `d1. 可列印 PDF 摘要（A4 格式）
提供「列印 / 下載 PDF」按鈕，輸出 A4 一頁格式嘅學習摘要：
- 頂部：學生頭像 / 姓名 / 班別 / 日期
- 中段：本週學習數據（答對率、平均嘗試次數、完成時間）＋長條圖視覺化
- 「🌟 最熟練項目」3 項 ＋「💡 需加強項目」3 項（短句 + emoji）
- 底部：教師留言欄（手寫／打字）、家長簽名欄、班主任蓋章欄
PDF 使用簡單 CSS print media query，唔需要 server-side rendering`,

    showParentQR: `d2. QR code 畀家長（互動重播）
每份報告頁面右上角自動加 QR code（純 client-side 用 qrcode.js CDN）：
- 掃描後開啟「互動重播」頁面（家長手機可用）
- 顯示學生本週答題 timeline（每題答對／答錯 + 用時 + 嘗試次數）
- 包含「情緒表情符號日誌」（學生喺每個關卡揀嘅情緒 emoji）
- 提供「家長回饋」文字輸入框（儲存去 localStorage，老師下次登入可睇）
QR code 內容為 data URL（base64 PNG），唔需要 hosting`,

    showNewsletter: `d3. 每週／每月學習電子報（班級摘要）
提供「生成電子報」按鈕，自動彙總全班學生數據生成可發佈摘要：
- 頂部：班別 / 週次 / 主題
- 「🏆 MVP 學生榜」：本週答對率最高 3 位（匿名化處理，例如「進步火箭 🚀：小明、小美、小玲」）
- 「📋 需關注名單」：持續犯同一類錯誤嘅學生（顯示錯誤模式摘要，唔顯示姓名）
- 「📈 班級整體趨勢」：本週 vs 上週答對率對比長條圖
- 「💡 本週教學建議」：根據錯誤模式自動生成 2-3 條教學調整建議
輸出格式：HTML 頁面（可列印）+ 可複製 Markdown（貼去學校網頁／家長群組）`,

    showTeacherReflection: `d4. 教師反思 prompt（專業成長）
報告頁面底部加「教師反思」section（摺疊展開），3 條引導反思 prompt：
- K（What I Knew）: 「呢週我已經知道學生掌握咗咩？」
- W（What I Wonder）: 「我想再了解學生邊方面？邊啲錯誤模式反映更深層概念誤解？」
- L（What I Learned）: 「呢週教學過程我自己學到咗咩？下次會點調整？」
反思 prompt 旁提供「填寫筆記」textarea（純 localStorage 儲存），畀老師記低專業成長日誌`,
};

// Compose 一段完整嘅 rule text 根據 toggle 狀態
// 策略：
//   - enabled=false → 返回 null (generator filter 走)
//   - 冇任何 sub-toggle 開 → 返回 null
//   - sub-toggle 開 → concat 對應 section (段間空一行分隔)
// 老師 custom rules 入面如果有「個別化學習報告」相關嘅，已經 __isDefault: false 會
// 被 generator 保留（唔會 dup）
// v3.2.5: 加 4 個 d 段 sub-toggle (showParentPDF/showParentQR/showNewsletter/showTeacherReflection)
// 全部 default true（comprehensive），對齊舊 default 行為
export const composePersonalizedReportRule = (config) => {
    if (!config || typeof config !== 'object') return null;
    if (config.enabled === false) return null;
    const parts = [];
    if (config.showData !== false) parts.push(personalizedReportSections.showData.trimEnd());
    if (config.showVisualization !== false) parts.push(personalizedReportSections.showVisualization.trimEnd());
    if (config.showGrowthMindset !== false) parts.push(personalizedReportSections.showGrowthMindset.trimEnd());
    // d 段：親師溝通格式 — 順序 PDF → QR → Newsletter → Reflection
    if (config.showParentPDF !== false) parts.push(personalizedReportSections.showParentPDF.trimEnd());
    if (config.showParentQR !== false) parts.push(personalizedReportSections.showParentQR.trimEnd());
    if (config.showNewsletter !== false) parts.push(personalizedReportSections.showNewsletter.trimEnd());
    if (config.showTeacherReflection !== false) parts.push(personalizedReportSections.showTeacherReflection.trimEnd());
    if (parts.length === 0) return null;
    // 段間用 \n\n (一個空行) — trimEnd 確保唔會有 3 個 newline
    return parts.join('\n\n');
};

export {
    senTypeOptions,
    accessibilityOptions,
    learningDiversityOptions,
    defaultRules,
    personalizedReportSections,
    categories,
    subjects,
    // composePersonalizedReportRule 由上面 export const 直接 export，唔重複列
};
