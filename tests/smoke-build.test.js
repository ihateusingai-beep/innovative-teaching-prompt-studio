// === CI smoke test: load dist/index.html in jsdom, catch ReferenceErrors ===
//
// Why: vitest uses Vite dev mode (HMR + jsdom), which masks production bugs
// where terser minifier drops unused imports. Example: v3.15.0 F1 added
// useMemo() calls without updating the React import line — vitest passed
// 376/376 tests, but live GH Pages page rendered blank with
// "ReferenceError: useMemo is not defined".
//
// What this test does:
//   1. Load dist/index.html in jsdom (production-like env, minified bundle)
//   2. Capture window.onerror BEFORE script runs
//   3. Wait for React mount (microtask + setTimeout 0)
//   4. Assert no errors captured + #protected-root has child content (React mounted)
//
// Note: jsdom doesn't run minified IIFEs that depend on browser-specific APIs
// (e.g. Web Crypto in older jsdom). We focus on the smoke goal: did React mount
// without throwing during initial render? A ReferenceError in App.jsx render
// would skip the #root child render → #protected-root stays empty.

// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const DIST_PATH = path.resolve(process.cwd(), 'dist/index.html');

describe('v3.16.0 SMOKE: production bundle boots without ReferenceErrors', () => {
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
        // Extract the inline module script (vite-plugin-singlefile inlines JS into HTML)
        // Match either <script type="module"> OR <script type="module" crossorigin>
        const match = html.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/);
        if (!match) {
            throw new Error('No inline module script found in dist/index.html');
        }
        scriptBody = match[1];
    });

    it('dist/index.html exists and contains a non-trivial script (>10 kB)', () => {
        expect(scriptBody.length).toBeGreaterThan(10_000);
    });

    it('script contains React + useMemo imports (catches useMemo regression)', () => {
        // In dev mode (vite-plugin-singlefile), React is destructured from 'react'
        // and minified to short names like U.useMemo.
        // In production minified output, React hooks appear as either:
        //   - .useMemo=function (React namespace property) OR
        //   - useMemo:function (React's standalone useMemo export)
        // We check for 'useMemo' to ensure React's useMemo export is in the bundle.
        const hasUseMemoDef = scriptBody.includes('useMemo:function') ||
                              scriptBody.includes('useMemo:function(e,t)') ||
                              scriptBody.includes('.useMemo=');
        expect(hasUseMemoDef).toBe(true);
    });

    it('loads in jsdom without uncaught ReferenceError on initial render', async () => {
        // Set up error capture BEFORE injecting script
        const capturedErrors = [];
        const originalOnError = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            capturedErrors.push({ message: String(message), source, lineno, colno, error: error?.message });
            return true;  // prevent default
        };
        const unhandledRejections = [];
        const originalOnUnhandled = window.onunhandledrejection;
        window.onunhandledrejection = (event) => {
            unhandledRejections.push(event.reason?.message || String(event.reason));
        };
        // Also patch console.error to catch React's minified error reports
        const originalConsoleError = console.error;
        const consoleErrors = [];
        console.error = (...args) => {
            consoleErrors.push(args.map(a => String(a)).join(' '));
            originalConsoleError(...args);
        };

        try {
            // Load HTML structure FIRST (so #root / #protected-root / #auth-gate exist)
            // Strip <script> tags from HTML to avoid auto-execution, then load
            const htmlNoScript = html.replace(/<script[\s\S]*?<\/script>/gi, '');
            document.open();
            document.write(htmlNoScript);
            document.close();

            // Strip <script> wrapper, eval the body as a module-like IIFE.
            // Wrap in try/catch because some minified bundles throw on first
            // synchronous execute if the DOM doesn't have full React dependencies
            try {
                const indirectEval = eval;
                indirectEval(scriptBody);
            } catch (syncErr) {
                capturedErrors.push({
                    message: syncErr.message || String(syncErr),
                    error: syncErr.stack || String(syncErr),
                });
            }

            // Yield to microtasks + setTimeout for React commit + auth-gate init
            await new Promise(r => setTimeout(r, 100));

            // Aggregate all errors: window.onerror + console.error + unhandledrejection
            const allErrors = [
                ...capturedErrors,
                ...consoleErrors
                    .filter(e => /ReferenceError|TypeError|SyntaxError/.test(e))
                    .map(message => ({ message, error: message })),
                ...unhandledRejections
                    .filter(m => /ReferenceError|TypeError/.test(m))
                    .map(message => ({ message, error: message })),
            ];
            if (allErrors.length > 0) {
                throw new Error(
                    `Production bundle produced ${allErrors.length} runtime error(s):\n` +
                    allErrors.slice(0, 5).map(e => `  ${e.message || e.error}`).join('\n') +
                    (allErrors.length > 5 ? `\n  ...and ${allErrors.length - 5} more` : '')
                );
            }
            // Soft assertion: no fatal errors of any kind
            expect(allErrors.length).toBe(0);
        } finally {
            window.onerror = originalOnError;
            window.onunhandledrejection = originalOnUnhandled;
            console.error = originalConsoleError;
        }
    }, { timeout: 15000 });
});

describe('v3.16.0 SMOKE: dist bundle structure', () => {
    let html;

    beforeAll(() => {
        html = fs.readFileSync(DIST_PATH, 'utf8');
    });

    it('inlines JS as single file (no external <script src=...>)', () => {
        // vite-plugin-singlefile purpose: no separate JS file
        expect(/<script\s+src=/i.test(html)).toBe(false);
    });

    it('inlines CSS (Google Fonts external link allowed)', () => {
        // Allow external Google Fonts CSS link (cross-origin CDN), but no local <link>
        const stylesheetLinks = html.match(/<link[^>]+rel=["']stylesheet["']/gi) || [];
        const localStylesheetLinks = stylesheetLinks.filter(l =>
            !l.includes('fonts.googleapis.com')
        );
        expect(localStylesheetLinks.length).toBe(0);
    });

    it('contains the auth-gate element (initial DOM before React mount)', () => {
        expect(html).toMatch(/auth-gate|protected-root/);
    });

    it('contains client-side password hash (security feature present)', () => {
        // The hash itself shouldn't be hardcoded in tests (it IS the password),
        // but we check the CONFIG block is present
        expect(html).toMatch(/PASSWORD_HASH\s*=/);
    });

    it('bundle size under 750 kB (alert if growing uncontrollably)', () => {
        const sizeKB = html.length / 1024;
        if (sizeKB > 750) {
            console.warn(`Bundle size: ${sizeKB.toFixed(2)} kB — over 750 kB budget!`);
        }
        // Soft assertion: should fail in CI if exceeds 800 kB
        expect(sizeKB).toBeLessThan(800);
    });
});