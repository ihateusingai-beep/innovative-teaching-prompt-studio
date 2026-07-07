// === v3.15.0 A1: Auto-save debounce 500ms + live 'X 秒前' badge ===
// Tests:
//   - useTimeAgo returns formatted string + updates every 1s
//   - useTimeAgo returns null when timestamp is null
//   - useTimeAgo cleans up interval on unmount
//   - useAutosave debounce is 500ms (coalesces multiple rapid changes)

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

import { useTimeAgo } from '../src/hooks/useTimeAgo.js';
import { formatTimeAgo } from '../src/utils/time.js';

describe('v3.15.0 A1 — useTimeAgo', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null when timestamp is null', () => {
        const { result } = renderHook(() => useTimeAgo(null));
        expect(result.current).toBe(null);
    });

    it('returns formatted string immediately after mount', () => {
        const ts = Date.now();
        const { result } = renderHook(() => useTimeAgo(ts));
        expect(result.current).toBe('0 秒前');
    });

    it('updates label after 1 second tick', () => {
        const ts = Date.now();
        const { result } = renderHook(() => useTimeAgo(ts));
        expect(result.current).toBe('0 秒前');
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(result.current).toBe('1 秒前');
    });

    it('keeps updating every 1 second', () => {
        const ts = Date.now();
        const { result } = renderHook(() => useTimeAgo(ts));
        act(() => vi.advanceTimersByTime(3000));
        expect(result.current).toBe('3 秒前');
        act(() => vi.advanceTimersByTime(2000));
        expect(result.current).toBe('5 秒前');
    });

    it('transitions to 分鐘前 after 60s', () => {
        const ts = Date.now();
        const { result } = renderHook(() => useTimeAgo(ts));
        act(() => vi.advanceTimersByTime(61_000));
        expect(result.current).toBe('1 分鐘前');
    });

    it('cleans up interval on unmount (no leaked timers)', () => {
        const ts = Date.now();
        const { unmount } = renderHook(() => useTimeAgo(ts));
        // Spy on clearInterval to verify cleanup
        const spy = vi.spyOn(global, 'clearInterval');
        unmount();
        // At least one clearInterval should have been called
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('does not start interval when timestamp is null', () => {
        const { result, rerender } = renderHook(({ ts }) => useTimeAgo(ts), {
            initialProps: { ts: null },
        });
        expect(result.current).toBe(null);
        act(() => vi.advanceTimersByTime(5000));
        // Still null — no interval ticking
        expect(result.current).toBe(null);
        // Now provide a timestamp
        rerender({ ts: Date.now() });
        expect(result.current).toBe('0 秒前');
    });
});

describe('v3.15.0 A1 — formatTimeAgo', () => {
    it('returns "0 秒前" for current timestamp', () => {
        expect(formatTimeAgo(Date.now())).toBe('0 秒前');
    });

    it('formats 30s as 30 秒前', () => {
        expect(formatTimeAgo(Date.now() - 30_000)).toBe('30 秒前');
    });

    it('formats 90s as 1 分鐘前', () => {
        expect(formatTimeAgo(Date.now() - 90_000)).toBe('1 分鐘前');
    });

    it('formats 3700s as 1 小時前', () => {
        expect(formatTimeAgo(Date.now() - 3_700_000)).toBe('1 小時前');
    });
});

describe('v3.15.0 A1 — useAutosave debounce constant', () => {
    it('debounce is 500ms (not 1000ms) — source-level check', async () => {
        // Read the source to assert the constant value
        const fs = await import('node:fs');
        const path = await import('node:path');
        const src = fs.readFileSync(
            path.resolve(process.cwd(), 'src/hooks/useAutosave.js'),
            'utf8'
        );
        expect(src).toMatch(/AUTOSAVE_DEBOUNCE_MS\s*=\s*500/);
        expect(src).not.toMatch(/AUTOSAVE_DEBOUNCE_MS\s*=\s*1000/);
        expect(src).toMatch(/v3\.15\.0\s+A1/i);
    });
});
