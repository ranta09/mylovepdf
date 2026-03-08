import { useCallback, useState, useEffect } from "react";
import { Upload, X, FileText, Image as ImageIcon, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // MB
  onFilesChange: (files: File[]) => void;
  files: File[];
  label?: string;
}

const FileUpload = ({ accept = ".pdf", multiple = true, maxSize = 100, onFilesChange, files, label = "Select files" }: FileUploadProps) => {
  const [dragging, setDragging] = useState(false);

  const acceptedExtensions = accept.split(",").map(s => s.trim().toLowerCase());

  const formatAcceptedTypes = () => {
    return acceptedExtensions
      .map(ext => ext.replace(".", "").toUpperCase())
      .join(", ");
  };

  const isAcceptedFile = (file: File) => {
    return acceptedExtensions.some(ext => {
      if (ext.startsWith(".")) return file.name.toLowerCase().endsWith(ext);
      if (ext.includes("*")) return file.type.startsWith(ext.replace("*", ""));
      return file.type === ext;
    });
  };

  const addFiles = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => f.size <= maxSize * 1024 * 1024);
    if (valid.length < newFiles.length) {
      toast.error(`Some files exceeded the ${maxSize}MB limit`);
    }
    if (valid.length === 0) return;
    onFilesChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
  }, [files, maxSize, multiple, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  }, [addFiles]);

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        e.preventDefault();
        const accepted = pastedFiles.filter(isAcceptedFile);
        if (accepted.length === 0) {
          toast.error("Pasted file type is not supported here");
          return;
        }
        addFiles(accepted);
        toast.success(`${accepted.length} file(s) pasted`);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles, acceptedExtensions]);

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200",
          dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/40 hover:bg-secondary/50"
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <p className="font-display text-lg font-semibold text-foreground mb-1">{label}</p>
        <p className="text-sm text-muted-foreground mb-1">or drag and drop files here</p>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Supported: {formatAcceptedTypes()}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <label>
            <input type="file" accept={accept} multiple={multiple} onChange={handleSelect} className="hidden" />
            <Button asChild variant="default" size="lg" className="cursor-pointer rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <span>Browse files</span>
            </Button>
          </label>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clipboard className="h-3.5 w-3.5" />
          <span>You can also paste files with Ctrl+V / ⌘+V</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Max {maxSize}MB per file</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                {isImage(file) ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(i)} className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
