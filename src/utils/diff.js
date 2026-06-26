// === Diff Engine ===
// 純 function — line-by-line LCS (Longest Common Subsequence) diff
// 唔靠外部 library（控制 bundle size，老師 import 時自動 inline）
//
// Input: 兩段 text string (e.g. version A vs version B 嘅 design prompt)
// Output: array of { type: 'eq' | 'add' | 'del', text: string, lineA?: number, lineB?: number }
//
// Algorithm:
//   1. Split both texts into lines (keep line endings metadata)
//   2. Compute LCS table (DP, O(n*m) time, O(n*m) space — fine for prompt-sized text < 10k lines)
//   3. Backtrack to produce diff ops
//   4. Adjacent same-type ops merged for compactness

/**
 * @param {string} textA - Baseline text
 * @param {string} textB - Comparison text
 * @returns {Array<{type: 'eq'|'add'|'del', text: string, lineA?: number, lineB?: number}>}
 */
export const computeLineDiff = (textA, textB) => {
    const linesA = (textA || '').split('\n');
    const linesB = (textB || '').split('\n');
    const n = linesA.length;
    const m = linesB.length;

    // 1. Build LCS table
    // dp[i][j] = length of LCS of linesA[0..i-1] and linesB[0..j-1]
    // Use typed array for memory efficiency on large prompts
    const dp = [];
    for (let i = 0; i <= n; i++) {
        dp.push(new Uint32Array(m + 1));
    }
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (linesA[i - 1] === linesB[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // 2. Backtrack to produce ops
    const ops = [];
    let i = n;
    let j = m;
    while (i > 0 && j > 0) {
        if (linesA[i - 1] === linesB[j - 1]) {
            ops.push({ type: 'eq', text: linesA[i - 1], lineA: i, lineB: j });
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            ops.push({ type: 'del', text: linesA[i - 1], lineA: i });
            i--;
        } else {
            ops.push({ type: 'add', text: linesB[j - 1], lineB: j });
            j--;
        }
    }
    while (i > 0) {
        ops.push({ type: 'del', text: linesA[i - 1], lineA: i });
        i--;
    }
    while (j > 0) {
        ops.push({ type: 'add', text: linesB[j - 1], lineB: j });
        j--;
    }
    // ops 係 reverse order (backtrack)
    ops.reverse();

    // 3. Merge adjacent same-type ops (for compactness)
    const merged = [];
    for (const op of ops) {
        const last = merged[merged.length - 1];
        if (last && last.type === op.type) {
            last.text += '\n' + op.text;
            if (op.lineA !== undefined) last.lineA = op.lineA;
            if (op.lineB !== undefined) last.lineB = op.lineB;
        } else {
            merged.push({ ...op });
        }
    }
    return merged;
};

/**
 * Summary stats for a diff
 * @param {Array} ops
 * @returns {{added: number, removed: number, unchanged: number}}
 */
export const diffStats = (ops) => {
    let added = 0, removed = 0, unchanged = 0;
    for (const op of ops) {
        const lines = op.text.split('\n').length;
        if (op.type === 'add') added += lines;
        else if (op.type === 'del') removed += lines;
        else unchanged += lines;
    }
    return { added, removed, unchanged };
};