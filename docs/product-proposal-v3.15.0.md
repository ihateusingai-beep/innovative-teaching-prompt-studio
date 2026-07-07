# Innovative Teaching Prompt Studio — 產品設計與優化提案 v3.15.0

**版本基準**: v3.14.1 已 ship (Award Certificate 6 styles + hotfix auth-gate scroll reset)
**撰寫日期**: 2026-07-03
**目標受眾**: SEN (Special Educational Needs) 老師 — ADHD / ASD / 讀寫障礙 / 聽障
**使用裝置**: Desktop primary (per user memory); 5-tab layout 已 ship 但 mobile responsive 仍 P1
**前一份提案**: v3.14.0 (見 `product-proposal-v3.14.0.md`)
**Live URL**: https://ihateusingai-beep.github.io/innovative-teaching-prompt-studio/
**Repo**: https://github.com/ihateusingai-beep/innovative-teaching-prompt-studio

---

## 0. v3.14.x 結算 + v3.14.1 hotfix

### 0.1 v3.14.0 GA ✅
- Award Certificate component — 6 styles (🌈 Rainbow / 🏅 Medal / 🌌 Galaxy / 🎨 Art / 🦕 Dino / 🌸 Flower)
- Award Certificate Modal (fullscreen preview + Cmd+P browser print)
- A4 landscape print CSS + 6 styles distinct CSS
- 規則 tab cert sub-section (master + 6-style picker + 6 content sub-toggles + teacherMessage textarea)
- 18 new tests (208 → 226)
- Bundle 657 → 677 KB / gzip 274 → 277 KB
- Commit `797a809`

### 0.2 v3.14.1 hotfix ✅ (auth-gate blank-page regression)
- Root cause: browser scrollRestoration auto-restored stale `scrollY=1211` while React was mounting under `#protected-root[hidden]`
- Fix: `unlock()` now does `history.scrollRestoration='manual' + window.scrollTo(0, 0)`
- Verified via Playwright: post-unlock `scrollY=0`, `protectedHidden=false`, form in-viewport
- Commit `cf357a5`
- 226/226 tests still pass

### 0.3 v3.15.0 起點 — known pain points
- App.jsx **2393 lines** — tech debt 持續長大 (5-tab logic + cert modal + assessment form + 6 themes 全 inline)
- 4 tabs → 5 tabs 後 desktop 1440×621 fit OK, mobile 375×812 tablet check 未做
- CSS bundle 677 KB (gz 277 KB) — close to 700 KB budget
- Reactor theme 永久 `@keyframes reactor-card-pulse` animation — WCAG 2.3.3 reduced-motion guard **missing** (P0 a11y blocker)
- 奬狀 print stylesheet 只 cover landscape A4 — portrait/Chrome vs Safari/Firefox diff testing 缺
- 範本 library 8 個 built-in only — user 唔識 import 自己個樣式
- Schema v3 migration 完整 backward compat, 但「匯入 JSON」對話 UX 簡陋（只 bare textarea + show diff — error UX 弱）

---

## 1. 新功能開發 (New Features)

### F1. **範本編輯器 — 用戶自建範本 (Template Editor)** [P0]

**痛點**: 老師有自己常用嘅 prompt 組合（例如「自閉症社交故事生成器 v3」），但 8 個 built-in 涵蓋唔到。`「💾 將當前設定儲存為範本」` button 而家存在，但 UX 極簡陋（一行 input 寫個名）— 唔可以分類、編輯、預覽、archive。

**方案**:
- 新「📚 我的範本」sub-section 喺 範本庫 tab 內（並排 8 built-in + 用戶自訂）
- 每個 user 範本卡片顯示：name、category badge、最後修改日、使用次數、tags
- 範本 CRUD：create (從當前 formData)、edit (載入去 formData 編輯)、duplicate、delete、archive、tag filter
- LocalStorage key: `TDA_user_templates_v1` (array of {id, name, category, tags[], formData snapshot, createdAt, lastUsed, useCount})
- Export/Import JSON — 用戶可以同同事 share 範本 (base64 encoded)

**Effort**: 4 days (UI + localStorage CRUD + autosave conflict detection + tag filter)

