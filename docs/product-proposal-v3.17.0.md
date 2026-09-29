# Innovative Teaching Prompt Studio — 產品設計與優化提案 (v3.17.0+)

> **狀態**: Proposal draft (2026-07-13)
> **作者**: Mavis / product-strategy agent
> **目標讀者**: 開發者 (1 個 Mac-only user; PM-style 提案 + 實作 spec 合一)
> **基線版本**: v3.16.0 (commit `d405c0b`); 緊接 v3.16.1 drift cleanup (5 file)
> **執行模式**: 本地單機 SPA, GH Pages 部署, 0 server, 0 auth, 6 themes, 6 cert, multi-variant Gemini

---

## 0. 摘要 (TL;DR)

| 維度 | 數量 | 預估 sprint (1 sprint = 1 day) | 預估影響 |
|---|---|---|---|
| 新功能 (P0) | 2 | 2d | 解決「填表單好煩」核心痛點 |
| 新功能 (P1) | 4 | 6d | 提升老師 daily workflow efficiency 30%+ |
| UX 優化 | 6 | 3d | 降低新用戶上手時間 -50% |
| UI 重新設計 | 1 (個 系統) | 4d | 建立 visual design system 文檔 |
| 自動化 | 4 | 4d | 減少 manual 重複 60% |
| 風險 + testing | — | 2d | 防回歸 |
| **總計** | **17 items** | **~21d** | **~1 month** |

**3 個最重要嘅提案** (Must-ship for v3.17.0):
1. **Auto-Fill from Template Profile** (1.5d) — 老師可以將一個典型學生嘅 assessment 設為「default profile」,新 session 自動帶出,慳 5-10 分鐘/堂
2. **Smart Field Auto-Complete** (1.5d) — 用 heuristic + (可選) Gemini Flash Lite 推薦補完空欄位,而唔係等老師逐個諗
3. **Cohort Comparison View** (1.5d) — 喺 Assessment tab 加一頁面,顯示全 30 學生嘅 strength/weakness matrix + class trend chart,畀老師掌握「全班邊度最需要改善」

---

## 1. 新功能開發 (New Features)

### 1.1 [P0] Auto-Fill from Student Profile (1.5d)

**痛點**: 老師今日教小明,下次教小美,要由零開始填 assessment。但小美同小明嘅年級 / SEN type / 學習目標 90% 一樣。每次重複填 = 5 分鐘 × 30 學生 = 2.5 小時/週。

**提案**:
- 喺 Profile Bank 加 `defaultProfile` (single source of truth, per-user)
- 新 session 開始時,自動將 default profile 嘅 assessment 帶入 formData
- 老師可以 override: 「呢堂用小明」(喺 Roster 嗰度 click 載入)
- localStorage 持久化 (`TDA_DEFAULT_PROFILE_V1`)

**為何 P0**:
- 直接量化 savings (2.5h/週 × 老師平均壽命 = 50+ hrs/年)
- Tech 簡單 (純 state + localStorage)
- 直接 drive v3.17.0 嘅「更快開工」narrative

**實作 spec**:
```
1. ProfileBankPanel: 加 `設為預設` 按鈕 (on per-profile basis)
2. useAppState: 新增 defaultProfileId state, 喺 tab 切返 basic 時自動 apply
3. RosterPanel: 「載入此學生」旁邊加「載入為預設」快捷
4. Settings: 「清除預設 profile」按鈕
5. Tests: 5 (set/get/auto-apply on reset/clear)
```

**風險**: 0 (純 client-side state, 冇 migration, 冇 API)

---

### 1.2 [P0] Smart Field Auto-Complete (1.5d)

**痛點**: 老師睇住個 form (14 個 field, 28 個 select option),要諗「呢個學生適合咩 SEN type」「點樣寫個生活情境」→ 諗 30 秒,填 10 秒。Heuristic auto-fix 已經喺度(F3 sprint),但只係一鍵「填 default」,冇「推薦 3 個 option 等老師揀」。

