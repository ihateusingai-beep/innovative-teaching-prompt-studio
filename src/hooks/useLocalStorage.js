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
        setRawValue(newValue);
        if (newValue === null || newValue === undefined) {
            removeFromStorage(key);
        } else {
            saveToStorage(key, newValue);
        }
    }, [key]);

    const clear = useCallback(() => {
        removeFromStorage(key);
        setRawValue(initialValue);
    }, [key, initialValue]);

    return [value, setValue, clear];
};