import {
  Merge, Scissors, Minimize2, Image, FileImage, FileText,
  FileSpreadsheet, Presentation, Edit3, RotateCw, Droplets,
  Lock, Unlock, Hash, LayoutGrid, Wrench,
  Sparkles, BrainCircuit, MessageSquare, ScanSearch,
  Trash2, FileOutput, PenTool, Crop, EyeOff, Layers, Languages,
  Globe, FileCheck, GitCompare, ScanLine
} from "lucide-react";

export type ToolCategory = "merge" | "split" | "compress" | "convert" | "edit" | "protect" | "ai";

export interface PdfTool {
  id: string;
  name: string;
  description: string;
  icon: typeof Merge;
  path: string;
  category: ToolCategory;
  available: boolean;
  bgClass?: string;
}

export const tools: PdfTool[] = [
  { id: "merge", name: "Merge PDF", description: "Combine multiple PDFs into one document", icon: Merge, path: "/merge-pdf", category: "merge", available: true },
  { id: "split", name: "Split PDF", description: "Separate PDF pages into individual files", icon: Scissors, path: "/split-pdf", category: "split", available: true },
  { id: "compress", name: "Compress PDF", description: "Reduce file size without losing quality", icon: Minimize2, path: "/compress-pdf", category: "compress", available: true },
  { id: "pdf-to-jpg", name: "PDF to JPG", description: "Convert PDF pages to JPG images", icon: Image, path: "/pdf-to-jpg", category: "convert", available: true },
  { id: "jpg-to-pdf", name: "JPG to PDF", description: "Convert images into a PDF document", icon: FileImage, path: "/jpg-to-pdf", category: "convert", available: true },
  { id: "pdf-to-word", name: "PDF to Word", description: "Extract text from PDF as a document", icon: FileText, path: "/pdf-to-word", category: "convert", available: true },
  { id: "word-to-pdf", name: "Word to PDF", description: "Convert text documents to PDF", icon: FileText, path: "/word-to-pdf", category: "convert", available: true },
  { id: "pdf-to-ppt", name: "PDF to PPT", description: "Convert PDF pages to presentation slides", icon: Presentation, path: "/pdf-to-ppt", category: "convert", available: true },
  { id: "ppt-to-pdf", name: "PPT to PDF", description: "Convert presentations to PDF", icon: Presentation, path: "/ppt-to-pdf", category: "convert", available: true },
  { id: "pdf-to-excel", name: "PDF to Excel", description: "Extract tables from PDF to CSV", icon: FileSpreadsheet, path: "/pdf-to-excel", category: "convert", available: true },
  { id: "excel-to-pdf", name: "Excel to PDF", description: "Convert spreadsheet data to PDF", icon: FileSpreadsheet, path: "/excel-to-pdf", category: "convert", available: true },
  { id: "excel-to-ppt", name: "Excel to PPT", description: "Smart generator to convert spreadsheet data into a PowerPoint presentation", icon: Presentation, path: "/excel-to-ppt", category: "convert", available: true },
  { id: "edit", name: "Edit PDF", description: "Add text, shapes and annotations", icon: Edit3, path: "/edit-pdf", category: "edit", available: true },
  { id: "rotate", name: "Rotate PDF", description: "Rotate PDF pages to any angle", icon: RotateCw, path: "/rotate-pdf", category: "edit", available: true },
  { id: "watermark", name: "Add Watermark", description: "Stamp text or images on your PDF", icon: Droplets, path: "/add-watermark", category: "edit", available: true },
  { id: "protect", name: "Protect PDF", description: "Add password protection to PDF", icon: Lock, path: "/protect-pdf", category: "protect", available: true },
  { id: "unlock", name: "Unlock PDF", description: "Remove password from protected PDF", icon: Unlock, path: "/unlock-pdf", category: "protect", available: true },
  { id: "page-numbers", name: "Page Numbers", description: "Add page numbers to your PDF", icon: Hash, path: "/page-numbers", category: "edit", available: true },
  { id: "organize", name: "Organize Pages", description: "Rearrange, delete or add pages", icon: LayoutGrid, path: "/organize-pdf", category: "edit", available: true },
  { id: "repair", name: "Repair PDF", description: "Fix corrupted or broken PDFs", icon: Wrench, path: "/repair-pdf", category: "edit", available: true },
  { id: "delete-pages", name: "Delete Pages", description: "Remove specific pages from your PDF", icon: Trash2, path: "/delete-pages", category: "edit", available: true },
  { id: "extract-pages", name: "Extract Pages", description: "Extract specific pages into a new PDF", icon: FileOutput, path: "/extract-pages", category: "edit", available: true },
  { id: "sign-pdf", name: "Sign PDF", description: "Draw or type your signature on PDF", icon: PenTool, path: "/sign-pdf", category: "edit", available: true },
  { id: "crop-pdf", name: "Crop PDF", description: "Trim margins and crop PDF pages", icon: Crop, path: "/crop-pdf", category: "edit", available: true },
  { id: "redact-pdf", name: "Redact PDF", description: "Black out sensitive information", icon: EyeOff, path: "/redact-pdf", category: "edit", available: true },
  { id: "flatten-pdf", name: "Flatten PDF", description: "Flatten form fields and annotations", icon: Layers, path: "/flatten-pdf", category: "edit", available: true },
  { id: "html-to-pdf", name: "HTML to PDF", description: "Convert any webpage URL to a PDF document", icon: Globe, path: "/html-to-pdf", category: "convert", available: true },
  { id: "ocr-pdf", name: "OCR PDF", description: "Make scanned PDFs searchable with text recognition", icon: ScanLine, path: "/ocr-pdf", category: "edit", available: true },
  { id: "pdf-to-pdfa", name: "PDF to PDF/A", description: "Convert PDF to PDF/A for long-term archiving", icon: FileCheck, path: "/pdf-to-pdfa", category: "convert", available: true },
  { id: "compare-pdf", name: "Compare PDF", description: "Compare two PDFs side by side and spot differences", icon: GitCompare, path: "/compare-pdf", category: "edit", available: true },
];

