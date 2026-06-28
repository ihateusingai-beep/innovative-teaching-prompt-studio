import { defaultRules } from './option-tables.js';

const SCHEMA_VERSION = 2;

// === Schema definitions for JSON migration ===
// 每改 formData shape，要 bump SCHEMA_VERSION + 加 migration entry
// type: 'string' | 'number' | 'boolean' | 'array' | 'object'
// required: true ＝ import 必須有呢個 field（否則 throw）
// required: false ＝ import 冇呢個 field 會用 default forward-fill

const FORM_SCHEMA = {
    teacherName:             { type: 'string', required: false },
    toolName:                { type: 'string', required: false },
    category:                { type: 'string', required: false },
    subjectCategory:         { type: 'string', required: false },
    subjectCustomInput:      { type: 'string', required: false },
    gameStyle:               { type: 'string', required: false }, // v1 係 array，v2 起係 string（單選）
    gameStyleCustomInput:    { type: 'string', required: false },
    interactionType:         { type: 'array',  required: false },
    interactionCustomInput:  { type: 'string', required: false },
    learningDiversity:       { type: 'array',  required: false },
    includePreferenceSettings:{ type: 'boolean', required: false },
    useGeminiStyle:          { type: 'boolean', required: false }, // v1 叫 isGemini
    fabStyle:                { type: 'string', required: false },  // 新增
    examples:                { type: 'array',  required: false },
    grade:                   { type: 'string', required: false },
    senLevel:                { type: 'string', required: false },
    senTypes:                { type: 'array',  required: false }, // 新增
    accessibility:           { type: 'array',  required: false }, // 新增
    purpose:                 { type: 'string', required: true  }, // 核心用途必填
    context:                 { type: 'string', required: false },
    value:                   { type: 'array',  required: false },
    rules:                   { type: 'array',  required: false },
};

// Migration map — 由舊 field name / structure migrate 到 v2 shape
// Key 係 source key（如果係 object 形式）或 source path；value 係 transformer
const FIELD_RENAMES = {
    isGemini: 'useGeminiStyle', // v1 → v2: isGemini rename
};

// v1 → v2 field-level migration transformers
// 用嚟處理 value 結構轉換（例如 array → string）
const FIELD_TRANSFORMS = {
    gameStyle: (value) => {
        // v1 係 array, v2 係 string
        if (Array.isArray(value) && value.length > 0) {
            return value[0];
        }
        return value;
    },
    // W9-10 #6: rules 由 string[] 升級去 {text, __isDefault}[]
    // 舊 import 可能係 string，自動 normalize 入 object shape（標記為 user 自訂）
    // 新 shape (object with .text) 維持不變（avoid round-trip warning noise）
    rules: (value) => {
        if (!Array.isArray(value)) return value;
        // 如果全部都已經係 {text, ...} object shape，唔好 trigger warning (round-trip stable)
        const allAlreadyObjects = value.every(r => typeof r === 'object' && r !== null && typeof r.text === 'string');
        if (allAlreadyObjects) return value; // pass through, 唔 warn
        return value.map(r => {
            if (typeof r === 'string') return { text: r, __isDefault: false };
            if (typeof r === 'object' && r !== null && typeof r.text === 'string') return r;
            return null;
        }).filter(Boolean);
    },
};

// 揾 helper field type — 容忍 'string' / 'number' / 'array' / 'boolean' / 'object'
// 唔做 deep recursive validation（太複雜），只做 top-level type check
const matchesType = (value, type) => {
    switch (type) {
        case 'string':  return typeof value === 'string';
        case 'number':  return typeof value === 'number' && !Number.isNaN(value);
        case 'boolean': return typeof value === 'boolean';
        case 'array':   return Array.isArray(value);
        case 'object':  return typeof value === 'object' && value !== null && !Array.isArray(value);
        default:        return true;
    }
};

