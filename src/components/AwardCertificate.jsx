// === AwardCertificate.jsx ===
// v3.14.0 — Student award certificate renderer with 6 visual styles
// v3.18.0 — 系統預設標題/正文（努力證書·進步證書），老師唔使手打
//
// Props (all optional — component falls back to placeholders):
//   style: 'rainbow' | 'medal' | 'galaxy' | 'art' | 'dino' | 'flower'  (default: 'rainbow')
//   title: string (e.g. 努力證書 / 進步證書) — 缺省自動由 score/improvement 推
//   body: string  — 缺省「恭喜 {名} 完成 {科目}！」
//   studentName, date, subject, score, strengths, improvement, teacherName, teacherMessage

import React from 'react';
import { resolveCertTitle, resolveCertBody, DEFAULT_TEACHER_MESSAGE } from '../utils/awardDefaults.js';
import { SCHOOL_NAME, SCHOOL_LOGO_URL } from '../data/schoolBrand.js';

export const AWARD_STYLES = ['rainbow', 'medal', 'galaxy', 'art', 'dino', 'flower'];

export const AWARD_STYLE_META = {
    rainbow: { emoji: '🌈', label: '彩虹小馬', desc: '鮮色 + emoji, 適合低年級' },
    medal:   { emoji: '🏅', label: '獎牌徽章', desc: '金屬 ribbon, 適合高年級' },
    galaxy:  { emoji: '🌌', label: '星空探索', desc: '深色 + glow, 適合中年級' },
    art:     { emoji: '🎨', label: '藝術家',     desc: '粉彩 + 筆觸, 適合文藝學生' },
    dino:    { emoji: '🦕', label: '恐龍探險', desc: '粗獷 + 綠色, 適合活力學生' },
    flower:  { emoji: '🌸', label: '花漾年華', desc: '粉色 + 植物, 適合細心學生' },
};

const EMPTY = {
    studentName: '同學',
    date: new Date().toLocaleDateString('zh-HK'),
    subject: '',
    score: '',
    strengths: [],
    improvement: '',
    teacherName: '',
};

export const AwardCertificate = ({
    style = 'rainbow',
    title,
    body,
    studentName = EMPTY.studentName,
    date = EMPTY.date,
    subject = EMPTY.subject,
    score = EMPTY.score,
    strengths = EMPTY.strengths,
    improvement = EMPTY.improvement,
    teacherName = EMPTY.teacherName,
    teacherMessage, // undefined → 系統預設；'' → 隱藏
}) => {
    const safeStyle = AWARD_STYLES.includes(style) ? style : 'rainbow';
    const meta = AWARD_STYLE_META[safeStyle];
    const visibleStrengths = (strengths || []).filter(Boolean).slice(0, 3);

    const resolvedTitle = (title && String(title).trim())
        || resolveCertTitle({ score, improvement, currentScore: score });
    const resolvedBody = (body && String(body).trim())
        || resolveCertBody({ studentName, subject, currentScore: score });
    // undefined → 系統預設；明確 '' → 隱藏（進階關咗老師的話）
    const resolvedMsg = (teacherMessage === undefined || teacherMessage === null)
        ? DEFAULT_TEACHER_MESSAGE
        : String(teacherMessage).trim();

    return (
        <div className={`award-cert cert-${safeStyle}`} data-style={safeStyle}>
            <div className="cert-frame">
                <div className="cert-card">
                    <div className="cert-school-bar">
                        <img
                            src={SCHOOL_LOGO_URL}
                            alt={SCHOOL_NAME}
                            className="cert-school-logo"
                            referrerPolicy="no-referrer"
                        />
                        <div className="cert-school-text">
                            <div className="cert-school-name">{SCHOOL_NAME}</div>
                            <div className="cert-school-sub">Tseung Kwan O Pui Chi School</div>
                        </div>
                    </div>
                    <div className="cert-header">
                        <div className="cert-emblem">{meta.emoji}</div>
                        <h1 className="cert-title">{resolvedTitle}</h1>
                        <p className="cert-subtitle">Award of Excellence</p>
                    </div>

                    <div className="cert-body">
                        <p className="cert-presented-to">特此頒授予</p>
                        <h2 className="cert-student-name">{studentName || '同學'}</h2>

                        <p className="cert-body-text">{resolvedBody}</p>

                        {(subject || score !== '') && (
                            <div className="cert-meta-row">
                                {subject && (
                                    <span className="cert-meta-item">
                                        <span className="cert-meta-label">科目</span>
                                        <span className="cert-meta-value">{subject}</span>
                                    </span>
                                )}
                                {score !== '' && score !== null && (
                                    <span className="cert-meta-item">
                                        <span className="cert-meta-label">分數</span>
                                        <span className="cert-meta-value cert-score">{score}</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {improvement && (
                            <p className="cert-improvement">📈 進步 {improvement}</p>
                        )}

                        {visibleStrengths.length > 0 && (
                            <div className="cert-strengths">
                                <p className="cert-strengths-label">傑出表現</p>
                                <ul className="cert-strengths-list">
                                    {visibleStrengths.map((s, i) => (
                                        <li key={i} className="cert-strength-item">
                                            <span className="cert-strength-bullet">★</span>
                                            <span className="cert-strength-text">{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {resolvedMsg ? (
                            <p className="cert-teacher-message">
                                <span className="cert-message-label">老師的話：</span>
                                {resolvedMsg}
                            </p>
                        ) : null}
                    </div>

                    <div className="cert-footer">
                        <div className="cert-footer-item">
                            <p className="cert-footer-label">日期</p>
                            <p className="cert-footer-value">{date}</p>
                        </div>
                        <div className="cert-footer-item cert-signature">
                            <p className="cert-footer-label">頒發</p>
                            <p className="cert-footer-value cert-teacher-signature">
                                {teacherName || '老師簽名'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AwardCertificate;
