# Mobile UX Audit — v3.11.0 (iPhone 12 Viewport)

**Target device**: iPhone 12 (375×812 logical px)
**HIG/Material baseline**: Apple HIG min 44×44 px, Material 48×48 px touch target
**Test date**: 2026-06-28
**Tester**: Mavis (Playwright MCP)
**App version**: v3.10.0 (post Path B.5 collapse)
**Method**: 4 tabs (基本/內容/規則/生成) full screenshot + user flow probe + DOM touch-target measurement

---

## Severity legend
- **P0** — Broken on mobile (functional blocker or near-unusable)
- **P1** — Significant friction (works but bad UX)
- **P2** — Polish / nice-to-have

---

## P0 — Critical (mobile-breaking)

### #1 Toggle switch 36×20 px — way below 44×44 minimum

**Location**: All 10 role="switch" toggles in 規則 tab + 1 master `usePersonalizedReport` + `includePreferenceSettings` + `useGeminiStyle`

**DOM measurement**:
```
toggleW: 36, toggleH: 20, meetsTouchTarget: false
```

**Impact**: User finger tap target = 36×20 px (smaller than a finger tip). On iOS, tap may register as scroll. On Android, FAT-finger errors. Workable with aim but ergonomic P0.

**Fix**: Increase ToggleSwitch min dimensions to **min-w-[44px] min-h-[24px]** (track height) + **expand hit area** to 44×44 via `p-3` outer container or pseudo-element `::before`/`::after` (Apple pattern: hit area > visual).

**Recommended**: Modify `src/design-system/primitives/ToggleSwitch.jsx`:
- Wrap button in a flex container with `min-h-[44px] items-center`
- Track size: `w-12 h-7` (sm) / `w-14 h-8` (md) — bigger visually + larger hit area
- Knob scales with track

---

### #2 ✨ AI 幫我加規則 button 122×24 px — far below 44px

**Location**: Sub-section d1 區域內 header button

**DOM measurement**:
```
txt: "✨ AI 幫我加規則", w: 122, h: 24, meetsH: false
```

**Impact**: Hit area only 24px tall = impossible to tap reliably.

**Fix**: Add `min-h-[44px]` to the button + ensure parent row provides vertical centering so layout doesn't shift.

---

### #3 「下一步」/「上一步」 button text wrap cause 96-98px height (visual instability)

**Location**: Step navigation footer of 規則 + 生成 tab

**DOM measurement**:
```
上一步: w=98, h=98   ← 文字 wrap 兩行
下一步: w=108, h=96  ← 同
預覽:   w=92,  h=42  ← 接近 44 但唔夠
```

**Impact**: Nav buttons visually inconsistent (one row tall on some, two rows tall on others). Tap area OK after wrap (96h = way past 44) but visual layout jarring.

**Fix**: 
- Force button content to single line: `whitespace-nowrap`
- OR reduce button font-size on mobile: `text-xs sm:text-sm`
- Add `min-h-[44px]` to 預覽 specifically

---

## P1 — Significant friction

### #4 Tab bar 320px / 375px — no breathing room

**DOM measurement**: 4 tabs × 80px = 320px + 3 gaps × ~8px = ~344px. Container 375px. **15px each side margin** (effectively 0 since border).

**Fix**:
- Reduce tab to **52px** on iPhone (`min-w-[52px]`) → 4×52 + 3×8 = 232px, more comfortable
- OR add `px-2` parent + smaller gap

---

### #5 「快速開始」 button text wrap "快速 / 開始"

**Location**: 範本庫 header

**Impact**: 2-line button looks broken on iPhone

**Fix**: `whitespace-nowrap` OR shorten label to `開始` only on mobile via `hidden sm:inline`

---

### #6 Label text wrap 「2.1 核心用途 (Core Purpose)」 etc.

**Location**: All sub-section labels in 基本 + 內容 + 規則 tab

**Impact**: 2-line label wastes vertical space, makes scroll feel slower

**Fix**: 
- Shorten label mobile-only: `md:hidden` show "2.1 核心用途", `hidden md:inline` show "(Core Purpose)"
- OR drop the `(English)` parenthetical on mobile

---

### #7 FAB SegmentedControl option text wrap

**DOM measurement**: 「全息漸變 + 簽名圖」 / 「白底簡約按鈕」 / 「唔加 FAB」 — each wraps to 2 lines on iPhone

**Fix**: Smaller font `text-[10px] sm:text-xs` + shorter option label on mobile (e.g. 「Cyber」/「Minimal」/「關閉」)

---

### #8 自動儲存 + 復原 tour widget overlaps content

**Location**: Bottom-right corner, fixed position

**Impact**: 5/5 step indicator + chat "Ken Cheng 設計" widget both compete for bottom-right real estate. On iPhone they overlap content card (screenshot evidence: 基本 tab template library card partially hidden behind widget)

