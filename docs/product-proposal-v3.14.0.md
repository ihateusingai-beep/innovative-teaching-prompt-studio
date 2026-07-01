# Innovative Teaching Prompt Studio — 產品設計與優化提案 v3.14.0+

**版本基準**: v3.14.0-alpha 已 ship (評估 tab + assessment form)
**撰寫日期**: 2026-07-01
**目標受眾**: SEN (Special Educational Needs) 老師 — 為 ADHD / ASD / 讀寫障礙 / 聽障 等學生設計結構化 prompt
**使用裝置**: Desktop primary (per user memory)
**前一份提案**: v3.13.0 (見 `product-proposal-v3.13.0.md`)

---

## 0. v3.13.0 進度回顧 + v3.14.0-alpha 結算

### 0.1 v3.13.0 已 ship ✅
- V6: Toggle 36×20 → 56×32 track + 44px hit area (mobile audit P0 fix)
- F2: 3-variant side-by-side generation (3 parallel Gemini calls)
- 208/208 tests, 652 KB bundle

### 0.2 v3.14.0-alpha 已 ship ✅ (本日)
- 第 5 tab「📊 評估」— student assessment form
- Schema v2 → v3 (新 awardCertificate + assessment fields)
- 208/208 tests still pass

### 0.3 v3.14.0 剩餘 work (目標本日 + 後續)
- **Award Certificate component** (6 styles)
- **Award Certificate Modal** (preview + browser print)
- **Award CSS** (6 styles + A4 @media print)
- **Toggle wiring** in 規則 sub-section
- **Tests** (12-15 new)

### 0.4 已知問題
- App.jsx **2257 lines** (further grown from 1974) — refactor 壓力繼續加大
- 27 個 ternary 仲係 inline `theme === 'warm' ? X : Y` (narrow refactor 漏)
- 4 themes → 6 themes 後 CSS bundle 657 KB → 接近 700 KB budget
- **A11y concerns** from mobile audit 13 pain points — desktop-primary so not blocking
- GH Pages edge cache 持續 10+ min lag (NRT node) — third observation

---

## 1. 新功能開發 (New Features)

### F1. **完整 Award Certificate — 6 Styles** (v3.14.0-ship, high priority)

**痛點**: 老師教 SEN 學生需要正面強化 + 視覺化成就感，但一張標準證書太單調。
**方案** (已 design, 待 ship):
- 6 styles: 🌈 Rainbow / 🏅 Medal / 🌌 Galaxy / 🎨 Art / 🦕 Dino / 🌸 Flower
- 6 sub-toggles (showStudentName/Date/Subject/Score/Strengths/Improvement/TeacherMessage)
- Modal preview + browser `window.print()`
- A4 landscape print CSS

**Effort**: 1.5 days (component + 6 CSS + print). **Risk**: 6 styles 设计需谨慎 naming.

### F2. **Assessment Auto-Aggregate — 班級統計** (medium priority)

**痛點**: 老師多個學生填 assessment 麻煩 — 應該可以一次過 import CSV / spreadsheet 自動 fill 5/10 學生嘅 assessment。
**方案**:
- 「📊 從 CSV 匯入評估」按鈕 → file upload → parse → 自動 fill `formData.assessment[]` array
- 一 click 即生成全班平均分 + 各學生 cert 序列
- Sample CSV 提供下載

**Effort**: 2 days (CSV parser + UI). **Edge**: 解決老師 30 學生嘅 pain。

### F3. **Prompt Demo / Showcase Gallery** (medium priority)

**痛點**: 老師睇唔到其他人用我哋個 prompt 工具出嚟嘅效果，唔知可以做出咩。
**方案**:
- 新「🎨 範例」sub-section 喺 範本庫 tab 內
- 5-10 個 built-in showcase (game × subject × grade × SEN type 配對)
- 每個 showcase 有個 demo tool iframe + 「試下變化」button (load formData preset)

**Effort**: 2 days (demos HTML + integration). **Edge**: 勁 demo 對 discoverability 大加分。

### F4. **Real-time Preview During Form Edit** (high priority, post v3.14.0)

**痛點**: 老師填 form 18 fields 都唔知個最終 prompt 會點樣，要到「生成」tab 先睇到 Part 1 / Part 2。
**方案**:
- 每 tab 右邊加 collapsible sticky preview pane (desktop only)
- 即時顯示 Part 1 + Part 2 generateDesignPrompt() / generateTechPrompt() output
- 老師一改 field 即時 update preview (0 debounce, React useMemo)
- 預覽旁仲可複製 prompt 段