**Edge case**: localStorage 5MB 限 → 超過要 migrate 去 IndexedDB (deferred)

### F2. **班級管理 — Multi-student roster** [P1]

**痛點**: 老師一個 prompt tool 對全班 30 學生，但 Assessment tab 而家只一個 studentName field。30 學生要 import 30 次、generate 30 份 cert。

**方案**:
- 新「👥 班級」tab 或者 inline expansion 喺 Assessment tab
- `classRoster[]` array: [{id, name, senType, notes, assessmentSnapshot}]
- Import CSV / paste spreadsheet (教師助理通常 Excel 用開)
- 一 click 全班「generate all prompts」+ 一 click 全班「列印全部奬狀」
- 學生級別 filter + sort

**Effort**: 5 days (CSV parser + roster UI + bulk-generate orchestration + IndexedDB queue)

### F3. **AI Prompt Quality Analyzer** [P1]

**痛點**: 老師寫 prompt 唔知點解 score 38/100 — QualityScore 而家只 show 一個 number，唔知點改善。

**方案**:
- 喺「生成」tab QualityScore 旁加「🔍 點解咁低?」button
- Click → 展開 4-dimension breakdown (purpose 清晰度 / context 豐富度 / rules 完整性 / accessibility 覆蓋)
- 每個 dim 顯示 sub-score 0-25 + 具體建議 ("未填 context" / "SEN types 只有 1 個")
- 一 click 「📝 一鍵改善」→ 自動填 suggestion fields

**Effort**: 3 days (heuristic engine + breakdown UI + auto-fill)

### F4. **Prompt 變體產生器 — A/B 測試版** [P1]

**痛點**: 老師唔肯定 prompt 寫法邊個 work 好。F2 嘅 multi-variant (3 lengths) 只係長度唔同，唔係 content 唔同。

**方案**:
- 「✨ 生成」tab 加「🎲 產生 3 種寫法」button
- 3 種 tone/approach:
  - 教練式 (socratic, "你覺得呢個情況點算?")
  - 直接指示式 (instructional, "請做 X 然後 Y")
  - 故事式 (narrative, "小熊維尼遇到...")
- 每個 side-by-side card + 「✓ 用呢個」button
- AI 唔需要嘅 variant 自動 fold 走

**Effort**: 4 days (3 Gemini calls × distinct prompts + UI + pick-and-apply)

### F5. **Lesson Plan Auto-Fill from AI** [P2]

**痛點**: 老師見到 AI 出嘅 final HTML output 好，但 reverse-engineer 返 form 唔知點 set 返去。U7 提過，但唔係 AI-driven。

**方案**:
- 「🤖 AI 幫我分析」button 喺「生成」tab
- Paste 任何 prompt text / lesson description → Gemini 反推 → 自動填 formData 所有 fields
- Confidence per field show + user 可 reject 低 confidence

**Effort**: 5 days (Gemini function calling / structured output + confidence UX)

### F6. **Accessibility Audit (内建 WCAG checker)** [P2]

**痛點**: 老師唔識 a11y，但 SEN 學生工具必須 a11y friendly。Mobile audit (v3.11.0) 已經做過 UI 痛點，但無 systematic a11y check。

**方案**:
- 「♿ A11y 報告」panel 喺 設定 tab
- Auto-detect 8 common a11y issues: missing alt / contrast ratio < 4.5 / touch target < 44px / focus missing / keyboard trap / color-only meaning / small text / motion without reduce
- Per issue: WCAG reference + suggested fix + 可一 click auto-apply

**Effort**: 4 days (axe-core integration + report panel + fix suggestions engine)

### F7. **Export to Multiple Formats** [P2]

**痛點**: 老師而家 docx export, 但多咗其他 format 唔識出。

**方案**:
- Markdown (.md) — 適合 paste 到 Notion / HackMD
- HTML self-contained — 適合 email / web publish
- PDF (via html2pdf.js) — 適合 print
- JSON (existing) — 適合 backup
- 一個 dropdown 「📤 匯出為...」+ 4 個 format button

**Effort**: 3 days (markdown serializer + html standalone wrapper + pdf pipeline)

---

## 2. 使用者體驗 (UX) 優化

