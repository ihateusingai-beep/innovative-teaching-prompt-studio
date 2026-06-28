// === Vitest config ===
// 因為 vitest 用 esbuild 做 default transformer，唔識處理 JSX
// 我哋喺度 wrap Vite plugin chain 入去
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react({
            // Classic JSX runtime — 同 vite.config.js 一致
            jsxRuntime: 'classic',
        }),
    ],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.{js,jsx}'],
        globals: false,
    },
});
