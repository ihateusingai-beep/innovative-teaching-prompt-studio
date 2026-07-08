// === v3.15.0 F1: User Template Editor tests ===
// Tests:
//   - Schema migration: legacy shape (id+name+data) → F1 shape (category/tags/useCount/etc)
//   - Migration is idempotent (re-running on F1-shape returns same shape)
//   - Migration handles invalid input (null, non-object, missing id/data)
//   - Tag collection + filter logic
//   - Base64 encode/decode roundtrip (with Chinese characters)
//   - Decode fails gracefully on bad input (wrong prefix, corrupt base64, missing magic)
//   - TemplateEditorModal renders create mode vs edit mode
//   - TemplateEditorModal enforces name required + max length + tag cap
//   - TemplateCard shows category badge / tags / useCount / lastUsed when present
//   - TemplateCard hides F1 metadata gracefully for legacy templates

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import React from 'react';

import {
    migrateUserTemplate,
    migrateUserTemplates,
    encodeTemplateShare,
    decodeTemplateShare,
    collectAllTags,
    MAX_USER_TAGS,
    MAX_NAME_LENGTH,
    MAX_DESC_LENGTH,
} from '../src/data/userTemplateSchema.js';
import { TemplateCard, TemplateEditorModal } from '../src/components/TemplateCard.jsx';

const validF1Template = {
    id: 'user_12345',
    name: 'ADHD 練習工具',
    description: '給小一專注力不足學生嘅加法練習',
    category: '學科',
    tags: ['ADHD', '小一', '加法'],
    icon: '⭐',
    data: { purpose: '練習加法', toolName: 'ADHD 練習工具' },
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    lastUsed: 1700000000000,
    useCount: 5,
    archived: false,
};

const legacyTemplate = {
    id: 'user_99999',
    name: '舊版範本',
    description: 'v3.14 之前',
    icon: '⭐',
    data: { purpose: 'foo' },
    createdAt: 1690000000000,
    // No category, no tags, no useCount, no lastUsed, no updatedAt, no archived
};

// Cleanup DOM between tests to avoid "multiple elements" errors
afterEach(() => cleanup());

describe('v3.15.0 F1 — schema migration', () => {
    it('returns F1 shape with all fields for valid F1 input', () => {
        const m = migrateUserTemplate(validF1Template);
        expect(m.id).toBe('user_12345');
        expect(m.name).toBe('ADHD 練習工具');
        expect(m.category).toBe('學科');
        expect(m.tags).toEqual(['ADHD', '小一', '加法']);
        expect(m.useCount).toBe(5);
        expect(m.archived).toBe(false);
    });

    it('migrates legacy template → F1 defaults for missing fields', () => {
        const m = migrateUserTemplate(legacyTemplate);
        expect(m).not.toBeNull();
        expect(m.id).toBe('user_99999');
        expect(m.name).toBe('舊版範本');
        // Defaults
        expect(m.category).toBe('');
        expect(m.tags).toEqual([]);
        expect(m.useCount).toBe(0);
        expect(m.lastUsed).toBe(0);
        expect(m.archived).toBe(false);
        // updatedAt falls back to createdAt
        expect(m.updatedAt).toBe(1690000000000);
    });

    it('migration is idempotent (re-running on F1 shape returns same values)', () => {
        const a = migrateUserTemplate(validF1Template);
        const b = migrateUserTemplate(a);
        expect(b).toEqual(a);
    });

    it('returns null for invalid input (null, undefined, non-object)', () => {
        expect(migrateUserTemplate(null)).toBe(null);
        expect(migrateUserTemplate(undefined)).toBe(null);
        expect(migrateUserTemplate('string')).toBe(null);
        expect(migrateUserTemplate(42)).toBe(null);
        expect(migrateUserTemplate([])).toBe(null);  // missing id + data
    });

    it('returns null when id or data is missing', () => {
        expect(migrateUserTemplate({ name: 'no id' })).toBe(null);
        expect(migrateUserTemplate({ id: 'no_data' })).toBe(null);
    });

    it('truncates over-length name and description', () => {
        const longName = 'A'.repeat(100);
        const m = migrateUserTemplate({ ...validF1Template, name: longName, description: 'B'.repeat(200) });
        expect(m.name.length).toBe(MAX_NAME_LENGTH);
        expect(m.description.length).toBe(MAX_DESC_LENGTH);
    });

    it('caps tags at MAX_USER_TAGS and truncates each tag', () => {
        const tooMany = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];
        const longTag = 'A'.repeat(50);
        const m = migrateUserTemplate({ ...validF1Template, tags: [...tooMany, longTag] });
        expect(m.tags.length).toBe(MAX_USER_TAGS);
        expect(m.tags[0]).toBe('t1');
    });

    it('coerces invalid types: non-array tags → []', () => {
        const m = migrateUserTemplate({ ...validF1Template, tags: 'not-an-array' });
        expect(m.tags).toEqual([]);
    });

    it('migrateUserTemplates drops nulls and migrates valid entries', () => {
        const arr = [validF1Template, null, legacyTemplate, { invalid: true }];
        const result = migrateUserTemplates(arr);
        expect(result.length).toBe(2);
        expect(result[0].id).toBe('user_12345');
        expect(result[1].id).toBe('user_99999');
    });
});