### U1. **App.jsx 2393 → 4 split files** [P0 — tech debt blocker]

**痛點**: App.jsx 由 v3.10.0 嘅 1988 → 928 → v3.13.0 1974 → v3.14.0 2257 → v3.14.1 2393。Monolithic 結構仲加緊。5-tab 各自 render fn 全部 inline 喺 App.jsx。

**方案**:
- Split strategy:
  ```
  src/App.jsx                    (~250 lines: shell, routing, state init)
  src/tabs/BasicTab.jsx          (~400 lines: 1.1-1.6 fields)
  src/tabs/ContentTab.jsx        (~350 lines: 2.1-2.4 fields)
  src/tabs/RulesTab.jsx          (~450 lines: 3 rules + cert sub-section)
  src/tabs/AssessmentTab.jsx     (~250 lines: assessment form)
  src/tabs/GenerateTab.jsx       (~400 lines: 2 generation paths + variant + quality score)
  ```
- 每個 tab file export default `<XTab formData={...} onChange={...} />`
- Props drilled 經由 useAppState context, 不再 mega-prop-drilling
- Side benefit: 將來 React.lazy() code-splitting per tab → bundle 唔再 all-or-nothing

**Effort**: 3 days (mechanical split + refactor verification + smoke test all 5 tabs render)

### U2. **空狀態 (Empty state) 引導** [P1]

**痛點**: 老師第一次開 — 「生成」tab 完全空白唔知點 set。「Profile Bank」、「Templates」、「Assessment」各 tab empty 時無引導。

**方案**:
- 每個 tab empty state 顯示:
  - 一句鼓勵語
  - 一個 primary CTA (例如「載入範本」「從 CSV 匯入」)
  - 一張 illustration (lucide 圖示 + 簡單 SVG background, NOT 3rd-party assets)
- Reduce 「驚」嘅 first impression — drive usage from empty state

**Effort**: 1 day (per tab design + lucide icon picks)

### U3. **鍵盤 power-user shortcuts** [P1]

**痛點**: 老師熟練後 keyboard navigation 仍要 mouse 點 tabs / buttons。

**方案**:
- `Cmd/Ctrl + 1-5`: switch tabs
- `Cmd/Ctrl + S`: force save (current formData → localStorage `TDA_formData_v3` immediately)
- `Cmd/Ctrl + P`: trigger cert print (when cert modal open)
- `Cmd/Ctrl + K`: command palette (search all toggles / fields)
- `?`: keyboard shortcut help modal
- 全 keyboard navigable (focus rings 強化)

**Effort**: 2 days (event listener registry + command palette UI)

### U4. **Form auto-recovery prompt** [P1]

**痛點**: 老師 browser crash / 忘記 save → 唔知有冇 draft。

**方案**:
- App 啟動時 detect `TDA_AUTOSAVE_V1` 內有 non-default formData
- Modal: 「搵到上次未完成嘅草稿 (3 days ago) — 載入 / 由新開始 / 預覽 diff」
- 預覽 diff show changed fields + timestamp
- 用戶決定後寫入 `TDA_AUTOSAVE_BACKUP_*` 存 safety net

**Effort**: 1.5 days (modal UI + diff display + backup write)

### U5. **Field-level validation inline hint** [P1]

**痛點**: 老師填錯 (例如 `totalQuestions = -5`) 要到 QualityScore 跳低先知。

**方案**:
- 每 field 失焦後即時 validate (range / type / required)
- Inline error message 紅字 + warning icon
- Tab 進度條 0/6 → 1/6 (未通過 validation 不算)
- 「生成」tab 「✨ 生成」button disable until formData 通過 basic schema validation

**Effort**: 2 days (validator utils + inline UI + button gating)

### U6. **Onboarding tour — first-run wizard** [P2]

**痛點**: 老師第一次用 — 5 tabs 完全 free-form，唔知由邊度開始。

**方案**:
- 第一次載入自動 pop 「👋 5 分鐘 tour」
- 4 step: 載入範本 → 編輯 1-2 fields → 切去生成睇 prompt → 列印 cert
- "skip" + "later" + "next" button — tour 唔阻塞
- 完事後 localStorage 記低 `tour_done_v1` — 唔再 pop

