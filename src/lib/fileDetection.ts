import { tools, aiTools, PdfTool } from "./tools";

const allTools = [...aiTools, ...tools];

export type FileCategory = "PDF" | "Word" | "PowerPoint" | "Excel" | "Image" | "Text" | "Unknown";

export interface FileDetectionResult {
    category: FileCategory;
    extension: string;
    mimeType: string;
}

export interface ToolGroup {
    category: string;
    tools: PdfTool[];
}

export const detectFileType = (file: File): FileDetectionResult => {
    const extension = file.name.split('.').pop()?.toLowerCase() || "";
    const mimeType = file.type.toLowerCase();

    let category: FileCategory = "Unknown";

    if (extension === "pdf" || mimeType === "application/pdf") {
        category = "PDF";
    } else if (
        ["doc", "docx"].includes(extension) ||
        mimeType.includes("word") ||
        mimeType === "application/msword" ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        category = "Word";
    } else if (
        ["ppt", "pptx"].includes(extension) ||
        mimeType.includes("presentation") ||
        mimeType === "application/vnd.ms-powerpoint" ||
        mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
        category = "PowerPoint";
    } else if (
        ["xls", "xlsx"].includes(extension) ||
        mimeType.includes("excel") ||
        mimeType.includes("spreadsheet") ||
        mimeType === "application/vnd.ms-excel" ||
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        category = "Excel";
    } else if (
        ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff"].includes(extension) ||
        mimeType.startsWith("image/")
    ) {
        category = "Image";
    } else if (
        ["txt", "html", "md", "csv"].includes(extension) ||
        mimeType.startsWith("text/")
    ) {
        category = "Text";
    }

    return { category, extension, mimeType };
};

export const getRecommendedTools = (files: File[]): ToolGroup[] => {
    if (!files || files.length === 0) return [];

    const categoriesFound = new Set<FileCategory>();
    const hasHtml = files.some(f => detectFileType(f).extension === "html");

    files.forEach(file => {
        categoriesFound.add(detectFileType(file).category);
    });

    const groups: ToolGroup[] = [];

    categoriesFound.forEach(category => {
        let recommendedIds: string[] = [];
        let groupName = "";

        switch (category) {
            case "PDF":
                groupName = "PDF Tools";
                // Show ALL PDF-compatible tools
                recommendedIds = [
                    "compress", "merge", "split", "pdf-to-word", "pdf-to-jpg", "pdf-to-ppt", "pdf-to-excel",
                    "pdf-to-pdfa", "edit", "rotate", "watermark", "protect", "unlock", "page-numbers",
                    "organize", "repair", "delete-pages", "extract-pages", "sign-pdf", "crop-pdf",
                    "redact-pdf", "flatten-pdf", "compare-pdf", "ai-summarizer", "ai-quiz", "ai-chat", "ai-translate"
                ];
                break;
            case "Word":
                groupName = "Word Tools";
                recommendedIds = ["word-to-pdf", "ai-summarizer", "ai-ats"];
                break;
            case "PowerPoint":
                groupName = "PowerPoint Tools";
                recommendedIds = ["ppt-to-pdf"];
                break;
            case "Excel":
                groupName = "Excel Tools";
                recommendedIds = ["excel-to-pdf"];
                break;
            case "Image":
                groupName = "Image Tools";
                recommendedIds = ["jpg-to-pdf", "ocr-pdf"];
                break;
            case "Text":
                if (hasHtml) {
                    groupName = "Web Tools";
                    recommendedIds = ["html-to-pdf"];
                }
                break;
            default:
                // Fallback for unknown items
                if (categoriesFound.size === 1) {
                    groupName = "Suggested Tools";
                    recommendedIds = ["compress", "merge", "split"];
                }
                break;
        }

        if (recommendedIds.length > 0) {
            const groupTools = recommendedIds
                .map(id => allTools.find(tool => tool.id === id))
                .filter((tool): tool is PdfTool => tool !== undefined);

            groups.push({
                category: groupName,
                tools: groupTools
            });
        }
    });

    return groups;
};
