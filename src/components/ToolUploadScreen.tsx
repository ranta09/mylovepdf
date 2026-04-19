import { useRef, useState, useCallback, useEffect, DragEvent } from "react";
import { ShieldCheck, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { detectFileType } from "@/lib/fileDetection";
import { trackEvent } from "@/lib/plausible";

interface ToolUploadScreenProps {
  /** Title displayed above the button, e.g. "Merge PDF files" */
  title: string;
  /** Subtitle displayed below the title, e.g. "Combine multiple PDFs into one document" */
  description: string;
  /** Button label, e.g. "Select PDF file" */
  buttonLabel?: string;
  /** "or drop PDF here" label below button */
  dropLabel?: string;
  /** Accepted file extensions, e.g. ".pdf" or ".pdf,.docx" */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
  /** Max size in MB per file */
  maxSize?: number;
  /** Max number of files (only applies when multiple=true) */
  maxFiles?: number;
  /** Called when user selects / drops files */
  onFilesSelected: (files: File[]) => void;
}

const ToolUploadScreen = ({
  title,
  description,
  buttonLabel = "Select file",
  dropLabel,
  accept = ".pdf",
  multiple = false,
  maxSize = 100,
  maxFiles = 10,
  onFilesSelected,
}: ToolUploadScreenProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { globalFiles, clearGlobalFiles, setAcceptedTypes, disableGlobalFeatures } = useGlobalUpload();

  const acceptedExtensions = accept.split(",").map((s) => s.trim().toLowerCase());

  const isAcceptedFile = useCallback(
    (file: File) => {
      const { extension } = detectFileType(file);
      return acceptedExtensions.some((ext) => {
        const cleanExt = ext.replace(".", "").toLowerCase();
        if (cleanExt === extension) return true;
        if (ext.includes("*")) return file.type.startsWith(ext.replace("*", ""));
        return file.type === ext;
      });
    },
    [acceptedExtensions]
  );

  // Sync accepted types with GlobalUploadContext
  useEffect(() => {
    try {
      if (setAcceptedTypes) setAcceptedTypes(acceptedExtensions);
    } catch {
      // ignore
    }
  }, [accept, setAcceptedTypes]);

  const processFiles = useCallback(
    (rawFiles: File[]) => {
      const validSize = rawFiles.filter((f) => f.size <= maxSize * 1024 * 1024);
      if (validSize.length < rawFiles.length)
        toast.error(`Some files exceeded the ${maxSize}MB limit`);
      if (validSize.length === 0) return;

      const validType = validSize.filter(isAcceptedFile);
      if (validType.length === 0) {
        const types = acceptedExtensions.map((e) => e.replace(".", "").toUpperCase()).join(", ");
        toast.error(`Please upload ${types} files only.`);
        return;
      }

      const sliced = multiple ? validType.slice(0, maxFiles) : validType.slice(0, 1);
      if (sliced.length < validType.length && multiple)
        toast.error(`Added ${sliced.length} files. Maximum limit of ${maxFiles} reached.`);

      trackEvent("file_uploaded", {
        tool_name: window.location.pathname.replace(/^\//, "") || "home",
        file_count: sliced.length,
      });

      onFilesSelected(sliced);
    },
    [maxSize, maxFiles, multiple, isAcceptedFile, acceptedExtensions, onFilesSelected]
  );

  // Auto-hydrate from global context (when user drops on the global overlay or redirected from home)
  useEffect(() => {
    if (!globalFiles || globalFiles.length === 0) return;

    let isSubscribed = true;
    const valid = globalFiles.filter(isAcceptedFile);

    if (valid.length > 0) {
      if (isSubscribed) {
        processFiles(valid);
      }
    } else if (isSubscribed) {
      const types = acceptedExtensions.map((e) => e.replace(".", "").toUpperCase()).join(", ");
      toast.error(`This tool requires ${types} files.`);
    }

    if (isSubscribed) {
      clearGlobalFiles();
    }

    return () => { isSubscribed = false; };
  }, [globalFiles, isAcceptedFile, processFiles, clearGlobalFiles]);

  // Clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disableGlobalFeatures) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const pasted: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const f = items[i].getAsFile();
          if (f) pasted.push(f);
        }
      }
      if (pasted.length > 0) {
        e.preventDefault();
        processFiles(pasted);
        toast.success(`${pasted.length} file(s) pasted`);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processFiles, disableGlobalFeatures]);

  // Drag handlers
  const onDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) processFiles(dropped);
    },
    [processFiles]
  );

  const resolvedDropLabel =
    dropLabel ?? (multiple ? `or drop ${accept.split(",")[0].replace(".", "").toUpperCase()} files here` : `or drop ${accept.split(",")[0].replace(".", "").toUpperCase()} here`);

  return (
    <motion.div
      key="tool-upload-screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center pt-0 min-h-[85vh] px-4 -mx-4"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Full-page drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-primary/5 border-4 border-dashed border-primary flex items-center justify-center backdrop-blur-[2px] pointer-events-none"
          >
            <div className="flex flex-col items-center gap-4 text-primary">
              <Upload className="h-16 w-16 animate-bounce" />
              <p className="text-2xl font-bold">Drop files here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center content */}
      <motion.div
        className="w-full max-w-2xl text-center flex flex-col items-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4 px-2">
          {title}
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto px-4">
          {description}
        </p>

        <div className="flex flex-col items-center gap-4 w-full px-4">
          <div className="relative w-full sm:w-auto flex justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-white text-lg md:text-2xl font-bold px-8 py-4 md:px-20 md:py-6 rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center w-full sm:min-w-[360px]"
            >
              {buttonLabel}
            </motion.button>
          </div>

          <p className="text-sm font-medium text-muted-foreground">{resolvedDropLabel}</p>
        </div>
      </motion.div>

      {/* Security footer */}
      <p className="mt-auto mb-12 text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium opacity-60">
        <ShieldCheck className="h-4 w-4" />
        Files are processed safely in your browser.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) processFiles(files);
          e.target.value = "";
        }}
      />
    </motion.div>
  );
};

export default ToolUploadScreen;
