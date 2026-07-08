// === AwardCertificateModal.jsx ===
// v3.14.0 — Fullscreen modal for certificate preview + browser print
//
// Props:
//   open: boolean — modal visible flag
//   onClose: () => void
//   style: string — current style key (controlled by parent)
//   onStyleChange: (newStyle) => void
//   certificateProps: object — passed through to AwardCertificate
//     { studentName, date, subject, score, strengths, improvement, teacherName, teacherMessage }
//
// UX:
//   - Fullscreen overlay (95vh)
//   - Top toolbar: Style selector (6 dropdown) + Print button + Close
//   - Center: scrollable certificate preview at A4 landscape scale

import React, { useEffect, useRef, useState } from 'react';
import { AwardCertificate, AWARD_STYLES, AWARD_STYLE_META } from './AwardCertificate.jsx';

export const AwardCertificateModal = ({
    open,
    onClose,
    style = 'rainbow',
    onStyleChange,
    certificateProps = {},
}) => {
    const modalRef = useRef(null);
    // v3.15.0 V2: print preview state — show dashed-border frame around the cert
    // so user can visually confirm "what print will look like" before triggering print
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Lock body scroll when modal open + apply 'printing-cert' class for print CSS scope
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('printing-cert');
        } else {
            document.body.style.overflow = '';
            document.body.classList.remove('printing-cert');
        }
        return () => {
            document.body.style.overflow = '';
            document.body.classList.remove('printing-cert');
        };
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const handlePrint = () => {
        window.print();
    };

    // Scale certificate to fit viewport (297mm is too wide for typical screen)
    // Use CSS transform with measure-based scale (~0.6 for 1440x900 viewport)
    const scale = 0.55;

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 z-[9999] flex flex-col bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="奬狀預覽 (Award Certificate Preview)"
        >
            {/* Top toolbar — hidden during print via .no-print */}
            <div className="no-print flex items-center justify-between px-6 py-3 bg-slate-900 text-white border-b border-white/10">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold">🏆 奬狀預覽</h2>
                    {/* Style selector */}
                    <select
                        value={style}
                        onChange={(e) => onStyleChange && onStyleChange(e.target.value)}
                        className="bg-slate-800 text-white border border-white/20 rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-700"
                        aria-label="選擇奬狀風格"
                    >
                        {AWARD_STYLES.map(s => (
                            <option key={s} value={s}>
                                {AWARD_STYLE_META[s].emoji} {AWARD_STYLE_META[s].label}
                            </option>
                        ))}
                    </select>
                    <span className="text-xs text-slate-400 hidden md:inline">
                        {AWARD_STYLE_META[style]?.desc}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* v3.15.0 V2: print preview toggle — visual frame around cert */}
                    <button
                        onClick={() => setShowPrintPreview(p => !p)}
                        className={`px-3 py-1.5 text-sm font-bold rounded flex items-center gap-1 transition-colors ${
                            showPrintPreview
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        aria-pressed={showPrintPreview}
                        title="預覽列印效果（加虛線邊框模擬紙張）"
                    >
                        {showPrintPreview ? '👁️‍🗨️ 預覽中' : '👁️ 預覽列印'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        🖨️ 列印 / 存 PDF
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-bold transition-colors"
                        aria-label="關閉預覽"
                    >
                        ✕ 關閉 (Esc)
                    </button>
                </div>
            </div>

            {/* Center preview area (scrollable) */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-slate-900/50">
                <div
                    className={`no-cert-print-bg ${showPrintPreview ? 'print-preview-frame' : ''}`}
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    <AwardCertificate
                        style={style}
                        {...certificateProps}
                    />
                </div>
            </div>

            {/* Bottom hint */}
            <div className="no-print px-6 py-2 bg-slate-900 text-slate-400 text-xs text-center border-t border-white/10">
                提示: 列印時選「A4 橫向」+ 邊界「無」+ 「背景圖形」打剔 — A4 landscape, no margin, backgrounds on
            </div>
        </div>
    );
};

export default AwardCertificateModal;
