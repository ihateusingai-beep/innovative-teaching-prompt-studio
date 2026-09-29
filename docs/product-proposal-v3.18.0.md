# Innovative Teaching Prompt Studio — 產品設計與優化提案 (v3.18.0+)

> **狀態**: Proposal draft (2026-07-17)
> **作者**: Mavis / product-strategy
> **目標讀者**: 開發者 (1 個 Mac-only user; PM-style 提案 + 實作 spec 合一)
> **基線版本**: v3.17.0 ship 咗 (commit `944f10d` + `e4039224` + pending 1+2 hotfix)
> **上一份 proposal**: `docs/product-proposal-v3.17.0.md` (歷史文件,v3.17.0 嘅 spec 已落地)

---

## 0. 摘要 (TL;DR)

v3.17.0 收咗底:1.1 Auto-Fill + askConfirm drift cleanup + 6.1 click-coverage smoke test。下一份 sprint 嘅 3 個重點:

| 優先 | Item | Effort | 解決乜 |
|---|---|---|---|
| **P0** | Bundle trim (framer-motion selective import) | 0.5d | 解決 722 kB 超 700 kB budget 嘅 GH Pages 慢 load |
| **P0** | Import-linter (ESLint custom rule) | 0.5d | 預防 b701ac5 嗰個 getSuggestions P0 重演 (conditional JSX 隱藏嘅 ReferenceError) |
| **P0** | 1.2 Smart Field Auto-Complete | 1.5d | 解決「諗要點寫 context / purpose」嘅 cognitive load |

**長期投資(1 個月 arc)**: Design System docs (3.1, 4d) — 1.3 Cohort View + 3.2 Header redesign 嘅 prerequisite。

**避坑清單** (per 6.1 senior review 教訓): silent-skip test guards 改 hard-fail expect 1.1.1 hotfix ship 緊(commit 熱修中)。

---

## 1. v3.17.0 Sprint 結算 (audit)

| Item | Status | Commit |
|---|---|---|
| **1.1 Auto-Fill from Default Profile** (1.5d) | ✅ Shipped | `944f10d` |
| **drift cleanup (askConfirm flow + 5 個 dead-code removal)** (1.5d) | ✅ Shipped | `944f10d` |
| **hidden P0 fix (getSuggestions import)** (0.25d) | ✅ Shipped | `944f10d` |
| **6.1 click-coverage smoke test** (1d) | ✅ Shipped (e4039224) + Bug 1+2 hotfix 準備中 | pending push |
| **1.2 Smart Field Auto-Complete** (1.5d) | ⏳ Deferred | — |
| **2.1 Empty State Library** (0.5d) | ⏳ Deferred | — |
| **4.1 Auto-Save Recovery (beforeunload + crash detection)** (0.5d) | ⏳ Deferred | — |
| **2.3 Save Badge 即時性** (0.25d) | ⏳ Deferred | — |
| **Bundle trim** (1d) | ⏳ Deferred (URGENT — 722 kB > 700 kB) | — |
| **VersionPanel + ProfileBankPanel alert() drift** (1d) | ⏳ Deferred | — |

**Net ship count**: 3 features (1.1 + askConfirm + 6.1) + 1 P0 fix + 11 dead code removals + 11 unit tests added → total 16 atomic improvements。

---

## 2. v3.18.0 新功能 (New Features)

### 2.1 [P0] Bundle trim (0.5d, 真正 emergency)

**現狀**: 722 kB / gzip 291 kB,**超 700 kB budget 22 kB**。已 ship 4 個 sprint 冇 trim,情況越嚟越差。

**Quick win path (唔改架構)**:
- framer-motion 換 react-spring 或自己寫 CSS transition (節省 ~30 kB)
- 6 個 lucide-react icons 唔再 import `import * from 'lucide-react'` 而係 named import (tree-shake 改善)
- moment.js / lodash 替代品 audit (如果有)

**Architectural path (1d 額外)**: Multi-file build 拆 dynamic imports, 變 4-5 個 chunk,initial load 只係核心 + tab。

**建議**: Quick win 先,architectural 留 v3.19.0 + 1-2 sprint buffer。Quick win 0.5d 即時減 25-30 kB,返 budget 之下。

**Risk**: Quick win low risk (replace framer-motion with react-spring = drop-in API, motion semantics 1:1)。Architectural path high risk (multi-file 改 GH Pages deploy 流程,需要 verify)。

---

### 2.2 [P0] Import-linter: ESLint custom rule (0.5d)

**痛點**: 6.1 senior review 嘅 root cause 都係 b701ac5 嗰個 missing `getSuggestions` import。Conditional JSX (`activeSuggestionField !== null`) 將個 ReferenceError 隱藏咗 5 個 sprint。

