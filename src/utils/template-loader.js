// === Template field extractor ===
//
// 3 個 template shape 兼容 (避免 breaking 老師 save 過嘅 user templates):
//   1. Built-in (src/data/templates.js, v3.0+): { id, name, description, icon, category, preview, formData: {...} }
//   2. User-saved (saveAsUserTemplate): { id, name, description, data: {...} }
//   3. Legacy (pre-v3.2 直接 spread): { ...formFields }
//
// Bug fix: 之前 built-in 嘅 handleLoadTemplate 將成個 template object spread 入 formData，
// 污染 formData (id/name/description/icon/category/preview 變成假 form fields)。
// 呢個 helper 統一抽 form data 出嚟，3 個 shape 都 work。
export const extractTemplateFields = (template) => {
    if (!template) return {};
    if (template.formData && typeof template.formData === 'object') {
        // 1. Built-in
        return template.formData;
    }
    if (template.data && typeof template.data === 'object') {
        // 2. User-saved
        return template.data;
    }
    // 3. Legacy — assume template 本身就係 form fields
    // Strip known metadata keys just in case
    const { id, name, description, icon, category, preview, createdAt, ...fields } = template;
    return fields;
};
