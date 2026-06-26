import React from 'react';

// === Small UI primitives ===
// W3-4.1: 加 warm third case (primary school 低刺激 amber palette)
// W3-4.3: 用 CSS radius-token class 做 visual consistency
// W3-4.5: focus-visible 由 global CSS 處理（*:focus-visible）

// Helper: 揀 theme 對應嘅 border class
const borderClassFor = (theme) => {
    if (theme === 'cyber') return 'tech-border';
    if (theme === 'warm') return 'warm-border';
    return 'plain-border';
};

// Helper: 揀 theme 對應嘅 input class
const inputClassFor = (theme) => {
    if (theme === 'cyber') return 'tech-input';
    if (theme === 'warm') return 'warm-input';
    return 'plain-input';
};

// Helper: 揀 theme 對應嘅 select option bg
const optionBgFor = (theme) => {
    if (theme === 'cyber') return 'bg-slate-900 text-slate-200';
    if (theme === 'warm') return 'bg-amber-50 text-amber-900';
    return 'bg-white text-slate-800';
};

export const Card = ({ children, className = "", theme }) => (
    <div className={`radius-token-lg overflow-hidden ${borderClassFor(theme)} ${className}`}>
        {children}
    </div>
);

export const Label = ({ children, theme, required, optional }) => (
    <label className={`block text-sm font-bold mb-2 flex items-center gap-2 ${
        theme === 'cyber'
        ? 'text-cyan-300 tracking-wide uppercase orbitron'
        : theme === 'warm'
        ? 'text-amber-900 tracking-normal'
        : 'text-slate-700 tracking-normal'
    }`}>
        <span className={`w-1 h-4 rounded-sm inline-block ${
            theme === 'cyber' ? 'bg-cyan-500' : theme === 'warm' ? 'bg-amber-500' : 'bg-blue-600'
        }`}></span>
        {children}
        {required && (
            <span className="text-red-500 text-base" title="必填">*</span>
        )}
        {optional && !required && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-normal ${
                theme === 'cyber' ? 'bg-slate-700 text-slate-400'
                : theme === 'warm' ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-200 text-slate-600'
            }`}>選填</span>
        )}
    </label>
);

export const Input = (props) => {
    const { theme, className, ...rest } = props;
    return (
        <input
            className={`w-full px-4 py-3 radius-token-md outline-none ${inputClassFor(theme)} ${className || ""}`}
            {...rest}
        />
    );
};

export const TextArea = (props) => {
    const { theme, className, ...rest } = props;
    return (
        <textarea
            className={`w-full px-4 py-3 radius-token-md outline-none min-h-[120px] ${inputClassFor(theme)} ${className || ""}`}
            {...rest}
        />
    );
};

export const Select = ({ options, value, onChange, className = "", theme }) => (
    <div className={`relative ${className}`}>
        <select
            value={value}
            onChange={onChange}
            className={`w-full px-4 py-3 radius-token-md outline-none appearance-none cursor-pointer ${inputClassFor(theme)}`}
        >
            {options.map(opt => (
                <option
                    key={opt.value}
                    value={opt.value}
                    className={optionBgFor(theme)}
                >
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

// === Collapsible Section ===
export const CollapsibleSection = ({ title, badge, isOpen, onToggle, theme, children, hint }) => (
    <div className={`radius-token-md border overflow-hidden ${
        theme === 'cyber' ? 'border-slate-700/50 bg-slate-800/20'
        : theme === 'warm' ? 'border-amber-200 bg-white'
        : 'border-slate-200 bg-white'
    }`}>
        <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-4 transition-colors ${
                theme === 'cyber' ? 'hover:bg-slate-800/50'
                : theme === 'warm' ? 'hover:bg-amber-50'
                : 'hover:bg-slate-50'
            }`}
            aria-expanded={isOpen}
        >
            <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${
                        theme === 'cyber' ? 'text-cyan-400'
                        : theme === 'warm' ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span className={`font-bold text-sm tracking-wide ${
                    theme === 'cyber' ? 'text-cyan-200 orbitron'
                    : theme === 'warm' ? 'text-amber-900'
                    : 'text-slate-800'
                }`}>{title}</span>
                {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'cyber' ? 'bg-cyan-900/40 text-cyan-300'
                        : theme === 'warm' ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>{badge}</span>
                )}
            </div>
            {hint && (
                <span className={`text-xs hidden md:inline ${
                    theme === 'cyber' ? 'text-slate-400'
                    : theme === 'warm' ? 'text-amber-700'
                    : 'text-slate-500'
                }`}>{hint}</span>
            )}
        </button>
        {isOpen && (
            <div className={`p-4 border-t ${
                theme === 'cyber' ? 'border-slate-700/50 bg-slate-900/30'
                : theme === 'warm' ? 'border-amber-200 bg-amber-50/40'
                : 'border-slate-100 bg-slate-50/50'
            }`}>
                {children}
            </div>
        )}
    </div>
);