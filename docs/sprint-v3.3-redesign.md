# v3.3 Sprint: Modern UI Redesign

## Background

User feedback (2026-06-28): 用 `landing-page-builder` skill 嘅精神（modern aesthetic / glass morphism / gradient / animation）整靚現有 Innovative Teaching Prompt Studio app 嘅 UI。

**Confirmed scope**:
1. **Refactor theme → 保留 2 theme** (plain + warm)，拎走 cyber alias
2. **Modern redesign** — glass morphism、gradient、animation、typography polish
3. **唔郁** generator / schema / test（106 個 test 全部保留）

## Goal

App 嘅整體 visual 感覺升級去 2024-2025 modern web app standard（Vercel / Linear / Notion 嗰種）：
- 玻璃 card 統一用 `.glass-card` class（唔再用 inline Tailwind）
- Gradient accent 用 `.gradient-text` + 新 `.gradient-bg`
- Smooth transitions / hover lift / skeleton
- Typography hierarchy 清晰
- 2 個 theme（plain default + warm 低刺激）都 polish

## Scope (in / out)

### In scope
- `src/styles/index.css` — 新 design tokens（gradient variants / elevation / animation）+ 重組 glass utilities
- `src/components/ui.jsx` — 重寫 Card / Label / Input / Select / CollapsibleSection 用 modern tokens
- `src/components/widgets.jsx` — 重寫 QualityScoreBadge / TemplateCard / SuggestionPanel
- `src/components/modals.jsx` — 重寫 ApiSettingsModal / CoachMark / ConfirmReplaceDialog 用 glass
- `src/App.jsx` — 簡化 theme conditionals（cyber → plain 死 alias），用新 utility class
- `src/styles/index.css` body.theme-plain mesh background — 視覺 polish（更 subtle、更 modern）
- `src/styles/index.css` body.theme-warm — 重新設計為「柔和粉彩 + 暖色 glass」
- Icon / Logo 微調（NT-D emblem 可能要 modern 化）

### Out of scope
- Generator / Schema / Prompt 邏輯（v3.2.6 嘅 7 sub-toggle 全部保留）
- localStorage contract（TDA_* keys 保留 backward compat）
- New features（純 visual refresh）
- Cyber theme（alias 到 plain，唔再出現喺 UI 條件判斷）
- Multi-language / i18n

## Implementation Phases

### Phase 1: Theme refactor (foundation)
**Goal**: cyber alias 完全退役，177 個 conditionals 縮減到 60 個（只判斷 plain vs warm）。

- [ ] `src/styles/index.css`:
  - 拎走 `body.theme-cyber` 嘅獨立 rules，全部 alias 到 plain（保留 backward compat 假裝）
  - `body.theme-cyber::before/::after` 直接用 plain 嘅 pseudo-element rules
  - 新增新 tokens:
    - `--gradient-primary: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)` (simpler 2-stop)
    - `--gradient-soft: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.08))` (card hover)
    - `--elevation-1 / 2 / 3` (semantic naming)
    - `--animate-fade-in / slide-up / pulse-soft` keyframes
- [ ] `src/components/ui.jsx`:
  - 移除 `theme === 'cyber'` 分支（保留 `theme === 'warm'` 唔同 styles）
  - Card / Input / Label / TextArea / Select 用 `.glass-card` + `.glass-input` utility class
- [ ] `src/components/widgets.jsx`:
  - QualityScoreBadge / TemplateCard / SuggestionPanel 同樣移除 cyber branch
- [ ] `src/components/modals.jsx`:
  - 玻璃 backdrop（`backdrop-blur` + `bg-black/20`）
- [ ] `src/App.jsx`:
  - 簡化 177 個 conditionals（`theme === 'cyber' ? X : Y` 變 `theme === 'warm' ? X : Y` 因為 cyber = plain）
  - Header h1 用 `.gradient-text` + 現代 typography

### Phase 2: Visual polish (modern aesthetic)
**Goal**: 視覺上感覺 modern、professional、有 polish。

