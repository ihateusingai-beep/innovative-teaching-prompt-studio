// === User Template Schema + Migration ===
// v3.15.0 F1: upgrade user template shape to support category / tags / useCount / archived.
// Backward compat: existing templates (created before F1) get default values
// for missing fields instead of being dropped.
//
// Shape:
//   {
//     id: 'user_12345',         // 'user_' + Date.now()
//     name: '張老師 ADHD 工具箱',  // user-facing name (max 30 chars)
//     description: '...',        // optional, max 100 chars
//     category: '學科',          // optional, freeform or from preset list
//     tags: ['ADHD', '小一'],    // optional, array of strings (max 5)
//     icon: '⭐',                // emoji icon (default ⭐)
//     data: { ...formData },     // formData snapshot
//     createdAt: 1690000000000,  // epoch ms
//     updatedAt: 1690000000000,  // epoch ms (F1 new)
//     lastUsed: 0,               // epoch ms (F1 new, 0 = never)
//     useCount: 0,               // F1 new
//     archived: false,           // F1 new — soft delete
//   }

export const USER_TEMPLATE_VERSION = 1;
export const MAX_USER_TAGS = 5;
export const MAX_NAME_LENGTH = 30;
export const MAX_DESC_LENGTH = 100;
export const MAX_TAG_LENGTH = 12;

// Common categories (presets shown in TemplateEditorModal dropdown)
// 用戶可以 freeform 輸入 — 呢個 list 純粹 quick-pick
export const TEMPLATE_CATEGORIES = [
    '學科', '通識', '行政', '班級經營', 'SEN 支援', '評估', '其他',
];

// Migrate a single user template to F1 shape. Idempotent (safe to re-run).
// Defensive: missing fields → defaults; invalid types → coerced.
export const migrateUserTemplate = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    // Required: id + data (data 係 formData snapshot)
    if (!raw.id || !raw.data) return null;

    return {
        id: String(raw.id),
        name: typeof raw.name === 'string' ? raw.name.slice(0, MAX_NAME_LENGTH) : '未命名範本',
        description: typeof raw.description === 'string' ? raw.description.slice(0, MAX_DESC_LENGTH) : '',
        category: typeof raw.category === 'string' && raw.category.trim() ? raw.category : '',
        tags: Array.isArray(raw.tags)
            ? raw.tags
                .filter(t => typeof t === 'string' && t.trim())
                .map(t => t.slice(0, MAX_TAG_LENGTH))
                .slice(0, MAX_USER_TAGS)
            : [],
        icon: typeof raw.icon === 'string' && raw.icon ? raw.icon : '⭐',
        data: { ...raw.data },
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : (raw.createdAt || Date.now()),
        lastUsed: typeof raw.lastUsed === 'number' ? raw.lastUsed : 0,
        useCount: typeof raw.useCount === 'number' ? raw.useCount : 0,
        archived: typeof raw.archived === 'boolean' ? raw.archived : false,
    };
};

// Migrate an array of templates (used on app load to upgrade localStorage)
export const migrateUserTemplates = (rawArray) => {
    if (!Array.isArray(rawArray)) return [];
    return rawArray
        .map(migrateUserTemplate)
        .filter(Boolean); // drop nulls (corrupted entries)
};

// Encode template (or array) to base64 for share-with-colleague export.
// 包咗 magic prefix 'TDA_TPL_V1' 防用戶 paste 隨意 base64 撞我哋 format
export const encodeTemplateShare = (template) => {
    const json = JSON.stringify({ __tpl_share_v1: true, payload: template });
    // btoa works on Latin-1, but Chinese chars would break. Use TextEncoder + base64 polyfill
    // via simple utf8-bytes-to-base64:
    const utf8 = unescape(encodeURIComponent(json));
    return 'TDA_TPL_V1:' + btoa(utf8);
};

// Decode shared template string. Returns null on any decode error / wrong format.
export const decodeTemplateShare = (encoded) => {
    try {
        if (typeof encoded !== 'string') return null;
        if (!encoded.startsWith('TDA_TPL_V1:')) return null;
        const b64 = encoded.slice('TDA_TPL_V1:'.length);
        const utf8 = atob(b64);
        const json = decodeURIComponent(escape(utf8));
        const parsed = JSON.parse(json);
        if (!parsed || parsed.__tpl_share_v1 !== true) return null;
        return parsed.payload;
    } catch {
        return null;
    }
};

// 收集所有 user template 嘅 unique tags (for tag filter chip UI)
export const collectAllTags = (templates) => {
    const set = new Set();
    for (const t of templates) {
        if (Array.isArray(t.tags)) {
            for (const tag of t.tags) {
                if (tag) set.add(tag);
            }
        }
    }
    return Array.from(set).sort();
};