**Effort**: 2 days (stepper + sheperd.js 或者 plain React modal — 唔加 3rd-party dep)

### U7. **Undo/Redo UI** [P2]

**痛點**: 老師改錯 5 個 fields 想撤 — 而家只能 Cmd+Z 喺 input 內，唔跨 field。

**方案**:
- 全域 history stack (`useAppState.history` array of formData snapshots)
- `Cmd/Ctrl + Z` / `Cmd/Ctrl + Shift + Z`
- 「↩️ 撤回」「↪️ 重做」button (而家存在但 only basic 不 cross-field)
- Stack max 50 entries (防 memory 爆)

**Effort**: 2 days (useReducer + history middleware + keyboard binding)

---

## 3. 使用者介面 (UI) 設計

### V1. **Reactor Theme 嘅 reduced-motion guard** [P0 — a11y blocker]

**痛點**: Reactor theme 永久 `reactor-card-pulse` animation — WCAG 2.3.3 (Animation from Interactions, AAA) violation. 用戶喺 system setting set `prefers-reduced-motion: reduce` 都仲有 pulse。

**方案**:
- CSS: `@media (prefers-reduced-motion: reduce) { .reactor-card-pulse, .reactor-glow { animation: none !important; } }`
- Toggle 喺 設定 tab: 「🎬 自動跟 system 嘅 reduced-motion setting」(default on)
- 全 themes 通用 — 唔只 reactor

**Effort**: 0.5 day (CSS rule + setting toggle)

### V2. **奬狀 print stylesheet 全瀏覽器覆蓋** [P1]

**痛點**: V2 v3.14.0 只 cover landscape A4 + Cmd+P path。Chrome vs Safari vs Firefox 對 `@page` CSS support 各異。Portrait、Margins、Custom paper size 未測。

**方案**:
- Test matrix: Chrome 90+ / Safari 14+ / Firefox 88+ / Edge 90+ × landscape / portrait × A4 / Letter / A5
- 加 `@page { size: A4 landscape; margin: 0; }` browser-prefix alternatives (`-webkit-`, `-moz-`)
- Print preview button 喺 cert modal — invoke `window.print()` directly + show preview inline

**Effort**: 1.5 days (manual test + edge fixes + print preview component)

### V3. **Tab indicator bar 微動畫** [P2]

**痛點**: 5-tab 切換太 abrupt — 用戶唔知 active tab 切到邊。

**方案**:
- Active tab 下面加 4px animated underline (Framer Motion `layoutId` shared element)
- Hover tab 顯示 preview tooltip (tab 名 + 1-line description)
- Active tab 微微 `scale: 1.05` + 「→」icon 喺尾

**Effort**: 1 day (Framer Motion layoutId + tooltip)

### V4. **空狀態 illustration + onboarding illustration** [P2 — paired with U2 + U6]

**痛點**: 而家 empty 狀態只 text — 視覺空。

**方案**:
- 3-4 個 lucide icon 配單色 SVG background (per 5 tab × 3 state = 15 unique)
- 唔加 3rd-party asset (single-file SPA bundle size)
- 「🎉 完成 5/5 fields」celebration micro-animation (Framer Motion spring scale)

**Effort**: 1.5 days (SVG creation + micro-animations)

### V5. **Form compact mode (1440+ desktop)** [P2]

**痛點**: Desktop 1440×900 default layout 顯示 4-tab single column — 但 1920×1080+ monitor 有大量空間。

**方案**:
- 自動 detect viewport ≥ 1440px → 啟用 2-column layout (form 左 / preview 右)
- 配合 F4 (live preview during edit) 變 sticky right panel
- User toggle 強制 off (「📐 緊湊模式」in 設定)

**Effort**: 2 days (responsive layout + sticky panel + toggle)

### V6. **顏色 token audit — 統一 dark mode contrast** [P2]

**痛點**: 6 themes 入面 contrast ratio 未全部 verify (WCAG AA 4.5:1 for normal text)。

**方案**:
- 跑 axe-core on 每個 theme — 報告 contrast violation per text element
- 修 token 直到 6 themes 全 WCAG AA pass
- 加 `contrast-strict` 設定 toggle (AAA 7:1 mode for visually-impaired SEN students)

