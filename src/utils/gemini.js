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

// === v3.13.0: Multi-variant generation (F2) ===
// 3 parallel calls with different maxOutputTokens to produce short/standard/long variants
// for side-by-side comparison UI. Returns array of {variant, text, error} in same order.

export const VARIANT_CONFIG = {
    short:    { maxOutputTokens: 600,  label: '簡短版',  emoji: '🎯', desc: '≤ 200 字, 適合 1-on-1 學生' },
    standard: { maxOutputTokens: 1500, label: '標準版',  emoji: '📖', desc: '400-600 字, 班房用' },
    long:     { maxOutputTokens: 4000, label: '完整版',  emoji: '📚', desc: '含 rationale, 適合 IEP 報告' },
};

export const VARIANT_KEYS = ['short', 'standard', 'long'];

/**
 * Generate all 3 variants in parallel.
 * @param {string} apiKey - Gemini API key
 * @param {string} prompt - Full prompt (design + tech)
 * @param {(variant: string, partial: string) => void} onChunk - Optional streaming callback (per variant)
 * @returns {Promise<{short, standard, long}>} Map of variant → {text, error, tokenCount, durationMs}
 */
export const generateMultiVariant = async (apiKey, prompt, onChunk) => {
    if (!apiKey) {
        throw new Error('請先設定 Gemini API key');
    }
    // Prepend length hint to prompt for each variant (so Gemini respects target length)
    const lengthPrefixes = {
        short:    '[請用 ≤ 200 字回應, 精簡扼要, 1-on-1 學生用]\n\n',
        standard: '[請用 400-600 字回應, 標準長度, 班房用]\n\n',
        long:     '[請用最完整版本回應, 含 rationale + 教學建議, 適合 IEP 報告]\n\n',
    };

    const tasks = VARIANT_KEYS.map(async (variant) => {
        const cfg = VARIANT_CONFIG[variant];
        const lengthPrefixedPrompt = lengthPrefixes[variant] + prompt;
        const t0 = performance.now();
        try {
            const text = await generateWithGemini(apiKey, lengthPrefixedPrompt, {
                maxOutputTokens: cfg.maxOutputTokens,
                temperature: 0.7,
            });
            if (onChunk) onChunk(variant, text);
            return {
                variant,
                text,
                error: null,
                tokenCount: text.length,  // approximation
                durationMs: performance.now() - t0,
            };
        } catch (err) {
            return {
                variant,
                text: '',
                error: err.message || String(err),
                tokenCount: 0,
                durationMs: performance.now() - t0,
            };
        }
    });
    const results = await Promise.all(tasks);
    return {
        short:    results[0],
        standard: results[1],
        long:     results[2],
    };
};