- [ ] `src/styles/index.css` body.theme-plain:
  - mesh gradient 重做：subtle pastel blobs，更柔和嘅 blur，半透明更克制
  - 加 subtle noise texture overlay（純 CSS gradient，不加圖）
- [ ] `src/styles/index.css` body.theme-warm:
  - 暖色 mesh（amber / rose 取代 violet / cyan）
  - 紙感 paper texture（純 CSS gradient）
  - Glass card 改用 warm 半透明（rgba(254,243,199,0.6)）
- [ ] Animations:
  - `.animate-fade-in` 喺 Card 入面用 motion 取代
  - `.animate-slide-up` 喺 Modal 入面用
  - 數值變化（如 QualityScoreBadge）用 transition transform
- [ ] Typography:
  - h1 用 `text-4xl md:text-5xl font-black tracking-tight gradient-text`
  - h2 用 `text-2xl font-bold tracking-tight`
  - body 用 `text-base leading-relaxed`
  - 數字 monospace 用 JetBrains Mono
- [ ] Buttons:
  - Primary button: gradient bg + glass overlay + shadow-lg hover lift
  - Secondary button: glass-card variant
  - Toggle switch: gradient on state、滑順 transition

### Phase 3: Verify (regression)
**Goal**: 確保 106 個 test 仍然 pass + GitHub Pages live 仍然 work + 2 theme 都正常。

- [ ] `npm test` — 106/106 預期 pass（無 UI test，但 logic 唔應該 break）
- [ ] `npm run build` — bundle 唔應該大幅變大（可能 ±5KB 因為新 CSS）
- [ ] Icon guard pre-build hook — pass
- [ ] Playwright live verify:
  - Default theme (plain)：見到 glass card / mesh gradient / 動畫
  - 切去 warm theme：見到暖色 mesh / paper texture / 暖色玻璃
  - 4 個 tab 切換：smooth transition
  - Quality score badge update：transition smooth
  - All existing 106 個 feature 仍然 work（toggle / load template / coach mark / AI 直接生成 hidden）

## Critical Files

| File | Lines | Touch scope |
|---|---|---|
| `src/styles/index.css` | 349 | Major — 重組 tokens + 新增 animations + 兩個 theme 重做 |
| `src/components/ui.jsx` | 134 | Medium — 5 個 primitive 重寫 |
| `src/components/widgets.jsx` | 187 | Medium — 3 個 widget 重寫 |
| `src/components/modals.jsx` | 176 | Light — 3 個 modal 玻璃 backdrop |
| `src/App.jsx` | 2104 | Medium — 簡化 conditionals + 應用新 class |

## Risks

| Risk | Mitigation |
|---|---|
| 改 App.jsx 入面 177 個 conditionals 大幅簡化時 bug | 每個 batch 改完立即 `npm run build` + Playwright verify（don't save big batches untested）|
| Bundle 大幅變大 | terser minify + 唔引入新 dependency + 重複 Tailwind class 抽去 CSS utility |
| Mesh gradient 視覺太 busy | 用更克制 opacity（0.06-0.10）+ 更大 blur radius |
| Warm theme 唔夠 polished | Design token 同 plain 對稱設計，唔可以 afterthought |

## Versioning

- v3.3.0 — 開始 redesign phase 1+2（major visual refresh）
- 不 bump MAJOR 因為 backward compat 完全保留
- README / AGENTS.md 更新 sprint history

## Verification Acceptance

- [ ] 106/106 tests pass
- [ ] Icon guard pre-build pass
- [ ] Bundle < 700KB（v3.2.6 = 632KB，+68KB budget for new CSS）
- [ ] Playwright live verify 兩個 theme 嘅 screenshot 都「感覺 modern」
- [ ] Teacher UX 唔 regress（toggle / load template / coach mark 全部仍 work）

## Out-of-band (留俾下次)

- i18n / 多語言切換
- Dark mode（目前只有 light variant）
- Mobile-specific responsive design（暫時 desktop-only）
- Custom theme builder（user 自選 accent color）
- Avatar / character illustration（沿用 NT-D emblem）