**提案**: 自家 ESLint rule `no-unused-imports-in-conditional-jsx`:
- 掃 source code,detect: 「import A 喺 conditional JSX (inside `if (...)` or ternary) 嘅 3+ 個位用,但 conditional 係 false 嗰陣冚其他 path 都會用到」 → 警告
- 換句話:如果 import 喺 conditional JSX 用,該 conditional 嘅 0/1 branch 都要用得返
- 違反嘅話 fail lint 喺 CI 上

**Why this is cheap (0.5d)**: ESLint AST 已經識 traverse JSX + 識 detect conditional,`no-unused-vars` rule 已經有 framework。

**Bonus**: 包埋 `prefer-default-import-on-condition` (叫 AI 寫呢啲) → 預防 P0 系 80%。

**Risk**: ESLint rule 寫錯會 false-positive 太敏感。Mitigation: 頭 2 個 sprint opt-in 模式(只 warn),3rd sprint 升 hard fail。

---

### 2.3 [P0] 1.2 Smart Field Auto-Complete (1.5d) — carry-over from v3.17.0

**痛點**: 老師望住個 form (14 個 field),要諗「呢個學生適合咩 SEN type」「點樣寫個生活情境」→ 諗 30 秒,填 10 秒。

**提案** (per v3.17.0 proposal §1.2):
- 每個 select / textarea 旁加 ✨ 建議 button
- Heuristic 規則 (senTypeOptions 已有 12 條 desc) generate 3 個 suggestions
- 對 `purpose` / `context` 等 free text: 用 Gemini Flash Lite 生成 3 個 candidate (可選 opt-in)
- 用戶揀 1 個就 apply

**為何 carry-over 而非 P0 急 ship**:
- 1.1 (Auto-Fill from Default Profile) 已解決 60% 嘅「重複填表」痛點
- 1.2 解決「個別 field 諗嘢」嘅 cognitive load,但需要先有 user feedback 驗 1.1 嘅 ux 啱唔啱用
- Live verify 1.1 兩日 → 收集 feedback → spec 1.2 對齊實況

**建議**: v3.18.0 Sprint 1 (5-7 day 暖身期 1.1 + 1.2) 唔好急。Sprint 2-3 先開。

**Risk**: 1.5d 估算可能要 2d(heuristic 比想像中多 edge case)。Flash Lite 引入 cost/UX trade-off 需 user explicit 批准。

---

### 2.4 [P1] 1.3 Cohort Comparison View (1.5d) — carry-over

**痛點**: 30 學生 × 3 metric 嘅 cohort view 冇 → 老師唔知「全班邊度最需要改善」。

**提案** (per v3.17.0 proposal §1.3):
- Assessment tab 加 sub-tab: 「單個學生」/「全班 (Cohort)」
- Cohort view: 強項 matrix + class trend line chart + 需關注名單
- Pure SVG (冇 chart library)

**v3.18.0 優先**: P1 推到 Sprint 3 (老師 dashboard 嘅核心 component)。

---

### 2.5 [P1] 1.4 Prompt Version Compare + Diff (1.0d) — carry-over

**提案** (per v3.17.0 proposal §1.4): split-view 兩 column + highlight 唔同 line + quick restore button。

**Status**: DiffView component 已經喺度(單 column inline),今次只係 UI 包裝,P1 simple。

---

### 2.6 [P1] 1.5 Batch Print Multiple Certs (1.0d) — carry-over

**提案** (per v3.17.0 proposal §1.5): 2×3 grid 嘅 cert 顯示 + `window.print()` + CSS `@page`。

**Status**: MVP ship 過 (RosterPanel 「全部列印奬狀」button),但係手動 click-then-print。今次 fully automated batch。

---

### 2.7 [P1] 1.6 Class Roster CSV Import (0.5d) — carry-over

**痛點**: 30 個學生要逐個 click 新增 = 5 min。CSV 10 秒就 paste 到。

**提案** (per v3.17.0 proposal §1.6): RosterPanel 加「📥 匯入 CSV」button,parse `name,senType,notes`,line-by-line error 報告。

**Status**: pure parser, unit test 容易。Low risk + quick win。

---

### 2.8 [P1] Test architecture: per-route coverage (1.0d, 新提案)

**Learnings from 6.1**: 而家嘅 smoke-click-coverage 用 1 bundle load + 5 tabs via clicks,涵蓋 ~80% 按鈕。但係:
- 重 module (e.g. ProfileBankPanel) 嘅 modal mount 內 button 點唔到
- 認証流程之後嘅 (auth-gate form submit 嗰陣) button coverage 係 0
- 動態載入嘅 cert modal / preview panel 內部 button 喺 scope 之外