**Effort**: 2 days (axe-core test suite + token adjustment + toggle)

### V7. **Frosted glass card refactor (12 inline → 1 primitive)** [P2]

**痛點**: App.jsx 入面 `glass-card` class 出現 12 次 — 將來改 design 要逐個改。

**方案**:
- `<GlassCard>` primitive component 取代 inline className
- Theme-aware variant: `<GlassCard tone="info" | "warn" | "success">`
- Code reusability + consistency

**Effort**: 1 day (refactor — mechanical)

---

## 4. 自動化功能導入 (Automation)

### A1. **Auto-save debounce — 防 rapid keystroke** [P0]

**痛點**: 而家 `useAppState` 每次 formData change 即時 write `localStorage.TDA_AUTOSAVE_V1` — 鍵盤快速打字時每秒寫 5-10 次, 浪費 IO + 可能 race condition。

**方案**:
- Debounce 500ms (`lodash.debounce` 或者 custom hook) — typing pause 後先 write
- 加 `lastSavedAt` indicator badge 顯示「已儲存 X 秒前」(U3 v3.14.0 已有, 但要 refresh 機制)
- Conflict detection: 多 tab open → 2 個 instance 同時 write → 用 BroadcastChannel API sync

**Effort**: 1 day (debounce + BroadcastChannel sync)

### A2. **Quality Score 自動 recompute (live)** [P0]

**痛點**: U3 v3.13.0 ship 嘅 A2 — 已經 plan 但未 ship。而家 score 仲係 manual re-click 才 recompute。

**方案**:
- useMemo hook: formData 改變即時 recompute QualityScore (0 debounce)
- 4-dim sub-scores live update (purpose / context / rules / accessibility)
- 「📊 詳細分析」expand button → show heuristics + suggestion

**Effort**: 2 days (live recompute + heuristic engine already exists in code, just unwired)

### A3. **Schema 自動 migration on import (silent + safe)** [P1]

**痛點**: 用戶 import JSON v1/v2 模板 → 而家直接走 migration，silent 過渡。但 import 失敗時 UX 差：error message 「import failed」不告知哪個 field。

**方案**:
- Migration 加 `try/catch` per field — failed field 跳 warning 而唔 block 其餘 fields
- Import modal 加 diff display (舊 → 新, missing fields 標紅)
- 「↩️ Undo import」button after import (snapshot before-state 到 5 min 內可 undo)

**Effort**: 2 days (per-field migration error UX + undo snapshot)

### A4. **Auto-tag lesson subject from examples keywords** [P2]

**痛點**: A5 v3.14.0 提過但未 ship — 老師填 examples 時無 automatic subject tagging。

**方案**:
- AI-call (gemini-nano or fallback regex keyword match) analyze `formData.examples[]` text
- Auto-suggest 1-3 subject tags + populate `subjectCategory` 預設 value
- User accept/reject

**Effort**: 3 days (regex rule engine + Gemini function-calling fallback + suggestion UI)

### A5. **Bulk Certificate 生成 — 全班列印** [P2]

**痛點**: F2 roster + v3.14.0 cert 嘅 cross-product — 30 學生時一次過生成 30 份 cert + 一個 PDF。

**方案**:
- 喺 F2 roster 加「🎖️ 一鍵生成全班奬狀」button
- Background zip generation (jszip) → 30 individual PDF + 1 combined PDF
- Browser print queue (避免 browser hang)

**Effort**: 4 days (orchestration + ZIP + progress bar)

### A6. **Backup auto-snapshot — 每 24h 自動寫 IndexedDB** [P2]

**痛點**: localStorage 5MB limit + 用戶清 cache → 失去全部設定。

**方案**:
- 每日首次開 app 自動 snapshot formData → IndexedDB (idb-keyval lightweight wrapper)
- 保留 7 個 snapshot (1 week rolling)
- 「📦 7 日備份」button → list + restore

**Effort**: 1.5 days (idb-keyval setup + snapshot/restore UI)

### A7. **Conflict detection — 多 tab 多 instance** [P2]

**痛點**: 老師開 2 個 tab 編輯 → 後寫嘅覆蓋先寫嘅，silent data loss。

