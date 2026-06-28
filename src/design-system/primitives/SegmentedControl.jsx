// === SegmentedControl Primitive ===
// v3.8.0 Path B.3 — iOS-style segmented control with multiple options
//
// Replaces inline `<div className="flex border rounded-lg">...</div>` for option groups
// like FAB style selector (cyber/minimal/off).
//
// Props:
//   theme: 'plain' | 'warm' | 'cyber'
//   options: [{ value, label, desc? }]
//   value: currently selected value
//   onChange: (value) => void
//   columns: number of columns (default 3) for grid layout
//
// Usage:
//   <SegmentedControl
//     theme={theme}
//     options={[{ value: 'cyber', label: '🪩 Cyber' }, { value: 'minimal', label: '⚪ Minimal' }, { value: 'off', label: '🚫 關閉' }]}
//     value={fabStyle}
//     onChange={setFabStyle}
//   />

import React from 'react';

export const SegmentedControl = ({
    theme = 'plain',
    options,
    value,
    onChange,
    columns = 3,
    className = '',
}) => {
    const activeTheme = theme === 'warm' ? 'warm' : 'plain';
    return (
        <div
            className={`grid gap-2 ${className}`}
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
            {options.map(opt => {
                const isActive = opt.value === value;
                const activeClass = activeTheme === 'warm'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                    : 'border-pink-500 bg-pink-50 text-pink-700 ring-1 ring-pink-500';
                const inactiveClass = activeTheme === 'warm'
                    ? 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50';
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange && onChange(opt.value)}
                        className={`p-3 rounded-lg text-sm font-medium transition-token-base border text-left flex flex-col gap-1 h-full ${isActive ? activeClass : inactiveClass}`}
                    >
                        <span className="font-bold">{opt.label}</span>
                        {opt.desc && <span className="text-xs opacity-70 font-light">{opt.desc}</span>}
                    </button>
                );
            })}
        </div>
    );
};
