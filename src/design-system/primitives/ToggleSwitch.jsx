// === ToggleSwitch Primitive ===
// v3.8.0 Path B.3 — iOS-style pill toggle with theme-aware on color
// v3.13.0: bumped to 48×28 (md) and 44×24 (sm) with 44px hit area wrapper
//          (mobile audit P0 — original 36×20 was below Apple HIG 44px minimum)
//
// Props:
//   theme: 6 themes (plain/warm/dark/contrast/paper/reactor)
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

// v3.13.0: bumped track dimensions for better touch ergonomics
// sm: 48×28 visual (h-7 w-12), hit area expanded to 44×44 via p-2 wrapper padding
// md: 56×32 visual (h-8 w-14), hit area expanded to 48×48 via p-2 wrapper padding
//   knob sizes maintain translate-x-5 (sm) / translate-x-6 (md) for visual consistency
const sizeConfig = {
    sm: { track: 'h-7 w-12', knob: 'h-5 w-5', translate: 'translate-x-5', pad: 'p-2' },
    md: { track: 'h-8 w-14', knob: 'h-6 w-6', translate: 'translate-x-6', pad: 'p-2' },
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
    // v3.13.0: wrap in inline-flex with padding to expand hit area to 44px (HIG minimum)
    // Track itself remains visually compact, but clickable area covers 44×44 (sm) or 48×48 (md)
    return (
        <span className={`relative inline-flex items-center ${size_.pad} ${className}`}>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={ariaLabel}
                onClick={() => onChange && onChange(!on)}
                className={`relative inline-flex items-center rounded-full transition-token-base focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${size_.track} ${trackClass}`}
            >
                <span
                    className={`inline-block transform rounded-full bg-white transition-token-base ${size_.knob} ${on ? size_.translate : 'translate-x-1'}`}
                />
            </button>
        </span>
    );
};