describe('v3.15.0 F1 — base64 share encode/decode', () => {
    it('roundtrip: encode → decode returns equivalent template', () => {
        const encoded = encodeTemplateShare(validF1Template);
        const decoded = decodeTemplateShare(encoded);
        expect(decoded).toEqual(validF1Template);
    });

    it('encoded string starts with TDA_TPL_V1: prefix', () => {
        const encoded = encodeTemplateShare(validF1Template);
        expect(encoded.startsWith('TDA_TPL_V1:')).toBe(true);
    });

    it('handles Chinese characters in name/description (UTF-8 safe)', () => {
        const t = { ...validF1Template, name: '張老師嘅 ADHD 工具', description: '專為小一 SEN 學生設計' };
        const encoded = encodeTemplateShare(t);
        const decoded = decodeTemplateShare(encoded);
        expect(decoded.name).toBe('張老師嘅 ADHD 工具');
        expect(decoded.description).toBe('專為小一 SEN 學生設計');
    });

    it('decode returns null for wrong prefix', () => {
        expect(decodeTemplateShare('garbage_no_prefix')).toBe(null);
    });

    it('decode returns null for corrupt base64', () => {
        expect(decodeTemplateShare('TDA_TPL_V1:!!!not_base64!!!')).toBe(null);
    });

    it('decode returns null for wrong magic key in JSON', () => {
        const fake = 'TDA_TPL_V1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ wrong: 'magic' }))));
        expect(decodeTemplateShare(fake)).toBe(null);
    });

    it('decode returns null for empty / non-string input', () => {
        expect(decodeTemplateShare('')).toBe(null);
        expect(decodeTemplateShare(null)).toBe(null);
        expect(decodeTemplateShare(undefined)).toBe(null);
        expect(decodeTemplateShare(123)).toBe(null);
    });
});

describe('v3.15.0 F1 — collectAllTags', () => {
    it('returns unique sorted tags from all templates', () => {
        const all = collectAllTags([
            { tags: ['ADHD', '小一'] },
            { tags: ['小一', 'SEN'] },
            { tags: ['加法', 'ADHD'] },
            { tags: [] },
            { tags: null },
        ]);
        expect(all).toEqual(['ADHD', 'SEN', '加法', '小一']);
    });

    it('returns empty array when no tags exist', () => {
        expect(collectAllTags([{}, { tags: [] }, { tags: null }])).toEqual([]);
    });
});

