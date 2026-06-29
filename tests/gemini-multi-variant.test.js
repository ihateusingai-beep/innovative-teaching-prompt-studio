// === gemini.js utility tests ===
// v3.13.0 F2 — multi-variant parallel generation

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VARIANT_CONFIG, VARIANT_KEYS, generateMultiVariant } from '../src/utils/gemini.js';

describe('VARIANT_CONFIG (v3.13.0 F2)', () => {
    it('defines exactly 3 variants: short / standard / long', () => {
        expect(VARIANT_KEYS).toEqual(['short', 'standard', 'long']);
        expect(Object.keys(VARIANT_CONFIG).sort()).toEqual(['long', 'short', 'standard']);
    });

    it('each variant has maxOutputTokens + label + emoji + desc', () => {
        for (const k of VARIANT_KEYS) {
            const cfg = VARIANT_CONFIG[k];
            expect(typeof cfg.maxOutputTokens).toBe('number');
            expect(cfg.maxOutputTokens).toBeGreaterThan(0);
            expect(typeof cfg.label).toBe('string');
            expect(typeof cfg.emoji).toBe('string');
            expect(typeof cfg.desc).toBe('string');
        }
    });

    it('short has smallest token budget, long has largest', () => {
        expect(VARIANT_CONFIG.short.maxOutputTokens).toBeLessThan(VARIANT_CONFIG.standard.maxOutputTokens);
        expect(VARIANT_CONFIG.standard.maxOutputTokens).toBeLessThan(VARIANT_CONFIG.long.maxOutputTokens);
    });

    it('short variant emoji is 🎯 (target)', () => {
        expect(VARIANT_CONFIG.short.emoji).toBe('🎯');
    });

    it('long variant emoji is 📚 (book)', () => {
        expect(VARIANT_CONFIG.long.emoji).toBe('📚');
    });
});

describe('generateMultiVariant (parallel 3x Gemini calls)', () => {
    let originalFetch;
    beforeEach(() => {
        originalFetch = global.fetch;
    });
    afterEach(() => {
        global.fetch = originalFetch;
    });

    const mockGeminiResponse = (text) => ({
        ok: true,
        status: 200,
        json: async () => ({
            candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
        }),
    });

    it('throws if apiKey is empty', async () => {
        await expect(generateMultiVariant('', 'test prompt')).rejects.toThrow('請先設定 Gemini API key');
    });

    it('throws if apiKey is null', async () => {
        await expect(generateMultiVariant(null, 'test prompt')).rejects.toThrow('請先設定 Gemini API key');
    });

    it('returns 3 variants on success (short/standard/long keys)', async () => {
        global.fetch = vi.fn().mockResolvedValue(mockGeminiResponse('mock text'));

        const result = await generateMultiVariant('test-api-key', 'test prompt');

        expect(result).toHaveProperty('short');
        expect(result).toHaveProperty('standard');
        expect(result).toHaveProperty('long');
        for (const k of VARIANT_KEYS) {
            expect(result[k]).toHaveProperty('text', 'mock text');
            expect(result[k]).toHaveProperty('error', null);
            expect(result[k]).toHaveProperty('tokenCount');
            expect(result[k]).toHaveProperty('durationMs');
        }
    });

    it('calls Gemini 3 times in parallel (Promise.all)', async () => {
        let callCount = 0;
        global.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            return mockGeminiResponse('response-' + callCount);
        });

        await generateMultiVariant('test-api-key', 'test prompt');

        // Should be 3 parallel calls
        expect(callCount).toBe(3);
    });

    it('uses different maxOutputTokens for each variant', async () => {
        const calls = [];
        global.fetch = vi.fn().mockImplementation(async (url, options) => {
            const body = JSON.parse(options.body);
            calls.push(body.generationConfig.maxOutputTokens);
            return mockGeminiResponse('ok');
        });

        await generateMultiVariant('test-api-key', 'test prompt');

        expect(calls).toContain(VARIANT_CONFIG.short.maxOutputTokens);
        expect(calls).toContain(VARIANT_CONFIG.standard.maxOutputTokens);
        expect(calls).toContain(VARIANT_CONFIG.long.maxOutputTokens);
    });

    it('prepends length hint to each variant prompt', async () => {
        const prompts = [];
        global.fetch = vi.fn().mockImplementation(async (url, options) => {
            const body = JSON.parse(options.body);
            prompts.push(body.contents[0].parts[0].text);
            return mockGeminiResponse('ok');
        });

        await generateMultiVariant('test-api-key', 'MY_PROMPT');

        expect(prompts.some(p => p.includes('≤ 200 字'))).toBe(true);  // short hint
        expect(prompts.some(p => p.includes('400-600 字'))).toBe(true);  // standard hint
        expect(prompts.some(p => p.includes('最完整版本'))).toBe(true);  // long hint
        expect(prompts.every(p => p.includes('MY_PROMPT'))).toBe(true);  // original prompt included
    });

    it('per-variant error captured without breaking other variants', async () => {
        let callIdx = 0;
        global.fetch = vi.fn().mockImplementation(async () => {
            callIdx++;
            if (callIdx === 2) {
                // 2nd call (standard) fails
                return {
                    ok: false,
                    status: 429,
                    text: async () => 'Rate limit exceeded',
                };
            }
            return mockGeminiResponse('ok-' + callIdx);
        });

        const result = await generateMultiVariant('test-api-key', 'test');

        // All 3 still return (Promise.all wait for all)
        expect(result.short.text).toBe('ok-1');
        expect(result.standard.error).toContain('Gemini API 429');
        expect(result.long.text).toBe('ok-3');
    });

    it('onChunk callback fired for each variant with its text', async () => {
        global.fetch = vi.fn().mockResolvedValue(mockGeminiResponse('chunked text'));
        const chunks = [];
        const onChunk = (variant, text) => chunks.push({ variant, text });

        await generateMultiVariant('test-api-key', 'test', onChunk);

        expect(chunks).toHaveLength(3);
        expect(chunks.map(c => c.variant).sort()).toEqual(['long', 'short', 'standard']);
        expect(chunks.every(c => c.text === 'chunked text')).toBe(true);
    });
});
