// === SEN → a11y 智能推荐 map ===
// 根據老師揀嘅 SEN types，自動推薦相應嘅 a11y dimensions
const SEN_TO_A11Y_MAP = {
    'ADHD 專注力不足/過度活躍': ['減少動畫 (Reduced Motion)', '可調字體大小'],
    'ASD 自閉症譜系': ['減少動畫 (Reduced Motion)', '視覺輔助概念：固定流程、清晰指示'],
    '讀寫困難 (Dyslexia)': ['TTS 廣東話支援', '可調字體大小', '色彩對比 (WCAG AA 4.5:1)'],
    '數學障礙 (Dyscalculia)': ['視覺輔助概念：圖示為主、避免抽象符號'],
    '智障 / 認知發展遲緩': ['TTS 廣東話支援', '可調字體大小', '減少動畫 (Reduced Motion)'],
    '聽障': ['字幕 / 視覺替代', 'TTS 廣東話支援（文字替代）'],
    '視障': ['高對比模式切換', 'TTS 廣東話支援'],
    '肢體傷殘': ['鍵盤導航 (Keyboard)', 'Screen Reader 友善 (語意化 HTML + aria-label)'],
    '語言障礙': ['TTS 廣東話支援', '圖卡概念：避免純語音'],
    '情緒行為問題': ['減少動畫 (Reduced Motion)', '正向強化提示'],
};

// 根據已揀 SEN types 拎推薦 a11y labels
const getRecommendedA11y = (senTypes) => {
    const recommended = new Set();
    senTypes.forEach(label => {
        const items = SEN_TO_A11Y_MAP[label] || [];
        items.forEach(i => recommended.add(i));
    });
    return Array.from(recommended);
};

export { SEN_TO_A11Y_MAP, getRecommendedA11y };