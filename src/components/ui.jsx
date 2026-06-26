import React from 'react';

// === Small UI primitives ===

export const Card = ({ children, className = "", theme }) => (
    <div className={`rounded-2xl overflow-hidden ${theme === 'cyber' ? 'tech-border' : 'plain-border'} ${className}`}>
        {children}
    </div>
);

export const Label = ({ children, theme, required, optional }) => (
    <label className={`block text-sm font-bold mb-2 flex items-center gap-2 ${
        theme === 'cyber'
        ? 'text-cyan-300 tracking-wide uppercase orbitron'
        : 'text-slate-700 tracking-normal'
    }`}>
        <span className={`w-1 h-4 rounded-sm inline-block ${theme === 'cyber' ? 'bg-cyan-500' : 'bg-blue-600'}`}></span>
        {children}
        {required && (
            <span className="text-red-500 text-base" title="必填">*</span>
        )}
        {optional && !required && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-normal ${
                theme === 'cyber' ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
            }`}>選填</span>
        )}
    </label>
);

export const Input = (props) => {
    const { theme, className, ...rest } = props;
    return (
        <input
            className={`w-full px-4 py-3 rounded-xl outline-none ${theme === 'cyber' ? 'tech-input' : 'plain-input'} ${className || ""}`}
            {...rest}
        />
    );
};

export const TextArea = (props) => {
    const { theme, className, ...rest } = props;
    return (
        <textarea
            className={`w-full px-4 py-3 rounded-xl outline-none min-h-[120px] ${theme === 'cyber' ? 'tech-input' : 'plain-input'} ${className || ""}`}
            {...rest}
        />
    );
};

export const Select = ({ options, value, onChange, className = "", theme }) => (
    <div className={`relative ${className}`}>
        <select
            value={value}
            onChange={onChange}
            className={`w-full px-4 py-3 rounded-xl outline-none appearance-none cursor-pointer ${theme === 'cyber' ? 'tech-input' : 'plain-input'}`}
        >
            {options.map(opt => (
                <option
                    key={opt.value}
                    value={opt.value}
                    className={theme === 'cyber' ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}
                >
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

// === Collapsible Section ===
export const CollapsibleSection = ({ title, badge, isOpen, onToggle, theme, children, hint }) => (
    <div className={`rounded-xl border ${theme === 'cyber' ? 'border-slate-700/50 bg-slate-800/20' : 'border-slate-200 bg-white'} overflow-hidden`}>
        <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center justify-between p-4 transition-colors ${
                theme === 'cyber' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
            }`}
            aria-expanded={isOpen}
        >
            <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${theme === 'cyber' ? 'text-cyan-400' : 'text-slate-500'}`}>
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <span className={`font-bold text-sm tracking-wide ${theme === 'cyber' ? 'text-cyan-200 orbitron' : 'text-slate-800'}`}>{title}</span>
                {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'cyber' ? 'bg-cyan-900/40 text-cyan-300' : 'bg-blue-100 text-blue-700'}`}>{badge}</span>
                )}
            </div>
            {hint && (
                <span className={`text-xs hidden md:inline ${theme === 'cyber' ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</span>
            )}
        </button>
        {isOpen && (
            <div className={`p-4 border-t ${theme === 'cyber' ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                {children}
            </div>
        )}
    </div>
);