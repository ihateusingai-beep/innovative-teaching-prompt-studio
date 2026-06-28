// === GlassButton Primitive ===
// v3.8.0 Path B.3 — primary / secondary / ghost button
//
// Replaces inline `<button className="bg-blue-600 text-white hover:bg-blue-700">`
// and equivalent 3-way theme ternaries.
//
// Props:
//   variant: 'primary' | 'secondary' | 'ghost' (default = 'primary')
//   theme: 'plain' | 'warm' | 'cyber'
//   size: 'sm' | 'md' | 'lg' (default = 'md')
//   disabled: boolean (default false)
//   icon: optional Lucide icon component to render before children
//   onClick: click handler
//
// Usage:
//   <GlassButton theme={theme} variant="primary" onClick={handler}>儲存</GlassButton>
//   <GlassButton theme={theme} variant="secondary" icon={Plus}>新增</GlassButton>
//   <GlassButton theme={theme} variant="ghost" disabled>不可用</GlassButton>

import React from 'react';
import { buttonClass } from '../variants/themeClass.js';

const sizeClass = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export const GlassButton = ({
    children,
    theme = 'plain',
    variant = 'primary',
    size = 'md',
    disabled = false,
    icon: Icon,
    onClick,
    className = '',
    ...rest
}) => {
    const baseClass = buttonClass(theme, variant, { disabled });
    const sizing = sizeClass[size] ?? sizeClass.md;
    const disabledExtra = disabled ? 'cursor-not-allowed opacity-60' : '';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 rounded-md font-bold transition-token-base focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${baseClass} ${sizing} ${disabledExtra} ${className}`}
            {...rest}
        >
            {Icon && <Icon size={size === 'lg' ? 18 : size === 'sm' ? 12 : 14} />}
            {children}
        </button>
    );
};
