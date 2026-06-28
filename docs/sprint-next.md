# Next Sprint Planning — v3.4+ Direction

## Background

v3.3 sprint (Modern UI Redesign) 完成：
- styles/index.css 重組 tokens + 玻璃 utilities + animations
- components/ui.jsx 重寫
- App.jsx header h1 polish
- v3.3.1 / v3.3.2 / v3.3.3 footer link evolution

**剩餘技術債**（2026-06-28 確認 3 條路）：

1. **App.jsx 181 conditionals** — cyber alias 退役咗但 inline ternary 仲喺度，每次新 theme 要 grep 181 spot
2. **Design system 未抽出** — App.jsx + components/ 入面 inline token 同 glass class 重複用緊，唔可以一個 file 控制全局
3. **Mobile responsive 未做** — 只有 26 個 responsive class + `max-w-6xl` desktop-only container

---

## Path A — App.jsx Conditionals Simplification

### Goal
181 `theme === 'cyber' ? X : Y` conditionals → 60 (只判斷 plain vs warm)

### Scope
- **檔案**: 1 (`src/App.jsx`, 2135 lines)
- **改動 spot**: ~100 (每個 conditional 內 cyber 分支 = plain 分支，所以可以直接 `theme === 'warm' ? Y : X`)
- **改動類型**:
  - 簡單：`bg-cyan-900/20 border border-cyan-500/30 text-cyan-200` → 移除 (default plain class)
  - 嵌套：`theme === 'cyber' ? A : (theme === 'warm' ? B : C)` → `theme === 'warm' ? B : C`
  - 唔啱：少數 spot cyber 分支唔同 plain（例如：`bg-slate-800/80` vs `bg-white`）— 唔可以直接合併，要 visual decide

### Implementation Strategy
**Batch-by-batch + Playwright verify**（每 20-30 spot 一批）：
- Batch 1: header / header action buttons (line 1620-1700)
- Batch 2: step 1 render — 範本庫 (line 215-300)
- Batch 3: step 2/3/4 render + footer (line 780-1100 + 2000-2100)

每 batch 完：
- `npm run build` (verify build pass)
- Playwright reload + visual check + 切 theme verify
- 唔好一次過 save 大 batch untested

### Risk & Mitigation
- **Risk**: ternary 嵌套 + 4 個 conditional 嵌套嘅 JSX 容易出 syntax error
- **Mitigation**: 每改一個 spot 立即睇一眼前後 lines，唔好一次過 multi-spot edit
- **Backup**: v3.3.3 commit hash `850761b` 作為 fallback

### Acceptance
- ✅ 181 conditionals → ≤60 (target 60)
- ✅ Build pass + 106 tests pass
- ✅ Playwright live: 兩個 theme visual 都正常
- ✅ Bundle 唔大幅增加（≤+5KB）

### Estimate
- 3-4 batches × 30-45 min = 2-3 hours
- v3.4.0

---

## Path B — Design System Module Extraction (`src/design-system/`)

### Goal
抽 `src/design-system/` module，所有 design token + primitive component 都集中呢度，App.jsx 只係 consumer。

### Module Structure

```
src/design-system/
├── tokens/
│   ├── colors.js          // accent-primary / accent-secondary / warm-accent / semantic colors
│   ├── spacing.js         // space-1..16 → 4..64px export
│   ├── radius.js          // sm/md/lg/xl/2xl/full
│   ├── elevation.js       // elevation-1..4 (semantic naming)
│   ├── motion.js          // transition-fast/base/slow/spring + ease curves
│   ├── typography.js      // h1/h2/h3/body/caption scale
│   └── gradients.js       // gradient-primary / soft / bg / warm
├── primitives/
│   ├── GlassCard.jsx      // 取代 inline `bg-white/78 backdrop-blur-16`
│   ├── GlassButton.jsx    // primary (gradient) / secondary (glass) / ghost
│   ├── GlassInput.jsx     // text input + textarea + select
│   ├── Pill.jsx           // 取代 inline tab button
│   ├── ToggleSwitch.jsx   // 取代 inline toggle button
│   └── SegmentedControl.jsx
├── variants/
│   ├── themeClass.js      // getCardClass(theme), getInputClass(theme) — 取代 inline ternary
│   └── index.js
└── index.js               // barrel export
```

### Implementation Strategy
**Phase 1: Tokens export only** (low risk)
- 抽 `src/styles/index.css` 入面 `:root` variables 做 `tokens/colors.js` etc. export
- App.jsx 暫時繼續用 CSS variables
- **冇 breaking change**

**Phase 2: Variants helper** (medium risk)
- 寫 `getCardClass(theme)` / `getInputClass(theme)` helper
- App.jsx 大規模 replace `theme === 'cyber' ? A : B` → `getCardClass(theme)` 或者 `${getCardClass(theme)}`
- 配合 Path A 一齊做（兩者 scope overlap）

**Phase 3: Primitives** (high risk)
- 抽 `GlassCard` / `GlassButton` 取代 inline `bg-white/78 backdrop-blur-...`
- Touch 5-8 個 file: App.jsx + 4 components
- **每 primitive 抽完一個 file 就 build + visual verify**

### Risk & Mitigation
- **Risk**: primitive 重寫時改變 visual 細節
- **Mitigation**: 每 primitive 抽完先 git commit（單獨 commit），如果 visual regression 即 `git revert` 個 primitive
- **Trade-off**: design system module 抽得太 generic 可能 over-engineering — **唔好過早抽象**

