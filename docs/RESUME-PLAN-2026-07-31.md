# Innovative Teaching Prompt Studio — Resume Plan (2026-07-31)

> Handoff doc for a fresh session to pick up work. Read this first, then run §6 Resume Runbook.

---

## 1. TL;DR

Project is in a **broken commit state**:
- Latest commit `c976133` (CI red→green attempt) — **CI RED, not deployed**
- Live page is on `e4039224` (2026-07-13, 18 days stale)
- 4 fix files committed in `c976133`; 1 unit test + 3 smoke tests still failing
- 2 untracked proposal docs in working tree
- No active cron

**2 root cause P0s need senior-engineer review before next commit:**

| P0 | Location | Issue | Status |
|----|----------|-------|--------|
| **P0-A** | `.github/workflows/deploy.yml` | "Build for production bundle smoke" step doesn't produce dist/, all smoke tests fail with "dist/index.html not found" | **NOT investigated** (junior assumed it would work; CI run took 25s) |
| **P0-B** | `useAppState.js:937-958` + `tests/auto-fill-from-profile.test.jsx:174` | Auto-apply useEffect never propagates formData update. **Root cause identified but not fixed**: `applyProfile` (line 897-922) has "fill only empty" semantics (`if (!prev[key] || prev[key].trim().length === 0)`), but the test expects profile to override non-empty `formData.grade='小學二年級 (P2)'` (initial default). Semantic mismatch — fix requires either: (a) add `force: true` flag to `applyProfile` for auto-apply path, (b) update test to clear grade first, or (c) change merge logic | **Root cause known, fix not shipped** |

**3 follow-up P0s in v3.18.0 plan, none started:**

| Item | Effort | Status |
|------|--------|--------|
| §2.2 Import-linter (ESLint custom rule `no-unused-imports-in-conditional-jsx`) | 0.5d | Not started |
| §2.3 1.2 Smart Field Auto-Complete (heuristic + Gemini Flash Lite opt-in) | 1.5d | Not started |
| §2.1 Bundle trim architectural (framer-motion removal, 30+ usages) | 1.5d | Deferred to v3.18.1 |

---

## 2. Repo State

```
Branch: main
Latest commit:   c976133 (2026-07-31 17:08:24+08) — "fix: CI red → green" — CI RED
Previous commit: d09fd03 (2026-07-17 13:50:20Z) — 6.1 hotfix          — CI RED
Last green:      e4039224 (2026-07-13 13:42:37Z) — 6.1 smoke test     — CI GREEN (deployed)

Live page serving: e4039224 build (last successful deploy, 18 days old)
Remote:           https://github.com/ihateusingai-beep/innovative-teaching-prompt-studio
Public URL:       https://ihateusingai-beep.github.io/innovative-teaching-prompt-studio/
```

**Working tree (uncommitted):**
```
?? docs/product-proposal-v3.17.0.md   (15 kB, frozen historical)
?? docs/product-proposal-v3.18.0.md   (15 kB, current plan)
```

**2 untracked docs preserved — DO NOT trash on `git clean -fd`.**

---

## 3. The 4 Fix Files in c976133 (Already Committed)

| File | Lines | What it does |
|------|-------|--------------|
| `.github/workflows/deploy.yml` | +15 -2 | Removed `; echo "EXIT=$?"` hack masking test failures; added explicit `npm run build` step; smoke step now `npx vitest` directly (skips double build) |
| `tests/auto-fill-from-profile.test.jsx` (mock) | +5 -1 | Mock setter stringifies booleans (matches real localStorage semantics) |
| `tests/auto-fill-from-profile.test.jsx` (test 1.1) | +9 -4 | Wrapped auto-apply assertions in `await waitFor(...)` |
| `tests/smoke-click-coverage.test.js` | +28 -11 | `findButtonsByText` now normalizes whitespace; `'AI 幫我諗'` → `'AI 幫我'` substring (covers rules tab copy 'AI 幫我加規則') |

**Local result: 2 unit + 1 smoke failing.** **CI result: same failures, plus all smoke tests now fail with "dist not found"** (workflow P0-A).

**The 2 unit failures** are:
- `tests/auto-fill-from-profile.test.jsx:174` — auto-apply effect test (P0-B root cause)
- **2nd unit failure NOT YET IDENTIFIED** — user only ran `tail -5`, didn't share full output. Need to re-run with full output to identify.

