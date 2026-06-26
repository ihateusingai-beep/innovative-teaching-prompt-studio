// === Clipboard utilities ===
// Copy text 到 clipboard with graceful fallback
// Modern browsers: navigator.clipboard.writeText (async)
// Old browsers / file:// / insecure context: textarea + execCommand fallback

export const copyToClipboard = async (text) => {
    // Modern API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.warn('[TDA] Clipboard API failed, trying fallback:', err);
        }
    }
    // Fallback: deprecated execCommand
    return fallbackCopy(text);
};

export const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const success = document.execCommand('copy');
        if (!success) {
            throw new Error('execCommand copy returned false');
        }
        return true;
    } finally {
        document.body.removeChild(textArea);
    }
};