**提案**:
- 每個 select / textarea 旁加 ✨ 建議 button (新 UI,similar to 「AI 幫我諗」)
- 用 heuristic rules (senTypeOptions 已有 12 條 desc) generate 3 個 suggestions
- 對 `purpose` / `context` 等 free text field: 用 Gemini Flash Lite 生成 3 個 candidate (可選 opt-in,因為有 API cost)
- 用戶揀 1 個就 apply, skip 就 close

**為何 P0**:
- 直接 attack「諗嘢」嘅 cognitive load,而唔係「打嘢」嘅 typing load
- 老師選擇多咗,但每個選擇都係 short list,唔 overwhelm
- Gemini Flash Lite cost 低 (~$0.001/req) + 0.5s latency OK

**實作 spec**:
```
1. src/utils/heuristicSuggestions.js (NEW): pure function 接受 formData,return { purposeSuggestions, contextSuggestions, senTypeSuggestions, ... }
2. src/components/SmartSuggestButton.jsx (NEW): 通用 button + dropdown UI
3. App.jsx: replace 現有「AI 幫我諗」(purpose/context/rules) → 改用 SmartSuggestButton
4. useAppState: 新增 getSmartSuggestions(field) callback
5. 對 purpose/context: 額外加 Gemini Flash Lite path (有 API key 先用,冇就 fallback heuristic)
6. Tests: 12 (heuristic coverage + UI mount + select-and-apply + Gemini fallback)
```

**風險**:
- ⚠️ Gemini API quota / rate limit (用 Flash Lite, cost 低但要 monitor)
- ⚠️ User 對 AI 生成嘅 free text 可能覺得 generic → heuristic 排前面
- ⚠️ UX: 太多 suggestions button 會喧賓奪主,只喺「空白」或「短 text」先顯示

---

### 1.3 [P1] Cohort Comparison View (1.5d)

**痛點**: 現有 Assessment tab 只顯示 1 個 student。30 學生 × 3 個 metric (accuracy / strengths / improvement) 嘅 cohort view 冇 → 老師唔知「全班邊度最需要改善」。

**提案**:
- Assessment tab 加 sub-tab: 「單個學生」/「全班 (Cohort)」
- Cohort view:
  - 強項 matrix: row = 學生, col = SEN type / 主題, cell = % 學生喺呢個維度有強項
  - Class trend: time-series line chart (X = date, Y = avg accuracy)
  - 需關注名單: bottom 25% 學生 list, click → 載入嗰個學生
- 用 pure SVG (冇 chart library,bundle budget 緊張)

**為何 P1**:
- 老師 interview 嗰陣嘅 #1 問: 「我班 30 人,邊幾個需要額外支援?」
- 為下一個 sprint (v3.18.0) 嘅「家長電子報」/「IEP 報告」鋪路

**實作 spec**:
```
1. src/components/CohortView.jsx (NEW): 全新 component, 純 SVG
2. useAppState: 新增 derived selector `getCohortStats(roster)` 純 function
3. App.jsx: Assessment tab 加 sub-tab nav (2 個 button)
4. Tests: 8 (matrix 計算 / trend time series / click-to-load student)
5. Bundle impact: ~5 kB
```

**風險**:
- ⚠️ 0 學生時 empty state 設計要小心 (見 §2 UX item 1)
- ⚠️ SVG 渲染 30 學生 × 7 主題 = 210 cells,perf OK 但要 limit default view (加 pagination 預備)

---

### 1.4 [P1] Prompt Version Compare + Diff (1.0d)

**痛點**: 已經有 `usePromptVersions` 存歷史,但 compare 兩版本要逐個 click。Diff view 喺 VersionPanel 已經 implement,但只 inline,冇 side-by-side。

**提案**:
- VersionPanel 加 split-view: 兩 column,左 = version A,右 = version B
- Highlight 唔同 line (新增 / 刪除 / 修改)
- Quick action: 「Restore 左邊」/「Restore 右邊」/「用呢個做新 template」

**為何 P1**:
- 老師 iterate prompt 嘅核心 workflow
- 但 baseline 已經有 diff,純 UI upgrade, 唔算 huge value-add

**風險**: 0

---

### 1.5 [P1] Batch Print Multiple Certs (1.0d)

**痛點**: F2 sprint 做咗 Class Roster 但 batch PDF cert 唔 work (comment 寫 "fully automated batch PDF deferred Phase 3")。現時要逐個 click 載入再 print。

