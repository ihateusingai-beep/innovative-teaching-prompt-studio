import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage.js';

// === usePromptVersions Hook ===
// 老師 prompt 版本管理 — 儲存 design prompt / tech prompt 嘅多個 named version
//
// localStorage schema:
//   TDA_PROMPT_VERSIONS_V1 = [
//     { id, label, kind: 'design'|'tech'|'both', snapshot: { designPrompt, techPrompt, formData }, createdAt },
//     ...
//   ]
//
// Returns:
//   versions: 所有 saved versions（按 createdAt desc）
//   saveVersion(label, kind, snapshot): 加新 version
//   deleteVersion(id): 刪
//   restoreVersion(id): 將該 version 嘅 formData 寫返做 current（caller 負責 setFormData）
//   versionsOfKind(kind): filter helper
//
// 容量上限 MAX_VERSIONS = 50，避免 localStorage quota

const VERSIONS_STORAGE_KEY = 'TDA_PROMPT_VERSIONS_V1';
const MAX_VERSIONS = 50;

export const usePromptVersions = () => {
    const [versions, setVersions] = useLocalStorage(VERSIONS_STORAGE_KEY, []);

    const saveVersion = useCallback((label, kind, snapshot) => {
        const entry = {
            id: 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            label: (label || '').trim() || `版本 ${new Date().toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            kind: kind || 'both', // 'design' | 'tech' | 'both'
            snapshot: {
                designPrompt: snapshot.designPrompt || '',
                techPrompt: snapshot.techPrompt || '',
                formData: snapshot.formData || null,
            },
            createdAt: Date.now(),
        };
        setVersions(prev => {
            const next = [entry, ...prev];
            // FIFO 超過 max → 砍最舊
            if (next.length > MAX_VERSIONS) {
                return next.slice(0, MAX_VERSIONS);
            }
            return next;
        });
        return entry.id;
    }, [setVersions]);

    const deleteVersion = useCallback((id) => {
        setVersions(prev => prev.filter(v => v.id !== id));
    }, [setVersions]);

    const renameVersion = useCallback((id, newLabel) => {
        setVersions(prev => prev.map(v => v.id === id ? { ...v, label: newLabel.trim() || v.label } : v));
    }, [setVersions]);

    const getVersion = useCallback((id) => {
        return versions.find(v => v.id === id) || null;
    }, [versions]);

    const versionsOfKind = useCallback((kind) => {
        if (!kind) return versions;
        return versions.filter(v => v.kind === kind || v.kind === 'both');
    }, [versions]);

    // Sorted newest-first（其實 saveVersion 已經 prepend，但防禦性 sort）
    const sortedVersions = useMemo(() => {
        return [...versions].sort((a, b) => b.createdAt - a.createdAt);
    }, [versions]);

    return {
        versions: sortedVersions,
        saveVersion,
        deleteVersion,
        renameVersion,
        getVersion,
        versionsOfKind,
        MAX_VERSIONS,
        storageKey: VERSIONS_STORAGE_KEY,
    };
};