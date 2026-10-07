// === awardDefaults.js ===
// 獎狀系統預設文案 — 老師唔使手打 prompt / 正文
// v3.18.0

export const DEFAULT_TEACHER_MESSAGE = '繼續加油，老師為你 Proud！';
export const DEFAULT_CERT_STYLE = 'rainbow';

/** 努力證書 / 進步證書 — 有進步幅度 → 進步；否則努力 */
export function resolveCertTitle({ previousScore = 0, currentScore = 0, score = 0, improvement = '' } = {}) {
    const prev = Number(previousScore) || 0;
    const curr = Number(currentScore || score) || 0;
    if ((prev > 0 && curr > prev) || (typeof improvement === 'string' && improvement.trim().startsWith('+'))) {
        return '進步證書';
    }
    return '努力證書';
}

/** 正文：恭喜 {名} 完成 {科目}！正確率 {x}% */
export function resolveCertBody({
    studentName = '',
    subject = '',
    accuracyPercent = 0,
    totalQuestions = 0,
    correctCount = 0,
    currentScore = 0,
} = {}) {
    const name = (studentName && String(studentName).trim()) || '同學';
    const subj = (subject && String(subject).trim()) || '學習活動';
    let acc = Number(accuracyPercent) || 0;
    if (!acc && Number(totalQuestions) > 0) {
        acc = Math.round((Number(correctCount) / Number(totalQuestions)) * 100);
    }
    if (!acc && Number(currentScore) > 0) {
        acc = Number(currentScore);
    }
    if (acc > 0) return `恭喜 ${name} 完成 ${subj}！正確率 ${acc}%`;
    return `恭喜 ${name} 完成 ${subj}！`;
}

/** 老師訊息：空 → 系統預設 */
export function resolveTeacherMessage(raw = '', enabled = true) {
    if (enabled === false) return '';
    const t = (raw && String(raw).trim()) || '';
    return t || DEFAULT_TEACHER_MESSAGE;
}

/**
 * 由 formData 組出 AwardCertificate props（系統預設，唔使老師輪入）
 * show* toggles 預設全開；只有明確 false 先隱藏
 */
export function buildCertificateProps(formData = {}) {
    const ac = formData.awardCertificate || {};
    const a = formData.assessment || {};
    const show = (key, defaultOn = true) => {
        const v = ac[key];
        return v === undefined ? defaultOn : v !== false;
    };

    const studentName = show('showStudentName') ? (a.studentName || '同學') : '';
    const date = show('showDate')
        ? (a.date || new Date().toLocaleDateString('zh-HK'))
        : '';
    const subject = show('showSubject') ? (formData.subjectCategory || formData.toolName || '') : '';
    const score = show('showScore') ? (a.currentScore || a.accuracyPercent || '') : '';
    const strengths = show('showStrengths') ? (a.strengths || []) : [];

    // 有上次+今次分數就自動顯示進步（即使 toggle 預設 off，有數據就 on）
    const hasImproveData = Number(a.previousScore) > 0 && Number(a.currentScore) > 0;
    const showImprove = ac.showImprovement === true || (ac.showImprovement !== false && hasImproveData);
    const improvement = showImprove && hasImproveData
        ? `+${Number(a.currentScore) - Number(a.previousScore)} 分`
        : '';

    const teacherMessage = resolveTeacherMessage(
        ac.teacherMessage,
        ac.showTeacherMessage !== false, // 預設開
    );

    const title = resolveCertTitle({
        previousScore: a.previousScore,
        currentScore: a.currentScore,
        score: a.currentScore,
        improvement,
    });
    const body = resolveCertBody({
        studentName: a.studentName,
        subject: formData.subjectCategory || formData.toolName || '',
        accuracyPercent: a.accuracyPercent
            || (a.totalQuestions > 0
                ? Math.round((a.correctCount / a.totalQuestions) * 100)
                : 0),
        totalQuestions: a.totalQuestions,
        correctCount: a.correctCount,
        currentScore: a.currentScore,
    });

    return {
        studentName,
        date,
        subject,
        score,
        strengths,
        improvement,
        teacherName: formData.teacherName || '',
        teacherMessage,
        title,
        body,
        style: ac.style || DEFAULT_CERT_STYLE,
    };
}
