# AGENTS.md — Innovative Teaching Prompt Studio

## Project Overview

`~/workspace/vs code/Innovative Teaching Prompt Studio/` — 純前端 single-file React app，幫 SEN 教師生成結構化 prompt 餵畀 AI（Gemini / Claude / Lovable / v0 等）構思 + 生成教學工具。

**v3.0 modular source + single-file distribution build**: 開發用 modular Vite source (`src/`)，`npm run build` 將所有 JS/CSS inline 入 `dist/index.html`。老師收到嘅係 1 個 ~410KB 嘅 HTML file，唔需要 hosting / install。

## Tech Stack (locked, v3.0)

| Component | Choice | Version | Why |
|-----------|--------|---------|-----|
| **Framework** | React | 18.2 | Stable, classic JSX runtime |
| **JSX runtime** | Classic (`React.createElement`) | n/a | Vite `react({ jsxRuntime: 'classic' })` 避免 emit `react/jsx-runtime` bare specifier |
| **Bundler** | Vite | 5.4 | ESM + singlefile plugin |
| **Singlefile** | vite-plugin-singlefile | latest | inline JS/CSS/asset 入 HTML |
| **Minifier** | **Terser** (NOT esbuild) | 5.x | **必須用 terser**，esbuild 會撞名 (see "Minifier 陷阱" below) |
| **Animations** | Framer Motion | latest | Import 個別 modules (`motion`, `AnimatePresence`) |
| **Icons** | Lucide React | 0.292 | Tree-shake by import names |
| **Styling** | Tailwind CSS | 3.4 (build-time via PostCSS) | Tokens + JIT, no runtime CDN |
| **Docx** | docx | latest | Word export (CN font support) |

**Build target**: `es2018` (兼容較舊 browser) · `cssCodeSplit: false` · `inlineDynamicImports: true`

## File Structure (v3.0)

```
tda/
├── index.html              # 30-line shell — references /src/main.jsx
├── package.json            # React 18.2 + Vite 5 + terser
├── vite.config.js          # single-file IIFE config + mangle.reserved
├── tailwind.config.js      # design tokens + content paths
├── postcss.config.js       # Tailwind + autoprefixer
├── .gitignore              # node_modules + dist excluded
├── AGENTS.md               # This file
├── README.md               # User-facing distribution doc
├── src/                    # Source (modular)
│   ├── main.jsx            # React mount entry
│   ├── App.jsx             # Pure render — useAppState() destructure + renderStep1-4
│   ├── styles/index.css    # Tailwind directives + design tokens + legacy CSS
│   ├── data/               # Pure data + helpers
│   │   ├── schema.js       # SCHEMA_VERSION, FORM_SCHEMA, migrateFormData, getInitialFormData
│   │   ├── scorer.js       # promptScorer (default export!)
│   │   ├── suggestions.js  # 36 AI suggestion templates
│   │   ├── templates.js    # 8 BUILTIN_TEMPLATES
│   │   └── sen-a11y-map.js # SEN type → a11y dimensions map
│   ├── utils/              # Stateless helpers
│   │   ├── clipboard.js
│   │   ├── docx.js
│   │   ├── gemini.js
│   │   ├── storage.js
│   │   └── time.js
│   ├── prompts/
│   │   └── generators.jsx  # generateDesignPrompt(formData) + generateTechPrompt(formData)
│   ├── hooks/              # Custom React hooks
│   │   ├── useFormData.js  # Form state + setters (updateField / toggleSelection / examples / rules)
│   │   ├── useAutosave.js  # localStorage debounce auto-save + recovery
│   │   ├── useUndoRedo.js  # Milestone-based history (Cmd+Z / Cmd+Shift+Z)
│   │   └── useLocalStorage.js  # Generic key/value hook w/ cross-tab sync
│   ├── state/
│   │   └── useAppState.js  # Centralized state + handlers (the App state aggregator)
│   └── components/         # UI primitives
│       ├── ui.jsx          # Card, Label, Input, TextArea, Select, CollapsibleSection
│       ├── modals.jsx      # ApiSettingsModal, CoachMark, ConfirmReplaceDialog
│       └── widgets.jsx     # QualityScoreBadge, QualityScoreDetail, TemplateCard, SuggestionPanel
└── dist/                   # Build output (gitignored)
    └── index.html          # 410KB single-file IIFE bundle — THIS is what users get
```

## Hard Constraints (DO NOT break)