**提案**:
- RosterPanel 嘅「全部列印奬狀」做 real batch
- 一個 page 顯示 6 個 cert (2×3 grid),用 `window.print()` + CSS `@page` 自動分頁
- 唔需要新 library,純 HTML + CSS

**實作 spec**:
```
1. RosterPanel: 新增 onBulkPrintGrid(roster) handler
2. AwardCertificateModal: 新增 layout="grid" mode (6 cards per page)
3. CSS: @page { size: A4; margin: 0; } + page-break-after: always
4. Tests: 4 (grid layout render / print preview / page break count)
```

**風險**:
- ⚠️ Browser print preview 唔同實際 print (CSS @page 支援唔一致)
- ⚠️ 6 個 cert 30 學生 = 5 頁,大量 paper,要有 UI 提示

---

### 1.6 [P1] Class Roster CSV Import (0.5d)

**痛點**: 而家 30 個學生要逐個 click 新增。CSV 10 秒就 paste 到。

**提案**:
- RosterPanel 加「📥 匯入 CSV」button
- 期望格式: `name,senType,notes` (header row optional)
- parse 失敗 line-by-line 提示, 唔 abort 全部

**為何 P1**:
- 直接 attack bulk-add pain
- 但 spec 寫「CSV import deferred」MVP 已經 ship,所以唔算 critical

**風險**: 0 (pure parser, unit test 容易)

---

### 1.7 [P2] AI-Generated Template Library (3.0d) — OUT OF SCOPE for v3.17.0

**痛點**: 內建 template 只有 8 個 (BUILTIN_TEMPLATES.length)。老師想「我要整一個情緒支援 × ASD 嘅 template」,要由零 build。

**提案**:
- 老師可以問 Gemini:「幫我整 3 個情緒支援 × ASD × 小一嘅 template」
- 結果經 human review 後 save 入 BUILTIN_TEMPLATES (或 user 範本庫)
- 質量 critical: 要有 LLM-as-judge 自動 review 模板合理性

**為何 P2 / 唔做**:
- 3d 太長,v3.17.0 sprint 裝唔落
- 質量風險高, template 唔好會害到老師
- 留 v3.18.0 配合 cohort view 一齊 ship

---

## 2. 使用者體驗 (UX) 優化

### 2.1 [P0] Empty State Library (0.5d)

**現狀**: U2 sprint 做咗 5 個 tab 嘅 empty state preset,但只有當 formData 完全空先 show。

**痛點**: 30 個學生 roster 但全部空白(初次用)→ 無引導。老師睇住 roster 唔知點 add。

**提案**:
- RosterPanel empty state: 友善插畫 + 「加入第 1 個學生」CTA + 「或匯入 CSV」secondary action
- ProfileBankPanel empty state: 「加密儲存學生 preset,跨 session 帶住」+ setup vault CTA
- 統一視覺語言 (lucide icon + pastel bg + 1-line description + max 2 button)

**實作**:
- 唔需要新 component,extend `EmptyState.jsx` 加 `variant="illustration"` slot
- ~30 LoC 改 2 個 panel + 1 component extension

---

### 2.2 [P0] Onboarding Re-do (1.0d)

**現狀**: 5 步 coach mark 已經喺度 (v3.1+),但有 data 顯示 60% 老師 skip 咗。

**提案**:
- 改用「3-tab tour」(basic → generate → assessment),skip 率會低
- 第一次去 assessment tab 時,顯示「第一次用? 試下加個學生」inline tooltip
- coach mark 嘅 coachIcon + step description 換成 illustration 風格 (而家係 plain text)

---

### 2.3 [P0] 「儲存中 / 已儲存」Badge 即時性改善 (0.25d)

**現狀**: 1 秒 1 個 useTimeAgo interval,但 500ms debounce 寫入時跳 1-2 秒先看到更新。

**提案**:
- 寫入觸發時: 立即顯示「儲存中...」(瞬時)→ 1 秒後變「已儲存 1 秒前」
- 而家係: 寫入觸發時冇顯示 → 500ms 後 useTimeAgo tick 顯示「已儲存 N 秒前」,中間有空窗

