#!/usr/bin/env node
// === JSX icon import guard ===
//
// Bug 3 (v3.2.1 → v3.2.2): App.jsx 入面用咗 <Accessibility size={20} /> 但漏 import，
// build pass、test pass，user 喺 production 撳「規則 tab」先撞 ReferenceError 黑屏。
//
// 呢個 script:
//   1. 掃 src/**/*.{js,jsx} 抽 JSX tag 引用 (e.g. <Foo ...)
//   2. Skip HTML tags (lowercase like <div> / <button>) 同 common React components
//   3. 對於 src/App.jsx 等使用 lucide-react 嘅 file：
//      - parse `import { ... } from 'lucide-react'`
//      - 對比 lucide-react 真正 export list
//      - 任何喺 JSX 用咗但冇 import 嘅 icon → fail
//
// Run: `npm run check:icons`
// Apply to: build pipeline（pre-build）+ CI

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');
const SRC = join(ROOT, 'src');

// Lucide-react 真實 export list (auto-derived from node_modules)
const LUCIDE_PATH = join(ROOT, 'node_modules', 'lucide-react', 'dist', 'cjs', 'lucide-react.js');
let LUCIDE_EXPORTS = new Set();
try {
    const lucideSource = readFileSync(LUCIDE_PATH, 'utf-8');
    // Heuristic: 抽 `exports.FooName = ` 或 `exports["FooName"]` 模式
    const re = /exports\["([A-Z][A-Za-z0-9_]+)"\]|exports\.([A-Z][A-Za-z0-9_]+)\s*=/g;
    let m;
    while ((m = re.exec(lucideSource)) !== null) {
        LUCIDE_EXPORTS.add(m[1] || m[2]);
    }
    if (LUCIDE_EXPORTS.size === 0) {
        console.warn(`[check:icons] Warning: parsed 0 lucide-react exports from ${LUCIDE_PATH}. Skipping guard.`);
        process.exit(0);
    }
} catch (err) {
    console.warn(`[check:icons] Warning: cannot read lucide-react source (${err.message}). Skipping guard.`);
    process.exit(0);
}

// React built-in / lowercase HTML tags / 我哋自己嘅 internal components 唔 check
const SKIP_PATTERNS = /^(div|span|p|h[1-6]|button|input|select|textarea|label|form|ul|ol|li|table|tr|td|th|thead|tbody|tfoot|nav|header|footer|main|aside|section|article|figure|figcaption|img|svg|path|circle|rect|line|polyline|polygon|text|g|defs|use|br|hr|em|strong|small|code|pre|a|iframe|video|audio|source|track|canvas|noscript|template|slot|motion|AnimatePresence|Fragment|React\.|_jsx|jsxs|jsx)$/;

function walk(dir, files = []) {
    for (const f of readdirSync(dir)) {
        const full = join(dir, f);
        if (statSync(full).isDirectory()) {
            walk(full, files);
        } else if (['.js', '.jsx'].includes(extname(f))) {
            files.push(full);
        }
    }
    return files;
}

function extractJsxTags(content) {
    // Match opening <Tag ... > 或 self-close <Tag /> — Tag 必須大寫開頭
    const tags = new Set();
    const re = /<([A-Z][A-Za-z0-9_]*)/g;
    let m;
    while ((m = re.exec(content)) !== null) {
        tags.add(m[1]);
    }
    return tags;
}

function extractImports(content) {
    // Extract names from `import { A, B as C } from '...'` (named imports only)
    const imports = new Set();
    const re = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
        const inner = m[1];
        inner.split(',').forEach(p => {
            const trimmed = p.trim();
            if (!trimmed) return;
            // `A as B` → use B (the local name)
            const parts = trimmed.split(/\s+as\s+/);
            imports.add(parts[parts.length - 1].trim());
        });
    }
    return imports;
}

function extractDefaultImport(content) {
    // Extract names from `import Foo from '...'`
    const re = /import\s+([A-Z][A-Za-z0-9_]*)\s+from\s*['"][^'"]+['"]/g;
    const names = new Set();
    let m;
    while ((m = re.exec(content)) !== null) {
        names.add(m[1]);
    }
    return names;
}

let hasError = false;
const files = walk(SRC);

for (const file of files) {
    const rel = relative(ROOT, file);
    const content = readFileSync(file, 'utf-8');
    const jsxTags = extractJsxTags(content);
    if (jsxTags.size === 0) continue;

    const namedImports = extractImports(content);
    const defaultImports = extractDefaultImport(content);
    const allImports = new Set([...namedImports, ...defaultImports]);

    for (const tag of jsxTags) {
        if (SKIP_PATTERNS.test(tag)) continue;
        if (allImports.has(tag)) continue;
        // Check if it's a lucide-react icon — that's the critical case
        if (LUCIDE_EXPORTS.has(tag)) {
            console.error(`[check:icons] ❌ ${rel}: JSX uses <${tag} /> but icon is NOT imported from lucide-react`);
            hasError = true;
        }
        // Otherwise it's probably a local component defined elsewhere — skip silently
    }
}

if (hasError) {
    console.error(`\n[check:icons] FAILED — fix missing icon imports above.`);
    process.exit(1);
} else {
    console.log(`[check:icons] ✅ All lucide-react icon usages have matching imports.`);
}
