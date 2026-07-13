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
    });

    afterEach(() => {
        sessionStorage.removeItem('itps_auth_v1');
        // Cleanup any error capture state
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
     */
    function findButtonsByText(text) {
        return Array.from(document.querySelectorAll('button, [role="button"]'))
            .filter(el => {
                const t = (el.textContent || '').trim();
                return t.includes(text) && !el.disabled;
            });
    }

    it('regression guard: clicking "AI 幫我諗" on content / rules tabs does not throw (catches getSuggestions-class bug)', async () => {
        const errorState = loadBundleAndCaptureErrors();
        try {
            await wait(150);  // wait for React mount + auth-gate unlock
            expect(errorState.getFatal()).toEqual([]);

            // Switch to content tab so the "AI 幫我諗" button is rendered
            // Tab button text from App.jsx renderStep2: '📝 內容'
            const contentTab = findButtonsByText('📝 內容')[0];
            if (contentTab) {
                contentTab.click();
                await wait(80);
                expect(errorState.getFatal()).toEqual([]);
            }

            // Click "AI 幫我諗" buttons in the content tab
            const contentAiButtons = findButtonsByText('AI 幫我諗');
            for (const btn of contentAiButtons) {
                btn.click();
                await wait(80);
            }
            expect(errorState.getFatal()).toEqual(
                [],
                'Clicking "AI 幫我諗" should not throw ReferenceError. Captured: ' +
                JSON.stringify(errorState.getFatal(), null, 2)
            );

            // Switch to rules tab
            const rulesTab = findButtonsByText('⚙️ 規則')[0];
            if (rulesTab) {
                rulesTab.click();
                await wait(80);
                const rulesAiButtons = findButtonsByText('AI 幫我諗');
                for (const btn of rulesAiButtons) {
                    btn.click();
                    await wait(80);
                }
                expect(errorState.getFatal()).toEqual(
                    [],
                    'Clicking "AI 幫我諗" on rules tab should not throw. Captured: ' +
                    JSON.stringify(errorState.getFatal(), null, 2)
                );
            }
        } finally {
            errorState.restore();
        }
    }, { timeout: 15000 });

    it('broad coverage: clicking every visible enabled button does not throw ReferenceError / TypeError', async () => {
        const errorState = loadBundleAndCaptureErrors();
        try {
            await wait(150);

            // Discover all interactive elements
            const allButtons = Array.from(document.querySelectorAll('button:not([disabled]), [role="button"]:not([disabled]), a[href]'));

            // Walk through and click each (errors reset after each successful click)
            const triggeredErrors = [];
            for (let i = 0; i < allButtons.length; i++) {
                const btn = allButtons[i];
                const label = (btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '?').trim().slice(0, 40);

                // Skip buttons that would trigger browser-level dialogs
                // (we can't safely simulate file upload, alert, prompt in jsdom)
                const triggersDialog = btn.matches('input[type="file"] + *, label[class*="cursor-pointer"]');
                if (triggersDialog) continue;

                // Snapshot pre-click fatal count
                const beforeClick = errorState.getFatal().length;
                btn.click();
                await wait(30);

                const afterClick = errorState.getFatal();
                if (afterClick.length > beforeClick) {
                    const newErrors = afterClick.slice(beforeClick);
                    triggeredErrors.push({ label, errors: newErrors });
                }
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
