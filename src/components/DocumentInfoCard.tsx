import { FileText, FileType, Globe, Hash, HardDrive, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface DocumentInfoCardProps {
  name: string;
  sizeBytes?: number;
  pageCount?: number;
  language?: string | null;
  docType?: string;
  topic?: string;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const icons: Record<string, string> = {
    pdf: "📄", docx: "📝", doc: "📝",
    xlsx: "📊", xls: "📊", csv: "📋",
    pptx: "📑", ppt: "📑",
    txt: "📃", rtf: "📃", odt: "📃",
    epub: "📚",
    png: "🖼️", jpg: "🖼️", jpeg: "🖼️", webp: "🖼️",
  };
  return icons[ext] ?? "📄";
}

function getFileTypeColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const colors: Record<string, string> = {
    pdf: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    docx: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
    doc: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
    xlsx: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    xls: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    csv: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    pptx: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
    ppt: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
    txt: "text-muted-foreground bg-secondary/40 border-border",
  };
  return colors[ext] ?? "text-primary bg-primary/5 border-primary/20";
}

export default function DocumentInfoCard({
  name,
  sizeBytes,
  pageCount,
  language,
  docType,
  topic,
  className = "",
}: DocumentInfoCardProps) {
  const icon = getFileIcon(name);
  const typeColor = getFileTypeColor(name);
  const ext = name.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border bg-card shadow-sm overflow-hidden ${className}`}
    >
      {/* Top bar: file type accent */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${typeColor} border-opacity-50`}>
        <span className="text-xl leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate" title={name}>{name}</p>
          {topic && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              📚 {topic}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${typeColor}`}>
          {ext}
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-0 divide-x divide-border">
        {sizeBytes !== undefined && (
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            <HardDrive className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">{formatBytes(sizeBytes)}</span>
          </div>
        )}
        {pageCount !== undefined && (
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            <Hash className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">{pageCount} page{pageCount !== 1 ? "s" : ""}</span>
          </div>
        )}
        {language && (
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground">{language}</span>
          </div>
        )}
        {docType && (
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            <FileType className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground capitalize">{docType}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-4 py-2.5 ml-auto">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-[11px] font-bold text-green-600 dark:text-green-400">Ready</span>
        </div>
      </div>
    </motion.div>
  );
}
