import { useRef, useState, useCallback, useEffect } from 'react';

// === useUndoRedo Hook ===
// Milestone-based history (唔追蹤每個 keystroke)
// caller 喺 explicit milestone (handleNext / handleImportJSON / acceptRecovery) call pushHistory
//
// Returns:
//   canUndo / canRedo: boolean (for button disabled state)
//   pushHistory(): record current state before next change
//   undo() / redo(): navigate history
//
// Max 30 entries FIFO

const MAX_HISTORY = 30;

export const useUndoRedo = (formData, setFormData) => {
    const historyRef = useRef({ past: [], future: [] });
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const pushHistory = useCallback(() => {
        // 唔記錄 identical state (避免重複 milestone)
        const last = historyRef.current.past[historyRef.current.past.length - 1];
        if (last && JSON.stringify(last) === JSON.stringify(formData)) return;
        historyRef.current.past.push(formData);
        if (historyRef.current.past.length > MAX_HISTORY) {
            historyRef.current.past.shift();
        }
        historyRef.current.future = [];
        setCanUndo(true);
        setCanRedo(false);
    }, [formData]);

    const undo = useCallback(() => {
        const past = historyRef.current.past;
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        historyRef.current.past = past.slice(0, -1);
        historyRef.current.future.push(formData);
        setFormData(previous);
        setCanUndo(historyRef.current.past.length > 0);
        setCanRedo(true);
    }, [formData, setFormData]);

    const redo = useCallback(() => {
        const future = historyRef.current.future;
        if (future.length === 0) return;
        const next = future[future.length - 1];
        historyRef.current.future = future.slice(0, -1);
        historyRef.current.past.push(formData);
        setFormData(next);
        setCanRedo(historyRef.current.future.length > 0);
        setCanUndo(true);
    }, [formData, setFormData]);

    // Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z / Cmd+Y
    // Skip if focus in text input/textarea (let native text undo work)
    useEffect(() => {
        const handler = (e) => {
            const tag = (e.target && e.target.tagName) || '';
            const isTextInput = tag === 'TEXTAREA' ||
                (tag === 'INPUT' && ['text', 'search', 'email', 'tel', 'url', 'password', 'number'].includes(
                    (e.target.type || '').toLowerCase()
                ));
            if (isTextInput) return;
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    return {
        canUndo,
        canRedo,
        pushHistory,
        undo,
        redo,
    };
};