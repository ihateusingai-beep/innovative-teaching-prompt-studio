# Innovative Teaching Prompt Studio（創意教學 Prompt Studio）

**為 SEN 教師設計嘅 prompt 生成器**：3 分鐘填表 → 自動產生工程師級 prompt → 貼去 AI（Gemini / Claude / Lovable / v0）→ 生成教學工具 HTML。

![version](https://img.shields.io/badge/version-v3.0-blue)
![size](https://img.shields.io/badge/size-~410KB_(129KB_gz)-green)
![zero-backend](https://img.shields.io/badge/backend-zero-orange)
![offline](https://img.shields.io/badge/offline-ready-brightgreen)

---

## 🚀 Quick Start

### For 老師 (Users)

1. **下載** `dist/index.html` 呢個 file
2. **雙擊打開** — 喺 browser 開（Chrome / Edge / Safari / Firefox）
3. **填表** 4 個 step（基本資料 / 內容情境 / 規則設定 / 完成生成）
4. **複製 Part 1** → 貼去 Gemini / Claude → 問「構思呢個教學工具」
5. **複製 Part 2** → 貼去同一個 AI → 問「生成 HTML」
6. **下載 / 複製 HTML** — 完成！

**零安裝、零後端、零帳號、零資料外洩、零網絡依賴**（v3.0 build 後所有 JS/CSS inline 入 HTML）。

### For 開發者 (Developers)

```bash
# 1. 安裝 dependency
npm install

# 2. 開發模式 (HMR)
npm run dev
# → http://127.0.0.1:5173

# 3. Production build (single-file IIFE)
npm run build
# → dist/index.html (~410KB, 129KB gzipped)

# 4. Smoke test build
open -a "Google Chrome" "file://$(pwd)/dist/index.html"
# Or serve:
python3 -m http.server 8765 --bind 0.0.0.0 --directory dist
```

**Note**: `index.html` (root) 係 Vite dev shell — **唔好 distribute 呢個 file**。Always distribute `dist/index.html`。

---

## ✨ 主要功能

### 🎯 For 第一次用嘅教師
- **📚 範本庫** — 8 個內建範本（加法扭蛋樂園 / 情緒溫度計 / 日常對話卡 / 植物生長模擬...），一 click 整套載入
- **✨ AI 幫我諗** — 36 條 curated suggestion 推薦核心用途 / 生活情境 / 規則
- **🎓 Onboarding Tour** — 5 個 coach marks 帶你行完整個流程
- **🎯 Quality Score** — 即時評分（0-100）+ 改善建議（完整性 / 明確度 / SEN 適配 / 規則 / 範例）

### 📚 For 經驗老師
- **💾 Auto-save** — 1 秒 debounce 自動儲存，browser crash 都唔怕
- **↩️ Undo / Redo** — `Cmd+Z` / `Cmd+Shift+Z` milestone-based 復原
- **⭐ My Templates** — 將常用設定儲存為自訂範本（最多 50 個）
- **📥 JSON Import / Export** — 跨電腦 / 同事 share 設定

### 🤖 For 進階用戶
- **🚀 Direct Gemini** — 貼上 API key 即時生成 HTML（5-30 秒）
- **Schema Migration v2** — 舊版 JSON 自動 upgrade
- **🔧 Hard Constraints** — SEN 類型 + a11y 維度 + WCAG 2.1 AA 自動注入

### 🎨 For All Teachers
- **🎨 Theme Toggle** — Cyber / Plain 兩 theme
- **👁 Live Preview** — 即時睇 prompt output
- **📤 DOCX / JSON Export** — Word / JSON 格式 export

---

## 🌟 8 個內建範本

| # | 名稱 | Category | Grade | 用途 |
|---|------|----------|-------|------|
| 1 | 🎰 加法扭蛋樂園 | 教學遊戲 | 小一 | 數學加法 + 扭蛋機視覺包裝 |
| 2 | 🃏 英語詞彙配對卡 | 教學遊戲 | 小三 | 英文 vocabulary 記憶翻卡 |
| 3 | 🌡️ 情緒溫度計 | 情緒支援 | 小二 | 視覺化情緒辨識（ASD/ADHD 適用） |
| 4 | 💬 日常對話卡 | 溝通輔助 | 小三 | ASD 學生社交情境練習 |
| 5 | 🧮 數學練習寶 | 教學工具 | 小二 | 加減乘自主練習工具 |
| 6 | 🌱 植物生長模擬 | 實驗模擬 | 小四 | 科學探究 slider 互動 |
| 7 | ✍️ 中文字詞筆順 | 教學工具 | 小一 | 語文筆順動畫 + 描紅 |
| 8 | 🛒 購物情境模擬 | 教學工具 | 小三 | 生活技能算錢 / 找零 |

---

## 📋 使用流程

```
┌─────────────────────────────────────────┐
│ Step 1: 基本資料 (1.1–1.12)              │
│  • 老師名 / 工具名 / 範疇 / 科目         │
│  • 範疇決定 sub-section 顯示（智能）    │
│  • SEN 類型 + a11y 維度（智能推薦）     │
│  • 範本庫（8 個內建 + 自訂）            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Step 2: 內容情境 (2.1–2.3)              │
│  • 2.1 核心用途（必填）                │
│  • 2.2 生活情境                         │
│  • 2.3 融入價值觀                       │
│  • ✨ AI 幫我諗（推薦 suggestion）      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Step 3: 規則設定 (3.1)                  │
│  • 3.1 具體規則（可逐條加 / 刪）       │
│  • 技術功能設定（FAB 風格 / API 模組）│
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Step 4: 完成生成                        │
│  • 🎯 Quality Score (0-100)            │
│  • Part 1: 設計與邏輯                   │
│  • Part 2: 技術與執行                   │
│  • 📋 複製 Part 1 → AI → 📋 複製 Part 2  │
│  • 🚀 Direct Gemini (optional)         │
└─────────────────────────────────────────┘
```

---

## 💡 Quick Tips

### 第一次用？
1. 喺 Step 1 開頭撳「📚 加法扭蛋樂園」範本
2. 撳「📂 載入」即整套載入 formData
3. 去「2.1 核心用途」改你想做嘅嘢
4. 撳「✨ AI 幫我諗」叫 AI 寫 purpose
5. 過 Step 4，複製 Part 1 → 貼去 Gemini
6. 問 Gemini「幫我構思呢個教學工具嘅設計」
7. 等 Gemini 回應後，複製 Part 2 → 貼去 Gemini
8. 問 Gemini「生成 HTML」

### 想直接生成 HTML？
1. Step 4 撳「⚙️ API」→ 貼上 Gemini API key（[點樣攞](https://aistudio.google.com/apikey)）
2. 撳「🚀 直接生成 HTML」
3. 5-30 秒後 Gemini 返 HTML 畀你
4. 撳「⬇️ 下載 .html」拎走成品

### 想 Save 返所有嘢？
- **Auto-save 自動開咗** — 每次改 formData 1 秒後自動寫 localStorage
- **關咗 browser 都唔怕** — 下次開自動彈「載入上次未完成？」dialog
- **想 backup** — 撳「JSON」按鈕 save JSON file

---

## 🔒 Privacy & Security

- ✅ **零後端** — 所有 data 留喺你嘅 browser
- ✅ **零 telemetry** — 唔收集任何 analytics
- ✅ **零 tracking** — 唔連任何 third-party tracking
- ✅ **Gemini API key** — 純 localStorage（你嘅責任：share 電腦前 clear）
- ⚠️ **share JSON file 前** — 留意 `purpose` / `context` / `rules` field 唔好寫學生真實姓名 / 私隱資料

---

## 🛠 技術細節

### Tech Stack (v3.0)

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 5.4 | Build tool + ESM bundler |
| vite-plugin-singlefile | latest | Inline JS/CSS/asset into single HTML |
| **Terser** | 5.x | **Minifier (NOT esbuild — see gotchas below)** |
| Tailwind CSS | 3.4 (PostCSS) | Utility-first CSS |
| Framer Motion | latest | Animations |
| Lucide React | 0.292 | Icons (tree-shaken) |
| Docx | latest | Word export (CN font) |

### 部署格式

整個 app 喺單個 `dist/index.html` (~410KB, 129KB gzipped)
- ✅ file:// 直接打開 work
- ✅ 唔需要 server / hosting / CDN
- ✅ 完全 offline-ready（所有 JS / CSS inline）
- ✅ Email / USB / Google Drive share
- ✅ GitHub Pages deploy
- ✅ 唔需要 npm install 用嚟用

### 開發格式 (modular)

Source 喺 `src/` — modular structure for maintainability:
```
src/
├── data/        # Schema, scorer, suggestions, templates, sen-a11y map
├── utils/       # clipboard, docx, gemini, storage, time
├── prompts/     # Prompt generators (pure functions)
├── hooks/       # useFormData, useAutosave, useUndoRedo, useLocalStorage
├── state/       # useAppState (centralized App state + handlers)
├── components/  # UI primitives + modals + widgets
├── styles/      # Tailwind + design tokens
├── App.jsx      # Pure render — useAppState() + renderStep1-4
└── main.jsx     # React mount entry
```

詳細分工見 [`AGENTS.md`](./AGENTS.md)。

---

## 📋 System Requirements

### For 老師 (users)
- **Browser**: Chrome 90+ / Edge 90+ / Safari 14+ / Firefox 88+
- **OS**: Windows / macOS / Linux / iPad / Android tablet
- **Internet**: **完全唔需要**（v3.0 build 後所有 JS/CSS inline 入 HTML）
- **Storage**: localStorage 啟用（auto-save 用）

### For 開發者 (developers)
- **Node.js**: 18+ (Vite 5 requirement)
- **npm**: 9+
- **Browser**: 同上

---

## 🐛 Troubleshooting

### 開 file 後空白頁？
- ✅ 確認你打開嘅係 **`dist/index.html`** (唔係 root `index.html`，嗰個係 Vite dev shell)
- ✅ 確認 browser JS 冇 disable
- ✅ 試 Chrome / Edge（最穩）
- ✅ 撳 DevTools Console（F12）睇 error message

### 「Failed to resolve module specifier 'react/jsx-runtime'」？
- ✅ v3.0 build 已 fix — Vite `jsxRuntime: 'classic'` 直接 precompile JSX
- ⚠️ 如果你睇到呢個 error，build 過程出咗事 — `git pull` + `npm install` + `npm run build` 重試

### Auto-save 唔 work？
- ✅ Check 唔係 incognito / private mode（localStorage 喺 private mode 唔 persist）
- ✅ Check browser 冇 disable localStorage

### Gemini Direct API 失敗？
- ✅ API key 唔啱 → 撳「⚙️ API」換 key
- ✅ Internet 唔穩 → retry
- ✅ Prompt 觸發 safety filter → 改寫 prompt 用更中性的字眼

### 開發者 troubleshooting

#### Build error: 「Expected pattern to be a non-empty string」
- `vite-plugin-singlefile` 嘅 `inlinePattern` 用 string patterns 而唔係 regex
- ✅ 已 fix 喺 `vite.config.js` — 用 string array (e.g. `['.css', '.js']`) 或者直接 omit (默認 inline 所有 static assets)

#### Build error: 某 callback `ReferenceError: X is not defined` 喺 production runtime
- **Mangle name collision** — esbuild minifier 將唔同 module 入面同名 callback mangle 到同一個 short name
- ✅ 用 `build.minify: 'terser'` + `mangle.reserved` list (已喺 `vite.config.js` `MANGLE_RESERVED`)
- ⚠️ **新增 hook return value 或 useAppState callback 時必須更新呢個 list**

#### Console error: 「'X' is not exported by 'src/data/scorer.js'」
- 預設 export vs named export 唔啱
- `src/data/scorer.js` 用 `export default promptScorer`
- Import 要係 `import promptScorer from '../data/scorer.js'` (唔需要 `{}`)

---

## 📜 License & Credits

Built by **Ken Cheng** for SEN teachers in Hong Kong.

**v3.0 stable release** (2026-06-26) — Vite single-file IIFE build pipeline:
- Modular source (`src/`) for maintainability
- Single-file output (`dist/index.html`, ~410KB / 129KB gzipped) for distribution
- All CDN dependencies eliminated — fully offline-ready
- Terser minifier with `mangle.reserved` list (prevents cross-module name collision)

See [`AGENTS.md`](./AGENTS.md) for development workflow + locked decisions.

---

## 🔗 Related Resources

- **Google Gemini API**: https://aistudio.google.com/apikey
- **ChatGPT / Claude**: 貼 prompt 到 ChatGPT / Claude 都 work（但 Direct Gemini 限定 Gemini）
- **Lovable / v0 / Bolt**: 貼 Part 2 prompt 到呢啲工具都可以（注意佢哋可能會 normalize / 改動 prompt）
- **GitHub Pages**: 直接 push 個 `index.html` 去 `gh-pages` branch 即 deploy