**實作**: 1-line change `useAutosave` 寫入時 set `pendingSave=true`, 1 秒後 set false

---

### 2.4 [P1] Tab Completion Progress Bar (0.5d)

**現狀**: tab badge 顯示 `N/M`, 但冇整體進度。

**提案**:
- header 加 1 條 horizontal progress bar,顯示 5 個 tab 嘅 average completion
- color code: <30% red, 30-70% amber, >70% emerald
- click bar 跳去 first incomplete tab

---

### 2.5 [P1] Assessment Form Auto-Save Indicator (0.25d)

**現狀**: 已經有全 app 嘅 auto-save badge,但 assessment tab 內冇 per-field 嘅 unsaved indicator。

**提案**:
- 每個 field 離開 focus 時,顯示 ✓ saved 或 ● unsaved (右側)
- 純 local, 唔需要新 state, 用 formData ref compare

---

### 2.6 [P1] Keyboard Shortcut Cheatsheet (0.5d)

**現狀**: Tab 切換要 click 5 個 button。Undo/Redo 已經 Cmd+Z,但其他 shortcut 冇。

**提案**:
- Cmd/Ctrl + 1/2/3/4/5 → 切 tab
- Cmd/Ctrl + S → 即刻 save template
- Cmd/Ctrl + K → 開 command palette (template search + action search)
- `?` key → 顯示 cheatsheet modal

**為何 P1**: 老師 daily use 5-10 次, shortcut 累積省 30-60s/日 = 30min/月 = 6hrs/年

---

## 3. 使用者介面 (UI) 設計

### 3.1 [P0] 建立 Design System 文檔 (4.0d)

**現狀**: 6 個 theme 各有 inline ternary chain, 散落喺 App.jsx / 16+ component。冇 single source of truth, 改色要逐個 file 搵。

**提案**:
- 將所有 ternary chain 抽入 `design-system/tokens/colors.js` (已經部分存在)
- 寫 `docs/design-system.md` 詳細定義:
  - Color palette: primary / secondary / warning / danger / neutral 6 theme × 5 category
  - Typography: 5 級 font scale + line-height scale
  - Spacing scale: token-1 to token-12 (已存在,需要 lock)
  - Component patterns: Button / Card / Modal / Toast 嘅 5 個 variant × theme
  - Icon set: lucide-react sub-set (已 import, 但冇 audit)
  - Motion: 4 個 default + reduced-motion override

**為何 P0**:
- v3.18.0 要做 CohortView 嘅 visual chart,要 design system 先行
- bundle trim 嘅 theme switch refactor 都要先有 SSOT
- 1 個月後嘅自己睇返呢份 code 會快 50%

**實作**:
- 唔做 visual redesign,只做 SSOT refactor + 文檔
- 預估 ~12 個 file 改,但 diff 細

**風險**:
- ⚠️ 6 theme 嘅現有 ternary chain 唔同 tokens.js 100% 對齊 → refactor 期間 visual regression 機會高
- ⚠️ 必須: refactor 前後用 Playwright snapshot 比對 5 個代表 screen
- ⚠️ 必須: visual diff tool (Percy / Chromatic) — 冇 budget,用 jest snapshot + manual verify

---

### 3.2 [P1] Header 重設計 (1.0d)

**現狀**: header 有 9 個 control (theme / motion / reset / undo / redo / save badge / schema version / import / profile bank),太擠。

**提案**:
- Theme + motion 收埋去「⚙ 設定」dropdown
- Undo / Redo 留 header (常用)
- Save badge 保留 (重要 indicator)
- Reset 移到「⚙ 設定」(destructive 唔應該一眼見到)
- Schema version 同 import JSON 移到 footer

**為何 P1**: UI density 降 30%,focus 提升

---

### 3.3 [P1] Print Preview Mockup 改善 (0.5d)

**現狀**: V2 sprint 嘅 print preview 只係 dashed border + text 預覽,冇真實 mockup。

**提案**:
- 用 iframe + srcdoc 渲染真實嘅 award cert HTML
- 顯示實際 print 效果,而唔係 placeholder

