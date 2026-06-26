import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage, removeFromStorage } from '../utils/storage.js';
import { migrateFormData } from '../data/schema.js';

// === useAutosave Hook ===
// Auto-save formData to localStorage with debounce
// 開頁時檢查 recovery snapshot
//
// Returns:
//   lastSavedAt: timestamp | null
//   recoverySnapshot: object | null (有未處理嘅 snapshot)
//   acceptRecovery(): 載入 snapshot
//   dismissRecovery(): 清 snapshot
//   clearAutosave(): 清 localStorage entry
//
// localStorage key: 'TDA_AUTOSAVE_V1'
const AUTOSAVE_KEY = 'TDA_AUTOSAVE_V1';
const AUTOSAVE_DEBOUNCE_MS = 1000;
const AUTOSAVE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useAutosave = (formData) => {
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [recoverySnapshot, setRecoverySnapshot] = useState(null);

    // 開頁時檢查 recovery
    useEffect(() => {
        const stored = loadFromStorage(AUTOSAVE_KEY);
        if (!stored || !stored.formData || !stored.savedAt) return;
        // 太舊就清走
        if (Date.now() - stored.savedAt > AUTOSAVE_MAX_AGE_MS) {
            removeFromStorage(AUTOSAVE_KEY);
            return;
        }
        setRecoverySnapshot(stored);
    }, []);

    // formData 變動 → debounce save (但有 recovery 唔寫，避免覆寫未決定嘅 data)
    useEffect(() => {
        if (recoverySnapshot) return;
        const timer = setTimeout(() => {
            const saved = saveToStorage(AUTOSAVE_KEY, {
                formData,
                savedAt: Date.now(),
                schema_version: 2,
            });
            if (saved) setLastSavedAt(Date.now());
        }, AUTOSAVE_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [formData, recoverySnapshot]);

    const acceptRecovery = useCallback(() => {
        if (!recoverySnapshot) return null;
        const migrated = migrateFormData(recoverySnapshot.formData);
        const { __schema_version, __legacy_extra, __warnings, ...cleanFormData } = migrated;
        setLastSavedAt(recoverySnapshot.savedAt);
        setRecoverySnapshot(null);
        return { cleanFormData, warnings: __warnings };
    }, [recoverySnapshot]);

    const dismissRecovery = useCallback(() => {
        removeFromStorage(AUTOSAVE_KEY);
        setLastSavedAt(null);
        setRecoverySnapshot(null);
    }, []);

    const clearAutosave = useCallback(() => {
        removeFromStorage(AUTOSAVE_KEY);
        setLastSavedAt(null);
    }, []);

    return {
        lastSavedAt,
        recoverySnapshot,
        acceptRecovery,
        dismissRecovery,
        clearAutosave,
    };
};