**提案** (新):
- 將 6.1 拆做 N 個 narrow test: 1 個 per route / per modal
- Test 1: 認証 form (auth-gate input + submit, 密碼錯 + 對 path)
- Test 2: Profile Bank 完整 flow (GATE → unlock → list → add → edit → delete → apply)
- Test 3: Cert modal 完整 flow (open → 6 styles cycle → 印 preview)
- Test 4: Version Panel 完整 flow (open → list → save → diff view → restore)

**Total**: +4 tests × ~0.25d each = 1.0d 增量。Coverage 由 80% → 95%。

**Risk**: 多 test file 維護成本,但每個 file 細 + 專注一個 module,容易理解。

---

### 2.9 [P2] 1.7 AI-Generated Template Library (3.0d) — carry-over

**v3.17.0 proposal §1.7 留 P2**,LLM-generated template 質量風險高,留 v3.19.0+ 配合 cohort view 一齊 ship。

---

## 3. UX 優化

### 3.1 [P1] 2.4 Tab Completion Progress Bar (0.5d) — carry-over

**痛點**: 5 tab badge `N/M` 顯示個別 tab 完成度,但冇整體進度。

**提案**: header 加 1 條 horizontal progress bar,顯示 5 個 tab 嘅 average completion,click 跳去 first incomplete tab。

---

### 3.2 [P1] 2.5 Assessment Form Auto-Save Indicator (0.25d) — carry-over

**提案**: 每個 field 離開 focus 顯示 ✓ saved / ● unsaved。

---

### 3.3 [P1] 2.6 Keyboard Shortcut Cheatsheet (0.5d) — carry-over

**提案**: Cmd/Ctrl+1-5 切 tab + Cmd+S 存 + ? 顯示 cheatsheet modal。

**Trade-off**: 新用戶唔識,power user 必備。Cheatsheet modal on `?` 解決 discoverability。

---

### 3.4 [P0] 6.1 silent-skip hotfix (0.25d, follow-up)

**Per 6.1 senior review Bug 3**: test 1 用 `if (contentTab) { ... }` silent-skip guard。Re-run 嘅 hotfix 揾 1+2 但 defer 3。

**Now ship 3**:
- Replace guards with `expect(contentTab).toBeTruthy()` + `expect(contentAiButtons.length).toBeGreaterThan(0)`
- Prevents false-pass on slow CI runners
- 同 hotfix 1+2 一齊出

---

## 4. UI 重新設計

### 4.1 [P0] 3.1 Design System 文檔 (4.0d) — 1 個月 long-arc

**Status**: v3.17.0 proposal 留 P0 但未 ship。今日先正式 call 一次:

**Why now**:
- v3.18.0 ships Cohort View + Header redesign + 5 small UI updates (per v3.17.0 proposal §3.1-3.3)
- 冇 SSOT → 6 theme 嘅 ternary chain 散落 16+ file,改色要逐個搵
- 1 個月後回看 code,新 developer 會迷失

**Deliverable** (`docs/design-system.md`):
- 6 theme × 5 category color palette (visual + token)
- 5 級 font scale + line-height
- Spacing scale (token-1 to token-12, 已有要 lock)
- 5 button / 4 card / 3 modal pattern
- 4 motion tier (with reduced-motion override)
- Icon set: lucide-react sub-set audit
- Component usage examples

**Bonus**: Design system enforcement (lint rule 禁止 inline color, 必須用 token)。

**Effort 4.0d 但分階段 ship**:
- Phase 1 (1d): color + spacing + font scale → quick value
- Phase 2 (1d): component pattern
- Phase 3 (1d): motion + icon + audit
- Phase 4 (1d): 6 theme × 5 category visual + 6 theme SSOT refactor

**Risk**: 6 theme visual drift 風險高(screenshot 5 個代表 screen × 6 theme = 30 screenshot diff)。Mitigation: 用 Playwright screenshot diff per PR。

---

## 5. 自動化

### 5.1 [P1] 4.1 Auto-Save Recovery 改善 (0.5d) — carry-over

**Status**: 仲係 10s recovery snackbar,beforeunload 未處理。

**提案** (per v3.17.0 proposal §4.1):
- `beforeunload` event → 強制 flush pending autosave
- sessionStorage marker → crash detection,下次 reload 自動跳 recovery (唔等用戶 click)

---

### 5.2 [P1] 4.2 Auto-Categorize Examples (1.0d) — carry-over

