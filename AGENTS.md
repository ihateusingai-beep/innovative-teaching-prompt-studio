# AGENTS.md — TDA Prompt Builder

## Project Overview

`~/workspace/vs code/TDA/` — 純前端 single-file React app，幫 SEN 教師生成結構化 prompt 餵畀 AI（Gemini / Claude / Lovable / v0 等）構思 + 生成教學工具。

**Single-file design**: 整個 app (HTML + CSS + JSX + state) 喺 `index.html` 入面。唔需要 build step, 直接 file:// / GitHub Pages / 學校 server 開即用。

## Tech Stack (locked)

| Component | Choice | Version | Why |
|-----------|--------|---------|-----|
| **Framework** | React | 18.2.0 | Stable, esm.sh support |
| **JSX runtime** | Classic (`React.createElement`) | n/a | file:// 唔識 resolve `react/jsx-runtime` bare specifier |
| **Animations** | Framer Motion | 10.16.4 | 已 import 個別 modules (`motion`, `AnimatePresence`) |
| **Icons** | Lucide React | 0.292.0 | Tree-shake by import names |
| **Styling** | Tailwind CSS | 3.4.x (CDN) | Zero build step, JIT runtime |
| **Babel** | @babel/standalone | 7.23.10 | In-browser JSX transform, classic runtime override |
| **Docx** | docx | 7.8.2 | Word export (CN font support) |

**CDN sources**: `esm.sh`, `unpkg.com`, `cdn.tailwindcss.com` — see `index.html` head.

## Hard Constraints (DO NOT break)

### 1. **JSX runtime MUST stay classic**
- 改去 automatic runtime 會 emit `import 'react/jsx-runtime'` bare specifier → file:// 唔 work
- `Babel.availablePresets.react` wrapper 必須保留喺 `<script>` 載入 Babel 之後

### 2. **CDN independence**
- Teacher 可能喺學校網絡唔穩嘅環境用 file://
- 唔可以引入新嘅 runtime dependency（除咁 CDN 已有嘅）

### 3. **Zero backend**
- 純 client-side, 唔好提議 server endpoint / proxy
- 教師用嘅 prompt / 學生資料唔可以離開 browser
- Gemini API key 純 localStorage（雖然 security 上有 trade-off，但 commit 時絕對唔好 inline）

### 4. **Schema migration backward compat**
- FormData shape 由 SCHEMA_VERSION v2 開始（見 `migrateFormData` function）
- 每次 formData shape 改動要 bump SCHEMA_VERSION + 加 `FIELD_RENAMES` / `FIELD_TRANSFORMS` entries
- 舊 JSON import 必須仍 work（5/5 smoke test）

### 5. **Auto-save / Recovery policy**
- `localStorage` key naming: `TDA_<KEY>_V<N>`
- Auto-save debounce 1s, recovery prompt only 7 內有效
- 唔好亂清 localStorage

## File Structure (currently single-file)

```
tda/
├── index.html          # 4421 lines — HTML + CSS + JSX + state
├── .gitignore
├── AGENTS.md           # This file
├── README.md           # User-facing distribution doc
└── [Phase 4: package.json + src/ + dist/]
```

## Workflow Rules

### Code conventions
- Use functional `setFormData(prev => ({ ...prev, [key]: value }))` updates, never direct spread
- 16 個 Label 編號 (1.1-1.12 / 2.1-2.3 / 3.1) 必須 unique stable — 老師喺 prompt 入面 reference
- Use design tokens (`.p-token-*`, `.shadow-token-*`, `.transition-token-*`) for new code
- Avoid raw Tailwind spacing classes (`p-2` etc.) — 已 migrated to tokens

### State management
- `formData` is the single source of truth
- All state setters use `useState` (functional update)
- `useRef` for non-rendering state (history stack, file inputs)

### Comments
- 一律繁體中文 (zh-Hant)
- 為何而非僅係做咩 (intent over mechanics)
- 標明 Phase / Sprint metadata when relevant

## Hard-coded values (DO NOT change without migration)

