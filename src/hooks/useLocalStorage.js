import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage, removeFromStorage } from '../utils/storage.js';

// === useLocalStorage Hook ===
// Generic key/value store with cross-tab sync
// 適用於 templates / onboarding flag / Gemini API key
//
// Returns:
//   value
//   setValue(newValue): 更新並 persist
//   clear(): 刪除 storage entry
export const useLocalStorage = (key, initialValue) => {
    const [value, setRawValue] = useState(() => {
        const stored = loadFromStorage(key);
        return stored !== null ? stored : initialValue;
    });

    // 跨 tab 同步：其他 tab 改咗就 update 返
    useEffect(() => {
        const handler = (e) => {
            if (e.key !== key) return;
            const newValue = e.newValue ? JSON.parse(e.newValue) : null;
            setRawValue(newValue !== null ? newValue : initialValue);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [key, initialValue]);

    const setValue = useCallback((newValue) => {
        // Handle functional updater: useState's setRawValue 接受 function 自動 unwrap，
        // 但 storage save 需要 actual value。我哋手動 unwrap to save correct data.
        let resolvedValue = newValue;
        if (typeof newValue === 'function') {
            // Functional updater: 我哋需要 current value 嚟 compute next.
            // 但 setRawValue 仲未 apply，所以呢度取 current `value` (closure-captured).
            // 用 functional form for setRawValue so React 同步 apply.
            setRawValue(prev => {
                const next = newValue(prev);
                // Side effect: persist resolved value
                if (next === null || next === undefined) {
                    removeFromStorage(key);
                } else {
                    saveToStorage(key, next);
                }
                return next;
            });
            return;
        }
        // Direct value
        setRawValue(resolvedValue);
        if (resolvedValue === null || resolvedValue === undefined) {
            removeFromStorage(key);
        } else {
            saveToStorage(key, resolvedValue);
        }
    }, [key, value]);

    const clear = useCallback(() => {
        removeFromStorage(key);
        setRawValue(initialValue);
    }, [key, initialValue]);

    return [value, setValue, clear];
};