// === DOCX export ===
// 將 formData 生成嘅 Part 1 + Part 2 prompt export 成 Word .docx
// 使用 window.docx (CDN UMD bundle 由 index.html 載入)
// Note: Microsoft JhengHei 用於中文字符，跨 OS 一致顯示
import { generateDesignPrompt, generateTechPrompt } from '../prompts/generators.jsx';

export const handleExportDOCX = async (formData) => {
    const { Document, Packer, Paragraph, TextRun } = window.docx;

    const designText = generateDesignPrompt(formData);
    const techText = generateTechPrompt(formData);
    const fullText = designText + "\n\n" + techText;

    const lines = fullText.split('\n');
    const children = lines.map(line => new Paragraph({
        children: [new TextRun({
            text: line || " ",
            font: {
                ascii: "Arial",
                hAnsi: "Arial",
                eastAsia: "Microsoft JhengHei",
            },
        })],
        spacing: {
            after: 200,
        },
    }));

    const doc = new Document({
        sections: [{
            properties: {},
            children: children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.href = url;
    a.download = 'tda_prompt.docx';
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};