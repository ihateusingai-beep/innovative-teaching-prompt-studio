import { useState, useCallback, useMemo, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import {
    createVault,
    unlockVault,
    encryptProfileEntry,
    decryptProfileEntry,
} from '../utils/crypto.js';

// === useProfileBank Hook ===
// SEN 學生 Profile Bank — 加密儲存 individual student presets
//
// Storage shape (TDA_PROFILE_BANK_V1, localStorage):
//   {
//     salt: '<b64>',           // PBKDF2 salt, permanent
//     profiles: [              // encrypted entries
//       { id, iv, ciphertext, updatedAt },
//     ]
//   }
//
// State lifecycle:
//   - 未設 passphrase: isLocked === true, vaultExists === false
//   - 已設但 locked:    isLocked === true, vaultExists === true
//   - Unlocked:          isLocked === false, vaultKey held in memory
//
// Memory only:
//   - keyRef (CryptoKey, non-extractable): 喺 memory hold 到 tab close / manual lock
//   - 唔 save 落 localStorage；passphrase 都唔 save
//
// Returns:
//   vaultExists: bool — 有冇 setup 過 vault
//   isLocked: bool — 當前係咪 locked
//   profiles: array of decrypted {id, name, preset, customNotes, updatedAt}  (only when unlocked)
//   hasProfiles: bool
//   setup(passphrase): 建立新 vault
//   unlock(passphrase): 用現有 salt 解鎖
//   lock(): clear key + return to locked state
//   addProfile(name, preset, customNotes): 加新 profile
//   updateProfile(id, partial): 改
//   deleteProfile(id): 刪
//   exportEncrypted(): 整個 encrypted vault 拎出嚟做 JSON file
//   importEncrypted(json): 合併外部 vault 到本地
//
// Security note:
//   - applyProfile 唔喺呢度（caller 負責 formData merge）
//   - 每次 write (add/update/delete) 都會 encrypt 整個 profiles array + save 到 localStorage
//   - 用 ref 持有 CryptoKey 而唔係 state，避免 re-render 又無謂 trigger derive

const VAULT_STORAGE_KEY = 'TDA_PROFILE_BANK_V1';
const MAX_PROFILES = 30;

export const useProfileBank = () => {
    // Persistent storage — 但 vault 結構（salt + encrypted array）係明碼
    // （sensitive data 全部 encrypted 落 ciphertext 入面）
    const [vault, setVault] = useLocalStorage(VAULT_STORAGE_KEY, { salt: null, profiles: [] });

    // CryptoKey held in ref — 唔入 state，唔 trigger re-render
    const keyRef = useRef(null);

    // Decrypted profiles in memory — 每次 unlock 之後先 populate
    const [decryptedProfiles, setDecryptedProfiles] = useState([]);
    const [isLocked, setIsLocked] = useState(true);
    const [lastError, setLastError] = useState(null);

    const vaultExists = vault && !!vault.salt && Array.isArray(vault.profiles);
    const hasProfiles = decryptedProfiles.length > 0;

    // === Setup new vault ===
    const setup = useCallback(async (passphrase) => {
        setLastError(null);
        try {
            const { salt, key } = await createVault(passphrase);
            // Initialize empty vault
            setVault({ salt, profiles: [] });
            keyRef.current = key;
            setDecryptedProfiles([]);
            setIsLocked(false);
            return { success: true };
        } catch (err) {
            setLastError(err.message);
            return { success: false, error: err.message };
        }
    }, [setVault]);

    // === Unlock existing vault ===
    const unlock = useCallback(async (passphrase) => {
        setLastError(null);
        if (!vault || !vault.salt) {
            return { success: false, error: '冇現有 vault，請先設定 passphrase。' };
        }
        try {
            const { key } = await unlockVault(passphrase, vault.salt);
            // Decrypt all entries — if any fails, abort and signal wrong passphrase
            const decrypted = [];
            for (const entry of vault.profiles || []) {
                const plain = await decryptProfileEntry(entry, key);
                decrypted.push(plain);
            }
            keyRef.current = key;
            setDecryptedProfiles(decrypted);
            setIsLocked(false);
            return { success: true };
        } catch (err) {
            setLastError('Passphrase 唔啱或 vault 損壞。');
            return { success: false, error: 'Passphrase 唔啱或 vault 損壞。' };
        }
    }, [vault, setVault]);

    // === Lock — clear key + cached profiles ===
    const lock = useCallback(() => {
        keyRef.current = null;
        setDecryptedProfiles([]);
        setIsLocked(true);
        setLastError(null);
    }, []);

    // === Helper: persist one decrypted profile (encrypt + write vault) ===
    const persistProfile = useCallback(async (decryptedEntry) => {
        if (!keyRef.current) throw new Error('Vault 已經 lock。');
        const encrypted = await encryptProfileEntry(decryptedEntry, keyRef.current);
        const newVault = { ...vault };
        const idx = newVault.profiles.findIndex(p => p.id === decryptedEntry.id);
        if (idx >= 0) {
            newVault.profiles[idx] = encrypted;
        } else {
            // FIFO 超過 max → 砍最舊
            const updated = [encrypted, ...newVault.profiles];
            if (updated.length > MAX_PROFILES) {
                updated.splice(MAX_PROFILES);
            }
            newVault.profiles = updated;
        }
        setVault(newVault);
    }, [vault, setVault]);

    // === Add profile ===
    const addProfile = useCallback(async (name, preset, customNotes) => {
        if (!keyRef.current) return { success: false, error: 'Vault 已經 lock，請先解鎖。' };
        if (!name || !name.trim()) return { success: false, error: 'Profile 名唔可以空白。' };
        if (decryptedProfiles.length >= MAX_PROFILES) {
            return { success: false, error: `已達上限 ${MAX_PROFILES} 個 profile。` };
        }
        const entry = {
            id: 'profile_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: name.trim(),
            preset: preset || {},
            customNotes: customNotes || '',
            updatedAt: Date.now(),
        };
        try {
            await persistProfile(entry);
            setDecryptedProfiles(prev => [entry, ...prev]);
            return { success: true, id: entry.id };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [decryptedProfiles, persistProfile]);

    // === Update profile ===
    const updateProfile = useCallback(async (id, partial) => {
        if (!keyRef.current) return { success: false, error: 'Vault 已經 lock，請先解鎖。' };
        const existing = decryptedProfiles.find(p => p.id === id);
        if (!existing) return { success: false, error: '搵唔到呢個 profile。' };
        const updated = {
            ...existing,
            ...partial,
            id,  // 唔可以改 id
            updatedAt: Date.now(),
        };
        try {
            await persistProfile(updated);
            setDecryptedProfiles(prev => prev.map(p => p.id === id ? updated : p));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [decryptedProfiles, persistProfile]);

    // === Delete profile ===
    const deleteProfile = useCallback(async (id) => {
        if (!keyRef.current) return { success: false, error: 'Vault 已經 lock，請先解鎖。' };
        try {
            const newVault = { ...vault, profiles: vault.profiles.filter(p => p.id !== id) };
            setVault(newVault);
            setDecryptedProfiles(prev => prev.filter(p => p.id !== id));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }, [vault, setVault]);

    // === Export encrypted vault as JSON ===
    // 唔 decrypt — 直接 copy vault 結構出嚟，老師可以喺其他 device 用返同一個 passphrase 解
    const exportEncrypted = useCallback(() => {
        if (!vault || !vault.salt) return null;
        return {
            __format: 'tda_profile_bank_v1',
            exportedAt: Date.now(),
            vault,
        };
    }, [vault]);

    // === Import encrypted vault from JSON ===
    // 兩個 mode: 'merge' (合併 profiles) / 'replace' (完全覆蓋 vault)
    const importEncrypted = useCallback(async (jsonObj, mode = 'merge') => {
        setLastError(null);
        if (!jsonObj || jsonObj.__format !== 'tda_profile_bank_v1' || !jsonObj.vault || !jsonObj.vault.salt) {
            return { success: false, error: '唔係 valid profile bank JSON。' };
        }
        const importedVault = jsonObj.vault;

        if (mode === 'replace') {
            // Replace mode — 必須 lock + reset
            keyRef.current = null;
            setDecryptedProfiles([]);
            setIsLocked(true);
            setVault(importedVault);
            return { success: true, mode: 'replace', requiresUnlock: true };
        }

        // Merge mode — 合併 profiles (用 imported salt 解密, 然後用本地 salt 重新加密)
        // 簡化 UX: 假設 imported vault 用同一個 passphrase derive。
        // 因為我哋冇 user 嘅 passphrase 喺 memory（CryptoKey non-extractable），
        // 所以 merge mode 要 user 再輸入一次 imported vault 嘅 passphrase。
        // 為咗避免 UX 複雜，今次 W7-8 先做 Replace mode；Merge mode 之後再加。
        return {
            success: false,
            error: 'Merge mode 暫未實作，請先用 Replace mode 嚟 sync vault。',
        };
    }, [setVault]);

    // === Profiles sorted newest first (by updatedAt) ===
    const sortedProfiles = useMemo(() => {
        return [...decryptedProfiles].sort((a, b) => b.updatedAt - a.updatedAt);
    }, [decryptedProfiles]);

    return {
        vaultExists,
        isLocked,
        lastError,
        profiles: sortedProfiles,
        hasProfiles,
        MAX_PROFILES,
        setup,
        unlock,
        lock,
        addProfile,
        updateProfile,
        deleteProfile,
        exportEncrypted,
        importEncrypted,
    };
};