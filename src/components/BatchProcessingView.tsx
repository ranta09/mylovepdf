import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Download, FileText, Share2, RefreshCw, Archive, Eye, EyeOff, File, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";
import { trackEvent } from "@/lib/plausible";
import { triggerSubscriptionToast } from "./SubscriptionToast";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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

interface PreviewData {
    type: 'pdf-thumbnail' | 'docx-text' | 'generic';
    thumbnailDataUrl?: string;   // for PDF
    textSnippet?: string;        // for DOCX
    outputFilename?: string;
    outputSizeBytes?: number;
}

const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// ─── Preview Generator ────────────────────────────────────────────────────────

async function generatePreview(result: BatchProcessingResult): Promise<PreviewData> {
    const { blob, filename } = result;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'pdf') {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.2 });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: ctx, viewport }).promise;
            const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.82);

            return { type: 'pdf-thumbnail', thumbnailDataUrl, outputFilename: filename, outputSizeBytes: blob.size };
        } catch {
            return { type: 'generic', outputFilename: filename, outputSizeBytes: blob.size };
        }
    }

    if (ext === 'docx') {
        try {
            // Extract raw text from DOCX XML (word/document.xml inside the ZIP)
            const { default: JSZipLib } = await import('jszip');
            const zip = await JSZipLib.loadAsync(blob);
            const docXml = await zip.file('word/document.xml')?.async('string');
            let text = '';
            if (docXml) {
                // Strip XML tags, collapse whitespace, take first 250 chars
                text = docXml
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 250);
            }
            return { type: 'docx-text', textSnippet: text || 'No text content found.', outputFilename: filename, outputSizeBytes: blob.size };
        } catch {
            return { type: 'generic', outputFilename: filename, outputSizeBytes: blob.size };
        }
    }

    return { type: 'generic', outputFilename: filename, outputSizeBytes: blob.size };
}

// ─── FilePreviewPanel ─────────────────────────────────────────────────────────

interface FilePreviewPanelProps {
    result: BatchProcessingResult;
    onDownload: () => void;
}

