// === v3.17.0 6.1: Click-coverage smoke test ===
// Catches the class of bug where conditional JSX hides a missing
// import that only fires AFTER user interaction. Example: getSuggestions
// import was missing on main since b701ac5; the suggestion panel
// (activeSuggestionField !== null) hid the ReferenceError until user
// clicked "AI 幫我諗" button. The existing smoke-build.test.js only
// checks INITIAL-LOAD errors, not post-click errors. This file closes
// that gap.
//
// Strategy:
//   1. Bypass auth via sessionStorage (set itps_auth_v1='1' BEFORE script load)
//   2. Load dist/index.html in jsdom (same pattern as smoke-build.test.js)
//   3. Wait for React mount
//   4. Click each interactive element (by text content)
//   5. After each click, assert NO ReferenceError / TypeError / SyntaxError
//
// jsdom limitations:
//   - Some clicks trigger async network calls (Gemini API) → fail with network
//     error, NOT ReferenceError. Filter excludes network errors.
//   - Some clicks trigger file dialogs → fail silently in jsdom. Not a JS error.
//   - Framer Motion animations may not run; we don't care, we only check for
//     JS errors during the click + render cycle.

// @vitest-environment jsdom

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIST_PATH = path.resolve(process.cwd(), 'dist/index.html');

