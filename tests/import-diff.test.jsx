// === v3.15.0 A3: Schema migration safety + import diff + undo tests ===
// Tests:
//   - per-field try/catch: 1 invalid field doesn't block others
//   - __field_status returned for every schema field
//   - status 'ok' / 'migrated' / 'fallback' / 'auto-fill' / 'missing' / 'failed' classification
//   - legacy input still works (backward compat with v3.14.2 hotfix)
//   - ImportDiffModal renders status groups, warnings, legacy extra
//   - ImportDiffModal: Apply → success path; failed > 0 → button disabled
//   - ImportDiffModal: applied state shows Undo button

// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';

import { migrateFormData } from '../src/data/schema.js';
import { ImportDiffModal } from '../src/components/ImportDiffModal.jsx';

afterEach(() => cleanup());

describe('v3.15.0 A3 — per-field try/catch in migrateFormData', () => {
    it('returns __field_status map covering all schema fields', () => {
        const m = migrateFormData({ purpose: 'test' });
        expect(m.__field_status).toBeDefined();
        expect(typeof m.__field_status).toBe('object');
        // Should have entries for many fields
        expect(Object.keys(m.__field_status).length).toBeGreaterThan(10);
    });

    it('classifies present valid field as "ok"', () => {
        const m = migrateFormData({ purpose: 'test', toolName: 'foo' });
        expect(m.__field_status.toolName).toBe('ok');
        expect(m.__field_status.purpose).toBe('ok');
    });

    it('classifies transformed field (v1 gameStyle array → string) as "migrated"', () => {
        const m = migrateFormData({
            purpose: 'test',
            gameStyle: ['扭蛋機 (Gachapon)'],
        });
        expect(m.__field_status.gameStyle).toBe('migrated');
    });

    it('classifies type mismatch as "fallback"', () => {
        const m = migrateFormData({
            purpose: 'test',
            // rules should be array, send string instead
            rules: 'not-an-array',
        });
        expect(m.__field_status.rules).toBe('fallback');
    });

    it('classifies v1 missing required purpose as "auto-fill"', () => {
        const m = migrateFormData({ __schema_version: 1, toolName: 'foo' });
        expect(m.__field_status.purpose).toBe('auto-fill');
    });

    it('classifies missing optional field as "missing"', () => {
        const m = migrateFormData({ purpose: 'test' });
        expect(m.__field_status.toolName).toBe('missing');
    });

    it('throws when required v2+ field missing (no auto-fill rule)', () => {
        // purpose is required for v2+, so missing it should throw
        expect(() => migrateFormData({ __schema_version: 2 })).toThrow();
    });

    it('does NOT throw when 1 invalid field is present alongside valid required fields', () => {
        // purpose is valid; rules is invalid type. Should NOT throw.
        const m = migrateFormData({
            purpose: 'valid',
            rules: 'definitely-not-an-array',
        });
        expect(m.purpose).toBe('valid');
        expect(m.__field_status.rules).toBe('fallback');
    });

    it('legacy schemaVersion detection still works (backward compat with v3.14.2)', () => {
        const m = migrateFormData({
            teacherName: '張老師',
            toolName: 'foo',
            isGemini: true,  // v1 name → renamed
            gameStyle: ['扭蛋機 (Gachapon)'],  // v1 array → string
            examples: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
            rules: ['rule1', 'rule2', 'rule3'],
            __schema_version: 1,
        });
        expect(m.useGeminiStyle).toBe(true);  // renamed
        expect(m.gameStyle).toBe('扭蛋機 (Gachapon)');  // array → string
        expect(m.__field_status.useGeminiStyle).toBe('ok');
        expect(m.__field_status.gameStyle).toBe('migrated');
    });

    it('wrapped formData shape detection still works (audit v3.14.2 hotfix)', () => {
        const m = migrateFormData({
            formData: { purpose: 'wrapped test', toolName: 'x' },
            schemaVersion: 2,
        });
        expect(m.purpose).toBe('wrapped test');
    });
});

describe('v3.15.0 A3 — ImportDiffModal renders diff correctly', () => {
    const baseProps = {
        theme: 'plain',
        fileName: 'test.json',
        fieldStatus: {
            toolName: 'ok',
            purpose: 'ok',
            gameStyle: 'migrated',
            rules: 'fallback',
            teacherName: 'auto-fill',
            accessibility: 'missing',
            examples: 'ok',
        },
        warnings: ['自動轉換 gameStyle', 'rules fallback'],
        schemaVersion: 2,
        legacyExtra: { customOldField: 'value' },
        onConfirm: () => {},
        onClose: () => {},
    };

    it('shows file name and field count', () => {
        render(<ImportDiffModal {...baseProps} />);
        expect(screen.getByText(/test\.json/)).toBeTruthy();
    });

    it('groups fields by status with correct counts', () => {
        render(<ImportDiffModal {...baseProps} />);
        // migrated (1), fallback (1), auto-fill (1), missing (1), ok (2)
        expect(screen.getByText(/自動轉換 \(1\)/)).toBeTruthy();
        expect(screen.getByText(/用預設取代 \(1\)/)).toBeTruthy();
        expect(screen.getByText(/自動填入 \(1\)/)).toBeTruthy();
        expect(screen.getByText(/使用預設 \(1\)/)).toBeTruthy();
    });

    it('renders warning messages', () => {
        render(<ImportDiffModal {...baseProps} />);
        expect(screen.getByText(/自動轉換 gameStyle/)).toBeTruthy();
    });

    it('renders legacy extra fields section', () => {
        render(<ImportDiffModal {...baseProps} />);
        expect(screen.getByText(/保留舊版未知欄位/)).toBeTruthy();
        expect(screen.getByText(/customOldField/)).toBeTruthy();
    });

    it('shows Apply button when no failed fields', () => {
        const onConfirm = vi.fn();
        render(<ImportDiffModal {...baseProps} onConfirm={onConfirm} />);
        const applyBtn = screen.getByText(/確認匯入/);
        expect(applyBtn).toBeTruthy();
        const btn = applyBtn.closest('button');
        expect(btn.hasAttribute('disabled')).toBe(false);
        fireEvent.click(applyBtn);
        expect(onConfirm).toHaveBeenCalled();
    });

    it('disables Apply button when failed fields exist', () => {
        const failedProps = {
            ...baseProps,
            fieldStatus: { ...baseProps.fieldStatus, criticalField: 'failed' },
        };
        render(<ImportDiffModal {...failedProps} />);
        const btn = screen.getByText(/有 1 個失敗/).closest('button');
        expect(btn.hasAttribute('disabled')).toBe(true);
    });

    it('shows Undo button in applied state (isApplied=true)', () => {
        const onUndo = vi.fn();
        render(<ImportDiffModal {...baseProps} isApplied={true} onUndo={onUndo} />);
        const undoBtn = screen.getByText(/撤銷匯入/);
        expect(undoBtn).toBeTruthy();
        fireEvent.click(undoBtn);
        expect(onUndo).toHaveBeenCalled();
    });

    it('does NOT show Undo button before applied (isApplied=false)', () => {
        render(<ImportDiffModal {...baseProps} isApplied={false} />);
        expect(screen.queryByText(/撤銷匯入/)).toBeNull();
    });

    it('truncates long warnings list (>10) with "and N more" hint', () => {
        const manyWarnings = Array.from({ length: 15 }, (_, i) => `warning ${i}`);
        render(<ImportDiffModal {...baseProps} warnings={manyWarnings} />);
        expect(screen.getByText(/仲有 5 項/)).toBeTruthy();
    });
});