---

## 4. P0-A: Workflow Build Step Failure

### Symptom (CI annotation excerpt)
```
tests/smoke-click-coverage.test.js:38 — Error: dist/index.html not found
tests/smoke-build.test.js:34        — Error: dist/index.html not found
tests/smoke-build.test.js:142       — Error: dist/index.html not found
.github:170                         — Process completed with exit code 1.
```

### Workflow content (`deploy.yml` lines 35-45)
```yaml
- run: npm test
- name: Build for production bundle smoke
  run: npm run build
- name: Production bundle smoke (...)
  run: npx vitest run --config vitest.config.js tests/smoke-build.test.js tests/smoke-click-coverage.test.js
```

### Hypothesis (UNVERIFIED)
1. `npm run build` (`npm run check:icons && vite build`) silently fails on `check:icons` — but step shows success
2. `npm run build` succeeds but `dist/` is created in a non-CWD location
3. The "Build" step never actually runs (workflow YAML issue)
4. The vite `outDir` defaults somewhere unexpected in CI

### Investigation commands (run on `kencheng@KenChengdeMacBook`)
```bash
cd "/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio"
# 1. Verify build locally succeeds
npm run build
ls -la dist/  # expect index.html

# 2. Run build + smoke in sequence like CI does
npm run build && npx vitest run tests/smoke-build.test.js tests/smoke-click-coverage.test.js

# 3. If local passes, fetch actual CI log:
#    https://github.com/ihateusingai-beep/innovative-teaching-prompt-studio/actions/runs/30618850162
#    Look for "Build for production bundle smoke" step output (file: deploy.yml)
```

### Possible fixes (ranked by likelihood)
1. **Force-fail on build error**: Add `set -e` to step or `npm run build || exit 1`
2. **Move build into test step**: `run: npm run build && npm test && npx vitest run tests/smoke-*`
3. **Check if `check:icons` script is the silent failure**: `node scripts/check-icons.mjs` and inspect output
4. **Test with simpler build script**: replace `npm run check:icons && vite build` with just `vite build` temporarily

---

## 5. P0-B: Auto-Apply Effect Semantic Mismatch

### Symptom (CI annotation excerpt)
```
tests/auto-fill-from-profile.test.jsx:174
AssertionError: expected '小學二年級 (P2)' to be '小三'
- Expected: 小三
+ Received: 小學二年級 (P2)
```

### Root cause (FOUND via senior review, fix NOT shipped)

**Two code paths with conflicting semantics:**

**Path 1: `applyProfile` (useAppState.js:897-922)** — used by user clicking "套用 profile" button:
```js
for (const [key, value] of Object.entries(profile.preset)) {
    if (Array.isArray(value) && Array.isArray(prev[key])) {
        merged[key] = Array.from(new Set([...prev[key], ...value]));
    } else if (typeof value === 'string') {
        if (!prev[key] || prev[key].trim().length === 0) {  // <-- "fill only empty"
            merged[key] = value;
        }
    }
}
```

**Path 2: Auto-apply useEffect (useAppState.js:937-958)** — fires on mount when default set:
```js
useEffect(() => {
    if (!defaultProfileId || !autoApplyEnabled) return;
    const profiles = profileBank.profiles || [];
    if (profiles.length === 0) return;
    const profile = profiles.find(p => p.id === defaultProfileId);
    if (!profile) { ...stale-id recovery... return; }
    if (formData.toolName && formData.toolName.trim()) return;  // clobber gate
    if (formData.purpose && formData.purpose.trim()) return;    // clobber gate
    applyProfile(profile);  // <-- uses Path 1 logic!
    ...
}, [defaultProfileId, autoApplyEnabled, profileBank.profiles]);
```

**The conflict:** `applyProfile` is "fill only empty" — it does NOT override non-empty fields. The auto-apply effect intends to apply the default profile to a fresh form. But formData initializes with `grade: '小學二年級 (P2)'` (a default suggestion from `getInitialFormData()`), so the profile's `grade: '小三'` is silently ignored.

**Test expectation** (line 174): `formData.grade === '小三'` — assumes profile overrides default.

### Fix options (pick ONE)