**方案**:
- BroadcastChannel API 偵測 peer tab
- 顯示「⚠️ 偵測到另一 tab 編輯中 — 即時同步 / 保留本地 / 放棄」
- 解決 conflict 後寫回

**Effort**: 2.5 days (BroadcastChannel wiring + conflict resolution UX)

### A8. **Auto-mode Gemini prompt 優化** [P2]

**痛點**: 老師用 gemini mode 但 prompt 直接 paste, Gemini 唔一定 follow structure。

**方案**:
- Pre-send hook: 自動 inject Part 1 / Part 2 markers + 末尾 reminder token
- Post-receive hook: parse Gemini output → 自動 fill 「✨ 生成」tab preview pane
- 「🔁 重新生成」button 一 click regenerate with same seed

**Effort**: 4 days (Gemini SDK integration + parser + UI)

---

## 5. 技術風險評估 (Technical Risk Assessment)

| Risk | Likelihood | Impact | Mitigation | Affected Areas |
|---|---|---|---|---|
| **App.jsx refactor regression** (U1) | High | High | (1) split by visual tabs (each ≈ 200-450 lines); (2) exhaustive Playwright smoke test for all 5 tabs render + tab switch + field edit + QualityScore recompute; (3) per-tab test (Vitest + happy-dom); (4) `git revert` ready if regression | U1 |
| **localStorage quota exhaustion** (F1 user templates) | High | Medium | (1) lazy-load templates on demand; (2) auto-migrate to IndexedDB when approaching 4MB; (3) warn user at 3MB | F1, A6 |
| **CDN edge cache lag** (deferred regression) | Certain | Low | Already documented in memory. Pattern: workflow `success` ≠ live URL updated (10-15 min lag NRT edge). User workaround: Cmd+Shift+R | All deploys |
| **GH Pages quota exceeded** (low risk but possible) | Low | High | (1) implement service worker for offline first; (2) consider Cloudflare Pages migration; (3) monitor bandwidth on GH repo insights tab | All deploys |
| **Reactor theme a11y violation** (V1) | Certain | Medium | Single CSS rule `@media (prefers-reduced-motion: reduce)` — straightforward fix | V1 |
| **CSV import parser fragility** (F2) | Medium | Medium | (1) PapaParse library OR custom RFC 4180 parser with quote-escape handling; (2) explicit error per row; (3) preview before apply | F2 |
| **Gemini API rate limit / cost overrun** (F4 + F5 + A8) | Medium | High | (1) debounce + cancel-on-typing; (2) request quota pre-flight check; (3) graceful fallback to local-only mode if quota exceeded; (4) usage telemetry (user opt-in) | F4, F5, A8 |
| **Quality Score heuristic false positives** (A2) | Medium | Medium | (1) keep heuristic transparent (show sub-scores); (2) A/B test heuristic on 50 user templates; (3) opt-out toggle for power users | A2 |
| **IndexedDB schema migration** (F1 + A6) | Low | High | (1) version-tag every store; (2) on open, run migration ladder; (3) fallback to localStorage if IDB unavailable (private mode Safari) | F1, A6 |
| **Multi-tab BroadcastChannel edge case** (A7) | Medium | Medium | (1) feature detect; (2) fallback to no-sync mode if unavailable; (3) explicit "single instance recommended" warning | A7 |
| **Browser Print API differences** (V2) | Medium | Low | (1) cross-browser test matrix (Chrome/Safari/FF/Edge); (2) provide PDF fallback download path | V2 |
| **Bundle size budget breach** (V7 + F1 + F4) | High | Medium | (1) React.lazy() per-tab code split (after U1); (2) lucide-react tree-shaking audit; (3) manual code review before merge | V7, F1, F4 |
| **Single-file SPA dist size** (F1 + F4) | Medium | High | (1) vite-plugin-singlefile gzip already 277 KB; (2) budget 700 KB hard limit; (3) migrate to multi-file if exceeds | All |
| **Onboarding tour noisy** (U6) | Medium | Low | (1) opt-out via localStorage; (2) "Skip" prominently placed; (3) dismissible permanently | U6 |
| **CSS specificity war** (V1 + V2 + V6) | High | Medium | (1) CSS custom properties only (no nested overrides); (2) theme tokens single source of truth; (3) lint rule against nested `body.theme-*` | V1, V2, V6 |
| **Test suite bloat** | Medium | Low | (1) Vitest happy-dom for component tests; (2) Playwright only for smoke; (3) coverage gate 80% but not 100% (skip trivial getters) | All |

