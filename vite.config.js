import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Vite config — single-file IIFE bundle output
// 維持 v2.0 single-file distribution 嘅便利（同 vendor lib inline 喺 HTML）
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
    },
    server: {
        port: 5173,
        host: '127.0.0.1',
    },
});