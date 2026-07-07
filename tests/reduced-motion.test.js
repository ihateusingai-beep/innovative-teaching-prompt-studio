// === v3.15.0 V1: Reduced-motion override tests ===
// Tests cycle: 'system' | 'on' | 'off' | 'system' (3-state)
// + body class application via useEffect

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock useLocalStorage — actually use React state so re-render works
const mockStorage = new Map();
vi.mock('../src/hooks/useLocalStorage.js', () => ({
    useLocalStorage: (key, defaultValue) => {
        const [value, setRawValue] = React.useState(() => mockStorage.get(key) ?? defaultValue);
        const setter = (valOrUpdater) => {
            setRawValue(prev => {
                const v = typeof valOrUpdater === 'function' ? valOrUpdater(prev) : valOrUpdater;
                if (v === null || v === undefined) mockStorage.delete(key);
                else mockStorage.set(key, v);
                return v;
            });
        };
        return [value, setter, () => { mockStorage.delete(key); setRawValue(defaultValue); }];
    },
}));

import { useAppState } from '../src/state/useAppState.js';

describe('v3.15.0 V1 — reduced-motion override', () => {
    beforeEach(() => {
        mockStorage.clear();
        document.body.className = '';
    });

    afterEach(() => {
        document.body.className = '';
    });

    it('default motionPref is "system" (no body class added)', () => {
        const { result } = renderHook(() => useAppState());
        expect(result.current.motionPref).toBe('system');
        expect(document.body.classList.contains('tda-motion-on')).toBe(false);
        expect(document.body.classList.contains('tda-motion-off')).toBe(false);
    });

    it('cycleMotionPref: system → on → off → system', () => {
        const { result } = renderHook(() => useAppState());
        expect(result.current.motionPref).toBe('system');

        act(() => result.current.cycleMotionPref());
        expect(result.current.motionPref).toBe('on');
        expect(document.body.classList.contains('tda-motion-on')).toBe(true);

        act(() => result.current.cycleMotionPref());
        expect(result.current.motionPref).toBe('off');
        expect(document.body.classList.contains('tda-motion-on')).toBe(false);
        expect(document.body.classList.contains('tda-motion-off')).toBe(true);

        act(() => result.current.cycleMotionPref());
        expect(result.current.motionPref).toBe('system');
        expect(document.body.classList.contains('tda-motion-on')).toBe(false);
        expect(document.body.classList.contains('tda-motion-off')).toBe(false);
    });

    it('persists motionPref via localStorage key TDA_MOTION_PREF_V1', () => {
        // First mount: set to 'on' via cycle
        const { result } = renderHook(() => useAppState());
        act(() => result.current.cycleMotionPref());
        expect(result.current.motionPref).toBe('on');
        expect(mockStorage.get('TDA_MOTION_PREF_V1')).toBe('on');
    });

    it('cleanly removes both classes when switching states (no class accumulation)', () => {
        const { result } = renderHook(() => useAppState());
        act(() => result.current.cycleMotionPref()); // → on
        expect(document.body.classList.contains('tda-motion-on')).toBe(true);
        act(() => result.current.cycleMotionPref()); // → off
        expect(document.body.classList.contains('tda-motion-on')).toBe(false);
        expect(document.body.classList.contains('tda-motion-off')).toBe(true);
        act(() => result.current.cycleMotionPref()); // → system
        expect(document.body.classList.contains('tda-motion-off')).toBe(false);
        expect(document.body.classList.value).not.toMatch(/tda-motion-/);
    });
});
