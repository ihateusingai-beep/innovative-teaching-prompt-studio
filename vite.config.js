import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Reserved names that must NOT be mangled.
// 防止 esbuild minifier 將不同 module 入面同名 callback mangle 到同一個 short name
// (例如 useAutosave.acceptRecovery 同 useAppState.triggerJSONImport 都 mangle 做 'bi')
const MANGLE_RESERVED = [
    // useAutosave return values
    'lastSavedAt', 'recoverySnapshot', 'acceptRecovery', 'dismissRecovery', 'clearAutosave',
    // useUndoRedo return values
    'canUndo', 'canRedo', 'pushHistory', 'undo', 'redo',
    // useLocalStorage destructured names (avoid clash with React built-ins)
    'setValue', 'clear',
    // useAppState public API (imported names)
    'triggerJSONImport',
    'showGameStyle', 'showExamples',
    'handleCopyDesign', 'handleCopyTech', 'handleExport', 'handleGeminiGenerate',
    'handleSaveTemplate', 'handleLoadTemplate', 'handleDeleteTemplate',
    'handleImportJSON', 'handleExportJSON', 'handleGetSuggestions', 'handleSelectSuggestion',
    'handleCoachNext', 'handleCoachSkip', 'handleNext', 'handlePrev', 'handleReset',
    'updateField', 'toggleSelection', 'handleExampleChange', 'addExample', 'removeExample',
    'handleRuleChange', 'addRule', 'removeRule',
];

export default defineConfig({
    plugins: [
        react({
            // Classic JSX runtime — avoid bare specifier 'react/jsx-runtime' for file:// compat
            jsxRuntime: 'classic',
        }),
        viteSingleFile({
            useRecommendedBuildConfig: false,
        }),
    ],
    resolve: {
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    },
    build: {
        target: 'es2018', // 兼容較舊 browser
        cssCodeSplit: false, // 全部 CSS 入單一 file
        assetsInlineLimit: 100000000, // inline 所有 assets
        rollupOptions: {
            output: {
                inlineDynamicImports: true, // 全部 dynamic imports inline
            },
        },
        // Use terser instead of esbuild minifier to support mangle.reserved
        // (prevent callback name collisions across modules when bundled into single IIFE)
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2,
            },
            mangle: {
                reserved: MANGLE_RESERVED,
            },
            format: {
                comments: false,
            },
        },
    },
    server: {
        port: 5173,
        host: '127.0.0.1',
    },
});