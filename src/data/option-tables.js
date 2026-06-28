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
const defaultRules = [
    { text: "在右上角加上學習儀表版功能,讓學生能夠自我檢測, 成績要能存在本機", __isDefault: true },
    { text: "答對時給予 提示音及對應的知識理論，為何該答案是正確", __isDefault: true },
    { text: "首頁輸入框提示：請輸入你的名字開始遊戲： 例如：小明, 行動按鈕：開始遊戲", __isDefault: true },
    { text: "增加一個 自學模式，用戶能自行設定問題給自己, 例子(x - y) 然後自行解答。", __isDefault: true },
    { text: `「個別化學習報告頁面」，需符合以下原則：
a. 個別化與數據化
顯示具體學習數據，例如：答對題數／總題數、平均嘗試次數、完成時間（若適用）
標示「最熟練項目」與「需加強項目」（例如：最易／最難的數字、詞彙或題型）
數據需基於學生實際互動行為（如錯誤模式、重試次數）而非僅二元對錯
b. 可視化與兒童友善設計
使用簡易長條圖、圓餅圖或進度條呈現關鍵數據，避免複雜座標軸
採用柔和配色、大字體、Emoji 或插畫風格圖示（如🌟、💡、🚀）
避免文字密集，多用圖示與留白，確保低年級學生能一眼理解
c. 正向語言與建設性建議
以成長型思維（growth mindset）措辭：強調「努力」「進步」「小專家」「再試一次就更厲害」
提供 1–2 條具體、可操作的建議（例如：「你可以每天練習 3 次『7 的分解』，就像搭積木一樣！」）
避免負面標籤（如「你不會」「錯誤太多」）`
    , __isDefault: true },
    { text: "🎉 慶祝特效: 任務完成時觸發 canvas-confetti（特效只會觸發一次，重置後才會再次觸發）。", __isDefault: true },
];

export {
    senTypeOptions,
    accessibilityOptions,
    learningDiversityOptions,
    defaultRules,
};