**風險**:
- ⚠️ iframe srcdoc 內嘅 motion / framer 可能 render 唔同
- ⚠️ cross-origin (srcdoc 預設 same-origin, OK)

---

### 3.4 [P2] 6 Theme 統一 Brand 視覺 (2.0d) — OUT OF SCOPE for v3.17.0

每個 theme 嘅色相 / 字型 / corner radius 唔統一。例如 `paper` theme 似 notepad 但用 cyber font。應該每個 theme 都 define 一個 distinct visual identity (palette + font + spacing scale 三揀一, 唔係 palette only)。

**為何 P2**: 大 refactor,v3.17.0 裝唔落

---

## 4. 自動化功能導入

### 4.1 [P0] Auto-Save Recovery 改善 (0.5d)

**現狀**: 已經有 10s 嘅 recovery snackbar, 但只喺 reload 時出現。

**提案**:
- 偵測 `beforeunload` event → 強制 flush pending autosave
- 偵測 browser crash (sessionStorage marker): 下次 reload 自動跳 recovery 而唔等用戶 click

**為何 P0**: 0 個老師應該因為「我冇 click 載入 recovery」而失去 30 分鐘嘅工作

---

### 4.2 [P0] Auto-Categorize Examples (1.0d)

**痛點**: 老師 paste 10 條 example questions, 但每條要揀 level (初/中/高階) 同 mechanism (3選1/4選1/...)。

**提案**:
- ✨ button 喺每條 example 旁
- Heuristic 1: detect 數字 vs 文字 → 推測 level (有數字 = 中高階)
- Heuristic 2: detect 答案選擇器關鍵字 (「哪個」「選擇」) → 3選1
- 1-click 套用

---

### 4.3 [P1] Smart Default for Personal Values (0.5d)

**提案**:
- 當老師 set `category = 情緒支援`, 自動 tick 預設 value: 仁愛 + 同理心
- 當 `category = 教學遊戲`, 自動 tick 勤勞 + 堅毅
- 老師可以 uncheck

**為何 P1**: 減少「揀 value」嘅 cognitive load, 但唔係 P0 因為 value 揀錯唔影響 final prompt 太多

---

### 4.4 [P1] Auto-Detect Missing Required Field (0.5d)

**現狀**: 切去「生成」tab 時先發現有 field 未填 → 要跳返去搵邊個。

**提案**:
- Real-time validation: 任何 required field 空時, 對應 tab badge 變紅
- Tab bar 上面有紅點 = 有 missing required
- Click tab 直接 scroll 到 first missing field

---

## 5. 技術風險評估

### 5.1 高風險 (需要 senior review 先 ship)

| 風險 | 影響 | 緩解 |
|---|---|---|
| **Gemini API quota hit** (42212 / 2056) 已經發生過 | Multi-variant 3 calls 1 失敗 = user 唔知邊個 fail | 加 per-variant quota check + graceful degrade;用 Flash Lite 代替 Pro |
| **`getSuggestions` 同類 latent import bug** (d405c0b 隱藏咗幾個 sprint) | Live page click 特定 button 即 crash | 加 smoke test 模擬 click 每個 button; cover 5+ routes |
| **6 theme ternary chain refactor 期間 visual regression** | 重設計失敗 = user 唔認得自己嘅 product | Playwright screenshot diff 5 個代表 screen; dev 階段 maintain 6 theme 都 work |
| **localStorage quota hit** (>5MB 老師 1 年資料) | Save 失敗 = silent data loss | 加 quota warning banner; IndexedDB fallback plan (Phase 4) |

### 5.2 中風險

| 風險 | 影響 | 緩解 |
|---|---|---|
| **Bundle 突破 750 kB** (現 722 kB) | GH Pages load 慢, mobile 用戶離開 | 每 sprint 必加 `npm run test:smoke` + size budget guard |
| **PII 風險** (學生姓名 / 評估數據) | HK PDPO compliance issue | 加「清除所有 localStorage」按鈕; 加 PII detection |
| **Print 跨瀏覽器差異** (Chrome vs Safari) | 老師 print 發現 layout 散 | 用 `@page` standard, 唔用 browser-specific extension |
| **Framer-motion bundle** (~30 kB) | 影響 mobile | Selective import per component |

