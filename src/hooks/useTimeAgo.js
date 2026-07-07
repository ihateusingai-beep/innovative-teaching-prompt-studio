import { useState, useEffect } from 'react';
import { formatTimeAgo } from '../utils/time.js';

// === useTimeAgo Hook ===
// Live-updating "X 秒前 / X 分鐘前" display for a timestamp.
// 1 second tick to refresh; 唔 fire network/localStorage IO.
//
// Why custom hook:
//   - formatTimeAgo() 係 pure function 但 Date.now() 唔 trigger re-render
//   - 唔好 inline setInterval 喺 consumer — 每個 badge component 自己管 lifecycle
//     易 leak (unmount 漏 clearInterval)
//
// Returns:
//   formatted: '5 秒前' | '2 分鐘前' | null (timestamp falsy → 尚未儲存)
//
// Usage:
//   const savedLabel = useTimeAgo(lastSavedAt);
//   {savedLabel ?? '尚未儲存'}
export const useTimeAgo = (timestamp) => {
    const [, force] = useState(0);
    useEffect(() => {
        if (!timestamp) return;
        const id = setInterval(() => force(n => n + 1), 1000);
        return () => clearInterval(id);
    }, [timestamp]);
    return timestamp ? formatTimeAgo(timestamp) : null;
};
