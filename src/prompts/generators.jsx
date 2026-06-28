// === Lookup tables ===
// W9-10 #5: 抽出去 data/option-tables.js 做 single source of truth
// App.jsx + generators.jsx 兩邊 import 同一份，避免 drift
import {
    senTypeOptions,
    accessibilityOptions,
    learningDiversityOptions,
} from '../data/option-tables.js';

import promptScorer from '../data/scorer.js';

export const generateDesignPrompt = (formData) => {
    // W9-10 #6: rules 由 string[] → {text, __isDefault}[] object array
    // 老師改過嘅 rule (__isDefault: false) 全部注入 prompt
    // 未改過嘅 default rule filter 走，避免 default noise + 慳 token
    const normalizeRule = (r) => typeof r === 'string' ? r : (r?.text || '');
    const userRules = formData.rules.filter(r => {
        const text = normalizeRule(r);
        if (!text || !text.trim()) return false;
        if (typeof r === 'object' && r !== null && r.__isDefault === true) return false; // skip 走未改 default
        return true;
    });
    const rulesList = userRules.map((r, i) => `${i + 1}. ${normalizeRule(r)}`).join("\n    ");
    const examplesList = formData.examples.filter(ex => ex.text.trim() !== "").map((ex, i) => `* [${ex.level}] (${ex.mechanism}) ${ex.text} (請生成 ${ex.count || 10} 題近似題目)`).join("\n    ");
    const isGame = formData.category === "教學遊戲";
    
    const subject = formData.subjectCategory === "其他" ? formData.subjectCustomInput : formData.subjectCategory;
    
    // Game Style is now a single string
    const style = formData.gameStyle === "其他" ? formData.gameStyleCustomInput : formData.gameStyle;
    
    let interactions = [...formData.interactionType];
    if (interactions.includes("其他")) {
        interactions = interactions.filter(i => i !== "其他");
        if (formData.interactionCustomInput.trim()) {
    interactions.push(formData.interactionCustomInput);
        }
    }
    const interaction = interactions.length > 0 ? interactions.join("、") : "未指定";

    const diversityList = formData.learningDiversity.map(opt => {
        const option = learningDiversityOptions.find(o => o.label === opt);
        return `* **${opt}**：${option ? option.desc : ""}`;
    }).join("\n    ");

    // SEN 類型 — 每個拎返對應嘅 design implication，注入 prompt
    const senTypesList = formData.senTypes.length > 0
        ? formData.senTypes.map(label => {
    const option = senTypeOptions.find(o => o.label === label);
    return `* **${label}** — 設計指引：${option ? option.desc : ""}`;
        }).join("\n    ")
        : "";

    // a11y 維度 — 老師揀要執行嘅 a11y checklist，注入 prompt
    // 每個維度對應具體實作指引，AI 收到會喺「# 3. 設計與教育原則」逐項列點
    const accessibilityList = formData.accessibility.length > 0
        ? formData.accessibility.map(label => {
    const option = accessibilityOptions.find(o => o.label === label);
    return `* **${label}** — 實作指引：${option ? option.desc : ""}`;
        }).join("\n    ")
        : "*（無 — 老師未指定 a11y 維度，請用通用 WCAG 2.1 AA 標準設計）*";

    const valuesStr = formData.value.length > 0 ? formData.value.join("、") : "無";

    // W9-10 #3: Quality warning block — 將 scorer 嘅 missing-field suggestions 注入 prompt 開頭
    // 等 AI 收到 prompt 就知邊啲位資料唔齊，可能需要喺 output 主動提示老師
    // 只喺評分 < good（< 60）時注入，避免高分 prompt 都有冗長 warning block
    const quality = promptScorer(formData);
    const qualityWarning = quality.total < 60 && quality.suggestions.length > 0
        ? `\n# 0. ⚠️ Prompt 質素提示 (Quality Notice)\n**本 prompt 評分為 ${quality.total}/100（${quality.gradeLabel}）**。以下欄位未完善，AI 收到後請喺最終回應頂部主動提示老師補完，但唔好因為資料未齊而拒絕生成：\n${quality.suggestions.map(s => `* **${s.message}** — ${s.detail}。${s.improvement ? `\n  → ${s.improvement}` : ''}`).join('\n')}\n\n---\n\n`
        : '';
    
    let prompt = `${qualityWarning}# 1. 角色設定 (Role)
你是一位擁有 15 年經驗的「資深前端工程師」與「教育科技（EdTech）UX 專家」，專注於為小學生至中學生（具特殊教育需求的學習者）設計直觀、高互動性且符合無障礙標準（WCAG 2.1）的網頁學習工具。你擅長使用 HTML5、CSS3 與 Vanilla JavaScript 開發輕量、響應式、無需外部依賴的應用，並偏好運用 Emoji、CSS 動畫、正向回饋機制 與多感官提示（如顏色、聲音、點擊動效）來提升學習動機與參與度。

你的任務是協助教育工作者（如教師或課程設計者）打造一個在桌機與行動裝置上皆直觀易用的線上學習平台。請以顧問式口吻，具批判性及建設性思考角度，不要盲目服從，找到設計的邏輯問題、設計盲點，請特別從以下角度進行批判性檢視：
•「檢視『遊戲－問答交替循環』機制是否邏輯清晰,如「本工具採用『情境遊戲 → 觸發問答 → 回饋 → 返回遊戲』的循環模式，問答以全屏彈窗呈現，完成後自動返回原遊戲場景。」
•模擬工具的機制是否直觀容易明白？
•學習工具的排板是否有誤?
• 行動裝置上的互動模式是否符合無障礙標準？
• **無障礙 (a11y) 具體實作檢核**：色彩對比 ≥ 4.5:1、鍵盤導航 (Tab/Enter/Esc)、focus 樣式清晰、screen reader 友善（語意化 HTML + aria-label）、所有功能可純鍵盤完成。
• **SEN 適配性**：學生實際使用時的情緒與認知負荷（唔好只睇功能齊唔齊）。

**請按以下結構逐一回應**（每節都要有實質內容，唔好淨係列標題）：
1. 針對 # 3 嘅 5 大原則，逐項講解點樣落地（包含針對 # 1 設定嘅具體做法）
2. 針對 # 4 智能教學邏輯：描述三階回應嘅觸發條件 + 實際輸出範例
3. 針對 # 5 結算系統：說明「個別化報告」嘅 data points + 視覺化建議
4. 最後提供「高保真文字版介面藍圖」：用 Emoji + 縮排模擬關鍵畫面嘅佈局，並標註設計意圖（例如「此處用大按鈕確保觸控準確性」）

****「以下為專案配置，請據此分析」

# 2. 專案參數配置 (Configuration)
**請根據以下設定，構建程式的邏輯與內容：**

* **工具名稱**：${formData.toolName || "[未命名工具]"}
* **工具範疇**：${formData.category}
* **科目**：${subject || "未指定"}
${isGame ? `* **遊戲風格 (Game Style)**：${style} (請以此風格作為主要的視覺隱喻與互動包裝)
    * **遊戲機制說明**：「遊戲階段」：純粹遊戲(無知識），僅作為學習間的動機調節器，所有知識傳遞僅發生於問答彈窗。「遊戲－問答交替循環」模式， 進行遊戲機制後會彈出一個問題， 無論答對或答錯，皆給予即時回饋，並返回下一個關卡，此循環持續進行，直到完成預設題數。` : ""}
* **互動機制**：${interaction}
${isGame ? `* **遊戲模式需求**：請生成 **三種遊戲模式**，每種模式需分開 **初階、中階、高階** 三種難度。` : ""}
${examplesList ? `* **範例題目 (Example Questions)**：\n    ${examplesList}` : ""}
* **核心用途**：${formData.purpose}
* **目標學生年級**：${formData.grade}
* **支援程度 (SEN Level)**：${formData.senLevel}
    * *邏輯設定：「中度」需更多視覺輔助、少字多圖、詞彙簡單；「輕度」可包含較多文字說明。*
${senTypesList ? `* **SEN 類型 (SEN Type) — 必須針對性調整設計**：
    ${senTypesList}
    * *請在「# 3. 設計與教育原則」中明確列出針對每個 SEN 類型的設計策略（例如 ADHD 學生：每 5 分鐘提供動態操作、避免長任務；ASD 學生：視覺時間表、固定流程、減少抽象比喻）。*` : ""}
* **無障礙 (Accessibility / WCAG 2.1 AA) — 必須逐項實作**：
    ${accessibilityList}
    * *請在「# 3. 設計與教育原則」中新增「🛡️ 無障礙實作清單」段落，逐項列出對應嘅程式實作（例如：色彩對比 → 用 color-contrast() 函式驗證；鍵盤導航 → 所有 button 加 tabindex、focus 樣式用 :focus-visible；Screen Reader → 圖示 button 加 aria-label；減少動畫 → @media (prefers-reduced-motion: reduce) 包裝動畫）。*
    * *所有 a11y 維度都必須喺最終程式碼 (Part 2 嘅 HTML) 真正實作，唔可以只列不寫。*
* **照顧學習差異 (Learning Diversity Support)**：
    ${diversityList || "無特殊設定"}
* **生活情境設定**：${formData.context || "一般教室情境"}
* **融入價值觀**：${valuesStr}
* **具體規則與邏輯**：
    ${rulesList || "無特殊規則"}

# 3. 設計與教育原則 (Design & Pedagogical Principles)
**請嚴格遵守以下 5 大原則：**

1.  **🌈 視覺友善 (Visual Friendliness)**
    * **風格**：可愛卡通、色彩明亮、大字體（Large Fonts）。
    * **排版**：採用 "Bento Grid" (便當盒式佈局) 或 "Glassmorphism" (毛玻璃特效)。
    * **原則**：Show, don't tell（用大圖示與清晰動畫代替冗長說明）。
    * **RWD**：必須同時完美支援電腦（投影用）與平板（iPad 操作用）。

2.  **🧠 認知支援 (Cognitive Support)**
    * **即時反饋**：正確顯示 ✅ + 愉悅音效；錯誤顯示 ❌ + 溫和提示音。
    * **容錯設計**：必須提供「撤銷 (Undo)」或「重試」按鈕。
    * **步驟拆解**：將複雜任務分解為清晰的單一步驟。

3.  **🌍 生活連結 (Real-life Context)**
    * 情境設定需貼近學生生活（如：${formData.context || "日常生活"}）。
    * 優先連結獨立生活技能（Social & Life Skills）。

4.  **❤️ 情緒支持 (Emotional Support)**
    * **成長型思維**：錯誤時**絕不責備**（顯示：「再試一次！」、「差一點點！」）。
    * **正向增強**：任務完成時，給予強烈視覺回饋（如星星飛出、掌聲）。

5.  **🛡️ 安全與價值觀 (Safety & Values)**
    * **價值觀滲透**：在回饋或介面角落自然融入「${valuesStr}」的概念。

6.  **♿ 無障礙實作清單 (Accessibility Checklist)**
    **以下為必須逐項實作嘅 a11y 維度（由教師指定），喺最終程式碼必須真正落地，唔可以只列不寫：**
    ${accessibilityList}
    * *具體要求*：
        - 色彩對比：用 color-contrast() 函式驗證主要文字組合達 4.5:1。
        - 鍵盤導航：所有 button/link 有 tabindex，focus 樣式用 :focus-visible 顯示 2px outline。
        - Screen Reader：語意化 HTML (button/nav/main/header/footer)、icon-only button 加 aria-label、圖片加 alt。
        - 減少動畫：所有動畫包入 @media (prefers-reduced-motion: no-preference) 內。
        - TTS：Web Speech API lang 設為 'zh-HK'，每段文字提供喇叭 icon 按鈕。
        - 字體大小 / 高對比模式：右上角偏好設定模組內提供 toggle。
        - 字幕：所有音效配視覺替代（圖示/震動/文字）。
`;

    if (isGame) {
        prompt += `
# 4. 智能教學邏輯 (AI Scaffolding Logic)
**程式需內建以下三階回應機制，根據學生表現動態調整：**

* **🟢 初階 (Level 1: Visual)**：一句話直球答案 + 核心 Emoji/圖片。（適用：剛開始或中度支援需求）
* **🟡 進階 (Level 2: Logic)**：簡短解釋因果關係（兩句話內）。（適用：已掌握名詞）
* **🔴 高階 (Level 3: Metacognition)**：解釋 + 引導反問（例如：「你可以問我...」）。（適用：表現優異者）

# 5. 遊戲化結算系統 (Game Over & Report)
當活動結束時，顯示「個別化報告」畫面：

1.  **表現分析**：顯示總分，錯誤列表，常犯錯誤，已掌握的知識，給予一些建議（語氣溫和）。
2.  **適性化建議 (Adaptive Recommendation)**：
    * *錯誤率 > 40%*：建議「多練習初階，加油，你可以的」。
    * *錯誤率 10-40%*：建議「做得很好，繼續穩固知識」。
    * *錯誤率 < 10%*：建議「你是專家了！挑戰下一階吧！」。
3.  **導航**：必須包含「重玩」與「返回主選單」按鈕。
`;
    }

    return prompt;
};

// 2. Generate Technical Prompt (Step 6 + Execution)
export const generateTechPrompt = (formData) => {
     // Preference Settings Text
     const preferenceSettingsText = `* **🛠️ 偏好設定模組 (Preference Settings)**:
        網頁右上角有一個隱藏式偏好設定模組，藍色正方形背景 + 白色三條水平滑桿圖示，點擊按鈕後，從右側或下方滑入/淡入彈出選單。
        - **功能一**：字體大小（6級）：小小的(14px)｜小一點(16px)｜剛剛好(18px)｜大一點(22px)｜大大的(26px)｜超～大(32px)。
        - **功能二**：說話速度（6級）：0.5｜0.6｜0.7｜0.8｜0.9｜1.0（倍速），標題：「說話速度」，輔助視覺：左側標註 🐢「慢慢說」，右側標註 🐇「快快說」。`;

    // W9-10 #9: 重述 Part 1 context，避免 AI 淨 copy Part 2 時冇 setting context
    const part2Context = `# 0. Part 1 Context Recap
承接 Part 1 嘅設定（同學類型：${formData.senTypes.length > 0 ? formData.senTypes.join('、') : '一般學生'}；範疇：${formData.category}；學科：${formData.subjectCategory}；SEN Level：${formData.senLevel}）。
以下係將 Part 1 嘅教學設計落地嘅技術規格。
`;

    let prompt = `${part2Context}
# 6. 技術規格 (Technical Stack):
${formData.useGeminiStyle ? `請生成一個完整的**單一 HTML 檔案**，用瀏覽器直接打開 (\`file://\`) 即可運作，不需 build step 或 server。

1.  **Single-file 架構**：HTML 內用 CDN import React 18 (UMD build) + Babel standalone (in-browser JSX transform, jsxRuntime: 'classic') + Tailwind CDN。CSS inline 喺 \`<style>\` tag，JS inline 喺 \`<script type="text/babel">\`。
2.  **State**：React Functional Components + \`useState\` / \`useEffect\` / \`useRef\` hooks。**唔好用** Next.js / Vite / Webpack / npm build（要 file:// 可行）。
3.  **Styling**：Tailwind utility classes (CDN 版已內建)。配色需活潑、高對比、護眼。
4.  **Icons**：用 inline SVG（Lucide 嘅 outline 風格自己畫），避免 external icon library CDN dependency。
5.  **Animation**：原生 CSS @keyframes + Tailwind transition utilities，唔需要 Framer Motion（避免額外 CDN）。
6.  **必備功能**:` : `**Gemini Style 已關閉**。請按你嘅判斷選擇最合適嘅技術棧（React + Vite、純 HTML、或其他），呢度唔限制。

1.  **必備功能**:`}
    * **🔊 語音功能**: 有on/off功能, 若實作 \`speak\` 函式，請將 \`lang\` 預設值設為 \`'zh-HK'\`。
    ${formData.includePreferenceSettings ? preferenceSettingsText : ""}
    * **⬅️ 導航**: 左上方必須有一個顯眼的「返回主頁」按鈕。
    * **💾 儲存 (Download HTML)**: 於主頁左下角設置提供「⬇️ 下載 HTML」按鈕，供使用者一鍵下載當前網頁完整 HTML 原始碼的能力，便於教師備份教學頁面。
    * **🦶 頁尾與版權 (Footer)**: 頁面最底端顯示置中文字：\`© ${new Date().getFullYear()} ${formData.teacherName || '老師'} 設計\`。
${formData.fabStyle === "cyber" ? `    * **🏷️ 懸浮標籤 (FAB) — Cyber 全息風格**:
        - 位置：右下角固定 (Fixed)。
        - 樣式：使用彩虹般的全息色 (holographic/iridescent)，隨視角或時間微變，外框與文字，半透明材質，營造未來感。帶有電腦型 (Monitor) 圖示。
        - 內容：「${formData.teacherName || '老師'} 設計」。
        - 不需要附加任何外部圖片或個人簽名資產。` :
formData.fabStyle === "minimal" ? `    * **🏷️ 懸浮標籤 (FAB) — Minimal 簡約風格**:
        - 位置：右下角固定 (Fixed)。
        - 樣式：白底、淺灰邊框、簡約陰影；hover 時輕微 scale (1.05)。帶有電腦型 (Monitor) 圖示。
        - 內容：簡短文字「${formData.teacherName || '老師'} 設計」。
        - 整體調性：乾淨、專業、不搶眼，適合正式教學場合。` :
`    * **🏷️ 懸浮標籤 (FAB)**: ❌ 老師已選擇關閉，請勿加任何右下角浮動標籤 / FAB。`}
${formData.accessibility.length > 0 ? `    * **♿ 無障礙實作**：見 Part 1 §3.6 嘅完整 checklist（每個維度嘅具體 code pattern 同實作要求）。本段唔重複，淨係喺程式碼頂部加一個簡短嘅 a11y 註解區塊列出已實作嘅維度。` : ""}

# 執行任務 (Execution)
請根據上述配置，編寫完整的程式碼。程式碼需包含完整的 UI 佈局、邏輯處理${formData.category === "教學遊戲" ? "、以及上述的三階 AI 回應內容模擬" : ""}。`;
    return prompt;
}
