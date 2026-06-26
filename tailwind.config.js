/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            // 8px spacing scale 對齊 design tokens
            spacing: {
                'token-1': '4px',
                'token-2': '8px',
                'token-3': '12px',
                'token-4': '16px',
                'token-6': '24px',
                'token-8': '32px',
                'token-12': '48px',
                'token-16': '64px',
            },
            // Standard easing curve — Material Design
            transitionTimingFunction: {
                'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            // Transition duration scale
            transitionDuration: {
                'fast': '150ms',
                'base': '250ms',
                'slow': '400ms',
            },
        },
    },
    plugins: [],
};