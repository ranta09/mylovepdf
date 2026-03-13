import { useCallback, useState, useEffect, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, CheckCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalUpload } from "./GlobalUploadContext";
import { detectFileType } from "@/lib/fileDetection";
import FilePreviewList from "./FilePreviewList";
import FileFormatsDisplay from "./FileFormatsDisplay";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // MB
  onFilesChange: (files: File[]) => void;
  files: File[];
  label?: string;
}

const FileUpload = ({
  accept = ".pdf",
  multiple = true,
  maxSize = 100,
  onFilesChange,
  files,
  label = "Select files",
}: FileUploadProps) => {
  const [dragging, setDragging] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const globalUploadContext = useGlobalUpload();

  const acceptedExtensions = accept.split(",").map(s => s.trim().toLowerCase());

  const formatAcceptedTypes = () =>
    acceptedExtensions.map(ext => ext.replace(".", "").toUpperCase()).join(", ");

  const isAcceptedFile = (file: File) => {
    const { extension } = detectFileType(file);
    return acceptedExtensions.some(ext => {
      const cleanExt = ext.replace(".", "").toLowerCase();
      if (cleanExt === extension) return true;
      if (ext.includes("*")) return file.type.startsWith(ext.replace("*", ""));
      return file.type === ext;
    });
  };

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const valid = newFiles.filter(f => f.size <= maxSize * 1024 * 1024);
      if (valid.length < newFiles.length) toast.error(`Some files exceeded the ${maxSize}MB limit`);
      if (valid.length === 0) return;

      console.log("=== TOOL UPLOAD SUCCESS ===");
      console.log(`Added ${valid.length} valid files to tool state.`);
      valid.forEach((f, idx) => console.log(`Tool File ${idx + 1}: ${f.name}`));

      onFilesChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
    },
    [files, maxSize, multiple, onFilesChange]
  );

  // Auto-Hydrate from Global Files (Tool Context)
  // This will pick up any drops or pastes captured by GlobalDropOverlay
  useEffect(() => {
    try {
      if (globalUploadContext?.globalFiles && globalUploadContext.globalFiles.length > 0) {
        console.log("=== TOOL HYDRATION ===");
        console.log("Global files found:", globalUploadContext.globalFiles.length);

        const validGlobalFiles = globalUploadContext.globalFiles.filter(isAcceptedFile);
        console.log(`Accepted ${validGlobalFiles.length} / ${globalUploadContext.globalFiles.length} files for this tool`);

        if (validGlobalFiles.length > 0) {
          addFiles(validGlobalFiles);
          toast.success(`${validGlobalFiles.length} file(s) assigned automatically`);
        } else {
          toast.error(`The tool requires ${formatAcceptedTypes()} files. Please upload a compatible file.`);
        }

        // CRITICAL: Clear immediately to prevent cross-contamination or suggestions showing
        globalUploadContext.clearGlobalFiles();
      }
    } catch (e) {
      // Ignore context errors
    }
  }, [globalUploadContext?.globalFiles, addFiles]); // React to any new global files

  // Sync accepted types with global context so the DropOverlay knows what to accept
  useEffect(() => {
    try {
      if (globalUploadContext?.setAcceptedTypes) {
        globalUploadContext.setAcceptedTypes(acceptedExtensions);
      }
    } catch (e) {
      // Ignore if context is unavailable
    }
  }, [accept, globalUploadContext?.setAcceptedTypes]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    },
    [addFiles]
  );

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
        if (accepted.length === 0) { toast.error("Pasted file type is not supported here"); return; }
        addFiles(accepted);
        toast.success(`${accepted.length} file(s) pasted`);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles, acceptedExtensions]);

  const removeFile = (index: number) => onFilesChange(files.filter((_, i) => i !== index));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex min-h-[300px] w-full cursor-pointer flex-col items-center justify-center rounded-[2rem] p-10 text-center transition-all duration-300",
          dragging
            ? "bg-primary/10 scale-[1.01] shadow-card-hover"
            : "bg-transparent hover:bg-primary/5 shadow-sm"
        )}
      >
        {/* Icon */}
        <AnimatePresence mode="wait">
          {justAdded && files.length > 0 ? (
            <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
              <CheckCircle className="h-10 w-10" />
            </motion.div>
          ) : (
            <motion.div key="upload" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={cn(
                "mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-colors duration-300",
                dragging ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
              )}>
              <motion.div animate={dragging ? { y: [0, -4, 0] } : {}} transition={{ duration: 0.6, repeat: Infinity }}>
                <Upload className="h-10 w-10 text-primary" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="font-display text-2xl font-bold text-foreground mb-2">
          {dragging ? "Release to upload" : "Upload your Files"}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="font-semibold text-primary">Paste or drop anywhere</span> on this page, or <span className="font-semibold text-primary">click this tile</span> to browse.
        </p>

        {/* Formats Display categorized and collapsible */}
        <FileFormatsDisplay acceptedExtensions={acceptedExtensions} />

        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleSelect} className="hidden" />
      </div>

      {/* File list */}
      <div className="mt-6 w-full max-w-5xl mx-auto">
        <FilePreviewList
          files={files}
          onFilesChange={onFilesChange}
          onRemove={removeFile}
          reorderable={multiple}
        />
      </div>
    </div>
  );
};

export default FileUpload;
