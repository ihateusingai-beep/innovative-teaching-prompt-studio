import React from 'react';
import { Card } from './ui.jsx';

// === v3.16.0 V7: GlassCard Primitive ===
// Replaces inline `glass-card` divs. Theme-aware via body.theme-{name}.
// Tones: 'info' (blue) | 'success' (emerald) | 'warn' (amber) | 'danger' (red)
//        | 'plain' (slate) | 'cyan' (cyan)
// Variants: 'frosted' (default, glassmorphism with backdrop-blur) | 'flat' (no shadow)
//
// v3.15.0 refactor history: spec mentioned 12 inline glass-card usages
// but Card primitive (src/components/ui.jsx) already absorbed all 12.
// GlassCard is forward-looking for F2/F3 (Class Roster + Quality Analyzer)
// where lots of stat/info cards will be needed.
//
// Why this is a separate primitive from Card:
//   Card = structural container (white bg, border, padding) — neutral
//   GlassCard = semi-transparent + backdrop-blur — for over-photo / over-gradient
//   Use Card for content blocks, GlassCard for overlays / hero / empty states
export const GlassCard = ({
    tone = 'plain',
    variant = 'frosted',
    className = '',
    children,
    ...props
}) => {
    const toneClass = `glass-card-${tone}`;
    const variantClass = variant === 'flat' ? 'glass-card-flat' : 'glass-card';
    return (
        <Card
            theme="plain"
            className={`${variantClass} ${toneClass} ${className}`}
            {...props}
        >
            {children}
        </Card>
    );
};