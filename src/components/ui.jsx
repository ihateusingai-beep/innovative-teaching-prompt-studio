import React from 'react';

// === Small UI primitives ===
// v3.3: Refactored to use new glass-card / glass-input utility classes
// from styles/index.css. Theme conditionals kept minimal — only plain vs warm
// (cyber alias resolved at body.className level, no longer needed here).

// Helper: theme-aware border class — v3.3 simplified to 2 active themes
const borderClassFor = (theme) => {
    if (theme === 'warm') return 'glass-card';
    return 'glass-card';
};

// Helper: theme-aware input class
const inputClassFor = (theme) => {
    if (theme === 'warm') return 'glass-input';
    return 'glass-input';
};

// Helper: theme-aware select option bg (color-only, no logic change)
const optionBgFor = (theme) => {
    if (theme === 'warm') return 'bg-amber-50 text-amber-900';
    return 'bg-white text-slate-800';
};

export const Card = ({ children, className = "", theme, variant = 'default' }) => {
    const variantClass = variant === 'elevated' ? 'glass-card-elevated' : 'glass-card';
    return (
        <div className={`radius-token-lg overflow-hidden ${variantClass} ${className}`}>
            {children}
        </div>
    );
};

export const Label = ({ children, theme, required, optional }) => (
    <label className={`block text-sm font-bold mb-2 flex items-center gap-2 ${
        theme === 'warm' ? 'text-amber-900 tracking-normal' : theme === 'dark' ? 'text-slate-700 tracking-normal' : theme === 'contrast' ? 'text-slate-700 tracking-normal' : theme === 'paper' ? 'text-slate-700 tracking-normal' : theme === 'reactor' ? 'text-slate-700 tracking-normal' : 'text-slate-700 tracking-normal'
    }`}>
        <span className={`w-1 h-4 rounded-sm inline-block ${
            theme === 'warm' ? 'bg-amber-500' : theme === 'dark' ? 'bg-blue-600' : theme === 'contrast' ? 'bg-blue-600' : theme === 'paper' ? 'bg-blue-600' : theme === 'reactor' ? 'bg-blue-600' : 'bg-blue-600'}`}></span>
        {children}
        {required && (
            <span className="text-red-500 text-base" title="必填">*</span>
        )}
        {optional && !required && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-normal ${
                theme === 'warm' ? 'bg-amber-100 text-amber-700' : theme === 'dark' ? 'bg-slate-200 text-slate-600' : theme === 'contrast' ? 'bg-slate-200 text-slate-600' : theme === 'paper' ? 'bg-slate-200 text-slate-600' : theme === 'reactor' ? 'bg-slate-200 text-slate-600' : 'bg-slate-200 text-slate-600'}`}>選填</span>
        )}
    </label>
);

export const Input = (props) => {
    const { theme, className, ...rest } = props;
    return (
        <input
            className={`w-full px-4 py-3 radius-token-md outline-none transition-token-base ${inputClassFor(theme)} ${className || ""}`}
            {...rest}
        />
    );
};

export const TextArea = (props) => {
    const { theme, className, ...rest } = props;
    return (
        <textarea
            className={`w-full px-4 py-3 radius-token-md outline-none min-h-[120px] transition-token-base ${inputClassFor(theme)} ${className || ""}`}
            {...rest}
        />
    );
};

export const Select = ({ options, value, onChange, className = "", theme }) => (
    <div className={`relative ${className}`}>
        <select
            value={value}
            onChange={onChange}
            className={`w-full px-4 py-3 radius-token-md outline-none appearance-none cursor-pointer transition-token-base ${inputClassFor(theme)}`}
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

// === Collapsible Section — v3.3: glass-card based, hover lift, smooth chevron ===
export const CollapsibleSection = ({ title, badge, isOpen, onToggle, theme, children, hint }) => (
    <div className={`glass-card radius-token-md overflow-hidden animate-fade-in`}>
        <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-4 transition-token-base ${
                theme === 'warm' ? 'hover:bg-amber-50/60' : theme === 'dark' ? 'hover:bg-slate-50/60' : theme === 'contrast' ? 'hover:bg-slate-50/60' : theme === 'paper' ? 'hover:bg-slate-50/60' : theme === 'reactor' ? 'hover:bg-slate-50/60' : 'hover:bg-slate-50/60'}`}
            aria-expanded={isOpen}
        >
            <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${
                        theme === 'warm' ? 'text-amber-600' : theme === 'dark' ? 'text-slate-500' : theme === 'contrast' ? 'text-slate-500' : theme === 'paper' ? 'text-slate-500' : theme === 'reactor' ? 'text-slate-500' : 'text-slate-500'}`}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span className={`font-bold text-sm tracking-wide ${
                    theme === 'warm' ? 'text-amber-900' : theme === 'dark' ? 'text-slate-800' : theme === 'contrast' ? 'text-slate-800' : theme === 'paper' ? 'text-slate-800' : theme === 'reactor' ? 'text-slate-800' : 'text-slate-800'}`}>{title}</span>
                {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        theme === 'warm' ? 'bg-amber-100 text-amber-700' : theme === 'dark' ? 'bg-blue-100 text-blue-700' : theme === 'contrast' ? 'bg-blue-100 text-blue-700' : theme === 'paper' ? 'bg-blue-100 text-blue-700' : theme === 'reactor' ? 'bg-blue-100 text-blue-700' : 'bg-blue-100 text-blue-700'}`}>{badge}</span>
                )}
            </div>
            {hint && (
                <span className={`text-xs hidden md:inline ${
                    theme === 'warm' ? 'text-amber-700' : theme === 'dark' ? 'text-slate-500' : theme === 'contrast' ? 'text-slate-500' : theme === 'paper' ? 'text-slate-500' : theme === 'reactor' ? 'text-slate-500' : 'text-slate-500'}`}>{hint}</span>
            )}
        </button>
        {isOpen && (
            <div className={`p-4 border-t animate-slide-up-sm ${
                theme === 'warm' ? 'border-amber-200/60 bg-amber-50/40' : theme === 'dark' ? 'border-slate-200/60 bg-slate-50/30' : theme === 'contrast' ? 'border-slate-200/60 bg-slate-50/30' : theme === 'paper' ? 'border-slate-200/60 bg-slate-50/30' : theme === 'reactor' ? 'border-slate-200/60 bg-slate-50/30' : 'border-slate-200/60 bg-slate-50/30'}`}>
                {children}
            </div>
        )}
    </div>
);
