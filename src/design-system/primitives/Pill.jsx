// === Pill Primitive ===
// v3.8.0 Path B.3 — tab / badge / chip with theme-aware colors
//
// Replaces inline `<button className="bg-blue-100 text-blue-700 ring-1 ring-blue-300">`
// and equivalent 3-way theme ternaries.
//
// Props:
//   theme: 'plain' | 'warm' | 'cyber'
//   active: boolean (default false)
//   onClick: click handler
//   icon: optional Lucide icon component
//   children: pill content
//
// Usage:
//   <Pill theme={theme} active={isActive} onClick={...}>基本</Pill>
//   <Pill theme={theme} icon={Sparkles} active>Active</Pill>

import React from 'react';
import { pillClass } from '../variants/themeClass.js';

export const Pill = ({
    children,
    theme = 'plain',
    active = false,
    onClick,
    icon: Icon,
    className = '',
    ...rest
}) => {
    const baseClass = pillClass(theme, { active });
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-token-base ${baseClass} ${className}`}
            {...rest}
        >
            {Icon && <Icon size={14} />}
            {children}
        </button>
    );
};