**提案**: ✨ button 喺每條 example,heuristic detect level (數字 = 中高階) + mechanism (「哪個」 = 3選1)。

---

### 5.3 [P1] 4.3 Smart Default for Personal Values (0.5d) — carry-over

**提案**: category = 情緒支援 → 自動 tick 仁愛 + 同理心。

---

### 5.4 [P1] 4.4 Auto-Detect Missing Required Field (0.5d) — carry-over

**提案**: real-time validation,tab badge 變紅,click 跳去 first missing field。

---

## 6. 技術風險評估

### 6.1 高風險 (需要 senior review 先 ship)

| 風險 | 影響 | 緩解 |
|---|---|---|
| **Bundle trim 嘅 architectural path** (multi-file build) | 改 GH Pages deploy 流程,可能 break CDN cache 行為 | Quick win 先;architectural 獨立 sprint 跑 + Playwright 端到端 verify |
| **Design System 6-theme SSOT refactor** | Visual regression 風險(6 theme × 5 screen = 30 個 visual diff) | Per-PR screenshot diff + manual verify 5 代表 screen × 6 theme |
| **Import-linter false-positive** | ESLint rule 寫錯敏感度,警鐘太噪 | Phase 1 opt-in warn only;3 sprints 數據後升 hard fail |
| **Test architecture per-route coverage (2.8)** | 1 個大 test file 拆 5 個細嘅,維護成本上升 | 細 test 隔離清楚 + helper 共享 |

### 6.2 中風險

| 風險 | 影響 | 緩解 |
|---|---|---|
| **v3.17.0 6.1 test 嘅 silent-skip** (deferred Bug 3) | Slow CI runner 嗰陣 false-pass | 2.3 hotfix ship |
| **framer-motion 換 react-spring** | Motion semantic 可能唔 1:1 (e.g. layoutAnimation) | Visual diff 30 個 screen + 6 theme |
| **ProfileBankPanel / VersionPanel alert() drift** 仲未清 | 8 個 alert/confirm callsite 仲有 blocking dialog | Add 2 sprint follow-up,推 pushWarning pattern |
| **Live verify 1.1 嘅真實 feedback 未收** | 1.2 spec 可能對唔齊用戶實際 flow | 2 個 sprint 暖身期 + 收集 UX 數據 |

### 6.3 低風險 (但要 monitor)

- 1.7 AI-Generated Template Library 嘅 LLM quality drift
- 6 個 sprint 累積嘅 .bak / .DS_Store 重新出現 (今 sprint 已清 9 個)
- 1 個 sprint 累積嘅 722 → 700 kB 嘅 bundle budget 違規 (今 sprint trim 修)

---

## 7. Debug + 穩定性測試清單

### 7.1 每個 sprint 必做 (gating CI)

- [ ] `npm test` 全 425+ unit tests pass
- [ ] `npm run test:smoke` 11/11 pass (smoke-build 8 + click-coverage 3)
- [ ] **NEW: Import-linter 0 violations** (after Phase 2 升 hard fail)
- [ ] **NEW: Bundle size budget ≤ 700 kB** (after v3.18.0 trim)
- [ ] `git status --short` clean
- [ ] 6 theme × 5 screen = 30 screenshot diff (per PR)

### 7.2 Per-sprint manual / Playwright

- [ ] **NEW: Per-route Playwright spot-check** (5 min): 開 browser → auth → 5 tab 各自 click 每個 main button → verify 冇 console error
- [ ] 印 1 個 cert PDF,verify 6 styles 都 render OK (per style = 1 print, ~5 min)
- [ ] Mobile responsive check (iPhone 12 375×812): 5 個 tab scroll + touch target ≥ 44px
- [ ] 還原測試: import 一個 corrupt JSON, ImportDiffModal 顯示 errors 而唔 crash
- [ ] Cold start recovery: 填 5 分鐘 → reload → 看到 recovery snackbar → click 載入 → 完整還原

### 7.3 Production 監控 (continuous)

- [ ] GH Actions 嘅 `unit-test.log` artifact 保留 7 日
- [ ] GH Pages cache monitor: 改完 push 5-15 分鐘後落地, 唔可以即時 verify
- [ ] **NEW: Click coverage %** metric: smoke test 點擊咗幾多 button / app 總共有幾多 button。Target ≥ 80%。

### 7.4 v3.18.0 新增 (per §2.8 Test architecture)

- [ ] **NEW: Auth-gate form test** (1d, 新檔): 密碼對 + 錯 path, sessionStorage set / clear
- [ ] **NEW: Profile Bank full-flow test** (1d): GATE → setup → unlock → add → edit → delete → apply
- [ ] **NEW: Cert modal test** (0.5d): 6 styles cycle + print preview mockup
- [ ] **NEW: Version Panel test** (0.5d): save → diff view → restore round-trip