**Effort**: 2 days (UI + performance optimization). **Edge**: 50% 認知 load reduction。

### F5. **AI Hint Bubble — context-aware suggestions** (low priority)

**痛點**: 18 fields 唔識揀咩值 (尤其遊戲風格、學習風格)。
**方案**:
- Form 每個 field 旁邊 💡 icon，hover 顯示 AI suggestion (cached Gemini call)
- 一次 Gemini call 一次 generate 全部 suggestions，避免 N calls

**Effort**: 1.5 days. **Edge**: 同 F4 結合 = 解鎖 best-in-class UX。

### F6. **SEN Profile Library — pre-configured archetypes** (medium priority)

**痛點**: 老師要揀 SEN type 一個個剔，但唔知點配搭 (ADHD + 讀寫困難 vs ADHD + ASD 唔同)。
**方案**:
- Pre-defined profiles (8 archetypes):
  - 「閱讀障礙小一」— [讀寫困難, 輕度, 大字 + TTS + 簡短]
  - 「ADHD 五年級」— [ADHD, 中度, 短任務 + 視覺化 + 動態]
  - 「ASD 二年級非口語」— [ASD, 中度, 視覺時間表 + 固定流程 + 避抽象]
  - ... 8 個
- 點 profile 即 auto-fill senTypes + accessibility + senLevel + recommended gameStyle

**Effort**: 1.5 days (data + UI). **Edge**: 5× faster 完成 SEN section (老師 18 fields → 一 click)。

### F7. **Community-shared Templates (opt-in)** (low priority, viral)

**痛點**: 老師唔知其他同行寫咩 prompt，分享要 docx / email 慢。
**方案**:
- "📤 分享到社群" button → opt-in anonymous POST → Cloudflare R2 / GitHub Gist
- "📥 瀏覽社群" tab → browse public templates (filter by SEN/grade/style)
- 一 click 套用 = load 全 formData

**Effort**: 5-7 days (Cloudflare Workers setup, abuse moderation). **Edge**: Network effect。

---

## 2. 使用者體驗 (UX) 優化

### U1. **App.jsx 2257 lines → 4 split files** (high priority, technical debt)

**痛點**: App.jsx monolith 阻礙所有 future refactor, jest/Vitest 唔能 selectively 測 single file。
**方案**:
- 抽 `src/components/steps/` 目錄:
  - `Step1Basic.jsx` (~250 lines)
  - `Step2Content.jsx` (~250 lines)
  - `Step3Rules.jsx` (~400 lines, 包含 personalizedReport + awardCertificate sub-section)
  - `Step5Assessment.jsx` (~150 lines, 評估 tab)
- 抽 `src/components/StepNavigation.jsx` (5-tab bar)
- 抽 `src/components/AiVariants/` (renderMultiVariant + renderAiResult)

**Effort**: 6-8 hours (refactor only, no behavior change). **Edge**: future refactor 10x faster。

**Strategy**: 慢慢逐個抽，每次抽完都跑 208 tests + Playwright smoke test。

### U2. **5-tab bar — mobile audit fix** (medium priority)

**痛點**: 加入 評估 tab 後 5 tabs, iPhone 12 (375px) 仲 fit 但更擠。
**方案**:
- **Desktop**: keep 5 tabs horizontal (現狀 OK)
- **Mobile (≤640px)**: convert to bottom-sheet drawer (`<Drawer />`)
  - 1 button 顯示 current tab + counter → tap 展開 bottom sheet
  - sheet 内 5 tabs vertical list + completion dots
- 避免 tab overlap on small screens

**Effort**: 1.5 days. **Risk**: iPhone 12 375px 仲有 2-3px margin when 5 tabs fit exact; safe to defer if user confirms desktop-primary。

### U3. **Auto-save indicator badge** (medium priority)

**痛點**: 老師唔知「自動儲存」幾時 trigger, 怕 data loss。
**方案**:
- Header next to existing 5-second counter shows 💾 「已儲存 5 秒前」 (live update via react useAutosave hook)
- 無 autosave 時顯示 ⚠️ 「未儲存」orange badge
- Click → snapshot list modal (類似 GitHub commits)