const FilePreviewPanel = ({ result, onDownload }: FilePreviewPanelProps) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'download'>('preview');
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const generated = useRef(false);

    useEffect(() => {
        if (generated.current) return;
        generated.current = true;
        generatePreview(result).then(p => {
            setPreview(p);
            setIsLoading(false);
        });
    }, [result]);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
        >
            <div className="mt-3 rounded-xl border border-border bg-secondary/5 overflow-hidden">
                {/* Tab Bar */}
                <div className="flex border-b border-border bg-background/60">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 -mb-px",
                            activeTab === 'preview'
                                ? "border-primary text-primary bg-primary/5"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                        )}
                    >
                        <Eye className="h-3 w-3" />
                        Preview
                    </button>
                    <button
                        onClick={() => setActiveTab('download')}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 -mb-px",
                            activeTab === 'download'
                                ? "border-primary text-primary bg-primary/5"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20"
                        )}
                    >
                        <Download className="h-3 w-3" />
                        Download
                    </button>
                </div>

                {/* Panel Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'preview' ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="p-4"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center h-28 gap-3 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="text-xs font-medium uppercase tracking-widest">Generating Preview…</span>
                                </div>
                            ) : preview?.type === 'pdf-thumbnail' && preview.thumbnailDataUrl ? (
                                <div className="flex gap-4 items-start">
                                    {/* Thumbnail */}
                                    <div className="shrink-0 rounded-lg overflow-hidden border border-border shadow-md bg-white" style={{ width: 90 }}>
                                        <img
                                            src={preview.thumbnailDataUrl}
                                            alt="PDF preview"
                                            className="w-full h-auto object-contain block"
                                            width={90}
                                            decoding="async"
                                        />
                                    </div>
                                    {/* Meta */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-600 border border-red-500/20">PDF</span>
                                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Conversion verified
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold text-foreground truncate">{preview.outputFilename}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{formatSize(preview.outputSizeBytes ?? 0)}</p>
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Page 1 thumbnail shown</p>
                                    </div>
                                </div>
                            ) : preview?.type === 'docx-text' ? (
                                <div className="flex gap-4 items-start">
                                    {/* Icon */}
                                    <div className="shrink-0 w-[70px] h-[90px] rounded-lg border border-blue-500/20 bg-blue-500/5 flex flex-col items-center justify-center gap-1 shadow-sm">
                                        <FileText className="h-8 w-8 text-blue-600" />
                                        <span className="text-[8px] font-black uppercase tracking-tight text-blue-600">DOCX</span>
                                    </div>
                                    {/* Snippet */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border border-blue-500/20">DOCX</span>
                                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Text extracted
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold text-foreground truncate">{preview.outputFilename}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{formatSize(preview.outputSizeBytes ?? 0)}</p>
                                        <div className="mt-1 p-2.5 rounded-lg bg-muted/50 border border-border">
                                            <p className="text-[10px] leading-relaxed text-foreground/80 font-mono line-clamp-3 select-text">
                                                {preview.textSnippet}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Generic fallback */
                                <div className="flex gap-4 items-center">
                                    <div className="shrink-0 w-[70px] h-[70px] rounded-xl border border-border bg-secondary/30 flex items-center justify-center shadow-sm">
                                        <FileCheck className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> File ready
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-bold text-foreground truncate">{preview?.outputFilename}</p>
                                        <p className="text-[10px] text-muted-foreground">{formatSize(preview?.outputSizeBytes ?? 0)}</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="download"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="p-4 flex flex-col items-center gap-3"
                        >
                            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-foreground">{result.filename}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatSize(result.blob.size)}</p>
                            </div>
                            <Button
                                size="sm"
                                onClick={onDownload}
                                className="w-full max-w-[200px] h-10 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/25 hover:scale-[1.03] transition-transform"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download File
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// ─── FileRow ──────────────────────────────────────────────────────────────────

interface FileRowProps {
    item: FileState;
    onDownload: (result: BatchProcessingResult) => void;
}

const FileRow = ({ item, onDownload }: FileRowProps) => {
    const [expanded, setExpanded] = useState(false);

    // Auto-expand when done
    useEffect(() => {
        if (item.status === 'done') {
            setExpanded(true);
        }
    }, [item.status]);

    return (
        <div className="bg-background border border-border rounded-xl overflow-hidden transition-all duration-200">
            {/* Main Row */}
            <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                        "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border",
                        item.status === 'done'      ? "bg-green-500/10 border-green-500/20 text-green-500"     :
                        item.status === 'error'     ? "bg-destructive/10 border-destructive/20 text-destructive" :
                        item.status === 'processing' ? "bg-primary/10 border-primary/20 text-primary"           :
                        "bg-secondary/50 border-border text-muted-foreground"
                    )}>
                        {item.status === 'done'       ? <CheckCircle2 className="h-5 w-5" />            :
                         item.status === 'error'      ? <AlertCircle className="h-5 w-5" />              :
                         item.status === 'processing' ? <Loader2 className="h-5 w-5 animate-spin" />    :
                         <FileText className="h-5 w-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{item.file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-muted-foreground">{formatSize(item.file.size)}</span>
                            <span className="text-[10px] text-muted-foreground/30">•</span>
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider",
                                item.status === 'done'       ? "text-green-500"                  :
                                item.status === 'error'      ? "text-destructive"                :
                                item.status === 'processing' ? "text-primary animate-pulse"      :
                                "text-muted-foreground"
                            )}>
                                {item.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right-side action */}
                <div className="flex items-center gap-2 md:justify-end shrink-0">
                    {item.status === 'processing' && (
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${item.progress}%` }} />
                        </div>
                    )}
                    {item.status === 'error' && (
                        <p className="text-xs text-destructive max-w-[150px] truncate" title={item.errorMsg}>{item.errorMsg}</p>
                    )}
                    {item.status === 'done' && item.result && (
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className={cn(
                                "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all",
                                expanded
                                    ? "border-primary/30 bg-primary/5 text-primary"
                                    : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/20 hover:text-primary"
                            )}
                        >
                            {expanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {expanded ? 'Hide' : 'Preview'}
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable Preview Panel */}
            <AnimatePresence>
                {item.status === 'done' && item.result && expanded && (
                    <div className="px-3 pb-3">
                        <FilePreviewPanel
                            result={item.result}
                            onDownload={() => {
                                const url = URL.createObjectURL(item.result!.blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = item.result!.filename;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setTimeout(() => URL.revokeObjectURL(url), 2000);
                            }}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── BatchProcessingView ──────────────────────────────────────────────────────

const BatchProcessingView = ({ files, processItem, onReset, title = "Processing Files...", onComplete, hideZip = false }: BatchProcessingViewProps) => {
    const [fileStates, setFileStates] = useState<FileState[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [isFinished, setIsFinished] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
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
                trackEvent("conversion_success", { tool_name: window.location.pathname.replace(/^\//, '') || 'home' });
            } catch (err: any) {
                console.error("File processing error", err);
                trackEvent("conversion_error", { 
                    tool_name: window.location.pathname.replace(/^\//, '') || 'home',
                    error_message: err.message || "Processing failed"
                });
                setFileStates(prev => prev.map((item, i) =>
                    i === currentIndex ? { ...item, status: 'error', progress: 0, errorMsg: err.message || "Processing failed" } : item
                ));
            } finally {
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
            trackEvent("download_clicked", { tool_name: window.location.pathname.replace(/^\//, '') || 'home', format: 'single' });
            setTimeout(() => {
                URL.revokeObjectURL(url);
                triggerSubscriptionToast(window.location.pathname.replace(/^\//, '') || 'home');
            }, 2000);
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
            const { default: JSZip } = await import("jszip");
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
            trackEvent("download_clicked", { tool_name: window.location.pathname.replace(/^\//, '') || 'home', format: 'zip' });
            toast.success("Downloaded ZIP file");
            setTimeout(() => {
                URL.revokeObjectURL(url);
                triggerSubscriptionToast(window.location.pathname.replace(/^\//, '') || 'home');
            }, 2000);
        } catch (err) {
            toast.error("Failed to create ZIP");
        } finally {
            setIsZipping(false);
        }
    };

    if (fileStates.length === 0) return null;

    const doneCount = fileStates.filter(f => f.status === 'done').length;
    const errorCount = fileStates.filter(f => f.status === 'error').length;

    // Overall progress
    let overallProgress = 0;
    if (fileStates.length > 0) {
        let totalVal = 0;
        fileStates.forEach(f => {
            if (f.status === 'done') totalVal += 100;
            else if (f.status === 'processing') totalVal += f.progress;
            else if (f.status === 'error') totalVal += 100;
        });
        overallProgress = Math.round(totalVal / fileStates.length);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6 mt-6"
        >
            {/* Global Status Card */}
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

                    <h2 className="text-2xl font-black text-foreground">
                        {isFinished ? "Batch Complete!" : title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isFinished
                            ? `Successfully processed ${doneCount} file${doneCount !== 1 ? 's' : ''}`
                            : `Processing file ${Math.min(currentIndex + 1, files.length)} of ${files.length}`}
                        {errorCount > 0 && <span className="text-destructive ml-2">({errorCount} failed)</span>}
                    </p>

                    {/* Overall Progress Bar */}
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <span>Total Progress</span>
                            <span className={cn(
                                overallProgress > 0 && !isFinished ? "text-primary" : isFinished ? "text-green-500" : ""
                            )}>{overallProgress}%</span>
                        </div>
                        <div className="h-4 w-full bg-secondary rounded-full overflow-hidden p-[2px] border border-border/50 shadow-inner">
                            <motion.div
                                className={cn("h-full rounded-full relative overflow-hidden", isFinished ? "bg-green-500" : "bg-primary")}
                                initial={{ width: "0%" }}
                                animate={{ width: `${Math.max(overallProgress, 2)}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                            >
                                {!isFinished && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Per-File List */}
                <div className="p-4 bg-secondary/10 border-t border-border/50 max-h-[520px] overflow-y-auto custom-scrollbar space-y-3">
                    {fileStates.map(item => (
                        <FileRow
                            key={item.id}
                            item={item}
                            onDownload={handleDownloadSingle}
                        />
                    ))}
                </div>

                {/* Footer */}
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