---

## 8. 路線圖 (3 sprints, ~21d)

### v3.18.0 (本月, ~7d)

1. **2.4 6.1 silent-skip hotfix** (0.25d) — Bug 3 ship, 同 1+2 hotfix 一齊出 → 預防 slow CI false-pass
2. **2.1 Bundle trim (quick win)** (0.5d) — 0.5d 即時減 25-30 kB, 返 budget
3. **2.2 Import-linter** (0.5d) — 預防未來 conditional JSX 隱藏嘅 P0 重演
4. **2.7 CSV Import** (0.5d) — quick win,低風險
5. **1.2 Smart Field Auto-Complete** (1.5d) — carry-over P0, after 1.1 live verify 2 day
6. **2.8 Test architecture: per-route** (1.0d) — 4 new test files
7. **4.1 Auto-Save Recovery 改善** (0.5d) — quick UX win
8. **5.3 Smart Default Values** (0.5d) — small ux win

**Sprint 1 total**: ~5.25d. Sprint 2-3 留 buffer + 1.3 / 1.4 / 1.5 follow-ups。

### v3.18.1 (~10d, 1 個月後)

1. **3.1 Design System docs** (4.0d) — long-arc investment
2. **1.3 Cohort Comparison View** (1.5d) — 為 dashboard 鋪路
3. **1.4 Prompt Version Compare** (1.0d) — small UI wrap
4. **1.5 Batch Print Multiple Certs** (1.0d) — 自動化
5. **3.2 Header redesign** (1.0d) — 6 theme clean
6. **2.3-2.4 UX 小改** (0.5d)

### v3.19.0 (~2 個月後, 8d)

1. **1.7 AI-Generated Template Library** (3.0d) — P2 high-leverage
2. **Bundle trim architectural path** (1.5d) — multi-file build + dynamic imports
3. **5.2 Auto-Categorize Examples** (1.0d)
4. **5.4 Auto-Detect Missing Required** (0.5d)
5. **2.6 Keyboard Shortcut Cheatsheet** (0.5d)
6. **a11y axe-core integration** (0.5d) — 防 WCAG violation
7. **IndexedDB fallback** (1.0d) — 解決 localStorage quota 風險

---

## 9. KPI 指標

| Metric | v3.17.0 | v3.18.0 target | v3.19.0 target |
|---|---|---|---|
| **Bundle size** | 722 kB | <700 kB | <650 kB (architectural trim) |
| **Smoke test 數** | 11 (8 + 3) | 11 + 4 (per-route) = 15 | 15 + a11y = 16+ |
| **Click coverage %** (smoke / total) | ~80% (估算) | ≥85% | ≥90% |
| **Unit test count** | 419 | 430+ | 460+ |
| **Conditional-JSX latent P0** (估算) | 1 (getSuggestions) | 0 (import-linter 預防) | 0 |
| **填表完成時間** (P50) | 8 min | 5 min (1.1 + 1.2) | 3 min |
| **首次填表流失率** (用戶開咗 form 但 5 分鐘內冚野都唔填) | 估算 30-40% | <20% | <10% |
| **localStorage quota hit** | 0 (用戶投訴) | 0 | 0 (IndexedDB fallback ready) |

---

## 10. 開放問題 (需要 user 決定)

1. **Bundle trim 策略**: framer-motion → react-spring (quick, 0.5d) vs multi-file build (architectural, 1.5d)? 影響 v3.18.0 嘅 budget
2. **Import-linter Phase 1 模式**: opt-in warn only 2 sprints,定 hard fail 第 1 個 sprint?
3. **1.2 (Smart Auto-Complete) 嘅 Gemini Flash Lite 引入**: 用戶自帶 key 但要唔要 quota dashboard? (v3.17.0 proposal 問過,未答)
4. **PII compliance** (HK PDPO): 學生姓名 / 評估 localStorage 儲存, 而家完全冇 disclaimer, accept 風險定加 explicit consent modal?
5. **3.1 Design System 文檔 effort 4d 太大**: 拆做 4 個 phase, 每 phase 1 sprint, 期間 6 theme drift 風險高, 接受嗎?
6. **6.1 Bug 3 嘅 hotfix 1.1.1**: 等 1+2 hotfix 一齊出,定分開 2 個 commit?

---

**STATUS: DRAFT — 等待 user review。Sprint 1 揀邊 5 個 item 開工 → 開始 pre-flight recon。**
