import React, { useMemo } from 'react';
import { Plus, Minus, Equal } from 'lucide-react';
import { computeLineDiff, diffStats } from '../utils/diff.js';

// === DiffView ===
// Render line-by-line diff with +/- markers + 3-theme styling
//
// Props:
//   textA: baseline text
//   textB: comparison text
//   labelA, labelB: version labels (for header)
//   theme: 'cyber' | 'plain' | 'warm'
//   mode: 'unified' (single column) | 'split' (two columns side-by-side)
//          Default 'unified' for mobile compat (split 喺 desktop auto-activate)

export const DiffView = ({ textA, textB, labelA = 'A', labelB = 'B', theme, mode = 'unified' }) => {
    const ops = useMemo(() => computeLineDiff(textA || '', textB || ''), [textA, textB]);
    const stats = useMemo(() => diffStats(ops), [ops]);

    // Theme tokens
    const addBg = theme === 'warm' ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500' : theme === 'dark' ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500' : theme === 'contrast' ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500' : theme === 'paper' ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500' : theme === 'reactor' ? 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500' : 'bg-emerald-50 text-emerald-900 border-l-2 border-emerald-500';

    const delBg = theme === 'warm' ? 'bg-red-50 text-red-900 border-l-2 border-red-400 line-through opacity-80' : theme === 'dark' ? 'bg-red-50 text-red-900 border-l-2 border-red-400 line-through opacity-80' : theme === 'contrast' ? 'bg-red-50 text-red-900 border-l-2 border-red-400 line-through opacity-80' : theme === 'paper' ? 'bg-red-50 text-red-900 border-l-2 border-red-400 line-through opacity-80' : theme === 'reactor' ? 'bg-red-50 text-red-900 border-l-2 border-red-400 line-through opacity-80' : 'bg-red-50 text-red-900 border-l-2 border-red-400 line-through opacity-80';

    const eqBg = theme === 'warm' ? 'text-amber-900' : theme === 'dark' ? 'text-slate-700' : theme === 'contrast' ? 'text-slate-700' : theme === 'paper' ? 'text-slate-700' : theme === 'reactor' ? 'text-slate-700' : 'text-slate-700';

    const headerBg = theme === 'warm' ? 'bg-amber-100 border-amber-300' : theme === 'dark' ? 'bg-slate-100 border-slate-300' : theme === 'contrast' ? 'bg-slate-100 border-slate-300' : theme === 'paper' ? 'bg-slate-100 border-slate-300' : theme === 'reactor' ? 'bg-slate-100 border-slate-300' : 'bg-slate-100 border-slate-300';

    const statsText = theme === 'warm' ? 'text-amber-800' : theme === 'dark' ? 'text-slate-600' : theme === 'contrast' ? 'text-slate-600' : theme === 'paper' ? 'text-slate-600' : theme === 'reactor' ? 'text-slate-600' : 'text-slate-600';

    const containerBg = theme === 'warm' ? 'bg-amber-50/30' : theme === 'dark' ? 'bg-slate-50' : theme === 'contrast' ? 'bg-slate-50' : theme === 'paper' ? 'bg-slate-50' : theme === 'reactor' ? 'bg-slate-50' : 'bg-slate-50';

    // Render a single op row
    const renderRow = (op, idx) => {
        const Icon = op.type === 'add' ? Plus : op.type === 'del' ? Minus : Equal;
        const marker = op.type === 'add' ? '+' : op.type === 'del' ? '-' : ' ';
        const bg = op.type === 'add' ? addBg : op.type === 'del' ? delBg : eqBg;
        const lineLabel = op.lineA && op.lineB ? `${op.lineA}|${op.lineB}` : op.lineA ? `${op.lineA}|` : `|${op.lineB}`;
        return (
            <div key={idx} className={`flex items-start font-mono-token text-xs leading-relaxed px-token-2 py-0.5 ${bg}`}>
                <span className={`flex-none w-12 text-right pr-2 select-none ${statsText} opacity-60`}>{lineLabel}</span>
                <span className={`flex-none w-4 select-none ${statsText} opacity-80`}>{marker}</span>
                <span className="flex-1 whitespace-pre-wrap break-words">{op.text || '\u00A0'}</span>
            </div>
        );
    };

    return (
        <div className={`rounded-lg border overflow-hidden ${theme === 'warm' ? 'border-amber-300' : theme === 'dark' ? 'border-slate-300' : theme === 'contrast' ? 'border-slate-300' : theme === 'paper' ? 'border-slate-300' : theme === 'reactor' ? 'border-slate-300' : 'border-slate-300'}`}>
            {/* Header — labels + stats */}
            <div className={`flex items-center justify-between px-token-3 py-token-2 border-b text-xs font-bold ${headerBg}`}>
                <div className="flex items-center gap-token-2 flex-wrap">
                    <span className={`px-token-2 py-0.5 rounded ${theme === 'warm' ? 'bg-white text-amber-900' : theme === 'dark' ? 'bg-white text-slate-700' : theme === 'contrast' ? 'bg-white text-slate-700' : theme === 'paper' ? 'bg-white text-slate-700' : theme === 'reactor' ? 'bg-white text-slate-700' : 'bg-white text-slate-700'}`}>
                        A: {labelA}
                    </span>
                    <span className={statsText}>vs</span>
                    <span className={`px-token-2 py-0.5 rounded ${theme === 'warm' ? 'bg-white text-amber-900' : theme === 'dark' ? 'bg-white text-slate-700' : theme === 'contrast' ? 'bg-white text-slate-700' : theme === 'paper' ? 'bg-white text-slate-700' : theme === 'reactor' ? 'bg-white text-slate-700' : 'bg-white text-slate-700'}`}>
                        B: {labelB}
                    </span>
                </div>
                <div className={`flex items-center gap-token-2 text-[10px] ${statsText}`}>
                    <span className="flex items-center gap-1 text-emerald-500">
                        <Plus size={10} /> {stats.added}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                        <Minus size={10} /> {stats.removed}
                    </span>
                    <span className="flex items-center gap-1 opacity-60">
                        <Equal size={10} /> {stats.unchanged}
                    </span>
                </div>
            </div>

            {/* Diff body */}
            <div className={`max-h-[60vh] overflow-y-auto ${containerBg}`}>
                {ops.length === 0 || (stats.added === 0 && stats.removed === 0) ? (
                    <div className={`p-token-6 text-center text-sm ${statsText}`}>
                        ✨ 兩個版本完全一樣
                    </div>
                ) : (
                    ops.map((op, i) => renderRow(op, i))
                )}
            </div>
        </div>
    );};