### 1. **JSX runtime MUST stay classic**
- Vite config 必須有 `react({ jsxRuntime: 'classic' })`
- 改去 automatic runtime 會 emit `import 'react/jsx-runtime'` bare specifier → file:// 唔 work

### 2. **Zero backend / Zero runtime CDN**
- 純 client-side, 唔好提議 server endpoint / proxy
- 教師用嘅 prompt / 學生資料唔可以離開 browser
- Gemini API key 純 localStorage（雖然 security 有 trade-off，但 commit 時絕對唔好 inline）
- Build 後必須 single-file (`dist/index.html`)，老師 email / USB / file:// 都用得

### 3. **Schema migration backward compat**
- FormData shape 由 SCHEMA_VERSION v2 開始（見 `src/data/schema.js` 的 `migrateFormData`）
- 每次 formData shape 改動要 bump SCHEMA_VERSION + 加 `FIELD_RENAMES` / `FIELD_TRANSFORMS` entries
- 舊 JSON import 必須仍 work

### 4. **Auto-save / Recovery policy**
- `localStorage` key naming: `TDA_<KEY>_V<N>` (見 "Hard-coded values" below)
- Auto-save debounce 1s, recovery prompt only 7 內有效
- 唔好亂清 localStorage

### 5. **Minifier 陷阱 — 必須用 Terser + `mangle.reserved`** (CRITICAL)
- **唔好用 esbuild minifier** for single-file IIFE bundle.
- 原因：Rollup 將多個 module 合併到 top-level scope 時，esbuild minifier 唔識跨 module 保留 unique name。例如 `useAutosave.acceptRecovery` 同 `useAppState.triggerFileInput` 兩個 module-private function 會被 mangle 做同一個 short name (`bi`)，second def overwrite first，導致 `ReferenceError: triggerFileInput is not defined` 喺 production runtime。
- **Fix**：用 `build.minify: 'terser'` + `terserOptions.mangle.reserved` list 覆蓋所有 hook return value + useAppState public callback names。
- Reserved list 喺 `vite.config.js` `MANGLE_RESERVED` const。**新增 hook / useAppState return value 時必須更新呢個 list**，否則 build 會成功但 runtime 撞名。
- 快速判斷：`grep -ob "<newname>" dist/index.html` — 如果 minified 應該見到 short name，見到 long name = reserved 生效。

## Workflow Rules

### Code conventions
- Use functional `setFormData(prev => ({ ...prev, [key]: value }))` updates, never direct spread
- 16 個 Label 編號 (1.1-1.12 / 2.1-2.3 / 3.1) 必須 unique stable — 老師喺 prompt 入面 reference
- Use design tokens (`.p-token-*`, `.shadow-token-*`, `.transition-token-*`) for new code
- Avoid raw Tailwind spacing classes (`p-2` etc.) — 已 migrated to tokens

### Module structure
- `src/data/` — pure data + helpers, no React
- `src/utils/` — stateless helpers, no React
- `src/hooks/` — React hooks (state + effects)
- `src/state/useAppState.js` — App-level state aggregator (calls all hooks)
- `src/components/` — presentational JSX
- `src/App.jsx` — pure render (calls `useAppState()`, destructure state, render)

### Comments
- 一律繁體中文 (zh-Hant)
- 為何而非僅係做咩 (intent over mechanics)
- 標明 Phase / Sprint metadata when relevant

## Hard-coded values (DO NOT change without migration)

| Field | Value | Where | Why locked |
|-------|-------|-------|-----------|
| `SCHEMA_VERSION` | 2 | `src/data/schema.js` | formData shape contract |
| `AUTOSAVE_KEY` | `'TDA_AUTOSAVE_V1'` | `src/hooks/useAutosave.js` | localStorage contract |
| `USER_TEMPLATES_KEY` | `'TDA_USER_TEMPLATES_V1'` | `src/hooks/useLocalStorage.js` (useAppState) | localStorage contract |
| `ONBOARDING_KEY` | `'TDA_ONBOARDING_DONE_V1'` | `src/hooks/useLocalStorage.js` (useAppState) | localStorage contract |
| `GEMINI_API_KEY_STORAGE` | `'TDA_GEMINI_API_KEY_V1'` | `src/hooks/useLocalStorage.js` (useAppState) | localStorage contract |
| `BUILTIN_TEMPLATES` | 8 entries (id: `math-add-gacha-p1`, etc.) | `src/data/templates.js` | Template IDs are stable references |
| `PURPOSE_POOL` / `CONTEXT_POOL` / `RULES_POOL` | 36 suggestions | `src/data/suggestions.js` | AI Suggestion engine contract |