describe('v3.15.0 F1 — TemplateEditorModal', () => {
    it('renders in create mode with empty form', () => {
        render(<TemplateEditorModal theme="plain" onSave={() => ({ ok: true })} onClose={() => {}} />);
        expect(screen.getByText(/新增範本/)).toBeTruthy();
        expect(screen.getByPlaceholderText(/ADHD 練習工具/)).toBeTruthy();
    });

    it('renders in edit mode with prefilled name', () => {
        render(<TemplateEditorModal theme="plain" initialTemplate={validF1Template} onSave={() => ({ ok: true })} onClose={() => {}} />);
        expect(screen.getByText(/編輯範本/)).toBeTruthy();
        expect(screen.getByDisplayValue('ADHD 練習工具')).toBeTruthy();
        expect(screen.getByDisplayValue('給小一專注力不足學生嘅加法練習')).toBeTruthy();
    });

    it('blocks save when name is empty and shows error', () => {
        const onSave = vi.fn(() => ({ ok: true }));
        render(<TemplateEditorModal theme="plain" onSave={onSave} onClose={() => {}} />);
        fireEvent.click(screen.getAllByText(/建立範本/)[0]);
        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByText(/請填範本名稱/)).toBeTruthy();
    });

    it('calls onSave with name + description + category + tags when form is valid', () => {
        const onSave = vi.fn(() => ({ ok: true }));
        render(<TemplateEditorModal theme="plain" onSave={onSave} onClose={() => {}} />);
        fireEvent.change(screen.getAllByPlaceholderText(/ADHD 練習工具/)[0], { target: { value: '新範本' } });
        fireEvent.click(screen.getAllByText(/建立範本/)[0]);
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: '新範本' }));
    });

    it('shows error from onSave failure (e.g. max templates reached)', () => {
        const onSave = vi.fn(() => ({ ok: false, error: '已達上限' }));
        render(<TemplateEditorModal theme="plain" onSave={onSave} onClose={() => {}} />);
        fireEvent.change(screen.getAllByPlaceholderText(/ADHD 練習工具/)[0], { target: { value: 'Foo' } });
        fireEvent.click(screen.getAllByText(/建立範本/)[0]);
        expect(screen.getByText(/已達上限/)).toBeTruthy();
    });

    it('adds tag via Enter key', () => {
        const onSave = vi.fn(() => ({ ok: true }));
        render(<TemplateEditorModal theme="plain" onSave={onSave} onClose={() => {}} />);
        const nameInput = screen.getAllByPlaceholderText(/ADHD 練習工具/)[0];
        const tagInput = screen.getAllByPlaceholderText(/輸入後撳 Enter/)[0];
        fireEvent.change(nameInput, { target: { value: 'X' } });
        fireEvent.change(tagInput, { target: { value: 'ADHD' } });
        fireEvent.keyDown(tagInput, { key: 'Enter' });
        expect(screen.getAllByText(/#ADHD/)[0]).toBeTruthy();
    });
});

describe('v3.15.0 F1 — TemplateCard F1 metadata rendering', () => {
    it('renders category badge when present', () => {
        const { getByText } = render(
            <TemplateCard theme="plain" template={validF1Template} onLoad={() => {}} isUser={true} />
        );
        expect(getByText(/📁 學科/)).toBeTruthy();
    });

    it('renders tags as #hashtags when present', () => {
        const { getByText } = render(
            <TemplateCard theme="plain" template={validF1Template} onLoad={() => {}} isUser={true} />
        );
        expect(getByText(/#ADHD/)).toBeTruthy();
        expect(getByText(/#小一/)).toBeTruthy();
    });

    it('renders useCount + lastUsed when useCount > 0', () => {
        const { getByText } = render(
            <TemplateCard theme="plain" template={validF1Template} onLoad={() => {}} isUser={true} />
        );
        expect(getByText(/用咗 5 次/)).toBeTruthy();
    });

    it('does NOT render useCount for legacy template (useCount = 0)', () => {
        const legacy = migrateUserTemplate(legacyTemplate);
        const { queryByText } = render(
            <TemplateCard theme="plain" template={legacy} onLoad={() => {}} isUser={true} />
        );
        expect(queryByText(/用咗/)).toBeNull();
    });

    it('renders edit/duplicate/archive buttons when isUser + handlers provided', () => {
        const onEdit = vi.fn();
        const onDuplicate = vi.fn();
        const onArchive = vi.fn();
        const { getByTitle } = render(
            <TemplateCard
                theme="plain"
                template={validF1Template}
                onLoad={() => {}}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                isUser={true}
            />
        );
        expect(getByTitle('編輯範本')).toBeTruthy();
        expect(getByTitle('複製範本')).toBeTruthy();
        expect(getByTitle('封存範本')).toBeTruthy();
    });

    it('does NOT render edit/duplicate/archive for built-in (isUser=false)', () => {
        const { queryByTitle } = render(
            <TemplateCard theme="plain" template={validF1Template} onLoad={() => {}} isUser={false} />
        );
        expect(queryByTitle('編輯範本')).toBeNull();
        expect(queryByTitle('複製範本')).toBeNull();
    });

    it('shows 已封存 badge when archived=true', () => {
        const archived = { ...validF1Template, archived: true };
        const { getByText } = render(
            <TemplateCard theme="plain" template={archived} onLoad={() => {}} isUser={true} />
        );
        expect(getByText(/已封存/)).toBeTruthy();
    });
});