**Fix**: 
- Move "自動儲存 + 復原" widget to bottom-center on mobile (chat-widget already bottom-right)
- OR add `mb-safe` to widget so it doesn't overlap last content row
- OR auto-dismiss tour after first interaction

---

### #9 右上角 button cluster (載入 JSON / 學生 Profile / undo / redo)

**DOM measurement**: 4 buttons stacked vertically, each ~50px wide × 38px tall. Total ~50×200px in 80px wide column.

**Impact**: Buttons touch each other vertically (gap = 8px). User 容易 miss-tap between them.

**Fix**: Add `flex-col gap-2` with explicit spacing, OR move undo/redo to floating-action-cluster bottom-right

---

### #10 「PART 1: 設計與邏輯」 text cut at right edge

**Location**: 生成 tab bottom (visible after scroll)

**Impact**: Text overflows viewport

**Fix**: Add `pr-2` parent OR ensure container has horizontal padding

---

## P2 — Polish

### #11 4 tab emojis visually unbalanced without labels

On iPhone, v3.5.0 hides tab labels (counter only). Emoji 📋 / 📝 / ⚙️ / ✨ stand alone. Aesthetic OK but accessibility: screen reader announces only counter, not tab purpose.

**Fix**: Add `aria-label="基本資訊 tab, 完成 3/6 步"` etc. for SR users

---

### #12 Tabs hint chip 「Tabs 模式：任何 tab 隨時跳 • 改動自動儲存。」 wraps 2 lines

**Location**: Above tab bar

**Impact**: 2-line hint takes vertical space

**Fix**: Hide hint on iPhone (`hidden sm:flex`) since it's a discoverability hint, not critical info

---

### #13 Console errors (not mobile but flagged during audit)

2 console errors during preview:
1. `chrome-extension://...refresh.js` WebSocket fail — extension-only, ignore
2. `favicon.ico 404` — add favicon OR add `<link rel="icon" href="data:,">` to suppress

---

## Quantitative summary

| Category | Count |
|---|---|
| P0 (broken) | 3 |
| P1 (significant) | 7 |
| P2 (polish) | 3 |
| **Total** | **13** |

### Touch-target violations (HIG 44px minimum)
| Button | Height | Status |
|---|---|---|
| ✨ AI 幫我加規則 | 24 | ❌ -20 |
| 👤 學生 Profile | 38 | ❌ -6 |
| 預覽 | 42 | ❌ -2 |
| Toggle (×10) | 20 | ❌ -24 |

### Horizontal scroll
- viewport 375, scrollWidth 375, **no horizontal scroll** ✓
- 10 toggles + segmented control + step nav all fit within 375px width

---

## Recommended fix order (v3.11.0 sprint plan)

### Phase 1 (P0 fixes) — 4 hours
1. ToggleSwitch primitive: bump visual size + add 44px hit area container
2. ✨ AI 幫我加規則 button: `min-h-[44px]` + whitespace-nowrap
3. 下一步/上一步/預覽: `whitespace-nowrap` + `min-h-[44px]` on 預覽

### Phase 2 (P1 fixes) — 4 hours
4. Tab bar shrink on mobile (`w-12` instead of `w-20`)
5. 「快速開始」 → `whitespace-nowrap`
6. Sub-section labels: shorten on mobile (drop English parenthetical)
7. FAB SegmentedControl: smaller font + shorter labels on mobile
8. Tour widget: relocate to bottom-center on mobile + auto-dismiss
9. 右上角 button cluster: explicit gap + consider bottom-fab pattern
10. 「PART 1」 parent: add `pr-2` horizontal padding

### Phase 3 (P2 polish) — 1 hour
11. Add `aria-label` to tab buttons for screen readers
12. Hide tab hint chip on mobile
13. Add inline favicon link to suppress 404

**Estimated total**: 9 hours for complete mobile UX lift

---

## Open questions for user

1. Touch target standard: stick with **44px (Apple HIG)** or push to **48px (Material)**?
2. Tab bar: keep 4-up or convert to **bottom sheet drawer** (Phase 1 alt)?
3. Tour widget: auto-dismiss after first interaction, OR keep visible until user clicks X?
4. Sub-section labels: drop English parenthetical on mobile (loses SEO/accessibility hint) or use abbreviation (e.g. "Core Purp.")?
5. FAB SegmentedControl: keep 3 options or merge into single dropdown on mobile?

---

## File references

- ToggleSwitch source: `src/design-system/primitives/ToggleSwitch.jsx`
- Tab buttons: `src/App.jsx` ~line 690-720 (after Path B.5 collapse)
- 自動儲存 tour widget: `src/App.jsx` ~line 2000-2050 (fixed bottom-right)
- 右上角 button cluster: `src/App.jsx` ~line 120-160 (header)
- Sub-section labels: `src/App.jsx` ~line 380-1000 (基本/內容/規則 tabs)
- FAB SegmentedControl: `src/App.jsx` ~line 1750-1850 (規則 tab bottom)
