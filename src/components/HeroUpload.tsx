import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, Zap, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalUpload } from "./GlobalUploadContext";
import { toast } from "sonner";
const ACCEPTED = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".jpg", ".jpeg", ".png", ".html"];
const FORMATS_DISPLAY = ["PDF", "DOCX", "PPTX", "XLSX", "JPG", "PNG"];

const HeroUpload = () => {
    const [dragging, setDragging] = useState(false);
    const [justAdded, setJustAdded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { setGlobalFiles } = useGlobalUpload();

    const handleFiles = useCallback((files: FileList | File[]) => {
        if (!files || files.length === 0) return;

        setGlobalFiles(prev => {
            const newFiles = Array.from(files);
            const allFiles = [...prev, ...newFiles];

            setJustAdded(true);
            setTimeout(() => setJustAdded(false), 1200);
            return allFiles;
        });
    }, [setGlobalFiles]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files);
        e.target.value = "";
    }, [handleFiles]);

    return (
        <>
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                    "relative mx-auto flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center gap-6 rounded-[2rem] px-8 py-16 text-center transition-all duration-300",
                    dragging
                        ? "bg-primary/10 scale-[1.01] shadow-card-hover rounded-[2rem]"
                        : "bg-transparent hover:bg-primary/5 rounded-[2rem]"
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED.join(",")}
                    className="hidden"
                    onChange={handleSelect}
                />

                <AnimatePresence mode="wait">
                    {justAdded ? (
                        <motion.div
                            key="success"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10 text-green-500"
                        >
                            <CheckCircle className="h-10 w-10" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="upload"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={cn(
                                "flex h-20 w-20 items-center justify-center rounded-2xl transition-colors duration-300",
                                dragging ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
                            )}
                        >
                            <motion.div
                                animate={dragging ? { y: [0, -4, 0] } : {}}
                                transition={{ duration: 0.6, repeat: Infinity }}
                            >
                                <Upload className="h-10 w-10" />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div>
                    <p className="text-xl font-bold text-foreground">
                        {dragging ? "Release to upload" : "Upload your Files"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Paste or drop anywhere</span> on this page, or <span className="font-semibold text-primary">click this tile</span> to browse.
                    </p>
                </div>

                {/* Formats */}
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    {FORMATS_DISPLAY.map(fmt => (
                        <span key={fmt} className="inline-flex items-center gap-1 rounded-full bg-background/60 px-3 py-1 text-[11px] font-bold tracking-wider text-muted-foreground shadow-sm">
                            <FileText className="h-3 w-3" />
                            {fmt}
                        </span>
                    ))}
                </div>
            </div>

        </>
    );
};

export default HeroUpload;