---

## 6. Debug & 系統穩定性測試項目

### 6.1 Per-feature 測試矩陣

每個 F/U/V/A 完成後必跑：

| Test | Method | Pass Criteria |
|---|---|---|
| 5 tabs render | Playwright `browser_navigate` + `browser_snapshot` | All 5 tab pills visible, default tab is 「基本」 |
| Tab switch | Playwright click each pill | Active state updates, content swap < 100ms |
| Form edit + persist | Playwright type → reload → verify | Field value persists via `TDA_AUTOSAVE_V1` |
| QualityScore live recompute | Playwright edit 5 fields → wait 100ms | Score updates without manual click |
| Cert modal open + 6 styles | Playwright toggle cert on + click preview | Modal shows, 6 style cards, A4 landscape in print preview |
| Print 6 styles × 4 browsers | Manual + BrowserStack | Cert fits page, no cutoff, text readable |
| Reduced-motion + Reactor theme | Playwright emulate `prefers-reduced-motion: reduce` | No animation observed |
| Schema import v1/v2/v3 | Vitest unit | Backward compat, no data loss |
| Localstorage quota warning | Manual fill 3 MB | Warning modal shows at 3MB threshold |
| IndexedDB migration | Vitest mock IDB | v1 → v2 → v3 schema runs cleanly |
| BroadcastChannel conflict | Playwright open 2 tabs | Conflict modal shows, resolution works |
| CSV import 30 rows | Playwright upload sample.csv | All 30 students parsed, zero error |
| Auto-save debounce | Playwright type 10 chars rapidly | Only 1 save event fires (after 500ms pause) |

### 6.2 性能 / 穩定性 benchmark

- **First Contentful Paint** < 1.5s (3G slow)
- **Time to Interactive** < 3s
- **Bundle gzip** ≤ 350 KB (after F1+F4+U1)
- **Lighthouse Performance** ≥ 90
- **Lighthouse A11y** ≥ 95 (Reactor reduced-motion fix → expect 100)
- **Memory footprint** < 150 MB after 30 min idle (autosave polling check)

### 6.3 跨瀏覽器 matrix

- Chrome 90+ (Win/Mac/Linux)
- Safari 14+ (Mac/iOS)
- Firefox 88+ (Win/Mac/Linux)
- Edge 90+ (Win)

每個 release candidate 必過。Fail → block release。

### 6.4 緊急 rollback protocol

每個 release ship 之前必備：
- `git tag v3.X.Y-final` tag — quick rollback point
- `dist/index.html` 預先 download 到本地 — 萬一 GH Pages 故障可手動 host
- 每個 feature ship 必用獨立 commit (`feat: F3 cert modal` etc.) — `git revert <commit>` 一行 rollback

### 6.5 監控 (post-deploy smoke check)

- GH Pages URL 回 200 (HTTP/2)
- `dist/index.html` 大小唔多過 1 MB
- Version comment string = expected `v3.X.Y`
- 5 個 random sample field edit 後 reload 仍 persist

### 6.6 Security / Privacy audit

- Auth gate (v3.11.0): SHA-256 client-side only — **not real security**, casual gate only (documented in UI)
- Gemini API key (if user opt-in): browser localStorage, never sent to any other server (privacy audit each release)
- formData never leave browser (純 client-side)
- No tracking pixel / analytics by default (opt-in only)

---

## 7. 推薦 Roadmap (Q3-Q4 2026)

### Phase 1 (v3.15.0, 2026-07-15 ~ 2026-07-31, ~16 days)
- V1 (Reactor reduced-motion) — 0.5d (quick win)
- A1 (auto-save debounce) — 1d
- A2 (QualityScore live recompute) — 2d
- U5 (field-level validation) — 2d
- U1 (App.jsx split) — 3d
- F1 (Template Editor — user templates) — 4d
- Total: 12.5 days, 7 features

