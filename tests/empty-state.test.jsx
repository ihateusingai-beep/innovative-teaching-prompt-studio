// === v3.16.0 U2: Empty state guidance tests ===
// Tests:
//   - EmptyState renders title + description + CTA button
//   - CTA click triggers onCtaClick handler
//   - Icon is rendered (when provided)
//   - getEmptyStateForTab returns null when formData is not empty (rules filled, etc.)
//   - getEmptyStateForTab returns preset for each of 5 tabs when fields are empty
//   - preset.isEmpty logic:
//     * basic: toolName + purpose both empty
//     * content: purpose empty OR all examples empty
//     * rules: no user-custom rules (only default rules)
//     * assessment: studentName + totalQuestions both empty
//     * generate: toolName OR purpose empty

// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

import { EmptyState, EMPTY_STATE_PRESETS, getEmptyStateForTab } from '../src/components/EmptyState.jsx';
import { Target } from 'lucide-react';

afterEach(() => cleanup());

describe('v3.16.0 U2 — EmptyState component', () => {
    it('renders title + description + CTA button', () => {
        const onClick = vi.fn();
        render(
            <EmptyState
                icon={Target}
                title="先設定工具名"
                description="畀個名呢個工具"
                ctaLabel="去填寫"
                onCtaClick={onClick}
            />
        );
        expect(screen.getByText('先設定工具名')).toBeTruthy();
        expect(screen.getByText('畀個名呢個工具')).toBeTruthy();
        expect(screen.getByText(/去填寫/)).toBeTruthy();
    });

    it('CTA click triggers onCtaClick handler', () => {
        const onClick = vi.fn();
        render(
            <EmptyState
                icon={Target}
                title="X"
                ctaLabel="Click me"
                onCtaClick={onClick}
            />
        );
        fireEvent.click(screen.getByText(/Click me/));
        expect(onClick).toHaveBeenCalled();
    });

    it('renders ctaHint when provided', () => {
        render(
            <EmptyState
                icon={Target}
                title="X"
                ctaLabel="Y"
                onCtaClick={() => {}}
                ctaHint="或者由範本庫載入"
            />
        );
        expect(screen.getByText(/或者由範本庫載入/)).toBeTruthy();
    });

    it('does NOT crash when onCtaClick is omitted', () => {
        render(<EmptyState icon={Target} title="No CTA" />);
        expect(screen.getByText('No CTA')).toBeTruthy();
    });
});

describe('v3.16.0 U2 — EMPTY_STATE_PRESETS coverage', () => {
    it('defines all 5 tab presets (basic / content / rules / assessment / generate)', () => {
        expect(Object.keys(EMPTY_STATE_PRESETS).sort()).toEqual([
            'assessment', 'basic', 'content', 'generate', 'rules',
        ]);
    });

    it('every preset has icon + title + description + ctaLabel + isEmpty function', () => {
        for (const [key, preset] of Object.entries(EMPTY_STATE_PRESETS)) {
            expect(preset.icon, `${key}.icon`).toBeDefined();
            expect(typeof preset.title, `${key}.title`).toBe('string');
            expect(typeof preset.description, `${key}.description`).toBe('string');
            expect(typeof preset.ctaLabel, `${key}.ctaLabel`).toBe('string');
            expect(typeof preset.isEmpty, `${key}.isEmpty`).toBe('function');
        }
    });
});

describe('v3.16.0 U2 — getEmptyStateForTab logic', () => {
    it('returns null for unknown tab key', () => {
        expect(getEmptyStateForTab('nonexistent', {})).toBe(null);
    });

    describe('basic tab', () => {
        it('returns preset when toolName + purpose both empty', () => {
            const result = getEmptyStateForTab('basic', { toolName: '', purpose: '' });
            expect(result).not.toBe(null);
            expect(result.title).toContain('先設定');
        });

        it('returns null when toolName is filled', () => {
            expect(getEmptyStateForTab('basic', { toolName: 'X', purpose: '' })).toBe(null);
        });

        it('returns null when purpose is filled', () => {
            expect(getEmptyStateForTab('basic', { toolName: '', purpose: 'Y' })).toBe(null);
        });
    });

    describe('content tab', () => {
        it('returns preset when purpose empty', () => {
            const result = getEmptyStateForTab('content', { purpose: '', examples: [{ text: 'x' }] });
            expect(result).not.toBe(null);
        });

        it('returns preset when all examples empty', () => {
            const result = getEmptyStateForTab('content', {
                purpose: 'filled',
                examples: [{ text: '' }, { text: '' }, { text: '' }],
            });
            expect(result).not.toBe(null);
        });

        it('returns null when purpose filled + at least 1 example filled', () => {
            expect(getEmptyStateForTab('content', {
                purpose: 'filled',
                examples: [{ text: 'x' }, { text: '' }, { text: '' }],
            })).toBe(null);
        });
    });

    describe('rules tab', () => {
        it('returns preset when only default rules (no user-custom)', () => {
            const result = getEmptyStateForTab('rules', {
                rules: [
                    { text: 'default rule', __isDefault: true },
                ],
            });
            expect(result).not.toBe(null);
        });

        it('returns null when user has custom rules', () => {
            expect(getEmptyStateForTab('rules', {
                rules: [{ text: 'my rule', __isDefault: false }],
            })).toBe(null);
        });

        it('returns null when user modifies a default rule', () => {
            expect(getEmptyStateForTab('rules', {
                rules: [{ text: 'modified default', __isDefault: false }],
            })).toBe(null);
        });
    });

    describe('assessment tab', () => {
        it('returns preset when studentName + totalQuestions empty', () => {
            const result = getEmptyStateForTab('assessment', {
                assessment: { studentName: '', totalQuestions: 0 },
            });
            expect(result).not.toBe(null);
        });

        it('returns null when studentName filled', () => {
            expect(getEmptyStateForTab('assessment', {
                assessment: { studentName: 'Alice', totalQuestions: 0 },
            })).toBe(null);
        });

        it('returns null when totalQuestions > 0', () => {
            expect(getEmptyStateForTab('assessment', {
                assessment: { studentName: '', totalQuestions: 10 },
            })).toBe(null);
        });
    });

    describe('generate tab', () => {
        it('returns preset when toolName empty', () => {
            expect(getEmptyStateForTab('generate', { toolName: '', purpose: 'filled' })).not.toBe(null);
        });

        it('returns preset when purpose empty', () => {
            expect(getEmptyStateForTab('generate', { toolName: 'filled', purpose: '' })).not.toBe(null);
        });

        it('returns null when both filled', () => {
            expect(getEmptyStateForTab('generate', { toolName: 'X', purpose: 'Y' })).toBe(null);
        });
    });
});