describe('v3.17.0 6.1: click-coverage smoke test', () => {
    let html;
    let scriptBody;

    beforeAll(() => {
        if (!fs.existsSync(DIST_PATH)) {
            throw new Error(
                `dist/index.html not found at ${DIST_PATH}. ` +
                `Run 'npm run build' first.`
            );
        }
        html = fs.readFileSync(DIST_PATH, 'utf8');
        const match = html.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/);
        if (!match) {
            throw new Error('No inline module script found in dist/index.html');
        }
        scriptBody = match[1];
    });

    beforeEach(() => {
        // Reset DOM
        document.documentElement.innerHTML = '<html><head></head><body><div id="root"></div></body></html>';
        // Bypass auth gate (inline script in index.html checks sessionStorage on load)
        sessionStorage.setItem('itps_auth_v1', '1');
        // PATCH 2026-07-14: skip onboarding (CoachMark overlay would otherwise
        // appear on first mount + block/re-route the first click in the
        // broad-coverage test, hiding latent ReferenceErrors behind the
        // overlay. Matches the existing localStorage key useAppState reads:
        // useLocalStorage('TDA_ONBOARDING_DONE_V1', false) — see
        // useAppState.js onboardingDone useEffect gate.
        localStorage.setItem('TDA_ONBOARDING_DONE_V1', 'true');
        // Also reset recovery snapshot so the "load recovery?" snackbar
        // doesn't pop up and cover buttons on first mount.
        localStorage.removeItem('TDA_AUTOSAVE_V1');
    });

    afterEach(() => {
        sessionStorage.removeItem('itps_auth_v1');
        localStorage.removeItem('TDA_ONBOARDING_DONE_V1');
        localStorage.removeItem('TDA_AUTOSAVE_V1');
    });

    /**
     * Helper: load the dist bundle, capture errors, return the captured errors.
     * The load pattern mirrors smoke-build.test.js for consistency.
     * Returns an object with: getFatal() (combines all 3 error channels + filters
     * to ReferenceError/TypeError/SyntaxError), and restore() cleanup.
     */
    function loadBundleAndCaptureErrors() {
        const capturedErrors = [];
        const originalOnError = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            capturedErrors.push({
                kind: 'window.onerror',
                message: String(message),
                source,
                lineno,
                colno,
                errorName: error?.name,
                errorMessage: error?.message,
            });
            return true;  // prevent default
        };
        const unhandledRejections = [];
        const originalOnUnhandled = window.onunhandledrejection;
        window.onunhandledrejection = (event) => {
            unhandledRejections.push({
                kind: 'unhandledrejection',
                message: event.reason?.message || String(event.reason),
                errorName: event.reason?.name,
                errorMessage: event.reason?.message || String(event.reason),
            });
        };
        const originalConsoleError = console.error;
        const consoleErrors = [];
        console.error = (...args) => {
            consoleErrors.push(args.map(a => {
                try {
                    return typeof a === 'string' ? a : (a?.message || String(a));
                } catch {
                    return '[unstringifiable]';
                }
            }).join(' '));
            originalConsoleError(...args);
        };

        try {
            const htmlNoScript = html.replace(/<script[\s\S]*?<\/script>/gi, '');
            document.open();
            document.write(htmlNoScript);
            document.close();

            try {
                const indirectEval = eval;
                indirectEval(scriptBody);
            } catch (syncErr) {
                capturedErrors.push({
                    kind: 'sync-throw',
                    message: syncErr.message || String(syncErr),
                    errorName: syncErr.name,
                    errorMessage: syncErr.message || String(syncErr),
                });
            }
        } finally {
            const FATAL_PATTERN = /ReferenceError|TypeError|SyntaxError/;
            const getFatal = () => {
                const all = [
                    ...capturedErrors,
                    ...unhandledRejections,
                    ...consoleErrors.map(c => ({ kind: 'console.error', errorName: '', errorMessage: c })),
                ];
                return all.filter(e =>
                    FATAL_PATTERN.test(e.errorMessage || e.message || '') ||
                    FATAL_PATTERN.test(e.errorName || '')
                );
            };
            return {
                getFatal,
                capturedErrors,
                unhandledRejections,
                consoleErrors,
                restore: () => {
                    window.onerror = originalOnError;
                    window.onunhandledrejection = originalOnUnhandled;
                    console.error = originalConsoleError;
                },
            };
        }
    }

    /**
     * Helper: wait N ms via setTimeout, yielding to React's commit + microtasks.
     */
    function wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /**
     * Helper: find buttons matching text content (substring match).
     * Text content is preserved by terser (mangler does not rename string literals).
     *
     * PATCH 2026-07-17: match the button's *normalized* text — strip all
     * whitespace before substring match. Reason: terser minification strips
     * the inter-element whitespace that JSX inserts between adjacent
     * <span> children, so the production button textContent for the
     * content tab is `📝內容` (no space) while the dev build / unminified
     * output has `📝 內容` (with space). The original substring match
     * `t.includes('📝 內容')` silently failed in CI, so the Bug 3 expect
     * trip (`toBeTruthy`) was masking a real "tab not found" outcome
     * rather than a content-matching glitch. Normalized match makes the
     * test resilient to both layouts.
     */
    function findButtonsByText(text) {
        const norm = (s) => (s || '').replace(/\s+/g, '');
        const target = norm(text);
        return Array.from(document.querySelectorAll('button, [role="button"]'))
            .filter(el => {
                const t = norm(el.textContent);
                return t.includes(target) && !el.disabled;
            });
    }

    it('regression guard: clicking "AI 幫我" suggestion button on content / rules tabs does not throw (catches getSuggestions-class bug)', async () => {
        const errorState = loadBundleAndCaptureErrors();
        try {
            await wait(150);  // wait for React mount + auth-gate unlock
            expect(errorState.getFatal()).toEqual([]);

            // PATCH 2026-07-17 (v3.18.0 §3.4 follow-up): require tab buttons to
            // exist before switching — silent-skip 'if (contentTab) { ... }'
            // was the false-pass risk Bug 3 from senior review. Re-applied
            // after deferring from v3.17.0 6.1 hotfix (per user "1+2" pick).
            const contentTab = findButtonsByText('📝 內容')[0];
            expect(contentTab, 'content tab button should be rendered after initial mount').toBeTruthy();
            contentTab.click();
            // PATCH 2026-08-27: Framer Motion tab swap needs ~500ms in jsdom
            // before content-tab AI buttons land. 80ms was a false-fail.
            await wait(500);
            expect(errorState.getFatal()).toEqual([]);

            // PATCH 2026-07-17: match 'AI 幫我' (common substring) instead of
            // the exact 'AI 幫我諗'. Reason: content tab uses 'AI 幫我諗'
            // (purpose + context fields) but rules tab uses 'AI 幫我加規則'
            // (different copy on App.jsx:936). The original exact match
            // missed the rules button entirely — only worked locally because
            // the tab click silently no-op'd and we were still on content tab.
            // Substring 'AI 幫我' covers both copies + any future copy edits.
            const contentAiButtons = findButtonsByText('AI 幫我');
            expect(
                contentAiButtons.length,
                'at least one "AI 幫我" suggestion button should render on content tab'
            ).toBeGreaterThan(0);
            for (const btn of contentAiButtons) {
                btn.click();
                await wait(80);
            }
            expect(errorState.getFatal()).toEqual(
                [],
                'Clicking "AI 幫我" should not throw ReferenceError. Captured: ' +
                JSON.stringify(errorState.getFatal(), null, 2)
            );

            // Switch to rules tab
            const rulesTab = findButtonsByText('⚙️ 規則')[0];
            expect(rulesTab, 'rules tab button should be rendered').toBeTruthy();
            rulesTab.click();
            await wait(500);
            const rulesAiButtons = findButtonsByText('AI 幫我');
            expect(
                rulesAiButtons.length,
                'at least one "AI 幫我" suggestion button should render on rules tab'
            ).toBeGreaterThan(0);
            for (const btn of rulesAiButtons) {
                btn.click();
                await wait(80);
            }
            expect(errorState.getFatal()).toEqual(
                [],
                'Clicking "AI 幫我" on rules tab should not throw. Captured: ' +
                JSON.stringify(errorState.getFatal(), null, 2)
            );
        } finally {
            errorState.restore();
        }
    }, { timeout: 15000 });

    it('broad coverage: clicking every visible enabled button does not throw ReferenceError / TypeError', async () => {
        const errorState = loadBundleAndCaptureErrors();
        try {
            await wait(150);

            // PATCH 2026-07-14: snapshot-then-iterate was a stale-reference bug
            // (Bug 1 from senior review). Clicks can unmount other buttons
            // (e.g. ProfileBankPanel's Lock button unmounts the whole panel),
            // so we must re-query on each iteration against the live DOM.
            // Bound the loop by max iterations to avoid infinite loops if a
            // click keeps creating new buttons (e.g. dynamic add-rows).
            const MAX_ITERATIONS = 100;
            const triggeredErrors = [];
            const seen = new WeakSet();
            let lastSize = -1;

            for (let i = 0; i < MAX_ITERATIONS; i++) {
                const allButtons = Array.from(
                    document.querySelectorAll(
                        'button:not([disabled]), [role="button"]:not([disabled]), a[href]'
                    )
                );
                // Termination: if the DOM hasn't changed since last iteration
                // (i.e. we clicked everything we can see), stop.
                if (allButtons.length === lastSize) break;
                lastSize = allButtons.length;

                let clickedThisRound = 0;
                for (const btn of allButtons) {
                    if (seen.has(btn)) continue;
                    seen.add(btn);

                    const label = (
                        btn.textContent ||
                        btn.getAttribute('aria-label') ||
                        btn.getAttribute('title') ||
                        '?'
                    ).trim().slice(0, 40);

                    // Skip browser-level dialogs (file upload, alert, prompt
                    // — jsdom can't safely simulate these).
                    const triggersDialog = btn.matches(
                        'input[type="file"] + *, label[class*="cursor-pointer"]'
                    );
                    if (triggersDialog) continue;

                    // Skip links that navigate away (would lose our test
                    // context). All in-app links are # anchors.
                    if (btn.tagName === 'A' && btn.getAttribute('href')?.startsWith('http')) {
                        continue;
                    }

                    const beforeClick = errorState.getFatal().length;
                    btn.click();
                    clickedThisRound += 1;
                    await wait(30);

                    const afterClick = errorState.getFatal();
                    if (afterClick.length > beforeClick) {
                        const newErrors = afterClick.slice(beforeClick);
                        triggeredErrors.push({ label, errors: newErrors });
                    }
                }
                // Safety: if a round clicked nothing, break to avoid loop
                if (clickedThisRound === 0) break;
            }

            if (triggeredErrors.length > 0) {
                const summary = triggeredErrors
                    .slice(0, 5)
                    .map(t => `Button "${t.label}":\n  ${t.errors.map(e => '  ' + (e.errorMessage || e.message)).join('\n')}`)
                    .join('\n\n');
                throw new Error(
                    `${triggeredErrors.length} button(s) triggered fatal errors:\n\n${summary}` +
                    (triggeredErrors.length > 5 ? `\n\n...and ${triggeredErrors.length - 5} more` : '')
                );
            }
        } finally {
            errorState.restore();
        }
    }, { timeout: 30000 });

    it('broad coverage: typing into text inputs / textareas does not throw ReferenceError', async () => {
        const errorState = loadBundleAndCaptureErrors();
        try {
            await wait(150);

            // Find text-bearing inputs (skip password, file, hidden)
            const textInputs = Array.from(document.querySelectorAll(
                'input[type="text"]:not([disabled]), input:not([type]):not([disabled]), textarea:not([disabled])'
            )).filter(el => {
                const placeholder = el.getAttribute('placeholder') || '';
                return !placeholder.includes('搜尋') && !placeholder.includes('Search');
            });

            const triggeredErrors = [];
            for (const input of textInputs) {
                const beforeFatal = errorState.getFatal().length;
                const label = (input.getAttribute('placeholder') || input.getAttribute('aria-label') || '?').slice(0, 30);

                // Set value via the React-aware path
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
                    'value'
                ).set;
                try {
                    nativeInputValueSetter.call(input, 'test input value');
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    await wait(30);
                } catch (err) {
                    // Some inputs may not accept programmatic value (e.g. number)
                    continue;
                }

                const afterFatal = errorState.getFatal();
                if (afterFatal.length > beforeFatal) {
                    triggeredErrors.push({ label, errors: afterFatal.slice(beforeFatal) });
                }
            }

            if (triggeredErrors.length > 0) {
                const summary = triggeredErrors
                    .slice(0, 5)
                    .map(t => `Input "${t.label}":\n  ${t.errors.map(e => '  ' + (e.errorMessage || e.message)).join('\n')}`)
                    .join('\n\n');
                throw new Error(
                    `${triggeredErrors.length} input(s) triggered fatal errors:\n\n${summary}`
                );
            }
        } finally {
            errorState.restore();
        }
    }, { timeout: 30000 });
});