### 5.3 低風險 (但要 monitor)

- 6 theme × 4 個 component pattern visual diff 漂移
- `TDA_*` localStorage key migration 漏咗 (F2 roster 有發生過)
- 17 個 sprint 累積嘅 .bak file (今 sprint 已清 9 個, monitor 唔再累積)

---

## 6. Debug + 穩定性測試清單

### 6.1 每個 sprint 必做 (gating CI)

- [ ] `npm test` 全 408+ unit tests pass
- [ ] `npm run test:smoke` 8/8 pass (useMemo class regression catch)
- [ ] `npm run test:smoke -- --routes=basic,content,rules,assessment,generate` 5 個 tab 嘅 live load pass
- [ ] 1 個 Playwright script 模擬 click「✨ AI 幫我諗」 button on purpose/context/rules — 必須冇 ReferenceError (新加, catch getSuggestions class of bug)
- [ ] Bundle size budget check (`vite build` 後 bundle < 750 kB)
- [ ] `git status --short` clean (冇 untracked .bak / .DS_Store)

### 6.2 新功能 sprint 額外做

- [ ] **Auto-Fill from Profile (1.1)**: 6 tests
  - Set default profile, 開新 session, 自動 apply ✓
  - 載入非默認 profile, 唔 override default ✓
  - 清除 default, 新 session 用空 formData ✓
  - Profile schema migration (F1 升 v3.17.0 唔 crash) ✓
  - localStorage 寫入 / 讀取 / 持久化 (reload 後仲有) ✓
  - Default profile 唔存在時 fallback ✓

- [ ] **Smart Field Auto-Complete (1.2)**: 12 tests
  - Heuristic suggestions for purpose / context / senType (each 2 cases = 6) ✓
  - Gemini Flash Lite fallback when API key set ✓
  - Gemini fallback graceful when API fails (return heuristic instead of error) ✓
  - UI mount with 3 options + select + close ✓
  - Skip button works (apply suggestion = apply, close = no change) ✓

- [ ] **Cohort Comparison (1.3)**: 8 tests
  - 0 students → empty state ✓
  - 1 student → single row ✓
  - 30 students → matrix render ✓
  - Strength matrix calculation (count students per dimension) ✓
  - Trend chart with 0/1/many time points ✓
  - Click 學生 in cohort → 載入 individual assessment ✓
  - Sub-tab nav between 單個 / 全班 ✓
  - SVG render snapshot stable ✓

- [ ] **Keyboard Shortcuts (2.6)**: 5 tests
  - Cmd+1-5 switches tabs ✓
  - Cmd+S saves (active template or save-as dialog) ✓
  - ? shows cheatsheet modal ✓
  - Cheatsheet closeable via Esc / overlay click ✓
  - Cmd+K opens command palette (template search) ✓

### 6.3 Manual / Playwright live verify (per sprint)

- [ ] 3 個代表 screen × 6 theme visual snapshot (3 × 6 = 18 screenshots)
- [ ] Print preview 1 個 cert, 印 PDF, verify 6 styles (rainbow/medal/galaxy/art/dino/flower) 都 render OK
- [ ] Mobile responsive check (iPhone 12 375×812): 5 個 tab scroll OK, button touch target ≥ 44px
- [ ] 還原測試: import 一個 corrupt JSON, 確認 ImportDiffModal 顯示 errors 而唔 crash
- [ ] Cold start recovery: 填 5 分鐘 formData → 強制 reload → 看到 recovery snackbar → click 載入 → formData 完整還原

### 6.4 Production 監控 (continuous)

- [ ] Sentry / LogRocket 暫時冇,改用 GH Actions 嘅 `unit-test.log` artifact 保留 7 日 (現有)
- [ ] GH Pages cache 監控: 改完 push 5-15 分鐘後先 cache 落地, 唔可以即時 verify
- [ ] 手動 log sheet 記錄每 sprint:
  - bundle size (target: -2 kB per sprint)
  - test count (target: +5 tests per sprint)
  - smoke test catch rate (target: ≥1 per quarter)

---

## 7. 路線圖 (3 sprints ahead)