## Development Workflow

### Dev mode (HMR)
```bash
npm install      # first time only
npm run dev      # http://127.0.0.1:5173
```

### Build (production single-file)
```bash
npm run build    # → dist/index.html (~410KB, 129KB gzipped)
```

### Verify build
```bash
# 1. Open in real Chrome (file://)
open -a "Google Chrome" "file://$(pwd)/dist/index.html"

# 2. Or serve locally
python3 -m http.server 8765 --bind 0.0.0.0 --directory dist

# 3. Check console for errors (Chrome DevTools)
#    Should only see Chrome extension WebSocket noise, zero app errors

# 4. Smoke test critical flows:
#    - Click "匯入 JSON" → file chooser opens (triggerJSONImport works)
#    - Toggle theme → body className switches theme-cyber/theme-plain
#    - Type in form → "已儲存 N 秒前" appears (auto-save)
#    - Reload page → "載入上次未完成？" recovery dialog appears
```

### When adding new hook return values or useAppState callbacks
1. Add the name to `MANGLE_RESERVED` in `vite.config.js`
2. Build → check `grep -ob "<newname>" dist/index.html` returns at least one hit (preserved)
3. Smoke test in real Chrome

## Phases (locked)

| Phase | Status | Notes |
|-------|--------|-------|
| **P0** Bug fixes | ✅ Shipped (v1) | Step numbering, docx font, clipboard API |
| **P1** Functional state / SEN / a11y | ✅ Shipped (v1) | 12 setters functional, 10 SEN types, 8 a11y dims |
| **P2** Rename + Schema v2 | ✅ Shipped (v1) | `isGemini` → `useGeminiStyle`, FAB style toggle |
| **P3** Collapse + Live preview | ✅ Shipped (v1) | Step 1 sub-sections, floating preview |
| **P4** CDN pipeline fix | ✅ Shipped (v2.0) | Babel classic runtime override (file:// work) |
| **P5** Category visibility | ✅ Shipped (v2.0) | 1.5 / 1.6 conditional render |
| **Phase 1** UX features | ✅ Shipped (v2.0) | Auto-save + Quality Score + Undo/Redo + AI Suggestions + Templates Library |
| **Phase 2-3** UX polish + AI integration | ✅ Shipped (v2.0) | Onboarding Tour + Direct Gemini + Empty States + SEN Smart |
| **Phase 2.3 + 3.4** Design Tokens + Motion | ✅ Shipped (v2.0) | Spacing / Shadow / Transition tokens + Ripple + Spring + Skeleton |
| **Phase 4** Build pipeline | ✅ Shipped (v3.0) | Vite + Tailwind config + terser minifier + single-file IIFE output |

## Testing Checklist (manual, before commit)

- [ ] `npm run build` succeeds
- [ ] Real Chrome `file://` loads `dist/index.html` without console errors
- [ ] Cyber theme active (dark background + neon glow)
- [ ] Auto-save recovery dialog appears on reload with prior data
- [ ] 8 BUILTIN_TEMPLATES load
- [ ] "匯入 JSON" button opens file chooser
- [ ] Onboarding Tour shows on first visit (clear localStorage to test)
- [ ] Quality Score badge updates as form changes
- [ ] Undo/Redo keyboard shortcuts work
- [ ] Theme toggle (Cyber ↔ Plain) updates `body` className
- [ ] `grep -ob "<reserved_name>" dist/index.html` returns hits (proves mangle.reserved working)

## Distribution

- Single `dist/index.html` (~410KB, ~129KB gzipped)
- 老師 share 方法:
  - Email `dist/index.html` 附件
  - USB / Google Drive
  - GitHub Pages
  - 學校 server
  - file:// 直接雙擊打開
- **Note**: Development 用 `index.html` (Vite shell) — **NEVER distribute `index.html`**. Always build → `dist/index.html`.

## Related Projects

- `~/workspace/vs code/pdf/` — PDF workstation (separate AGENTS.md)
- `~/workspace/vs code/education/chinese/reading-para/` — sen-yue-read-score (粵語朗讀評分)
- `~/workspace/yt-dlp-gundam/` — yt-dlp GUI wrapper (separate AGENTS.md, local-only)