**Effort**: 1 day. **Edge**: 大幅提升 trust。

### U4. **Field-level validation summary** (medium priority)

**痛點**: 18 fields 有 required 但老師點 「生成」先見到 「❌ purpose 必填」。
**方案**:
- Header 加 「⚠️ 3 個未填」warning indicator (live)
- 點擊 → mini panel list 出所有 missing fields
- 「跳去填」 button each → setActiveTab + scroll to field

**Effort**: 1 day. **Edge**: 同 U1 組合 = best-in-class form UX。

### U5. **Undo/Redo keyboard hint** (low priority)

**痛點**: Undo/Redo 已經 implement 但唔顯眼。
**方案**:
- Header indicator 顯示 ↶↷ icon + 「Ctrl+Z / Ctrl+Shift+Z」shortcut hint
- History depth counter (e.g. 「5 步」)
- Dropdown 顯示 full history list

**Effort**: 0.5 day. **Edge**: 細但 delightful。

### U6. **TTS Preview for AI generated HTML** (medium priority)

**痛點**: 老師點 「複製 Part 1」之後要 paste 出嚟先知個 HTML 講咩。
**方案**:
- 「🔊 朗讀」button (each Part 1 / Part 2 / 奬狀)
- Web Speech API `lang='zh-HK'`
- 老師可以聽 prompt 嘅 flow 而唔使 read

**Effort**: 1 day. **Edge**: 對中文老師 SR (Speech Recognition) workflow friendlier。

### U7. **Form auto-fill from Lesson Plan** (medium priority)

**痛點**: 老師 fill `examples` + `context` 慢 — 過往 lesson plan 已經有 content。
**方案**:
- 「📂 從 docx/pdf 提取」 button → upload file → Gemini file API parse → auto-fill examples + context
- 顯示 diff before apply (老師可 edit accepted portion)

**Effort**: 2 days (Gemini file API + diff UI). **Edge**: 30-min task → 5-min。

---

## 3. 使用者介面 (UI) 設計

### V1. **Reactor Theme Animation Reduced Motion** (P0 — accessibility)

**現況**: 4s 永久 animation 對所有 glass-card。
**方案**:
- Wrap 喺 `@media (prefers-reduced-motion: no-preference)` — 預設 OFF
- Setting 加 「Enable reactor glow」 toggle

**Effort**: 0.5 day. **Risk**: 違反 WCAG 2.3.3。

### V2. **Print Stylesheet 全覆蓋** (P1, deferred from v3.13.0)

**現況**: 冇 `@media print` rules。
**方案**:
- Hide 所有 chrome (header / footer / FAB / tour / chat widget)
- Full-width content
- 黑底白字 forced
- Page-break hints for long content
- Print header: 「Prompt — 學生 X — 日期 Y」

**Effort**: 1 day. **Risk**: cross-browser quirks (Chrome/Firefox/Safari/Edge).

### V3. **Tab indicator bar 微動畫** (P2)

**現況**: Tab 切換 hard transition。
**方案**:
- 用 framer-motion layoutId + 共享 element transition (smooth slide)
- Indicator dot pulse on tab with incomplete fields

**Effort**: 0.5 day.

### V4. **獎狀 Modal — fullscreen take over** (P2, part of F1)

**現況**: Modal pattern 一致。
**方案**:
- Fullscreen modal（90vh+）for cert preview
- Background dim gray + cert floating with subtle shadow
- Toolbar (sticky top): Style selector + Print + Close
- Print preview pane on right (live Chrome print preview)

**Effort**: part of F1.

### V5. **Form compact mode for 1440+ desktop** (P2)

**現況**: 1280px max-w-6xl 鬆散，4K monitor 多咗 space。
**方案**:
- Detect viewport > 1440px → auto switch to 2-column layout
- Left: form fields, Right: live preview
- Manual toggle 「Compact mode」in settings

**Effort**: 1 day. **Edge**: 適合 desktop-primary user。

### V6. **Empty state illustrations** (P2)

**現況**: 範本庫 / assessment / award cert 全部空白時無引導。
**方案**:
- SVG illustration + CTA (e.g. "Build your first cert →")
- 8 個 illustration slots (範本庫 / 評估 / 奬狀 / Profile Bank / etc.)

**Effort**: 1 day.

