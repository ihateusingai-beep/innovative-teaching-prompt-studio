// === GlassCard Primitive ===
// v3.8.0 Path B.3 — primary widget surface
//
// Replaces inline `<div className="glass-card">` and equivalent Tailwind
// (`bg-white/78 backdrop-blur-16 border-slate-200`) patterns.
// Uses .glass-card / .glass-card-flat / .glass-card-elevated utility classes
// from src/styles/index.css (v3.3+).
//
// Props:
//   variant: 'default' | 'flat' | 'elevated' (default = 'default')
//   theme: 'plain' | 'warm' | 'cyber' (cyber alias to plain via normalizeTheme)
//   onClick: optional click handler
//   children: card content
//   className: extra Tailwind classes
//
// Usage:
//   <GlassCard theme={theme}>...</GlassCard>
//   <GlassCard theme={theme} variant="elevated">...</GlassCard>
//   <GlassCard theme={theme} onClick={handler}>clickable card</GlassCard>

import React from 'react';
import { cardClass } from '../variants/themeClass.js';

export const GlassCard = ({
    children,
    theme = 'plain',
    variant = 'default',
    onClick,
    className = '',
    ...rest
}) => {
    const baseClass = cardClass(theme, variant);
    const interactive = onClick
        ? 'cursor-pointer transition-token-base hover:-translate-y-0.5 active:translate-y-0'
        : '';
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`${baseClass} ${interactive} ${className}`}
            {...rest}
        >
            {children}
        </Tag>
    );
};
