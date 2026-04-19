import { useState, useEffect } from "react";
import { Download, Check, FileText, ArrowLeft, ChevronRight, ShieldCheck, Lock, CheckCircle2, FileBox, Merge, Scissors, Hash, Droplets, RotateCcw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { trackEvent } from "@/lib/plausible";
import { triggerSubscriptionToast } from "./SubscriptionToast";
import { cn } from "@/lib/utils";

export interface ProcessingResult {
    file: File | Blob;
    url: string;
    filename: string;
}

interface ResultViewProps {
    results: ProcessingResult[];
    onReset: () => void;
    hideShare?: boolean;
    hideIndividualDownload?: boolean;
}

const RELATED_TOOLS = [
    { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
    { name: "Split PDF", path: "/split-pdf", icon: Scissors },
    { name: "Add Page Numbers", path: "/page-numbers", icon: Hash },
    { name: "Watermark", path: "/watermark-pdf", icon: Droplets },
    { name: "Rotate PDF", path: "/rotate-pdf", icon: RotateCcw },
    { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
];

const ResultView = ({ results, onReset, hideIndividualDownload = false }: ResultViewProps) => {
    const [zipping, setZipping] = useState(false);

    useEffect(() => {
        if (results && results.length > 0) {
            trackEvent("conversion_success", { 
                tool_name: window.location.pathname.replace(/^\//, '') || 'home',
                file_count: results.length
            });
        }
    }, [results]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleDownloadSingle = (result: ProcessingResult) => {
        try {
            const fileSize = result.file?.size ?? 0;
            if (fileSize === 0) {
                toast.error("File could not be downloaded, it appears to be empty. Please try again.");
                return;
            }

            if (!result.url) {
                toast.error("Download link is missing. Please try again.");
                return;
            }

            const freshUrl = URL.createObjectURL(result.file);
            const a = document.createElement("a");
            a.href = freshUrl;
            a.download = result.filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                URL.revokeObjectURL(freshUrl);
                triggerSubscriptionToast(window.location.pathname.replace(/^\//, '') || 'home');
            }, 2000);

            trackEvent("download_clicked", { tool_name: window.location.pathname.replace(/^\//, '') || 'home', format: 'single' });
            toast.success(`Downloaded ${result.filename}`);
        } catch (err: any) {
            toast.error("Download failed. Please try again.");
        }
    };

    const handleDownloadAll = async () => {
        if (results.length === 1) {
            handleDownloadSingle(results[0]);
            return;
        }

        setZipping(true);
        try {
            const { default: JSZip } = await import("jszip");
            const zip = new JSZip();
            results.forEach((r) => {
                zip.file(r.filename, r.file);
            });

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = "MagicDOCX_Processed_Files.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            trackEvent("download_clicked", { tool_name: window.location.pathname.replace(/^\//, '') || 'home', format: 'zip' });
            toast.success("Downloaded all files as ZIP");

            setTimeout(() => {
                URL.revokeObjectURL(url);
                triggerSubscriptionToast(window.location.pathname.replace(/^\//, '') || 'home');
            }, 1000);
        } catch (e) {
            toast.error("Failed to create ZIP file");
        } finally {
            setZipping(false);
        }
    };

    if (results.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full min-h-full bg-secondary/30 dark:bg-secondary/10"
        >
            <div className="w-full max-w-5xl mx-auto px-4 pt-6 pb-12 space-y-8">

                {/* Title */}
                <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center tracking-tighter">
                    {results.length > 1 ? "Files are ready!" : "File is ready!"}
                </h2>

                {/* ── ACTION ROW ── */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:-ml-24">
                    {/* Back button */}
                    <button
                        onClick={onReset}
                        className="flex items-center justify-center w-14 h-14 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors shrink-0"
                        title="Go back"
                    >
                        <ArrowLeft className="h-6 w-6 text-foreground" />
                    </button>

                    {/* Main download button */}
                    <button
                        className="h-20 px-8 md:px-20 w-full md:w-auto md:min-w-[420px] rounded-2xl font-bold text-lg md:text-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-3 justify-center uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={handleDownloadAll}
                        disabled={zipping}
                    >
                        <Download className="h-6 w-6" />
                        {zipping ? "Zipping..." : results.length > 1 ? "DOWNLOAD ALL FILES" : "DOWNLOAD FILE"}
                    </button>
                </div>

                {/* ── PER-FILE BREAKDOWN (only if more than 1 file) ── */}
                {results.length > 1 && (
                    <div className="bg-background rounded-2xl border border-border overflow-hidden max-w-5xl mx-auto w-full">
                        <div className="px-5 py-3 border-b border-border bg-secondary/20 uppercase tracking-widest text-[10px] font-bold text-muted-foreground">
                            Processed files
                        </div>
                        <div className="divide-y divide-border">
                            {results.map((r, i) => (
                                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <FileBox className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground truncate">{r.filename}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {formatSize(r.file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {!hideIndividualDownload && (
                                        <div className="flex items-center gap-3 shrink-0 mt-3 sm:mt-0 justify-end border-t sm:border-t-0 border-border pt-3 sm:pt-0">
                                            <button
                                                onClick={() => handleDownloadSingle(r)}
                                                className="p-2.5 rounded-xl hover:bg-secondary transition-colors"
                                                title="Download"
                                            >
                                                <Download className="h-5 w-5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── CONTINUE TO... ── */}
                <div className="bg-background rounded-2xl border border-border overflow-hidden max-w-5xl mx-auto w-full">
                    <div className="px-6 py-4 border-b border-border">
                        <h3 className="text-base font-bold text-foreground">Continue to...</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                        {RELATED_TOOLS.map((tool, i) => (
                            <a
                                key={tool.path}
                                href={tool.path}
                                className={cn(
                                    "flex items-center gap-3 px-6 py-4 hover:bg-secondary/40 transition-colors group",
                                    i % 2 === 0 && "sm:border-r border-border",
                                    i >= 2 && "border-t border-border"
                                )}
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <tool.icon className="h-5 w-5 text-primary stroke-[1.5]" />
                                </div>
                                <span className="text-sm font-semibold text-foreground flex-1 group-hover:text-primary transition-colors">{tool.name}</span>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                        ))}
                    </div>
                    <div className="px-6 py-3 border-t border-border flex justify-end">
                        <button
                            onClick={() => window.location.href = "/#all-tools"}
                            className="text-sm font-bold text-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
                        >
                            See more
                        </button>
                    </div>
                </div>

                {/* ── SECURITY SECTION ── */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 space-y-4 max-w-5xl mx-auto w-full">
                    <h3 className="text-xl font-bold text-foreground tracking-tight">Secure. Private. In your control</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        MagicDOCX processes all files directly in your browser with no server uploads, no tracking, and complete privacy.
                        Your files are always handled safely and automatically cleared after processing.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-2">
                        {[
                            { icon: ShieldCheck, label: "SSL Encryption" },
                            { icon: Loader2, label: "No Storage" },
                            { icon: CheckCircle2, label: "100% Private" },
                        ].map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-background text-sm font-bold text-foreground shrink-0 shadow-sm">
                                <Icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export default ResultView;