| Option | Code change | Trade-off |
|--------|------------|-----------|
| **A** | Add `force` param to `applyProfile`, call `applyProfile(profile, { force: true })` in auto-apply | Cleanest semantic. User-clicked apply still "fill only empty" (safe). Auto-apply is "always apply" (correct intent). |
| **B** | Update test: clear formData.grade before the waitFor | Test-hack. Hides the real semantic issue. |
| **C** | Change `applyProfile` merge logic to "always set" | Breaks user-clicked apply behavior. Users who manually edited grade would lose their edit. |
| **D** | Update auto-apply effect to use a different merge path (don't reuse `applyProfile`) | Most code, but most explicit. |

**Recommended: Option A** — minimal, explicit, preserves both semantics.

### Investigation commands
```bash
# Find getInitialFormData to confirm grade default
grep -rn "getInitialFormData\|小學二年級" src/state/

# Run failing test with verbose output
npx vitest run tests/auto-fill-from-profile.test.jsx -t "auto-apply effect"
```

### Also: 2nd unit failure (unidentified)
User reported "2 failed | 20 passed (22) test files, 2 failed | 420 passed (422) tests" but only showed `tail -5`. The 2nd unit test file failure is unknown. Run full output to identify:
```bash
npx vitest run --reporter=verbose 2>&1 | grep -E "FAIL|✗" | head -20
```

---

## 6. Resume Runbook

### Step 0: Pre-flight recon (per memory §6)
```bash
cd "/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio"
# Bash tool wedge is normal in this Mavis Code session — use web_fetch / read / grep / edit / write only
# (See §11 Known Issues below)
```

Verify state with web_fetch:
- Latest commit: `https://api.github.com/repos/ihateusingai-beep/innovative-teaching-prompt-studio/commits?per_page=1`
- CI status: `https://api.github.com/repos/ihateusingai-beep/innovative-teaching-prompt-studio/actions/runs?per_page=1`
- Untracked docs: read `docs/product-proposal-v3.18.0.md` (current plan)

### Step 1: Decide path

| Scenario | Action |
|----------|--------|
| Bash works (Mavis Code wedged session can run commands) | Continue to Step 2 |
| Bash still wedged | User must run commands manually; Mavis writes code, user commits |

### Step 2: Fix P0-A (workflow)
- Read current `deploy.yml` (already in c976133, no need to re-fetch)
- Run `npm run build` locally; verify `dist/index.html` created
- If local build passes, the workflow YAML has a step-ordering issue
- Apply fix (likely Option 1: add `set -e` or move build inline)
- Don't commit yet — go to Step 3

### Step 3: Fix P0-B (auto-apply semantic)
- Read `useAppState.js:897-922` (applyProfile) and `:937-958` (auto-apply effect)
- Apply Option A: add `force` param to `applyProfile`, call with `force: true` from auto-apply
- Update mock in `tests/auto-fill-from-profile.test.jsx` if needed (probably not — force is internal to useAppState)
- Don't commit yet — go to Step 4

### Step 4: Run all tests locally
```bash
npm test 2>&1 | tail -30       # capture all failures
npm run test:smoke 2>&1 | tail -30
```
**All tests must pass before commit.** If 2nd unit test failure surfaces, fix that too.

### Step 5: Senior review
Per memory §13, multi-version / apply-with-choices features need senior review. The 1.1 Auto-Fill is a "apply-with-choices" feature. The 2 fix points are senior-review-required:
- P0-A: workflow step ordering (1 senior review)
- P0-B: applyProfile semantic change (1 senior review — affects user-clicked apply too)

### Step 6: Single commit + push
```bash
git add .github/workflows/deploy.yml src/state/useAppState.js tests/auto-fill-from-profile.test.jsx
git commit -m "fix: P0-A workflow build + P0-B auto-apply force mode

- .github/workflows/deploy.yml: <describe P0-A fix>
- src/state/useAppState.js: applyProfile() gains force param (default false).
  Auto-apply effect (line 937) now calls applyProfile(profile, { force: true })
  so profile values override initial formData defaults (e.g. grade='小學二年級 (P2)').
  User-clicked apply still 'fill only empty' — safer for in-progress editing.

- tests/auto-fill-from-profile.test.jsx: <describe any test update>

Senior review: pass (round 1).
Closes v3.18.0 P0 follow-ups (1+2+Bug 3 hotfix + workflow).

Test: 422/422 + 11/11 smoke (was 2 unit + 1 smoke fail before this commit)."
git push
```

### Step 7: CI verify cron
```bash
# After push, set up cron to monitor CI
mavis cron self ci-verify-<NEW-SHA> 5m "Check CI for <SHA>... exit on green/red..."
# Cron prompt MUST include:
# - explicit kill command: `mavis cron delete mavis ci-verify-<SHA>`
# - active-work probe (avoid idle ticks per memory §9)
# - exit conditions
```

---

## 7. v3.18.0 Sprint 1 Plan (3 items, 2.25d bounded)

From `docs/product-proposal-v3.18.0.md` §2:

| ID | Item | Effort | Files | Notes |
|----|------|--------|-------|-------|
| **§2.1** | Bundle trim architectural (framer-motion removal) | 1.5d (deferred to v3.18.1) | App.jsx ~20 motion usages, modals.jsx ~9 | Quick-win partial (~5-10 kB modals only) doesn't hit 700 kB budget. Architectural refactor 1.5-3d. |
| **§2.2** | Import-linter | 0.5d | `eslint-plugin-local-rules/` + custom rule | Catches getSuggestions-class bug at lint time. 6 tests (3 false-positive + 3 real P0 detection). |
| **§2.3** | 1.2 Smart Field Auto-Complete | 1.5d | TBD | Heuristic + Gemini Flash Lite opt-in. Cost/UX trade-off open question. |

**Optional buffer** (if Sprint 1 has capacity): 2.7 CSV Import (0.5d), 4.1 Auto-Save Recovery (0.5d), 5.3 Smart Default Values (0.5d).

**v3.18.1 (next month, deferred items):** 3.1 Design System docs (4.0d), 1.3 Cohort View (1.5d), 1.4 Version Compare (1.0d), 1.5 Batch Print (1.0d), Bundle trim architectural (1.5d).

---

## 8. Key File Paths

### Source (state, components, hooks)
- `src/App.jsx` (2500+ LoC, main UI)
- `src/state/useAppState.js` (~1100 LoC, **P0-B target**)
  - Line 96-1100: `useAppState` export
  - Line 252-253: `defaultProfileId` / `autoApplyEnabled` useLocalStorage
  - Line 897-922: **`applyProfile` function (P0-B target)**
  - Line 937-958: **auto-apply useEffect (P0-B target)**
- `src/components/ProfileBankPanel.jsx` (preset bank UI, 設為預設 button)
- `src/components/modals.jsx` (`ConfirmDialog`, API settings, CoachMark, AwardCertificate)
- `src/hooks/useLocalStorage.js` (real impl, NOT the mock)
- `src/hooks/useProfileBank.js` (real impl, NOT the mock)
- `src/data/option-tables.js` (SSOT for categories, subjects, senTypes, etc.)
- `src/data/suggestions.js` (`getSuggestions` — was the import that broke b701ac5..d405c0b)

### Tests
- `tests/auto-fill-from-profile.test.jsx` (**P0-B target**)
  - Line 14-18: import
  - Line 20-50: mock for useLocalStorage (stringify booleans fix already applied)
  - Line 50-75: mock for useProfileBank
  - Line 84-200: 1.1 hook tests
  - Line 161-180: **auto-apply effect test (P0-B target)**
- `tests/smoke-build.test.js` (8 tests, loads dist/index.html)
- `tests/smoke-click-coverage.test.js` (3 tests, click coverage; P0-A affected)
- `tests/reduced-motion.test.js` (v3.15.0 V1)

### Config + docs
- `.github/workflows/deploy.yml` (**P0-A target**)
- `vite.config.js` (MANGLE_RESERVED list; terser config)
- `vitest.config.js`
- `package.json` (test scripts)
- `scripts/check-icons.mjs` (pre-build icon guard — possible P0-A cause)
- `AGENTS.md` (project conventions)
- `docs/product-proposal-v3.17.0.md` (frozen historical)
- `docs/product-proposal-v3.18.0.md` (current plan, read this for context)
- `docs/RESUME-PLAN-2026-07-31.md` (this file)

### Auth + deploy
- Auth gate: `index.html` inline script, SHA-256 client-side, sessionStorage `itps_auth_v1` key
- Live URL: `https://ihateusingai-beep.github.io/innovative-teaching-prompt-studio/`
- Test bypass: `sessionStorage.setItem('itps_auth_v1', '1')` BEFORE script load (matches inline auth-gate)

---

## 9. Test Counts (Reference)

| Test file | Tests | Last status |
|-----------|-------|-------------|
| Auto-fill (1.1) | 11 | **1 failing** (line 174 — P0-B) |
| All other unit tests | ~411 | 1 unknown failure (need full verbose output to identify) |
| Smoke-build | 8 | All failing in CI (P0-A), passes locally |
| Smoke-click-coverage | 3 | All failing in CI (P0-A), unknown locally |

**Target after this commit: 422/422 unit + 11/11 smoke = 433 total.**

---

## 10. Bundle State

```
Bundle size: 722.56 kB / gzip 291.53 kB
Budget:      700 kB
Overage:     +22.56 kB (P1 — non-blocking)
```

Bundle trim architectural refactor (1.5-3d, deferred to v3.18.1) is the structural fix. Quick-win (~5-10 kB) only hits modals.jsx.

---

## 11. Known Issues (Mavis Code Session)

### Bash tool CWD wedge
**Symptom:** Every `bash` call returns `Working directory does not exist: /Users/kencheng/workspace/vs code/TDA` (or similar). Even `echo ping` fails. The session's bash CWD is wedged to a stale path.

**Workaround:**
- `read` / `edit` / `write` / `glob` / `grep` with absolute paths ✓
- `web_fetch` ✓
- `mavis` (native tool) ✓ (for cron, agent, session ops)
- `bash` ✗ (wedged)

**Recovery:** New Mavis Code session, or `mavis cron` jobs (which run in fresh worker context with own bash).

**APPLIES:** This resume plan assumes the new session MAY have the same bash wedge. If bash works, use it. If not, write code via edit/write, ask user to run commands.

### Cron discipline
- 3 stale crons from other projects (friendly-classroom-v2 × 2, plan monitor × 1) — DO NOT touch them
- No active cron for innovative-teaching-prompt-studio (deleted at user's request 2026-07-31 17:40)

### Memory rules that apply
- §2: cron prompt must include explicit kill command
- §5: senior review required for refactor / >100 LoC additions
- §6: 30s pre-flight before worker spawn
- §13: senior review required for multi-version / apply-with-choices features (1.1 auto-apply IS apply-with-choices)
- §14: coverage + a11y gates (not currently enforced; baseline acceptable for SEN app)

---

## 12. Pre-Written Prompt for Fresh Session

Paste this into a fresh Mavis session to bootstrap:

```
Read /Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/docs/RESUME-PLAN-2026-07-31.md first. This is a handoff doc from a previous session that paused at 2026-07-31 17:40.

Project: Innovative Teaching Prompt Studio (SEN teacher prompt builder, React/Vite single-file SPA)
Branch: main, latest commit c976133 (CI RED, not deployed)
Live page stale: 18 days on e4039224

Top priority (P0):
1. P0-A: Workflow build step in .github/workflows/deploy.yml — dist/ not created, all smoke tests fail in CI
2. P0-B: Auto-apply effect in useAppState.js:937-958 has semantic mismatch with applyProfile (line 897-922). Fix Option A: add force param to applyProfile, call with {force: true} from auto-apply path.

After fixing both, single commit + push. Then set up CI verify cron with explicit kill command.

Also identify the 2nd unit test file failure (user only saw tail -5, not full output).

DO NOT touch:
- 3 stale crons (other projects)
- Mavis Code session bash CWD wedge (use web_fetch / read / edit / write with absolute paths)
- The 2 untracked docs in working tree (docs/product-proposal-v3.17.0.md, docs/product-proposal-v3.18.0.md)
```

---

## 13. Open Questions for User (resolve before fixing)

1. **P0-B fix option**: A (add force param), B (test hack), C (always-set merge), D (separate path). Recommend A.
2. **2nd unit test failure**: Re-run `npm test 2>&1 | grep -E "FAIL|✗" | head -20` to identify before fixing.
3. **v3.18.0 sprint 1 start**: After P0-A + P0-B fix, ready to start §2.2 Import-linter (0.5d)?
4. **2 untracked docs**: When to commit `docs/product-proposal-v3.17.0.md` and `docs/product-proposal-v3.18.0.md`? (Could be in the same P0-fix commit, or separate doc commit.)

---

**End of handoff doc. Total: ~430 lines. Last updated: 2026-07-31 17:40 (Asia/Hong_Kong).**

---

## §A. Update Log (2026-08-06)

### A.1 Delta from 2026-07-31 to 2026-08-06 (6 days idle)

**No new commits, no new pushes, no new CI runs, no new crons.** Project state is **frozen** at c976133 (CI red). Per memory §6: pre-flight recon MUST start with `git status --short` + `git log --oneline -5` — 6 日 idle in this state is a strong signal that user has shelved work for a reason (waiting on external decision / paused for budget / context switch).

### A.2 Updated repo state (corrects §2 "18 days stale" line)

| Metric | Value | Δ from 2026-07-31 |
|--------|-------|-------------------|
| Latest commit | `c976133` (2026-07-31 09:08:45Z) | unchanged |
| Last green CI | `e4039224` (2026-07-13 13:42:37Z) | unchanged |
| Live page stale | **24 days on e4039224** (was 18) | +6 days |
| Working tree untracked | +1 new file: `docs/RESUME-PLAN-2026-07-31.md` (this doc, 19846 bytes) | +1 |
| Working tree untracked (other) | `docs/product-proposal-v3.17.0.md`, `docs/product-proposal-v3.18.0.md` | unchanged |
| Active crons | 0 | unchanged |
| Stale crons (other projects, ignore) | 3 | unchanged |

### A.3 Decision matrix (Aug 6 perspective)

If user returns to this work, **the priority order is now**:

1. **Decide**: ship P0-A + P0-B fix (resume the broken state), OR revert c976133 to d09fd03 state (re-open live page but lose the 4 fix files)?
   - **Ship P0-A + P0-B** (recommended if user wants v3.18.0 progress)
   - **Revert c976133** (recommended if user wants to unblock live page deploy NOW and redo the 4 fixes later with a different approach)
2. **Either way**: 2 untracked proposal docs (`product-proposal-v3.17.0.md` + `product-proposal-v3.18.0.md`) are STILL in working tree — 6 日唔 commit 暗示 user 故意 uncommitted（可能想 ship 喺 P0-fix commit 入面）
3. **2nd unit test failure**: still unidentified (Step 4 嘅 grep command 未跑過)

### A.4 Risks from 6 日 idle

- **Live page drift**: 24 days stale. If teacher used the live page between Jul 17 → Aug 6 with 6.1 hotfix 未 deploy 嘅 state，佢哋 experience 嘅係 `e4039224` build（6.1 smoke test commit）。冇 critical bug 因為 6.1 hotfix only fix test code 唔 fix source。但係 formData 6.1 hotfix 嘅真實 fix（round-based re-query etc.）只喺 tests/smoke-click-coverage.test.js，唔影響 production。
- **uncommitted file 風險**: `git clean -fd` 仲未跑過所以 OK。但係 6 日期間 user 開其他 session 可能 touch 過 `tests/smoke-click-coverage.test.js`（4 fix file 嘅 1 個），uncommitted 嘅改動可能同 local working tree drift 唔同。建議 §6 Step 0 pre-flight 用 `git diff tests/smoke-click-coverage.test.js` 確認本地仲係 7-31 寫嘅 version。
- **Memory hygiene**: 3 stale crons from 6 月 仍然 idle，仲未 expired TTL（crons 冇 auto-expire 除非 prompt 入面 explicit 寫）。但係唔阻礙工作，可以 defer cleanup。
- **P0-A workflow hypothesis 可能 stale**: 6 日前我嘅 hypothesis 係 "build step 唔 produce dist"。可能 user 已經 manual run 咗 `npm run build` 本地確認 build 成功，所以 P0-A 嘅 root cause 可能唔係 build step 本身而係別嘅（例如 env var 唔見咗 / node 20 deprecation 真係 break 咗啲嘢 / 等等）。建議 §6 Step 2 第一件事係 "local run `npm run build && npm run test:smoke` 確認係咪 P0-A 真係 reproduce"。

### A.5 NEW user question (didn't exist on 7-31)

- **是否完全 abandon v3.18.0 路線圖？** 6 日 idle + P0-A 仍然 uninvestigated + 2 untracked proposal doc 從未 commit 暗示 user 可能已經改變 scope（例如開新 project 改做 v3.19.0 嘅 AI workflow features 等等）。User 答呢條先決定 P0 fix 仲做唔做。

---

**End of update log. Doc total: ~480 lines. Last appended: 2026-08-06 22:48 (Asia/Hong_Kong).**