### Phase 2 (v3.16.0, 2026-08, ~20 days)
- F2 (Class Roster) — 5d
- F3 (Quality Analyzer breakdown) — 3d
- U2 (empty state guide) — 1d
- U4 (form auto-recovery) — 1.5d
- A3 (schema migration safety) — 2d
- V2 (cert print cross-browser) — 1.5d
- V7 (GlassCard primitive) — 1d
- Total: 15 days, 7 features

### Phase 3 (v3.17.0, 2026-09, ~22 days)
- F4 (prompt 變體 A/B) — 4d
- F7 (export multi-format) — 3d
- U3 (keyboard shortcuts) — 2d
- U6 (onboarding tour) — 2d
- V3 (tab indicator micro-anim) — 1d
- A4 (auto-tag keywords) — 3d
- A6 (daily IndexedDB backup) — 1.5d
- Total: 16.5 days, 7 features

### Phase 4 (v3.18.0, 2026-10, ~25 days)
- F5 (Lesson Plan auto-fill AI) — 5d
- F6 (Accessibility Audit built-in) — 4d
- A5 (bulk cert 全班列印) — 4d
- A7 (multi-tab conflict) — 2.5d
- V5 (compact mode 1440+) — 2d
- V6 (color token audit WCAG AA) — 2d
- U7 (Undo/Redo full) — 2d
- Total: 21.5 days, 7 features

### Phase 5 (v3.19.0, 2026-11, ~10 days — buffer)
- A8 (Gemini auto-prompt 優化) — 4d
- V4 (empty state illustrations) — 1.5d
- 預留 buffer 4.5d — unpredicted issues

### 2027 Q1 Planning
- Community sharing (F4 deferred from v3.14.0 proposal) — Cloudflare Workers + R2 backend
- Bulk certificate per class (A6 → generalization)
- Multi-language i18n (zh-Hant / zh-Hans / en)
- Tauri 2 desktop wrapper (existing pattern from Gundam Halo — port over)

---

## 8. 結論

**核心結論**:
1. **Tech debt 係最大 blocker** — U1 (App.jsx split) 必先做，否則 F1/F2/F4 嘅 React state coordination 會失控。
2. **A11y 必 ship** — V1 (Reactor reduced-motion) 0.5d, P0 唔做後續 a11y 改進都冇意義。
3. **Performance + UX 平衡** — Phase 1-2 集中：debounce / QualityScore live / 5-tab render 穩定性。
4. **User feedback loop** — 每個 Phase ship 後 collect 5-user beta feedback, 唔盲目 push roadmap。
5. **Bundle budget** — React.lazy() per-tab 喺 U1 完成後先做, 否則每加 feature 都爆 700 KB。

**Standout 推薦** (用戶最可能即刻感受到 value):
- A1 + A2 (auto-save + live score) — 用戶 30 秒內 feel better
- V1 (Reactor reduced-motion) — accessibility win, brand reputation
- U4 (form auto-recovery) — 防 data loss 救命功能

**最重要嘅唔做**:
- F2 (Class Roster) 唔喺 v3.15.0 做 — scope 太大，5 days 但要拆 3 phases（CSV → roster UI → bulk-generate）
- A8 (Gemini auto-prompt 優化) 唔喺 Phase 1-2 — 需要 Gemini API key + cost overrun 風險
- F5 (Lesson Plan auto-fill AI) 唔喺 v3.15.0 — 5 days 但 ROI 不確定

---

## 附錄 A — 工作量估算摘要

| Phase | Features | Days | Calendar |
|---|---|---|---|
| v3.15.0 | V1, A1, A2, U5, U1, F1 | 12.5 | Jul 15-31 |
| v3.16.0 | F2, F3, U2, U4, A3, V2, V7 | 15 | Aug |
| v3.17.0 | F4, F7, U3, U6, V3, A4, A6 | 16.5 | Sep |
| v3.18.0 | F5, F6, A5, A7, V5, V6, U7 | 21.5 | Oct |
| v3.19.0 | A8, V4, buffer | 10 | Nov |

**Total Q3-Q4 2026**: ~75 days, ~32 features