### V7. **Toggle visual indicator** (P1 — mobile audit deferred)

**現況**: V6 v3.13.0 加大咗 track + hit area, 但視覺 knob 仲係單一 thumb。
**方案**:
- Add subtle drop shadow to knob + slight scale on hover (已 in V6 size)
- Animated transition on toggle (slide + fade)

**Effort**: 0.5 day. **Mostly done by V6, extend minor polish.**

---

## 4. 自動化功能導入 (Automation)

### A1. **Auto-fill Examples from Assessment strengths** (high priority, post v3.14.0)

**痛點**: 老師填咗 assessment.strengths (e.g. 「加法」) 但冇 link 到 examples。
**方案**:
- 「✨ 從強項生成例子」button
- 用 strengths + grade 自動 generate 3 examples text
- One-click apply to formData.examples

**Effort**: 1 day. **Edge**: workflow closure。

### A2. **Auto-recompute Quality Score live** (medium priority)

**痛點**: Quality Score 只喺 generate tab 顯示, 改 field 後要 re-render。
**方案**:
- Quality score badge 顯示喺每 tab 頭
- Live recalc on every form change (useMemo)
- Show 5 dimensions (completeness / clarity / examples / accessibility / SEN fit)

**Effort**: 1 day. **Edge**: 老師知邊度要 improve 即時。

### A3. **Smart Section Recommendation — high priority** (already in v3.13.0 proposal)

從上次 attempt / 班級 data / subject correlation 自動 suggest next best field。

**Effort**: 1.5 days.

### A4. **Auto-archive inactive templates** (low priority)

**現況**: User template 上限 20 (硬 cap)。
**方案**:
- Detect >30 days 未用 → 自動 archive
- Archived template 入 recovery drawer (30-day soft delete)

**Effort**: 0.5 day. **Edge**: housekeeping。

### A5. **Auto-tag — lesson subject keywords from examples** (medium priority)

**痛點**: 老師有 10 個 lesson example 但 subject field 空白。
**方案**:
- Run keyword extraction on examples.text → suggest subjectCategory
- Show "✨ suggest: 數學 - 加法" with one-click apply

**Effort**: 1 day.

### A6. **Bulk Award Certificate 生成 — 全班列印** (medium priority, F2 同步)

**痛點**: 老師 30 學生要 30 張 cert, 1 1 印慢。
**方案**:
- Profile Bank multi-select → 「🖨️ 列印全班獎狀」
- 生成 PDF 含 30 頁 (each page = 1 student)
- 1 print job = 30 certificates

**Effort**: 2 days.

### A7. **Conflict diff when import JSON — already in v3.13.0** (deferred)

JSON import vs current formData → diff UI → merge per-field。

**Effort**: 2 days.

### A8. **Auto-save quality-of-life** (medium)

- 個 form 多個 fields 改完 → 自動 trigger quality score recompute (cheap)
- 開咗 tab 5 秒 → 自動 fetch 一個新 showcase demo
- 開 app 30 秒閒置 → 提示 tour discover new features

**Effort**: 1 day.

---

## 5. 技術風險評估 (Technical Risk Assessment)

### 5.1 新功能 Engineering Risk Matrix

| Feature | 風險 | 主要風險 | 緩解 |
|---|---|---|---|
| F1 Award Cert | 🟡 中 | 6 styles × A4 print 跨 browser quirks | Chrome 主 target; Firefox/Safari 後 spot-check |
| F2 CSV import | 🟡 中 | 不同 spreadsheet 同名 column → parsing fragile | 提供 strict sample CSV + validation; ignore 未知 column |
| F3 Demo gallery | 🟢 低 | iframe sandboxing + external iframe 同源 | use srcdoc + sandbox attribute; cache local first |
| F4 Live preview | 🟠 高 | 18 fields 同時 trigger render 性能 | 用 useMemo + 個別 debounce; 限制 React DevTools profiler 100ms |
| F5 AI Hint | 🟡 中 | 1 Gemini call 但 cached 30 fields suggestions 一次過 → output size 大 | maxOutputTokens cap 1500; truncate response |
| F6 SEN Profile | 🟢 低 | 純 data + UI, 冇 AI call | unit tests for each archetype |
| F7 Community | 🟠 高 | Abuse / spam / 私隱 — 公開 prompt 可能有學生私隱 | sanitize prompt (strip personal refs); rate-limit by IP via Cloudflare; opt-in only |

