// === LocalStorage helpers ===
// Safe wrappers 避免 quota crash / JSON parse error

export const loadFromStorage = (key, fallback = null) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        console.warn(`[TDA] Failed to load ${key}:`, err);
        return fallback;
    }
};

export const saveToStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        console.warn(`[TDA] Failed to save ${key}:`, err);
        return false;
    }
};

export const removeFromStorage = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (err) {
        console.warn(`[TDA] Failed to remove ${key}:`, err);
    }
};