| Field | Value | Why locked |
|-------|-------|-----------|
| `SCHEMA_VERSION` | 2 | formData shape contract |
| `AUTOSAVE_KEY` | `'TDA_AUTOSAVE_V1'` | localStorage contract |
| `USER_TEMPLATES_KEY` | `'TDA_USER_TEMPLATES_V1'` | localStorage contract |
| `ONBOARDING_KEY` | `'TDA_ONBOARDING_DONE_V1'` | localStorage contract |
| `GEMINI_API_KEY_STORAGE` | `'TDA_GEMINI_API_KEY_V1'` | localStorage contract |
| `BUILTIN_TEMPLATES` | 8 entries (id: `math-add-gacha-p1`, etc.) | Template IDs are stable references |
| `PURPOSE_POOL` / `CONTEXT_POOL` / `RULES_POOL` | 36 suggestions | AI Suggestion engine contract |

## Phases (locked in `index.html` comments)

| Phase | Status | Notes |
|-------|--------|-------|
| **P0** Bug fixes | ✅ Shipped | Step numbering, docx font, clipboard API |
| **P1** Functional state / SEN / a11y | ✅ Shipped | 12 setters functional, 10 SEN types, 8 a11y dims |
| **P2** Rename + Schema v2 | ✅ Shipped | `isGemini` → `useGeminiStyle`, FAB style toggle |
| **P3** Collapse + Live preview | ✅ Shipped | Step 1 sub-sections, floating preview |
| **P4** CDN pipeline fix | ✅ Shipped | Babel classic runtime override (file:// work) |
| **P5** Category visibility | ✅ Shipped | 1.5 / 1.6 conditional render |
| **Phase 1** UX features | ✅ Shipped | Auto-save + Quality Score + Undo/Redo + AI Suggestions + Templates Library |
| **Phase 2-3** UX polish + AI integration | ✅ Shipped | Onboarding Tour + Direct Gemini + Empty States + SEN Smart |
| **Phase 2.3 + 3.4** Design Tokens + Motion | ✅ Shipped | Spacing / Shadow / Transition tokens + Ripple + Spring + Skeleton |
| **Phase 4** Build pipeline | ⏳ Planned (v3.0) | Vite + Tailwind config, single-file IIFE |

## Development Workflow

### Local test
- Open `index.html` in browser (file:// OK, no server needed)
- Edit source, refresh page (no HMR in single-file mode)

### Validate changes
- `node /tmp/tda_pX_check.js` — Babel syntax check (after each Phase)
- Migration smoke tests (5/5) — verify schema round-trip

### Phase 4 (future, v3.0)
- See `/tmp/tda_phase4_plan.md` for migration plan
- Will create `package.json`, `vite.config.js`, `tailwind.config.js`
- Output: `dist/index.html` (single-file IIFE bundle)
- Goal: production-grade build, zero CDN dep, offline support

## Testing Checklist (manual, before commit)

- [ ] Babel JSX syntax valid (`@babel/parser` check)
- [ ] 16 個 Label 編號 unique
- [ ] Schema migration 5/5 smoke test
- [ ] file:// 直接打開 work
- [ ] Live preview 即時 sync
- [ ] All 8 BUILTIN_TEMPLATES load
- [ ] Auto-save / Recovery round-trip
- [ ] Onboarding Tour 顯示（清 localStorage 後）
- [ ] Gemini direct API（如果設定咗 key）
- [ ] Theme toggle (Cyber ↔ Plain)

## Distribution

- Single `index.html` (4421 lines, ~268KB)
- 老師 share 方法:
  - Email .html 附件
  - USB / Google Drive
  - GitHub Pages
  - 學校 server
  - file:// 直接雙擊打開

## Related Projects

- `~/workspace/vs code/pdf/` — PDF workstation (separate AGENTS.md)
- `~/workspace/vs code/education/chinese/reading-para/` — sen-yue-read-score (粵語朗讀評分)
- `~/workspace/yt-dlp-gundam/` — yt-dlp GUI wrapper (separate AGENTS.md, local-only)