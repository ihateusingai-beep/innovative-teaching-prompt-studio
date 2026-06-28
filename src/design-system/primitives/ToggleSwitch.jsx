// === ToggleSwitch Primitive ===
// v3.8.0 Path B.3 — iOS-style pill toggle with theme-aware on color
//
// Replaces inline `<button className="bg-blue-600 w-11 h-6 rounded-full">` patterns
// from App.jsx (1.9/1.10 preference toggles, d1-d4 module toggles, etc.)
//
// Props:
//   theme: 'plain' | 'warm' | 'cyber'
//   on: boolean (current state)
//   onChange: (next: boolean) => void
//   size: 'sm' | 'md' (default = 'md')
//   ariaLabel: accessibility label
//
// Usage:
//   <ToggleSwitch theme={theme} on={enabled} onChange={setEnabled} />
//   <ToggleSwitch theme={theme} on={enabled} onChange={setEnabled} size="sm" ariaLabel="啟用偏好設定" />

import React from 'react';
import { toggleClass } from '../variants/themeClass.js';

const sizeConfig = {
    sm: { track: 'h-5 w-9', knob: 'h-3 w-3', translate: 'translate-x-5' },
    md: { track: 'h-6 w-11', knob: 'h-4 w-4', translate: 'translate-x-6' },
};

export const ToggleSwitch = ({
    theme = 'plain',
    on = false,
    onChange,
    size = 'md',
    ariaLabel,
    className = '',
}) => {
    const size_ = sizeConfig[size] ?? sizeConfig.md;
    const trackClass = toggleClass(theme, on);
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={ariaLabel}
            onClick={() => onChange && onChange(!on)}
            className={`relative inline-flex items-center rounded-full transition-token-base focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${size_.track} ${trackClass} ${className}`}
        >
            <span
                className={`inline-block transform rounded-full bg-white transition-token-base ${size_.knob} ${on ? size_.translate : 'translate-x-1'}`}
            />
        </button>
    );
};
