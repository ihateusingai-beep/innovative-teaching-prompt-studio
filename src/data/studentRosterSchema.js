// === v3.16.0 F2: Class Roster Schema ===
// Multi-student roster for bulk operations (generate all / print all certs).
//
// Shape:
//   {
//     id: 'student_<timestamp>_<random>',
//     name: '張小明',
//     senType: 'ADHD' | 'ASD' | '讀寫困難' | ...  (optional, freeform string)
//     notes: '課堂表現: 專注 5 分鐘後開始分心'  (optional, max 200 chars)
//     assessment: {  // snapshot of formData.assessment fields
//       date: '2026-07-09',
//       totalMinutes: 30,
//       totalQuestions: 10,
//       correctCount: 7,
//       accuracyPercent: 70,  // auto-computed if 0
//       strengths: ['加法運算'],
//       improvementAreas: ['減法'],
//       previousScore: 60,
//       currentScore: 75,
//     },
//     createdAt: epoch_ms,
//     updatedAt: epoch_ms,
//   }

export const ROSTER_VERSION = 1;
export const MAX_ROSTER_STUDENTS = 30;  // Per spec: 老師通常 30 學生 / 班
export const MAX_NAME_LENGTH = 20;
export const MAX_NOTES_LENGTH = 200;

export const COMMON_SEN_TYPES = [
    'ADHD',
    'ASD',
    '讀寫困難',
    '智力障礙',
    '聽力障礙',
    '視力障礙',
    '肢體障礙',
    '情緒行為問題',
    '其他',
];

export const migrateStudent = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    if (!raw.id || !raw.name) return null;
    return {
        id: String(raw.id),
        name: String(raw.name).slice(0, MAX_NAME_LENGTH),
        senType: typeof raw.senType === 'string' ? raw.senType.slice(0, 30) : '',
        notes: typeof raw.notes === 'string' ? raw.notes.slice(0, MAX_NOTES_LENGTH) : '',
        assessment: normalizeAssessment(raw.assessment),
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    };
};

export const normalizeAssessment = (raw) => {
    if (!raw || typeof raw !== 'object') return {
        date: '', totalMinutes: 0, totalQuestions: 0, correctCount: 0,
        accuracyPercent: 0, strengths: [], improvementAreas: [],
        previousScore: 0, currentScore: 0,
    };
    const totalQuestions = Number(raw.totalQuestions) || 0;
    const correctCount = Number(raw.correctCount) || 0;
    const accuracyPercent = raw.accuracyPercent != null
        ? Number(raw.accuracyPercent)
        : (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);
    return {
        date: typeof raw.date === 'string' ? raw.date : '',
        totalMinutes: Number(raw.totalMinutes) || 0,
        totalQuestions,
        correctCount,
        accuracyPercent,
        strengths: Array.isArray(raw.strengths) ? raw.strengths.filter(s => typeof s === 'string') : [],
        improvementAreas: Array.isArray(raw.improvementAreas) ? raw.improvementAreas.filter(s => typeof s === 'string') : [],
        previousScore: Number(raw.previousScore) || 0,
        currentScore: Number(raw.currentScore) || 0,
    };
};

export const migrateRoster = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map(migrateStudent).filter(Boolean);
};

// === Bulk operation helpers ===
// Copy assessment fields from roster student → formData.assessment shape
export const studentToAssessment = (student) => {
    return {
        studentName: student.name,
        date: student.assessment?.date || new Date().toLocaleDateString('zh-HK'),
        totalMinutes: student.assessment?.totalMinutes || 0,
        totalQuestions: student.assessment?.totalQuestions || 0,
        correctCount: student.assessment?.correctCount || 0,
        accuracyPercent: student.assessment?.accuracyPercent || 0,
        strengths: [...(student.assessment?.strengths || [])],
        improvementAreas: [...(student.assessment?.improvementAreas || [])],
        previousScore: student.assessment?.previousScore || 0,
        currentScore: student.assessment?.currentScore || 0,
    };
};

// Validate a student's name before adding
export const validateStudentName = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return { ok: false, error: '請填學生姓名' };
    if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, error: `姓名不能超過 ${MAX_NAME_LENGTH} 字` };
    return { ok: true, name: trimmed };
};