### Acceptance
- ✅ `src/design-system/` module 有 8-10 個 file
- ✅ App.jsx inline class 大幅減少（target -50%）
- ✅ Build pass + 106 tests pass
- ✅ Visual regression < 1% (Playwright screenshot diff)

### Estimate
- Phase 1: 1 hour (token export, no behavior change)
- Phase 2: 2-3 hours (variant helper + App.jsx 大規模 replace)
- Phase 3: 3-4 hours (primitive extraction, touch 5-8 files)
- 整體：2 個 sprint (v3.4.0 + v3.5.0)

---

## Path C — Mobile Responsive Design

### Goal
iPhone 12 viewport (375×812) 唔再 layout overflow，所有 section readable + interactive

### Current State
- 26 個 `md:` / `sm:` / `lg:` responsive class
- 1 個 `max-w-6xl` desktop-only container
- Step 4 `grid-cols-1 md:grid-cols-2` (Part 1 / Part 2 兩欄) 喺 mobile 變單欄
- Step 1/2/3 入面 form fields 多數係 `grid-cols-1 md:grid-cols-2` — OK

### Problem Spots (預測，要 verify)
1. **Header h1**: `text-3xl md:text-5xl` 已經 responsive，但 logo `h-12 w-12 md:h-14 md:w-14` 配 h1 喺 mobile 可能擠
2. **Header action buttons**: 5 個 button vertical stack 喺 desktop，mobile 可能 push out viewport
3. **Tab bar**: 4 個 pill button `flex` 喺 mobile 可能窄
4. **CollapsibleSection**: 長 content 喺 mobile 唔 scrollable
5. **Step 4 prompt output textarea**: `md:h-[600px]` fixed height 喺 mobile 可能擠
6. **Footer links**: 9-10 個 link `flex-wrap` 應該 OK，但 `gap-token-3` 可能太擠
7. **FAB (bottom-right)**: `fixed bottom-6 right-6 z-50` 喺 mobile 可能遮住內容

### Implementation Strategy
**Phase 1: Audit (Playwright)** — 1 hour
- iPhone 12 viewport screenshot 4 個 tab + step 4
- Identify 5-10 個 layout overflow spot
- Write audit doc

**Phase 2: Quick fixes** — 1-2 hours
- 加 responsive class 修 overflow
- header button stack 改 mobile 版面
- tab bar 縮 spacing
- 唔需要 design system

**Phase 3: Mobile-specific components** (optional)
- 抽 `<MobileSheet>` for modal/setting (slide from bottom 取代 desktop modal)
- 抽 `<MobileCockpit>` 取代 sidebar layout (if needed)

### Risk & Mitigation
- **Risk**: mobile change 影響 desktop visual
- **Mitigation**: Playwright verify **兩** viewport (375 + 1440) per change
- **Trade-off**: mobile-first 可能破壞 desktop，**唔做 aggressive mobile-only redesign** — 只 fix overflow + 改善 touch target

### Acceptance
- ✅ iPhone 12 (375×812) 唔再 layout overflow
- ✅ 所有 button touch target ≥ 44px (Apple HIG standard)
- ✅ Desktop visual 唔 regress (1440×900 同 v3.3.3 screenshot diff)
- ✅ Build pass + 106 tests pass

### Estimate
- Phase 1: 1 hour
- Phase 2: 1-2 hours
- Phase 3: optional, 2-3 hours if user wants deeper mobile redesign
- 整體 v3.4.0 = 2-3 hours (Phase 1+2)

---

## Recommended Order

### Option 1: 嚴格 sequential
1. **v3.4.0** — Path A (conditionals simplify, 2-3 hr)
2. **v3.5.0** — Path C (mobile responsive, 2-3 hr)
3. **v3.6.0** — Path B Phase 1 (token export, 1 hr)
4. **v3.7.0** — Path B Phase 2 (variant helper, 2-3 hr)
5. **v3.8.0** — Path B Phase 3 (primitives, 3-4 hr)

每 sprint 獨立 ship，唔阻塞。

### Option 2: A + C 同期 (sprint 合併)
1. **v3.4.0** — Path A + Path C 同期做 (3-4 hr total)
   - App.jsx 大改動做 conditionals + mobile
   - 一齊 visual verify 兩 viewport
2. **v3.5.0** — Path B Phase 1+2 (3-4 hr)
3. **v3.6.0** — Path B Phase 3 (3-4 hr)

### Option 3: 保守只做一個
- 揀 Path A (foundation 改善最即時)
- Path B / C 留俾再下個 sprint

---

## Dependencies

```
Path A  →  唔依賴其他 path，可獨立做
Path B  →  唔嚴格依賴，但最好 A 先做（先有乾淨 baseline）
Path C  →  唔依賴，但最好 A + B 完成後做（design system + mobile 可一齊設計）
```

---

## Out of Scope (唔做呢個 cycle)

- **Dark mode** (新 3rd theme) — 等 design system 抽完先做
- **Custom theme builder** (用戶自選 accent color) — 等 design system + 多 theme 支援先做
- **i18n** (i18next 整合) — 唔喺呢個 UX scope
- **Accessibility audit** (ARIA + screen reader) — 已經有 focus-visible 等基本 a11y，未做 deep audit

---

## Open Questions (User 決定)

1. **Sprint 1 揀邊條路？** A / B / C / A+C 同期 / 全部都做
2. **Sprint 1 budget 幾多時間？** 1-2 小時 (輕量) / 3-4 小時 (標準) / 6+ 小時 (deep)
3. **Path B 嘅 primitive extraction 係咪 over-engineering？** 接受 / 唔做（只做 token export）
