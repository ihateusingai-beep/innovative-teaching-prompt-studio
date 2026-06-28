// === GlassInput Primitive ===
// v3.8.0 Path B.3 — text input / textarea / select with glass theme
//
// Replaces inline `<input className="glass-input">` (or 3-way theme ternary)
// from src/components/ui.jsx + App.jsx inline form fields.
//
// Props:
//   theme: 'plain' | 'warm' | 'cyber'
//   as: 'input' | 'textarea' | 'select' (default = 'input')
//   options: [{ value, label }] for select
//   rows: textarea rows (default = 4)
//   minHeight: textarea min-height CSS value
//   ...rest: standard input/textarea props (value, onChange, placeholder, ...)

import React from 'react';
import { inputClass } from '../variants/themeClass.js';

export const GlassInput = ({
    theme = 'plain',
    as = 'input',
    options,
    rows = 4,
    minHeight,
    className = '',
    ...rest
}) => {
    const baseClass = inputClass(theme);
    const sizing = as === 'textarea'
        ? `min-h-[${minHeight || '120px'}] resize-y w-full p-3 rounded-md outline-none ${baseClass}`
        : `w-full px-4 py-3 rounded-md outline-none ${baseClass}`;

    if (as === 'textarea') {
        return (
            <textarea
                rows={rows}
                className={`${sizing} ${className}`}
                {...rest}
            />
        );
    }

    if (as === 'select') {
        return (
            <select className={`${sizing} appearance-none cursor-pointer ${className}`} {...rest}>
                {options && options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    }

    return <input className={`${sizing} ${className}`} {...rest} />;
};