### v3.17.0 (優先 sprint, ~7 day)
1. **1.1 Auto-Fill from Profile** (1.5d) — P0 must
2. **1.2 Smart Field Auto-Complete** (1.5d) — P0 must
3. **2.1 Empty State Library** (0.5d) — P0 must
4. **4.1 Auto-Save Recovery** (0.5d) — P0 must
5. **2.3 Save Badge 即時性** (0.25d) — P0 must (quick win)
6. **6.1 Smoke test click coverage** (1d) — Critical 預防再出 P0 隱藏 bug
7. **Bundle trim** (1d) — Drop 22 kB to fit budget
8. **VersionPanel + ProfileBankPanel alert drift cleanup** (1d) — Last W9-10 Q3 migration 遺留

### v3.18.0 (1.0 month out, ~10 day)
1. **1.3 Cohort Comparison View** (1.5d) — P1 high-value
2. **1.4 Prompt Version Compare** (1.0d) — P1
3. **1.5 Batch Print Multiple Certs** (1.0d) — P1
4. **1.6 CSV Import** (0.5d) — P1
5. **3.1 Design System 文檔** (4.0d) — 為 1.7 (AI template library) 鋪路
6. **3.2 Header 重設計** (1.0d) — P1 UX
7. **2.4 Tab Completion Progress** (0.5d) — P1 UX
8. **4.2 Auto-Categorize Examples** (1.0d) — P1 automation

### v3.19.0 (2 months out, ~8 day)
1. **1.7 AI-Generated Template Library** (3.0d) — P2 high-leverage
2. **4.3 Smart Default Values** (0.5d) — P1
3. **4.4 Auto-Detect Missing Required** (0.5d) — P1
4. **2.6 Keyboard Shortcut Cheatsheet** (0.5d) — P1
5. **3.4 6 Theme 統一 Brand** (2.0d) — P2 long-arc
6. **2.5 Assessment Auto-Save Indicator** (0.25d) — P1 quick win
7. **IndexedDB fallback** (1.0d) — 解決 localStorage quota 風險
8. **a11y audit + axe-core integration** (0.5d) — 防 WCAG violation

---

## 8. KPI 指標 (sprint 結束時對齊)

| Metric | 現在 (v3.16.0) | v3.17.0 target | v3.18.0 target |
|---|---|---|---|
| **首次填表完成時間** (基本資料 tab) | ~8 min | ~5 min | ~3 min |
| **生成 1 個 prompt 嘅 click 數** | 12 | 8 | 5 |
| **每日 active use 時間** | ~15 min | ~25 min | ~40 min |
| **Bundle size** | 722 kB | <700 kB | <650 kB |
| **Unit test count** | 408 | 425 | 460 |
| **Smoke test catch rate** (per quarter) | 0 | ≥1 | ≥1 |
| **WCAG 2.1 AA violation** (axe-core) | unknown | 0 critical/serious | 0 |
| **localStorage quota hit** (用戶投訴) | 0 | 0 | 0 |

---

## 9. 開放問題 (需要 user 決定)

1. **Bundle trim 策略**: framer-motion 換走 vs multi-file build 拆, 影響 roadmap (見 v3.17.0 item 7)
2. **Gemini Flash Lite 引入**: 用戶自帶 key, cost 由 user 揹 — OK? 定要 build quota dashboard 畀 user 睇 usage?
3. **PII compliance**: HK PDPO 要求老師系統處理學生資料要明示 + 提供刪除途徑。要唔要加 disclaimer + 改 settings UI 顯眼啲?
4. **AI 自動化嘅 transparency**: 1.2 / 1.7 嘅 AI 建議要唔要標明「呢個係 AI 生成」?老師可能將 AI 內容直接 paste 比家長, 引起 expectation 問題
5. **Cohort view 嘅權限**: 老師以外 (e.g. 助教 / SEN 統籌) 要唔要可睇 cohort 但唔可以改? (single-user 設計但呢個 future-proof)
6. **Onboarding 簡化後嘅 power-user workflow**: 簡化 onboarding 會唔會將 power user (用緊 keyboard shortcut 嘅) 嚇走?

---

**STATUS: DRAFT — 等待 user review + 1.1 / 1.2 sprint 確認後開工。**