// Pure migration function — 將任何 imported JSON normalize 到當前 schema
// 策略：
//   1. 唔係 object 就 throw
//   2. Rename legacy fields（FIELD_RENAMES map）
//   3. Type validation — 唔啱 type 就 log warning + fallback 到 default（唔 throw，保留寬容）
//   4. Required field 缺失 → throw（明確失敗）
//   5. Forward-fill 所有 default field（用 getInitialFormData() 嘅 default）
//   6. 保留未知 field 喺 __legacy_extra（debug 用，老師亦可睇到）
//   7. 喺 migrated 物件加 __schema_version metadata
const migrateFormData = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new Error("JSON 必須係 object（唔可以係 array 或純值）。");
    }

    const errors = [];
    const warnings = [];
    const migrated = {};
    const extra = {};

    // 1. Apply field renames + collect values
    const renamedInput = { ...input };
    Object.entries(FIELD_RENAMES).forEach(([oldKey, newKey]) => {
        if (oldKey in renamedInput && !(newKey in renamedInput)) {
            renamedInput[newKey] = renamedInput[oldKey];
            delete renamedInput[oldKey];
            warnings.push(`自動將舊欄位「${oldKey}」轉成新欄位「${newKey}」`);
        }
    });

    // 2. Process each schema field
    Object.entries(FORM_SCHEMA).forEach(([key, spec]) => {
        if (key in renamedInput) {
            let value = renamedInput[key];

            // Apply value-level transformer (e.g. array → string)
            if (FIELD_TRANSFORMS[key]) {
                const original = value;
                value = FIELD_TRANSFORMS[key](value);
                if (original !== value) {
                    warnings.push(`「${key}」已從舊結構轉換成新結構`);
                }
            }

            if (matchesType(value, spec.type)) {
                migrated[key] = value;
            } else {
                // Type mismatch — fallback to default + warn
                warnings.push(`「${key}」類型不符 (期望 ${spec.type})，已用預設值取代`);
                // 唔 throw，等 import 仲用得，只係 warn
            }
        } else if (spec.required) {
            errors.push(`缺少必填欄位「${key}」`);
        }
        // 其他情況（optional + missing）→ forward-fill 由 default 提供
    });

    // 3. Forward-fill from defaults
    const defaults = getInitialFormData();
    Object.keys(FORM_SCHEMA).forEach(key => {
        if (!(key in migrated)) {
            migrated[key] = defaults[key];
        }
    });

    // 4. Collect unknown fields → __legacy_extra
    Object.keys(renamedInput).forEach(key => {
        if (!(key in FORM_SCHEMA) && !(key in FIELD_RENAMES)) {
            extra[key] = renamedInput[key];
        }
    });

    // 5. Throws on hard errors
    if (errors.length > 0) {
        const err = new Error(errors.join('\n'));
        err.userMessage = `匯入失敗：\n${errors.join('\n')}`;
        throw err;
    }

    // 6. Attach metadata
    migrated.__schema_version = SCHEMA_VERSION;
    migrated.__legacy_extra = extra;
    migrated.__warnings = warnings;

    return migrated;
};

const getInitialFormData = () => ({
    teacherName: "",
    toolName: "",
    category: "教學遊戲",
    subjectCategory: "語文",
    subjectCustomInput: "",
    gameStyle: "扭蛋機 (Gachapon)",  // v2 起係 string（單選），v1 係 array [已修正]
    gameStyleCustomInput: "",
    interactionType: ["點擊 (Click)"],
    interactionCustomInput: "",
    learningDiversity: [],
    includePreferenceSettings: true, // Default to true
    useGeminiStyle: true, // 控制 output format（單一 HTML 檔 + Gemini 風格生成指令），唔係揀 AI model
    fabStyle: "cyber", // New: 生成出嚟嘅 HTML 工具右下角 FAB 風格（cyber holographic / minimal / off）
    examples: [
        { text: "", level: "初階", count: 10, mechanism: "3選1答案" },
        { text: "", level: "中階", count: 10, mechanism: "4選1答案" },
        { text: "", level: "高階", count: 10, mechanism: "輸入文字 (Text Input)" }
    ],
    grade: "小學二年級 (P2)",
    senLevel: "輕度 (Mild)",
    senTypes: [], // New: SEN type 多選（ADHD、ASD、讀寫困難...）
    accessibility: [ // New: a11y 維度（老師可控；預設全選）
        "色彩對比 (WCAG AA 4.5:1)",
        "鍵盤導航 (Keyboard)",
        "Screen Reader 友善 (語意化 HTML + aria-label)",
        "減少動畫 (Reduced Motion)",
        "TTS 廣東話支援"
    ],
    purpose: "",
    context: "",
    value: ["堅毅"],
    // W9-10 #6: rules 用 object array，加 __isDefault flag
    // generator 會 filter 掉 __isDefault: true 而老師未改過嘅 entry，避免 default noise 入 prompt
    // 老師一改 text (即使加個句號)，__isDefault 會由 useFormData.handleRuleChange 自動清返 false
    rules: defaultRules.map(r => ({ ...r })),
});

export { SCHEMA_VERSION, FORM_SCHEMA, FIELD_RENAMES, FIELD_TRANSFORMS, matchesType, migrateFormData, getInitialFormData };
