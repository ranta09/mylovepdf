import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, Zap, Shield, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalUpload } from "./GlobalUploadContext";
import { toast } from "sonner";

const ACCEPTED = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".jpg", ".jpeg", ".png", ".html"];

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
        <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
                "relative mx-auto flex w-full min-h-[420px] cursor-pointer flex-col items-center justify-center gap-6 rounded-xl px-8 py-16 text-center transition-all duration-300 border-2 border-dashed",
                dragging
                    ? "bg-primary/10 border-primary scale-[1.01] shadow-card-hover"
                    : "bg-transparent border-primary/40 hover:border-primary hover:bg-primary/5 shadow-sm"
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
                        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-green-500"
                    >
                        <CheckCircle className="h-10 w-10" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="upload"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="flex items-center justify-center transition-colors duration-300"
                    >
                        <motion.div
                            animate={dragging ? { y: [0, -4, 0] } : {}}
                            transition={{ duration: 0.6, repeat: Infinity }}
                        >
                            <Upload className="h-12 w-12 text-primary" strokeWidth={2.5} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col items-center gap-2">
                <p className="text-xl font-medium text-foreground mb-2">
                    {dragging ? "Release to upload" : (
                        <>Drop your files here or <span className="font-bold text-primary">browse.</span></>
                    )}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 opacity-80">
                {[
                    { label: "100% Free", icon: <Zap className="h-4 w-4" /> },
                    { label: "100% Secure", icon: <Shield className="h-4 w-4" /> },
                    { label: "No Sign-up Required", icon: <CheckCircle className="h-4 w-4" /> },
                    { label: "Browser-based Processing", icon: <Globe className="h-4 w-4" /> },
                ].map((badge, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="flex items-center gap-1.5 text-xs md:text-sm font-medium text-muted-foreground transition-colors"
                    >
                        <span className="text-primary/70">{badge.icon}</span>
                        {badge.label}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default HeroUpload;
