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
// options:
//   - temperature: number (default 0.7)
//   - maxOutputTokens: number (default 4096)
//   - onChunk: (chunk: string) => void — non-streaming callback, fires once
//     with the final result. Reserved for future SSE streaming support; for
//     now it gives callers a uniform hook without breaking existing call sites.
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
    if (typeof options.onChunk === 'function') {
        try { options.onChunk(text); } catch (_) { /* ignore listener errors */ }
    }
    return text;
};

// === v3.13.0: Multi-variant generation (F2) ===
// 3 parallel calls with different maxOutputTokens to produce short/standard/long variants
// for side-by-side comparison UI. Returns array of {variant, text, error} in same order.

// BUGFIX 2026-07-12 (Drift #4): temperatures added so the 3 variants are
// actually distinct. Old config had only maxOutputTokens — every variant used
// temperature 0.7, so "short / standard / long" boiled down to a length
// variation on the same probability distribution. New profile:
//   - short    0.9 → hot / exploratory (try alternative framings)
//   - standard 0.7 → default (deterministic enough for classroom review)
//   - long     0.3 → cool / grounded (rationale + pedagogy, less hallucination)
export const VARIANT_CONFIG = {
    short:    { maxOutputTokens: 600,  temperature: 0.9, label: '簡短版',  emoji: '🎯', desc: '≤ 200 字, 適合 1-on-1 學生' },
    standard: { maxOutputTokens: 1500, temperature: 0.7, label: '標準版',  emoji: '📖', desc: '400-600 字, 班房用' },
    long:     { maxOutputTokens: 4000, temperature: 0.3, label: '完整版',  emoji: '📚', desc: '含 rationale, 適合 IEP 報告' },
};

export const VARIANT_KEYS = ['short', 'standard', 'long'];

/**
 * Generate all 3 variants in parallel.
 * @param {string} apiKey - Gemini API key
 * @param {string} prompt - Full prompt (design + tech)
 * @param {(variant: string, partial: string) => void} onChunk - Optional callback
 *   fired per variant with the final text (non-streaming today; reserved for
 *   future SSE streaming). Signature differs from generateWithGemini's
 *   options.onChunk (variant, text) vs (chunk).
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
