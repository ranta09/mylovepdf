import {
  Merge, Scissors, Minimize2, Image, FileImage, FileText,
  FileSpreadsheet, Presentation, Edit3, RotateCw, Droplets,
  Lock, Unlock, Hash, LayoutGrid, Wrench,
  Sparkles, BrainCircuit, MessageSquare, ScanSearch
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
}

export const tools: PdfTool[] = [
  { id: "merge", name: "Merge PDF", description: "Combine multiple PDFs into one document", icon: Merge, path: "/merge-pdf", category: "merge", available: true },
  { id: "split", name: "Split PDF", description: "Separate PDF pages into individual files", icon: Scissors, path: "/split-pdf", category: "split", available: true },
  { id: "compress", name: "Compress PDF", description: "Reduce file size without losing quality", icon: Minimize2, path: "/compress-pdf", category: "compress", available: true },
  { id: "pdf-to-jpg", name: "PDF to JPG", description: "Convert PDF pages to JPG images", icon: Image, path: "/pdf-to-jpg", category: "convert", available: true },
  { id: "jpg-to-pdf", name: "JPG to PDF", description: "Convert images into a PDF document", icon: FileImage, path: "/jpg-to-pdf", category: "convert", available: true },
  { id: "pdf-to-word", name: "PDF to Word", description: "Extract text from PDF as a document", icon: FileText, path: "/pdf-to-word", category: "convert", available: true },
  { id: "word-to-pdf", name: "Word to PDF", description: "Convert text documents to PDF", icon: FileText, path: "/word-to-pdf", category: "convert", available: true },
  { id: "pdf-to-ppt", name: "PDF to PowerPoint", description: "Convert PDF pages to presentation slides", icon: Presentation, path: "/pdf-to-ppt", category: "convert", available: true },
  { id: "ppt-to-pdf", name: "PowerPoint to PDF", description: "Convert presentations to PDF", icon: Presentation, path: "/ppt-to-pdf", category: "convert", available: true },
  { id: "pdf-to-excel", name: "PDF to Excel", description: "Extract tables from PDF to CSV", icon: FileSpreadsheet, path: "/pdf-to-excel", category: "convert", available: true },
  { id: "excel-to-pdf", name: "Excel to PDF", description: "Convert spreadsheet data to PDF", icon: FileSpreadsheet, path: "/excel-to-pdf", category: "convert", available: true },
  { id: "edit", name: "Edit PDF", description: "Add text, shapes and annotations", icon: Edit3, path: "/edit-pdf", category: "edit", available: true },
  { id: "rotate", name: "Rotate PDF", description: "Rotate PDF pages to any angle", icon: RotateCw, path: "/rotate-pdf", category: "edit", available: true },
  { id: "watermark", name: "Add Watermark", description: "Stamp text or images on your PDF", icon: Droplets, path: "/add-watermark", category: "edit", available: true },
  { id: "protect", name: "Protect PDF", description: "Add password protection to PDF", icon: Lock, path: "/protect-pdf", category: "protect", available: true },
  { id: "unlock", name: "Unlock PDF", description: "Remove password from protected PDF", icon: Unlock, path: "/unlock-pdf", category: "protect", available: true },
  { id: "page-numbers", name: "Page Numbers", description: "Add page numbers to your PDF", icon: Hash, path: "/page-numbers", category: "edit", available: true },
  { id: "organize", name: "Organize Pages", description: "Rearrange, delete or add pages", icon: LayoutGrid, path: "/organize-pdf", category: "edit", available: true },
  { id: "repair", name: "Repair PDF", description: "Fix corrupted or broken PDFs", icon: Wrench, path: "/repair-pdf", category: "edit", available: true },
];

export const aiTools: PdfTool[] = [
  { id: "ai-summarizer", name: "PDF Summarizer", description: "AI-powered notes and summaries from any PDF", icon: Sparkles, path: "/pdf-summarizer", category: "ai", available: true },
  { id: "ai-quiz", name: "Quiz Generator", description: "Generate quizzes from study material with AI", icon: BrainCircuit, path: "/quiz-generator", category: "ai", available: true },
  { id: "ai-chat", name: "Chat with PDF", description: "Ask questions and chat with your document", icon: MessageSquare, path: "/chat-with-pdf", category: "ai", available: true },
  { id: "ai-ats", name: "ATS Resume Checker", description: "Check resume ATS compatibility and get suggestions", icon: ScanSearch, path: "/ats-checker", category: "ai", available: true },
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