### 5.2 UX/UI Risk

| | 風險 | 緩解 |
|---|---|---|
| U1 App.jsx refactor | 🟠 高 (2257 → 4 files, 任何錯都 break 全 18 fields render) | 抽每個 step 完都跑 208 tests + Playwright e2e smoke (每 tab screenshot 一張) |
| U2 5-tab mobile drawer | 🟡 中 | iPhone 12 spot-check; fallback 保留 horizontal |
| U3 Auto-save badge | 🟢 低 | just subscribe to useAutosave |
| U4 Validation summary | 🟡 中 | edge case: 0 filled vs 1 filled state |
| U7 Auto-fill docx | 🟠 高 | Gemini file API limits + parse failure fallback |

### 5.3 自動化 Risk

| | 風險 | 緩解 |
|---|---|---|
| A1 Example auto-fill | 🟡 中 | Gemini call 額外 quota, rate-limit + cache |
| A2 Quality live | 🟢 低 | 純 useMemo recompute |
| A4 Template archive | 🟢 低 | Add recovery UI; soft delete |
| A6 Bulk certificate | 🟠 高 | 30 students × 1 Gemini call = rate limit; add queue with progress + pause/resume |

### 5.4 跨切風險: **Performance + Bundle**

| Metric | Current | 6 styles + 評估 + AwardCert | Budget | Status |
|---|---|---|---|---|
| Bundle (gzip) | 272 KB | ~330-380 KB | 700 KB | ✓ |
| App.jsx lines | 2257 | 500-800 if refactored | N/A | needs U1 |
| Memory footprint | ~50 MB | ~70 MB (with preview iframe) | <150 MB | ✓ |
| Time to interactive | ~1.5 s | ~2 s (with 6 theme CSS) | <3 s | ✓ |
| Lighthouse score | est 90 | est 85 (more CSS) | >85 | needs verify |

### 5.5 GH Pages edge cache lag (recurring third time)

每次 deploy 後 NRT cache 10+ min stale。用戶要 hard reload 或者等 max-age=600 過。
**Action**: 寫一個 `version-detect.js` snippet — page load 時 fetch `/version.txt` (CDN-cache-busting, separate URL) 對比 hardcoded current version; mismatch 時顯示「有新版本可用 [Refresh]」banner。不需 rebuild 主 bundle。

---

## 6. Debug & Stability 測試項目

### 6.1 Test matrix requirements

#### 6.1.1 Award Certificate (v3.14.0 ship)
- ✅ 6 styles 各自 render correct class signature
- ⚠️ Visual regression: 6 styles × 6 themes × 評估 data variations × screenshot matrix
- ⚠️ A4 print: Chrome / Firefox / Safari / Edge 4 browser screenshot
- ⚠️ Empty data fallback (no studentName → 「學生」default placeholder)
- ⚠️ Long studentName overflow handling

#### 6.1.2 Live preview (F4)
- 18 fields × 100 changes/second benchmark → render < 16ms
- Memory leak test (open + close tab 50 cycles, ensure < 200MB increase)
- useMemo deps correctness (re-render only when actual field changes)

#### 6.1.3 SEN Profile archetype (F6)
- 每 archetype auto-fill 對應 field 正確
- 30 archetypes × 18 fields 嘅 matrix coverage test
- Apply profile 後 formData 完全 override 而非 merge

#### 6.1.4 CSV import (F2 / A1)
- Excel generated CSV (commas + quotes)
- Numbers-only CSV
- Multi-row CSV with mixed encoding
- Malformed CSV → graceful error 而非 app crash

#### 6.1.5 Community sharing (F7)
- Submit → Cloudflare R2 write
- Rate limit 5次/min per IP
- Profanity filter (badword list + replacement)
- PII detection (學生名 / 家長 email) → refuse / warn

#### 6.1.6 Print edge cases
- 1 student cert (basic)
- 30 student cert (bulk print job)
- Long studentName truncate
- Special chars (emoji, CJK, RTL Arabic?)
- Empty all optional fields

### 6.2 推薦 testing infrastructure