export const aiTools: PdfTool[] = [
  {
    id: "ai-summarizer", name: "PDF Summarizer", description: "Instantly create concise summaries of long PDF documents.",
    icon: BrainCircuit,
    path: "/pdf-summarizer", category: "ai", available: true
  },
  {
    id: "ai-quiz", name: "Quiz Generator", description: "Generate multiple-choice or short-answer quizzes from any PDF.",
    icon: LayoutGrid,
    path: "/quiz-generator", category: "ai", available: true
  },
  {
    id: "ai-chat", name: "Chat with PDF", description: "Interact with your PDF using an AI assistant.",
    icon: MessageSquare,
    path: "/chat-with-pdf", category: "ai", available: true
  },
  {
    id: "ai-ats", name: "ATS Resume Checker", description: "Check your resume against ATS systems and get a score.",
    icon: ScanSearch,
    path: "/ats-checker", category: "ai", available: true
  },
  {
    id: "ai-translate", name: "Translate PDF", description: "Translate PDF documents to over 100 languages.",
    icon: Languages,
    path: "/translate-pdf", category: "ai", available: true
  },
];

export const categoryColors: Record<ToolCategory, string> = {
  merge: "bg-tool-merge",
  split: "bg-tool-split",
  compress: "bg-tool-compress",
  convert: "bg-tool-convert",
  edit: "bg-tool-edit",
  protect: "bg-tool-protect",
  ai: "bg-tool-ai",
};

export const categoryTextColors: Record<ToolCategory, string> = {
  merge: "text-tool-merge",
  split: "text-tool-split",
  compress: "text-tool-compress",
  convert: "text-tool-convert",
  edit: "text-tool-edit",
  protect: "text-tool-protect",
  ai: "text-tool-ai",
};
