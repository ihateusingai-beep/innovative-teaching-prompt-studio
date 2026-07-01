// === AwardCertificate.jsx ===
// v3.14.0 — Student award certificate renderer with 6 visual styles
//
// Props (all optional — component falls back to placeholders):
//   style: 'rainbow' | 'medal' | 'galaxy' | 'art' | 'dino' | 'flower'  (default: 'rainbow')
//   studentName: string
//   date: string (ISO date or display string)
//   subject: string (e.g. "二年級數學")
//   score: number (0-100) or string
//   strengths: array of strings (top 1-3)
//   improvement: string (e.g. "+12%")
//   teacherName: string
//   teacherMessage: string (optional personal note)
//
// Aesthetic decisions:
//   - A4 landscape design (297mm × 210mm visible aspect)
//   - 6 styles cover different student preferences:
//       rainbow: vibrant + emojis + cartoon stars (ADHD / young)
//       medal:   gold metallic + ribbon + clean lines (high-grade / ASD)
//       galaxy:  deep navy + glow + starfield (older students)
//       art:     pastels + brush strokes + frame (creative students)
//       dino:    bold greens + T-rex icon + jagged edges (boy preference)
//       flower:  pink + botanical line art + serif (girl preference)
//   - All styles use semantic class names that map to .cert-* CSS classes
//   - Print stylesheet (in styles/index.css) handles @media print A4 landscape

import React from 'react';

export const AWARD_STYLES = ['rainbow', 'medal', 'galaxy', 'art', 'dino', 'flower'];

export const AWARD_STYLE_META = {
    rainbow: { emoji: '🌈', label: '彩虹小馬', desc: '鮮色 + emoji, 適合低年級' },
    medal:   { emoji: '🏅', label: '獎牌徽章', desc: '金屬 ribbon, 適合高年級' },
    galaxy:  { emoji: '🌌', label: '星空探索', desc: '深色 + glow, 適合中年級' },
    art:     { emoji: '🎨', label: '藝術家',     desc: '粉彩 + 筆觸, 適合文藝學生' },
    dino:    { emoji: '🦕', label: '恐龍探險', desc: '粗獷 + 綠色, 適合活力學生' },
    flower:  { emoji: '🌸', label: '花漾年華', desc: '粉色 + 植物, 適合細心學生' },
};

// Fallbacks when formData missing fields
const EMPTY = {
    studentName: '同學',
    date: new Date().toLocaleDateString('zh-HK'),
    subject: '',
    score: '',
    strengths: [],
    improvement: '',
    teacherName: '',
    teacherMessage: '',
};

export const AwardCertificate = ({
    style = 'rainbow',
    studentName = EMPTY.studentName,
    date = EMPTY.date,
    subject = EMPTY.subject,
    score = EMPTY.score,
    strengths = EMPTY.strengths,
    improvement = EMPTY.improvement,
    teacherName = EMPTY.teacherName,
    teacherMessage = EMPTY.teacherMessage,
}) => {
    // Defensive: verify style is in supported set
    const safeStyle = AWARD_STYLES.includes(style) ? style : 'rainbow';
    const meta = AWARD_STYLE_META[safeStyle];

    // Truncate very long strengths to top 3
    const visibleStrengths = (strengths || []).filter(Boolean).slice(0, 3);

    // Common layout: framed certificate with header / body / footer
    // Each style changes ONLY the visual treatment via .cert-* CSS classes
    return (
        <div className={`award-cert cert-${safeStyle}`} data-style={safeStyle}>
            {/* Decorative outer frame — style-specific border */}
            <div className="cert-frame">
                {/* Inner card — common across all styles */}
                <div className="cert-card">
                    {/* Header: emblem + title */}
                    <div className="cert-header">
                        <div className="cert-emblem">{meta.emoji}</div>
                        <h1 className="cert-title">奬 狀</h1>
                        <p className="cert-subtitle">Award of Excellence</p>
                    </div>

                    {/* Body: recipient + metadata */}
                    <div className="cert-body">
                        <p className="cert-presented-to">特此頒授予</p>
                        <h2 className="cert-student-name">{studentName}</h2>

                        {/* Subject + score (conditional) */}
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

                        {/* Improvement (e.g. +12%) */}
                        {improvement && (
                            <p className="cert-improvement">📈 進步 {improvement}</p>
                        )}

                        {/* Strengths (top 1-3) */}
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

                        {/* Optional teacher message */}
                        {teacherMessage && (
                            <p className="cert-teacher-message">
                                <span className="cert-message-label">老師的話：</span>
                                {teacherMessage}
                            </p>
                        )}
                    </div>

                    {/* Footer: signature + date */}
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