#### 6.2.1 自動化 (CI / local)
```
- vitest: 208+ unit tests (current)
  - + 12-15 Award cert tests
  - + 8-10 SEN Profile tests
  - + 5-8 CSV parse tests
- Playwright (e2e/):
  - assessment-flow.test.js: 填表 → tab complete
  - award-cert.test.js: 6 styles × 6 themes screenshot
  - live-preview.test.js: 18 field change render <16ms
  - print-dialog.test.js: window.print() called with correct args
- Visual regression (per-PR):
  - Chromatic: 6 themes × 5 tabs × 6 cert styles = 180 snapshots per diff
```

#### 6.2.2 手動 (release 前)
```
- 5 user interview (1 hour each)
- Cross-browser matrix: Chrome/Firefox/Safari/Edge × desktop/laptop/tablet/phone
- A4 print on 3 different printers (HP/Canon/Epson if available)
- Lighthouse CI for each release
```

#### 6.2.3 Load test
- 100 concurrent users (static GH Pages — proxy via Cloudflare)
- Bundle size CI gate (must stay <700KB)
- FCP <2s, TTI <3s, LCP <2.5s Lighthouse mobile target

### 6.3 監控 (post-launch)

```
- Sentry: Frontend error tracking (including unhandled promise rejections)
- Plausible (opt-in): User flow analytics (anonymized, GDPR-compliant)
- localStorage quota warning: detect at 80% full, suggest export
- Gemini API quota monitoring: client-side banner when <10% remaining
```

---

## 7. 推薦 Roadmap (Q3-Q4 2026)

### Phase 1 (1 week, immediate — v3.14.0 ship)
- F1 Award Certificate component (6 styles)
- Modal + print CSS
- Toggle wiring in 規則 sub-section
- Tests + ship v3.14.0 + GH Pages deploy

### Phase 2 (2 weeks)
- F4 Live preview during form edit
- A2 Auto-recompute Quality Score live  
- U1 App.jsx refactor (2257 → 800 lines)
- V1 Reactor animation reduced motion (P0 a11y)
- V2 Print stylesheet full coverage

### Phase 3 (4 weeks)
- F2 CSV import aggregation
- F6 SEN Profile archetypes (8)
- A1 Auto-fill examples from assessment strengths
- U6 TTS preview for AI generated HTML
- V5 Compact mode for 4K desktop

### Phase 4 (Q4 2026)
- F7 Community sharing (if Phase 1-3 successful)
- F3 Demo gallery
- F5 AI Hint Bubble
- V6 Empty state illustrations batch

### Phase 5 (Q1 2027)
- A6 Bulk certificate generation for full class
- A7 Conflict diff for JSON import
- Cloud sync infrastructure (Tailscale / Cloudflare Access)

---

## 8. 結論

### Highest leverage features (next 3 months)
1. **F1 Award Certificate ship** (immediate, already design-done)
2. **F4 Live preview** — biggest UX 跳一級 (2 day)
3. **F6 SEN Profile archetypes** — 5× speed (1.5 day)
4. **U1 App.jsx refactor** — necessary for any future work (1 day, but pays forever)
5. **V1 Reactor reduced motion** (P0 a11y, 0.5 day)

### Highest risk (要小心)
1. **U1 App.jsx refactor** — 2257 lines monolith, 任何錯都影響 18 fields render
2. **F7 Community** — moderation / abuse vector
3. **A6 Bulk certificate** — 30x Gemini cost 風險
4. **F4 Live preview** — performance regression 風險

### Architectural debt (要解決嘅根)
- **App.jsx 2257 lines** — biggest blocker for future work
- **27 ternary `theme === 'warm' ? X : Y`** — narrow refactor 漏咗
- **No zod / yup validation** — 18 fields manual check
- **No E2E tests** — only 208 unit tests for structure
- **6 themes × 4+5 tabs × 6 cert styles = 240 visual states** — 冇 visual regression test

### GH Pages edge cache lag (recurring 3rd time)
- Workflow publish OK, 文件 etag changed, 但 NRT edge 持續 stale 10+ min
- 加 `version-detect.js` snippet: page load → fetch `/version.txt` mismatch → "有新版可用 [Refresh]"
- 不需 rebuild 主 bundle, 純 1-2 KB 額外 cache-busting asset

---

**Author**: Mavis
**Status**: Draft v1
**Next review**: v3.14.0 GA + Phase 2 完成後 (~2026-07-22)
**Related docs**: `product-proposal-v3.13.0.md`, `mobile-audit-v3.11.0.md`, `sprint-next.md`
