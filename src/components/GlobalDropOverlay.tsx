
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, UploadCloud, X } from "lucide-react";
import SmartSuggestions from "./SmartSuggestions";
import { useGlobalUpload } from "./GlobalUploadContext";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { detectFileType } from "@/lib/fileDetection";

const GlobalDropOverlay = () => {
    const [dragActive, setDragActive] = useState(false);
    const [incompatibleFile, setIncompatibleFile] = useState(false);
    const [incompatibleMessage, setIncompatibleMessage] = useState("");
    const dragCounter = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { activeTool, acceptedTypes, globalFiles, setGlobalFiles } = useGlobalUpload();

    // -- File Processing --
    // Helper to centralize file processing from drag, paste, and double-click
    const processFiles = (files: File[]) => {
        if (!files || files.length === 0) return;

        console.log("=== FILE UPLOAD EVENT ===");
        console.log("Files Count:", files.length);
        files.forEach((f, idx) => console.log(`File ${idx + 1}: ${f.name} (Type: ${f.type})`));

        // Always put files in global state. The FileUpload component will reactively 
        // snatch them if we're on a tool page, otherwise SmartSuggestions will show.
        setGlobalFiles(prev => [...prev, ...files]);
        setDragActive(false); // hide overlay
    };

    // -- Drag & Drop Handlers --
    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
            setDragActive(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setDragActive(false);
        }
    }, []);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        dragCounter.current = 0;
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            processFiles(Array.from(files));
        }
    }, [setDragActive, setGlobalFiles]);

    // -- Paste Handler --
    const handlePaste = useCallback((e: ClipboardEvent) => {
        // Don't intercept paste if user is typing in an input or textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        const items = e.clipboardData?.items;
        if (!items) return;

        const filesFromPaste: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) {
                    filesFromPaste.push(file);
                }
            }
        }

        if (filesFromPaste.length > 0) {
            processFiles(filesFromPaste);
        }
    }, [setGlobalFiles]);

    // -- Double Click Handler --
    const handleDoubleClick = useCallback((e: MouseEvent) => {
        // Only trigger on the homepage
        if (location.pathname !== "/") return;

        // Don't trigger if clicking on interactive elements
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('button, a, input, [role="button"]');

        if (!isInteractive && inputRef.current) {
            inputRef.current.click();
        }
    }, [location.pathname]);

    // -- File Input Handler (for double-click) --
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            processFiles(Array.from(files));
        }
        // Reset input so the same file can be selected again if needed
        e.target.value = "";
    };

    // -- Event Listeners --
    useEffect(() => {
        document.addEventListener("dragenter", handleDragEnter);
        document.addEventListener("dragleave", handleDragLeave);
        document.addEventListener("dragover", handleDragOver);
        document.addEventListener("drop", handleDrop);
        document.addEventListener("paste", handlePaste);
        document.addEventListener("dblclick", handleDoubleClick);

        return () => {
            document.removeEventListener("dragenter", handleDragEnter);
            document.removeEventListener("dragleave", handleDragLeave);
            document.removeEventListener("dragover", handleDragOver);
            document.removeEventListener("drop", handleDrop);
            document.removeEventListener("paste", handlePaste);
            document.removeEventListener("dblclick", handleDoubleClick);
        };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handlePaste, handleDoubleClick]);

    const handleSuggestionSelect = (path: string) => {
        console.log("=== ROUTE NAVIGATION ===");
        console.log("Selected Tool Path:", path);
        // We do NOT clear globalFiles here. Tool handoff will pick them up.
        navigate(path);
    };

    return (
        <>
            {/* Hidden file input for double-click upload */}
            <input
                type="file"
                multiple
                className="hidden"
                ref={inputRef}
                onChange={handleFileInput}
                accept={activeTool && acceptedTypes?.length ? acceptedTypes.join(",") : undefined}
            />

            <AnimatePresence>
                {incompatibleFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="flex max-w-md flex-col items-center text-center bg-card border border-border rounded-3xl p-8 shadow-elevated"
                        >
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
                                <X className="h-8 w-8" />
                            </div>
                            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                                Incompatible File
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                {incompatibleMessage}
                            </p>
                            <div className="flex flex-col w-full gap-3">
                                <Button
                                    size="lg"
                                    onClick={() => setIncompatibleFile(false)}
                                    className="rounded-xl w-full"
                                >
                                    Got it, I'll upload another file
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => {
                                        setIncompatibleFile(false);
                                        // Force the file to standard SmartSuggestions if they click this
                                        // by temporarily bypassing the context logic. We'd need the originally
                                        // dropped file though. This is an advanced case, but for now we'll
                                        // just close the dialog.
                                        toast.info("Navigate back to Home to use all automatic tools");
                                    }}
                                    className="rounded-xl w-full"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {dragActive && !incompatibleFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="flex flex-col items-center p-12 text-center"
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/20 shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)]"
                            >
                                <UploadCloud className="h-12 w-12 text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" />
                            </motion.div>

                            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl drop-shadow-sm">
                                Drop your file anywhere
                            </h2>
                            <p className="mt-4 text-lg text-muted-foreground md:text-xl font-medium">
                                {activeTool ? (
                                    <span className="text-primary font-semibold">Active Tool: {activeTool.name}</span>
                                ) : (
                                    "MagicDocx will detect the right tool automatically."
                                )}
                            </p>
                            {activeTool && (
                                <p className="mt-2 text-sm text-muted-foreground/80">
                                    Supported formats: {acceptedTypes.join(", ").toUpperCase()}
                                </p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {globalFiles.length > 0 && !activeTool && (
                    <SmartSuggestions
                        files={globalFiles}
                        onSelect={handleSuggestionSelect}
                        onClose={() => setGlobalFiles([])}
                        onRemoveFile={(index) => {
                            setGlobalFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default GlobalDropOverlay;
