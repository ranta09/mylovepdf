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
import { trackEvent } from "@/lib/plausible";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // MB
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
  files: File[];
  label?: string;
}

const FileUpload = ({
  accept = ".pdf",
  multiple = true,
  maxSize = 100,
  maxFiles = 10,
  onFilesChange,
  files,
  label = "Select files",
}: FileUploadProps) => {
  const [dragging, setDragging] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { globalFiles, clearGlobalFiles, setAcceptedTypes, disableGlobalFeatures } = useGlobalUpload();

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

      const totalFilesAllowed = maxFiles - files.length;
      if (totalFilesAllowed <= 0) {
        toast.error(`You can only upload up to ${maxFiles} files at a time.`);
        return;
      }
      
      const filesToAdd = multiple ? valid.slice(0, totalFilesAllowed) : valid.slice(0, 1);
      
      if (valid.length > totalFilesAllowed && multiple) {
         toast.error(`Added ${totalFilesAllowed} files. Maximum limit of ${maxFiles} reached.`);
      }

      console.log("=== TOOL UPLOAD SUCCESS ===");
      console.log(`Added ${filesToAdd.length} valid files to tool state.`);

      trackEvent("file_uploaded", { 
        tool_name: window.location.pathname.replace(/^\//, '') || 'home',
        file_count: filesToAdd.length
      });

      onFilesChange(multiple ? [...files, ...filesToAdd] : filesToAdd);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1400);
    },
    [files, maxSize, maxFiles, multiple, onFilesChange]
  );

  // Auto-Hydrate from Global Files (Tool Context)
  // This will pick up any drops or pastes captured by GlobalDropOverlay
  useEffect(() => {
    try {
      if (globalFiles && globalFiles.length > 0) {
        console.log("=== TOOL HYDRATION ===");
        console.log("Global files found:", globalFiles.length);

        const validGlobalFiles = globalFiles.filter(isAcceptedFile);
        console.log(`Accepted ${validGlobalFiles.length} / ${globalFiles.length} files for this tool`);

        if (validGlobalFiles.length > 0) {
          addFiles(validGlobalFiles);
          toast.success(`${validGlobalFiles.length} file(s) assigned automatically`);
        } else {
          toast.error(`The tool requires ${formatAcceptedTypes()} files. Please upload a compatible file.`);
        }

        // CRITICAL: Clear immediately to prevent cross-contamination or suggestions showing
        clearGlobalFiles();
      }
    } catch (e) {
      // Ignore context errors
    }
  }, [globalFiles, addFiles]); // React to any new global files

  // Sync accepted types with global context so the DropOverlay knows what to accept
  useEffect(() => {
    try {
      if (setAcceptedTypes) {
        setAcceptedTypes(acceptedExtensions);
      }
    } catch (e) {
      // Ignore if context is unavailable
    }
  }, [accept, setAcceptedTypes]);

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
      if (disableGlobalFeatures) return;

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
  }, [addFiles, acceptedExtensions, disableGlobalFeatures]);

  const removeFile = (index: number) => onFilesChange(files.filter((_, i) => i !== index));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="w-full space-y-6 flex flex-col items-center">
      {/* Mobile Only: Big Tap Button */}
      <div className="flex md:hidden w-full px-2 mt-4">
        <motion.div whileTap={{ scale: 0.95 }} className="w-full">
          <Button 
            variant="default" 
            size="lg" 
            className="w-full h-20 rounded-2xl font-bold text-lg shadow-xl shadow-primary/25 bg-primary text-primary-foreground flex flex-col items-center justify-center gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-6 w-6" strokeWidth={2.5} />
            <span>Tap to choose file</span>
          </Button>
        </motion.div>
      </div>

      {/* Desktop/Tablet: Drag & Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "hidden md:flex relative min-h-[350px] w-full max-w-4xl mx-auto cursor-pointer flex-col items-center justify-center rounded-3xl p-12 text-center transition-all duration-300 border-[3px] border-dashed",
          dragging
            ? "bg-primary/10 border-primary scale-[1.02] shadow-2xl"
            : "bg-background/80 border-primary/30 hover:border-primary/70 hover:bg-primary/5 shadow-md"
        )}
      >
        {/* Icon */}
        <AnimatePresence mode="wait">
          {justAdded && files.length > 0 ? (
            <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
              <CheckCircle className="h-10 w-10" />
            </motion.div>
          ) : (
            <motion.div key="upload" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="mb-4 flex items-center justify-center transition-colors duration-300">
              <motion.div animate={dragging ? { y: [0, -4, 0] } : {}} transition={{ duration: 0.6, repeat: Infinity }}>
                <Upload className="h-12 w-12 text-primary" strokeWidth={2.5} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="font-display text-2xl font-bold text-foreground mb-4">
          {dragging ? "Release to upload!" : (
            <>Drag & Drop your files here</>
          )}
        </p>

        {!dragging && (
          <p className="text-muted-foreground mb-8 text-sm">or click below to browse your computer</p>
        )}

        <Button 
          variant="default" 
          size="lg" 
          className="rounded-xl font-bold px-10 h-14 text-base shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            if (inputRef.current) inputRef.current.click();
          }}
        >
          {label}
        </Button>

        {/* Formats Display categorized and collapsible */}
        <div className="mt-8 opacity-80 hover:opacity-100 transition-opacity">
          <FileFormatsDisplay acceptedExtensions={acceptedExtensions} />
        </div>

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
