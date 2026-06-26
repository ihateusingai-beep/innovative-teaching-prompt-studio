// === Gemini API Integration ===
// Client-side direct fetch to Gemini REST API (CORS 開放, 唔需要 proxy)
// 純 utility functions, 唔直接 store state — caller 負責 useState 管理

export const GEMINI_API_KEY_STORAGE = 'TDA_GEMINI_API_KEY_V1';

// 從 localStorage 讀 key
export const loadGeminiKey = () => {
    try {
        return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
    } catch {
        return '';
    }
};

// 儲存 / 清除 key
export const saveGeminiKey = (key) => {
    try {
        if (key) localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
        else localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    } catch (err) {
        console.warn('[TDA] Failed to save Gemini API key:', err);
    }
};

// 直接 hit Gemini API (non-streaming)
// return: text string | throw error
export const generateWithGemini = async (apiKey, prompt, options = {}) => {
    if (!apiKey) {
        throw new Error('請先設定 Gemini API key');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxOutputTokens || 4096,
            },
        }),
    });
    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini API ${response.status}: ${errText.substring(0, 200)}`);
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        const reason = data?.candidates?.[0]?.finishReason || 'unknown';
        throw new Error(`Gemini 冇回傳內容 (finishReason: ${reason})。可能 prompt 觸發 safety filter。`);
    }
    return text;
};