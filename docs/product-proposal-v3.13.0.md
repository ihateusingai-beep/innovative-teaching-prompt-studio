# Innovative Teaching Prompt Studio — 產品設計與優化提案

**版本**: v3.12.0 為基準
**撰寫日期**: 2026-06-29
**目標受眾**: SEN (Special Educational Needs) 老師 — 為 ADHD / ASD / 讀寫障礙 / 聽障 等學生設計結構化 prompt
**使用裝置**: Desktop primary (per user memory)

---

## 0. 現況速覽 (Current State Audit)

### 0.1 程式規模
- **App.jsx**: 1974 lines (monolith — God Component 反模式)
- **useAppState.js**: 698 lines (single mega-hook 內含 formData / templates / versions / profile bank / autosave / undo-redo / sections)
- **components/**: 7 files (ui, widgets, modals, DiffView, VersionPanel, ProfileBankPanel)
- **design-system/**: 6 primitives (GlassCard, GlassButton, GlassInput, Pill, ToggleSwitch, SegmentedControl) + 7 token modules + themeClass variants
- **styles/index.css**: 931 lines
- **Total**: ~5,567 lines

### 0.2 已實現嘅核心功能
1. **6 步驟 4 tab 表單** (基本 / 內容 / 規則 / 生成) — 累積 18 個 field group
2. **AI prompt 生成** (Gemini API + user override)
3. **範本庫** (8 個 built-in + custom)
4. **個別化學習報告** (a-d 四 sub-section)
5. **Profile Bank** (加密儲存學生 profile — AES vault)
6. **Prompt 版本控制** (localStorage history)
7. **自動儲存 + 復原** (debounce + snapshot)
8. **Undo/Redo** (history stack)
9. **6 themes** (plain/warm/dark/contrast/paper/reactor)
10. **密碼保護** (SHA-256 client-side gate)
11. **JSON import/export** (Schema v2)
12. **FAB style 配置** (3 種)

### 0.3 已知問題
- App.jsx monolith (1974 lines) — refactor 壓力大
- formData 缺乏 zod / yup validation
- 4 step navigation (tab) 但 step counter 顯示 "3/6" (5/5) 內部計數 — UX confuse
- 生成 tab content 純文字輸出，無 syntax highlight / tokenization
- 6 theme 預設值由 script expand，個別 color combination 未親手 tune

---

## 1. 新功能開發 (New Features)

### F1. **AI Suggestion 升級 — Streaming + Multi-turn Refinement** (高 priority)

**痛點**: 而家 AI prompt generation 係 fire-and-forget 一次性輸出，無 iterative refinement。用戶如果唔滿意要手動改 prompt 再 submit，浪費 20+ sec 等回應。

**方案**:
- 用 Gemini API streaming output (`streamGenerateContent`) 實時顯示 token
- 加 "Refine" 按鈕 — user 揀 "短啲 / 詳細啲 / 加例子 / 改語氣" 4 個 quick action
- Multi-turn conversation history (最多 5 turn，舊的 auto-collapse)
- 顯示 token usage + estimated cost (老師唔識計 credit)

**技術 stack**: `EventSource` 或 `fetch + ReadableStream` for SSE; `react-markdown` for rendered output.

**Effort**: 2-3 days. **Competitive edge**: 坊間 AI prompt tool 多數 fire-and-forget，streaming + refine 體驗好過 90% 對手。

### F2. **Differentiated Output Variants — Same Prompt, Multiple Lengths** (高 priority)

**痛點**: 老師同一個 SEN 學生可能要用同一 prompt 喺唔同 context (e.g. 短句畀 ADHD 學生 vs 完整指引畀家長)。而家每次要重新 generate。

**方案**:
- "Generate All" 按鈕 → 一次出 3 個 variant:
  - **🎯 簡短版** (≤ 200 字, 適合 1-on-1 學生)
  - **📖 標準版** (400-600 字, 班房用)
  - **📚 完整版** (含 rationale, 適合 IEP 報告)
- 並排比較 UI (side-by-side cards)
- 揀一個 → 落生成 tab

**Effort**: 1.5 days (前端 + 3x Gemini calls 包裝). **Edge**: 唔同 AI tool 都係 1-out, 3-out 係強差異化。

### F3. **Dyslexia-friendly Preview Mode** (中 priority)

**痛點**: SEN 學生 (尤其讀寫障礙) 嘅生成 prompt 經常要列印出嚟用，但 UI 用咗大量細字 + 細色 + 反白 — print 出嚟睇唔到。

**方案**:
- Preview tab 加 "Print View" toggle:
  - 字體升級 (Inter → Atkinson Hyperlegible / OpenDyslexic 18pt)
  - 對比度 7:1 (WCAG AAA)
  - 行距 1.5x
  - 唔顯示 sidebars / 顏色干擾
- 一鍵列印 → `window.print()` + CSS `@media print` stylesheet
- 也支援 export PDF (print-to-PDF)

**Effort**: 1 day (frontend only, no AI cost). **Edge**: 對讀寫障礙家長 + 老師直接有 value。

### F4. **Cohort Analytics — 班級層級 Aggregate Insights** (中 priority)

**痛點**: 個別化學習報告係 per-student，老師要逐個睇。如果有 30 個學生，唔可能 30 個分開 generate。

**方案**:
- Profile Bank 加 "Cohort" 維度
- 一次性 generate 30 學生嘅 prompt → batch summary 顯示:
  - Distribution chart (by SEN type / by grade)
  - 共同 pattern 識別 (e.g. "8/30 學生需要情緒調節策略")
  - 班級層級教學建議
- Export CSV for school admin

**Effort**: 4-5 days. **Edge**: 教育 SaaS 市場 (ClassDojo / Edmodo) 嘅 analytics feature 通常鎖喺 paid tier。

### F5. **Lesson Plan Import — 從其他老師 prompt 學習** (低 priority, 但 viral)

**痛點**: 老師唔知其他同行點寫 prompt。Sharing 用 docx / email 慢。

**方案**:
- "Share to community" 按鈕 (opt-in, anonymous) → POST 到 static API endpoint
- "Browse community" tab → 顯示其他人嘅 prompt
  - 按 SEN type / grade / game style filter
  - 點 "Use this" → clone 到 form
- 完全 decentralized — 用 GitHub Gist / Cloudflare R2 static hosting

**Effort**: 5-7 days. **Edge**: Network effect 一旦 launch — 每多一個用戶，整個 library 越好。

### F6. **Voice Input — 廣東話語音輸入表單** (中 priority)

**痛點**: 老師 1 對 30 學生時，keyboard typing 慢 (尤其打中文 + ASD 學生情緒狀況描述)。

**方案**:
- Web Speech API (`SpeechRecognition`, `lang='zh-HK'`)
- 大按鈕 mic icon → 開始聆聽 → 即時 fill 表單
- Confidence 顯示 (e.g. 75% 信心度要老師 confirm)

**Effort**: 1.5 days. **Edge**: Google / Apple 都未做廣東話語音輸入 (主要係普通話 + English)，呢個係 niche 利基。

---

## 2. 使用者體驗 (UX) 優化

### U1. **Step Counter 改寫** (P1)

**現況**: Tab 顯示 "3/6" (規則) + Step 顯示 "5/5" — counter 內部唔一致。
**方案**:
- Tab 顯示 "3/4" (tab position 1-4, 0-based → 1-based)
- Bottom stepper 顯示 "Step 5 of 5" (section count within tab)
- 加 milestone indicator: ✓ 已完成, ⚠ 部分完成, ○ 未開始

### U2. **Onboarding Tour 重做** (P1)

**現況**: 「自動儲存 + 復原」tour 仲顯示底 — 5/5 step 永久霸佔右下面積。
**方案**:
- 第一次 visit 顯示一次性 product tour (4 個 step — 基本 / 內容 / 規則 / 生成 各自 highlight)
- 永久 dismiss 掣
- 永遠唔再 default show
- 設定頁面有 "Replay tour" option

### U3. **Empty State Illustration** (P2)

**現況**: 範本庫冇範本時顯示「內建範本 (8)」text 而已。
**方案**:
- 加 SVG illustration (一行人物 + 思考泡泡)
- 「由 0 開始建立你嘅 prompt」CTA

### U4. **Keyboard Shortcut 全覆蓋** (P2)

**現況**: Undo/Redo 有 keyboard binding (Ctrl+Z / Ctrl+Shift+Z)，其他冇。
**方案**:
- `Cmd/Ctrl + 1/2/3/4` → 切 tab
- `Cmd/Ctrl + S` → 強制 save (覆寫 autosave)
- `Cmd/Ctrl + Enter` → Generate prompt
- `Cmd/Ctrl + K` → Command palette (所有 action 可搜尋)
- `Esc` → 關 modal
- 顯示喺設定頁 + 「?」按鈕 pop-up cheat sheet

### U5. **Form Validation 即時 Feedback** (P1)

**現況**: 必填 field 紅色 asterisk，但 user 寫到一半先發現錯。
**方案**:
- 個 field 旁邊 inline hint (e.g. "請用 1-2 句話描述")
- 失焦時即時 validate (zod schema)
- Submit 前 full-form validation summary
- 進度條顯示 "12/18 fields filled" 鼓勵完成

### U6. **Confirmation Dialog 統一** (P2)

**現況**: 部分 destructive action (e.g. delete template) 用 `window.confirm` 醜樣。
**方案**:
- 全部換 `<ConfirmDialog>` primitive (已有 ConfirmReplaceDialog 喺 modals.jsx, 抽出來重用)
- 統一 danger / warning / info 三個 level

### U7. **Recovery Snapshot UX** (P2)

**現況**: 「自動儲存 + 復原」tour 阻礙 screen real estate。
**方案**:
- 收埋做 collapsible toast (bottom-right)
- Click 展開 show diff before/after
- Auto-dismiss after 30s if no action

---

## 3. 使用者介面 (UI) 設計

### V1. **Reactor Theme Animation 過頭** (P0 — fix)

**現況**: Reactor theme 嘅 `@keyframes reactor-card-pulse` 4s 動畫對所有 glass-card 永久播放 — **accessible motion issue + battery drain**。
**方案**:
- Wrap animation in `prefers-reduced-motion: no-preference` media query
- 預設 OFF，user toggle 「I want glow effect」先 enable
- 符合 WCAG 2.3.3 (Animation from Interactions)

### V2. **Dark Theme Contrast 提昇** (P1)

**現況**: Dark theme 用 `text-cyan-100` on `bg-slate-900` — contrast 估計 12:1 但 cyan 有點太冷。
**方案**:
- 改用 `text-slate-100` (default) + cyan ONLY 喺 accent
- 按鈕 / toggle 保留 cyan
- 主體閱讀用 slate-100，更舒適
- 對比 visual hierarchy 更清

### V3. **Print Stylesheet** (P1)

**現況**: 冇 `@media print` rules。
**方案**:
- 隱藏所有 chrome (header, footer, sidebar, FAB widget, tour widget)
- 內容 full-width
- Black on white
- 加 page break hints
- 加 print header: "Prompt — 學生 X — 日期 Y"

### V4. **Layout Density Toggle** (P2)

**現況**: 而家 desktop 預設 `max-w-6xl` 1280px 寬，內容 fit 得好鬆散。
**方案**:
- 設定加 "Density" 選項: **Comfortable** (default) / **Compact** (高 density 適合 power user)
- Compact mode 改 padding 8px → 4px, font 14px → 13px

### V5. **Onboarding 流程 Visual** (P2)

**現況**: 而家冇 onboarding 概念 (除咗「自動儲存 + 復原」tour)。
**方案**:
- 首次 visit: 4-step illustrated welcome modal
- 每 step 1 screenshot + 1 sentence
- "Skip" / "Next" / "Done"

### V6. **Toggle 視覺** (P1 — mobile audit)

**現況**: 36×20px 唔達 44×44 touch target (per v3.11.0 mobile audit 報告)。
**方案**:
- Toggle track 加闊至 48×28
- 加 invisible `padding: 12px` 擴展 clickable area
- Knob size 同步縮放

### V7. **Empty Space 利用** (P2)

**現況**: Header 右上有 "Schema v2" + "載入 JSON" + "學生 Profile" 4 個 button vertical stack。
**方案**:
- 改 horizontal layout (桌面) / 收埋入 hamburger menu (mobile)
- 加 keyboard shortcut hints next to each button (e.g. "⌘K")

### V8. **Loading Skeleton** (P1)

**現況**: Gemini API call 期間只係空白。
**方案**:
- Skeleton placeholder (灰色 pulsing block)
- 估計剩餘時間 (X 秒)
- 取消按鈕

---

## 4. 自動化功能導入 (Automation)

### A1. **Smart Field Auto-fill from History** (高 priority)

**痛點**: 老師每個新學生都要重新填 18 fields，雖然 5/5 個係 optional 但要重複 input 學生基本資料。

**方案**:
- 「從上次學生複製」按鈕 → 自動 copy non-SEN-specific fields (教師名, 科目, 班別) 到新 form
- 「從 Profile Bank 帶入」按鈕 → 已有 profile 嘅學生點名 → auto-fill 6+ 個 fields
- Smart suggestion: "上次填 ADHD + 二年級嘅 prompt 通常用呢個 game style (扭蛋機)，要唔要用？"

**Effort**: 1.5 days. **Edge**: 減低老師 friction 50%+。

### A2. **AI Auto-suggest Next Field** (高 priority)

**痛點**: 用戶填咗「科目 = 數學」, 唔知 game style 應該揀咩。

**方案**:
- 每填一個 field → 觸發 AI suggest next 3 個 likely values
- 顯示喺 input 下面 (low-attention suggestion)
- 點即用

**Tech**: 用 Gemini API with field context → return top-3 recommendations (deterministic, no streaming)。

**Effort**: 2 days. **Edge**: 大幅降低 cognitive load。

### A3. **Auto-save Conflict Resolution** (中 priority)

**痛點**: 而家 recovery snapshot 只係 "用邊個" 兩個選項，冇 conflict diff。
**方案**:
- 並排 diff (left = autosave, right = current)
- Highlight 每個 field 差異 (綠色 = 只 autosave, 紅色 = 只 current, 黃色 = 兩個都唔同)
- "Use autosave" / "Use current" / "Merge per-field" 三個選項

**Effort**: 2 days. **Edge**: 多裝置 sync 嘅基礎 (雖然我哋冇 server sync，但 conflict UX 預備好)。

### A4. **Theme Auto-suggest by Time** (低 priority, 但 cool)

**痛點**: User 每次要手動揀 theme，唔係智能。

**方案**:
- 預設 plain by day, dark after 18:00
- User override 永遠 remember
- Reactor theme 鎖「show on Friday」mode (joke 模式)

**Effort**: 0.5 day. **Edge**: 細，但 delight user。

### A5. **Auto-extract Examples from Lesson Plan** (中 priority, 高 value)

**痛點**: 老師有大量過往 lesson plan (docx / pdf)，新學生 prompt 嘅 example field 經常空白。

**方案**:
- Drag-and-drop lesson plan file
- AI parse → extract 3-5 relevant examples
- Auto-fill example field (user 可 edit / accept)

**Tech**: Gemini file upload + JSON structured output。

**Effort**: 2-3 days. **Edge**: 巨大 time saving。

### A6. **Background Sync to Cloud (optional)** (中 priority)

**痛點**: localStorage 限單一 browser，唔跨 device。

**方案**:
- Opt-in Google Drive / Dropbox sync
- 用 OAuth 2.0, encrypted blob sync
- 衝突解決 = A3 嘅 diff UI

**Effort**: 5-7 days. **Edge**: 唔再 bound to single device。

### A7. **Smart Template Suggestion** (中 priority)

**痛點**: 8 個 built-in 範本，但老師唔知邊個啱自己用。

**方案**:
- 根據 form fields 推薦最 matching 嘅範本 (cosine similarity on form data)
- 顯示 "Recommended for you" badge
- 點即 apply

**Effort**: 1.5 days. **Edge**: discoverability。

### A8. **Quality Score Auto-improvement** (中 priority)

**痛點**: 而家 Quality Score 只係顯示分數，唔教 user 點改。

**方案**:
- 識別 score 低的 dimension (e.g. "examples 太少")
- Inline 提示 "加多 2 個 examples 應該加 5 分"
- 自動 link 去相關 field
- 一鍵 "Auto-suggest examples" button (用 A5 嘅 lesson plan extraction)

**Effort**: 1.5 days. **Edge**: 直接提升 user output quality。

---

## 5. 技術風險評估 (Technical Risk Assessment)

### 5.1 新功能嘅 Engineering Risk

| Feature | 風險 level | 主要風險 | 緩解 |
|---|---|---|---|
| F1 (Streaming) | 🟡 中 | Gemini API streaming 喺 browser 環境對 CORS / event timing 唔穩 | 先用 fetch + ReadableStream fallback to polling; add timeout + retry |
| F2 (Multi-variant) | 🟡 中 | 3x Gemini call 增加 cost + rate limit 風險 | Add `Promise.allSettled` partial success; cache variant if same form |
| F3 (Print View) | 🟢 低 | CSS only, 但 cross-browser print stylesheet bug 多 | Chrome 為主 target; Firefox spot-check |
| F4 (Cohort) | 🟠 高 | 30 學生 × AI call = 30x cost, rate limit 撞牆 | Add queue (1-by-1 with 2s delay), progress UI, allow pause/resume |
| F5 (Community) | 🟠 高 | Static API endpoint spam / abuse / privacy | Opt-in only, profanity filter, rate-limit by IP (Cloudflare) |
| F6 (Voice) | 🟡 中 | Web Speech API 對 Safari/Firefox support 唔一; 廣東話 accuracy | Detect browser, fallback to text input; 顯示 confidence |

### 5.2 UX/UI 重構風險

| 改動 | 風險 | 緩解 |
|---|---|---|
| App.jsx 1974 lines → split | 🟠 高 (5,567 lines 跨 17 files 改 risk 大量 regression) | 慢慢 refactor by feature: 抽 `useStepNavigation` / `useFormValidation` / `<FormStep>` component，每個 sub-PR 都 181+ tests pass |
| Toggle 36×20 → 48×28 | 🟢 低 | Single component edit + visual regression test |
| Print stylesheet | 🟡 中 | Cross-browser matrix test (Chrome/Firefox/Safari/Edge) |
| Density toggle | 🟢 低 | CSS variable swap, no JS logic change |

### 5.3 自動化風險

| 功能 | 風險 |
|---|---|
| A1 (Smart copy) | 🟢 Low - data 已經喺 localStorage, 純 UI logic |
| A2 (AI suggest) | 🟡 中 - 額外 Gemini call 增 cost, 但用戶 action trigger 唔會被濫用 |
| A3 (Conflict diff) | 🟡 中 - diff algorithm 對 nested object 唔 trivial |
| A4 (Time-based theme) | 🟢 Low - timer + localStorage preference |
| A5 (Doc parse) | 🟠 高 - PDF/DOCX parsing 質素參差, AI cost 高 |
| A6 (Cloud sync) | 🟠 高 - OAuth flow, encryption key 管理, 跨 device conflict |
| A7 (Template recommend) | 🟢 Low - 純 client-side cosine similarity |
| A8 (Score improvement) | 🟢 Low - 既有的 score 邏輯擴展 |

### 5.4 跨 cut 風險: **Performance**

v3.10.0 / v3.12.0 之後 App.jsx 仍然 1974 lines:
- React 每次 re-render 全 tree
- framer-motion layout 動畫 6 themes 全部 enable 可能影響 perf
- 6 themes CSS 全部 inline 入 single file (639 KB) — 對 mobile 用戶係 bandwidth hit (但 user memory 講 desktop primary，**冇問題**)

**Action**: 用 React DevTools Profiler 量度 step navigation / theme switch 嘅 re-render time，>100ms 要 optimize (memo / useMemo / React.memo 喺 hot path)。

---

## 6. Debug & Stability 測試項目

### 6.1 必須嘅 test matrix

#### 6.1.1 Theme system (v3.12.0 既有)
- ✅ 191/191 unit tests pass
- ⚠️ 缺: visual regression test (Chromatic / Percy / 手動 screenshot matrix)
- ⚠️ 缺: 6 themes cross-browser (Chrome / Firefox / Safari / Edge) — 至少 1 device + 1 mobile view
- ⚠️ 缺: 6 themes × 4 tabs (基本/內容/規則/生成) screenshot matrix (24 frames)

#### 6.1.2 新 feature F1 (Streaming)
- 測試網絡中斷 (offline 5s → reconnect)
- 測試 Gemini API rate limit (429 處理)
- 測試 streaming 期間 user 切 tab (cancel + restart?)
- 測試 output 超長 (10K tokens) 嘅 scroll 性能

#### 6.1.3 新 feature F4 (Cohort)
- 30 學生 batch 嘅 memory usage (Chrome: <500MB)
- 30 學生 batch 嘅 rate limit handling
- 5 學生 abort mid-batch 嘅 partial state recovery
- Cohort data 嘅 export CSV schema validation

#### 6.1.4 新 feature F6 (Voice)
- 廣東話 accuracy test (10 個 sample phrase 嘅 WER)
- Background noise 影響
- Mic permission denied 嘅 fallback UX
- Continuous 5 min 錄音嘅 memory leak

#### 6.1.5 React performance
- 1000 field change 嘅 render time (目標 <16ms / 60fps)
- Step navigation 嘅 re-render scope (應該只 step subtree re-render)
- Theme switch 嘅 re-paint cost (6 themes CSS 全部 inline = paint flash?)

#### 6.1.6 localStorage 容量
- 30 profiles + 50 templates + 20 versions × ~5KB each = ~500KB
- localStorage limit 通常 5-10MB, 邊界測試 (4MB / 8MB)
- 超 limit 嘅 fallback (alert + 建議 export JSON)

#### 6.1.7 Auth gate edge case
- sessionStorage 過期 (tab background 30 min)
- Multiple tab 都 unlock 但 1 個 clear — 其他 tab 點 sync?
- SubtleCrypto unavailable 嘅 fallback (老舊 browser)

#### 6.1.8 Schema migration
- Schema v1 → v2 嘅 import 仍然 work
- Schema v3 (如果將來) 嘅 forward compat
- corrupted JSON 嘅 graceful error

### 6.2 推薦嘅 testing infrastructure

#### 6.2.1 自動化 (CI 環境)
```
- vitest: 191 unit tests (existing)
- Playwright: 4-6 e2e test (e2e/ folder)
  - user-flow.test.js: 開 browser → unlock → 填 form → generate → verify output
  - theme-switch.test.js: 6 themes cycle 無 crash
  - auth-gate.test.js: locked / unlocked / wrong password paths
- visual regression: Chromatic (per-PR 24 theme × 4 tab screenshot diff)
```

#### 6.2.2 手動 (release 前)
```
- 5 個 SEN 老師 user test (1 hour each, with thinking-aloud protocol)
- Cross-browser: Chrome / Firefox / Safari / Edge (latest)
- 3 device: Desktop (1920×1080) / Laptop (1366×768) / Tablet (768×1024)
- 6 themes × 4 tabs × 3 device = 72 visual verify
```

#### 6.2.3 Load test
- 100 concurrent user (GH Pages static — 唔可能真 load test, 但可以 Lighthouse audit)
- Bundle size: keep <700 KB (currently 639 KB)
- FCP / TTI / LCP targets: <2s / <3s / <2.5s (Lighthouse mobile)

### 6.3 監控 (post-launch)

```
- Sentry / Bugsnag: Frontend error tracking
- Plausible / Google Analytics: User flow (anonymized, opt-in)
- Console.error: GH Pages can pipe to custom endpoint (e.g. /api/log)
- localStorage quota warning: detect at 80% full, suggest export
```

---

## 7. 推薦 Roadmap (Q3 2026)

### Phase 1 (2 weeks) — Quick wins
- V1 (Reactor animation reduced-motion fix) — accessibility critical
- V6 (Toggle 48×28) — mobile audit P0 fix
- A1 (Smart field copy) — 50% friction reduction
- V3 (Print stylesheet) — high value, low cost
- A7 (Template recommend) — discoverability boost

### Phase 2 (4 weeks) — AI features
- F1 (Streaming) — biggest UX improvement
- F2 (Multi-variant) — competitive edge
- A2 (AI suggest next field) — cognitive load reduction
- A8 (Score improvement hints) — output quality

### Phase 3 (8 weeks) — Architecture
- App.jsx 1974 → 800 lines (refactor by feature)
- zod validation layer
- F3 (Dyslexia preview)
- A3 (Conflict diff) — foundation for future sync

### Phase 4 (Q4 2026) — Platform
- F4 (Cohort analytics) — high value, high cost
- F6 (Voice) — niche delight
- A5 (Doc parse)
- (Maybe) F5 (Community) — viral, but high maintenance

### Phase 5 (Q1 2027) — Sync + Ecosystem
- A6 (Cloud sync)
- F5 (Community) — if Phase 4 successful

---

## 8. 結論

### Highest leverage features (優先做)
1. **F1 Streaming** (2-3 days) — UX 跳一級
2. **F2 Multi-variant** (1.5 days) — 差異化
3. **V1 Reactor reduced-motion** (0.5 day) — accessibility blocker
4. **A1 Smart copy** (1.5 days) — friction 減半
5. **V6 Toggle 48px** (0.5 day) — mobile audit P0

### Highest risk features (小心做)
1. **F4 Cohort** — 30x AI cost 風險
2. **A6 Cloud sync** — encryption + OAuth + conflict 三重複雜
3. **F5 Community** — moderation / abuse vector

### Architectural debt to address
- **App.jsx monolith** (1974 lines) — 任何新 feature 加上去越來越難
- **冇 zod / yup validation** — 18 fields 靠 manual check, 容易 corrupt state
- **冇 E2E test** — 191 unit tests 但冇覆蓋 user flow
- **冇 visual regression** — 6 themes × 4 tabs = 24 個組合, 每次 refactor 要人手 verify

---

**Author**: Mavis
**Status**: Draft v1
**Next review**: 2 weeks after v3.13.0 (or 2026-07-13)
