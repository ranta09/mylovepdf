import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Download, FileText, Share2, RefreshCw, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

export interface BatchProcessingResult {
    blob: Blob;
    filename: string;
}

export interface BatchProcessingViewProps {
    files: File[];
    processItem: (file: File, updateProgress: (p: number) => void) => Promise<BatchProcessingResult>;
    onReset: () => void;
    title?: string;
    onComplete?: (results: BatchProcessingResult[]) => void;
    hideZip?: boolean;
}

type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface FileState {
    id: string;
    file: File;
    status: FileStatus;
    progress: number;
    errorMsg?: string;
    result?: BatchProcessingResult;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const BatchProcessingView = ({ files, processItem, onReset, title = "Processing Files...", onComplete, hideZip = false }: BatchProcessingViewProps) => {
    const [fileStates, setFileStates] = useState<FileState[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const processedRef = useRef(false);

    // Initialize states
    useEffect(() => {
        if (!processedRef.current && files.length > 0) {
            setFileStates(files.map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                status: 'pending',
                progress: 0
            })));
        }
    }, [files]);

    // Processing Loop
    useEffect(() => {
        if (fileStates.length === 0 || isFinished) return;
        
        const processNext = async () => {
            if (currentIndex >= fileStates.length) {
                if (!isFinished) {
                    setIsFinished(true);
                    processedRef.current = true;
                    
                    const doneResults = fileStates
                        .filter(f => f.status === 'done' && f.result)
                        .map(f => f.result!);
                        
                    toast.success("Batch processing complete!");
                    
                    if (onComplete) {
                        onComplete(doneResults);
                    }
                }
                return;
            }

            const currentItem = fileStates[currentIndex];
            if (currentItem.status !== 'pending') return;

            // Mark as processing
            setFileStates(prev => prev.map((item, i) => 
                i === currentIndex ? { ...item, status: 'processing', progress: 0 } : item
            ));

            try {
                const result = await processItem(currentItem.file, (p) => {
                    setFileStates(prev => prev.map((item, i) => 
                        i === currentIndex ? { ...item, progress: p } : item
                    ));
                });

                // Mark done
                setFileStates(prev => prev.map((item, i) => 
                    i === currentIndex ? { ...item, status: 'done', progress: 100, result } : item
                ));
            } catch (err: any) {
                console.error("File processing error", err);
                setFileStates(prev => prev.map((item, i) => 
                    i === currentIndex ? { ...item, status: 'error', progress: 0, errorMsg: err.message || "Processing failed" } : item
                ));
            } finally {
                // Move to next
                setCurrentIndex(prev => prev + 1);
            }
        };

        processNext();
    }, [currentIndex, fileStates, isFinished, processItem]);

    const handleDownloadSingle = (result: BatchProcessingResult) => {
        try {
            const url = URL.createObjectURL(result.blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = result.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (err) {
            toast.error("Download failed");
        }
    };

    const handleDownloadZip = async () => {
        const doneItems = fileStates.filter(f => f.status === 'done' && f.result);
        if (doneItems.length === 0) return;
        if (doneItems.length === 1) {
            handleDownloadSingle(doneItems[0].result!);
            return;
        }

        setIsZipping(true);
        try {
            const zip = new JSZip();
            doneItems.forEach(item => {
                zip.file(item.result!.filename, item.result!.blob);
            });

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = "MagicDOCX_Batch_Files.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success("Downloaded ZIP file");
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (err) {
            toast.error("Failed to create ZIP");
        } finally {
            setIsZipping(false);
        }
    };

    if (fileStates.length === 0) return null;

    const doneCount = fileStates.filter(f => f.status === 'done').length;
    const errorCount = fileStates.filter(f => f.status === 'error').length;
    
    // Calculate overall precise progress
    let overallProgress = 0;
    if (fileStates.length > 0) {
        let totalVal = 0;
        fileStates.forEach(f => {
            if (f.status === 'done') totalVal += 100;
            else if (f.status === 'processing') totalVal += f.progress;
            else if (f.status === 'error') totalVal += 100; // count errors as finished
        });
        overallProgress = Math.round(totalVal / fileStates.length);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 mt-6"
        >
            {/* Global Status Header */}
            <div className="w-full bg-card border border-border shadow-elevated rounded-3xl overflow-hidden text-center">
                <div className="p-8 pb-6 bg-gradient-to-b from-primary/5 to-transparent relative">
                    {!isFinished ? (
                         <div className="relative mx-auto w-16 h-16 flex items-center justify-center mb-4">
                            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1.2s' }} />
                            <Loader2 className="h-6 w-6 text-primary absolute animate-pulse" />
                         </div>
                    ) : (
                         <motion.div 
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-500 ring-8 ring-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.3)] relative z-10"
                        >
                            <CheckCircle2 className="h-8 w-8" strokeWidth={3.5} />
                        </motion.div>
                    )}

                    <h2 className="text-2xl font-black text-foreground">{isFinished ? "Batch Complete!" : title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isFinished ? `Successfully processed ${doneCount} file${doneCount !== 1 ? 's' : ''}` : `Processing file ${Math.min(currentIndex + 1, files.length)} of ${files.length}`}
                        {errorCount > 0 && <span className="text-destructive ml-2">({errorCount} failed)</span>}
                    </p>

                    {/* Big Unified Progress Bar */}
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <span>Total Progress</span>
                            <span className={cn(overallProgress > 0 && !isFinished ? "text-primary" : isFinished ? "text-green-500" : "")}>{overallProgress}%</span>
                        </div>
                        <div className="h-4 w-full bg-secondary rounded-full overflow-hidden p-[2px] border border-border/50 shadow-inner">
                            <motion.div
                                className={cn("h-full rounded-full shadow-glow relative overflow-hidden", isFinished ? "bg-green-500" : "bg-primary")}
                                initial={{ width: "0%" }}
                                animate={{ width: `${Math.max(overallProgress, 2)}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                            >
                                {!isFinished && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Per File List */}
                <div className="p-4 bg-secondary/10 border-t border-border/50 max-h-[350px] overflow-y-auto custom-scrollbar space-y-3">
                    {fileStates.map((item) => (
                        <div key={item.id} className="bg-background border border-border rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={cn(
                                    "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border",
                                    item.status === 'done' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                    item.status === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                                    item.status === 'processing' ? "bg-primary/10 border-primary/20 text-primary" :
                                    "bg-secondary/50 border-border text-muted-foreground"
                                )}>
                                    {item.status === 'done' ? <CheckCircle2 className="h-6 w-6" /> :
                                     item.status === 'error' ? <AlertCircle className="h-6 w-6" /> :
                                     item.status === 'processing' ? <Loader2 className="h-6 w-6 animate-spin" /> :
                                     <FileText className="h-6 w-6" />}
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-foreground truncate">{item.file.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-medium text-muted-foreground">{formatSize(item.file.size)}</span>
                                        <span className="text-[10px] text-muted-foreground/30">•</span>
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            item.status === 'done' ? "text-green-500" :
                                            item.status === 'error' ? "text-destructive" :
                                            item.status === 'processing' ? "text-primary animate-pulse" :
                                            "text-muted-foreground"
                                        )}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Row Action / Status */}
                            <div className="flex items-center md:justify-end min-w-[120px]">
                                {item.status === 'processing' && (
                                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                         <div className="h-full bg-primary" style={{ width: `${item.progress}%`, transition: 'width 0.3s ease' }} />
                                    </div>
                                )}
                                {item.status === 'error' && (
                                    <p className="text-xs text-destructive max-w-[150px] truncate" title={item.errorMsg}>{item.errorMsg}</p>
                                )}
                                {item.status === 'done' && item.result && (
                                    <Button size="sm" variant="outline" className="w-full md:w-auto h-9 text-xs font-bold hover:bg-primary/5 hover:text-primary rounded-lg" onClick={() => handleDownloadSingle(item.result!)}>
                                        <Download className="mr-2 h-3.5 w-3.5" /> Download
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-background border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                     {!hideZip && (
                         <Button
                            size="lg"
                            className="w-full sm:w-auto rounded-xl shadow-xl shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-sm font-black uppercase tracking-wider hover:scale-[1.02] transition-transform"
                            onClick={handleDownloadZip}
                            disabled={isZipping || doneCount === 0 || !isFinished}
                        >
                            {isZipping ? "Creating ZIP..." : doneCount > 1 ? "Download All as ZIP" : "Download File"}
                            {!isZipping && <Archive className="ml-2 h-5 w-5" />}
                        </Button>
                     )}

                    <Button variant="ghost" onClick={onReset} className="text-muted-foreground hover:text-foreground font-semibold rounded-xl" disabled={!isFinished && currentIndex < files.length}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Start New
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default BatchProcessingView;
