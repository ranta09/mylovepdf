import { useState } from "react";
import { Download, RefreshCw, Share2, Mail, Link as LinkIcon, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import JSZip from "jszip";

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

const ResultView = ({ results, onReset, hideShare = false, hideIndividualDownload = false }: ResultViewProps) => {
    const [zipping, setZipping] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showShare, setShowShare] = useState(false);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const handleDownloadSingle = (result: ProcessingResult) => {
        try {
            // Validate blob before attempting download
            const fileSize = result.file?.size ?? 0;
            console.log(`[Download] Initiating download: ${result.filename}, size=${fileSize} bytes, url=${result.url?.substring(0, 60)}`);

            if (fileSize === 0) {
                toast.error("File could not be downloaded — it appears to be empty. Please try converting again.");
                return;
            }

            if (!result.url) {
                toast.error("Download link is missing. Please try converting again.");
                return;
            }

            // Create a fresh Object URL from the blob to guarantee it's still valid
            const freshUrl = URL.createObjectURL(result.file);
            const a = document.createElement("a");
            a.href = freshUrl;
            a.download = result.filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Revoke after a short delay so the browser can initiate the download
            setTimeout(() => URL.revokeObjectURL(freshUrl), 2000);

            console.log(`[Download] Triggered: ${result.filename}`);
            toast.success(`Downloaded ${result.filename}`);
        } catch (err: any) {
            console.error("[Download] Failed:", err);
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
            toast.success("Downloaded all files as ZIP");

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            toast.error("Failed to create ZIP file");
        } finally {
            setZipping(false);
        }
    };

    const shareText = "I just converted some files perfectly for free using MagicDOCX! Check it out: https://magicdocx.com";

    const handleShare = async (platform: string) => {
        const encodedText = encodeURIComponent(shareText);

        switch (platform) {
            case "gmail":
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=Processed Files&body=${encodedText}`, "_blank");
                break;
            case "whatsapp":
                window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
                break;
            case "twitter":
                window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank");
                break;
            case "facebook":
                window.open(`https://www.facebook.com/sharer/sharer.php?u=https://magicdocx.com&quote=${encodedText}`, "_blank");
                break;
            case "copy":
                await navigator.clipboard.writeText("https://magicdocx.com");
                setCopied(true);
                toast.success("Link copied to clipboard");
                setTimeout(() => setCopied(false), 2000);
                break;
            case "native":
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: 'MagicDOCX Files',
                            text: shareText,
                            url: 'https://magicdocx.com',
                        });
                    } catch (e) {
                        // User cancelled
                    }
                }
                break;
        }
    };

    if (results.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 w-full flex flex-col items-center"
        >
            <div className="w-full max-w-2xl bg-card border border-border shadow-elevated rounded-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-primary/5 p-8 border-b border-border/50 text-center relative overflow-hidden">
                    {/* Subtle background glow effect over the success header */}
                    <div className="absolute inset-0 bg-green-500/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] blur-xl pointer-events-none" />
                    
                    <motion.div 
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-green-500 ring-8 ring-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.3)] relative z-10"
                    >
                        <Check className="h-10 w-10" strokeWidth={3.5} />
                    </motion.div>
                    <h2 className="text-xl font-bold text-foreground">Processing Complete!</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Successfully processed {results.length} file{results.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* File List */}
                <div className="p-4 max-h-[250px] overflow-y-auto custom-scrollbar space-y-2 bg-secondary/10">
                    {results.map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-[300px]">
                                        {res.filename}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatSize(res.file.size)}
                                    </p>
                                </div>
                            </div>
                            {!hideIndividualDownload && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-shrink-0 rounded-lg"
                                    onClick={() => handleDownloadSingle(res)}
                                >
                                    <Download className="h-4 w-4 md:mr-2" />
                                    <span className="hidden md:inline">Download</span>
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions Footer */}
                <div className="p-6 bg-background flex flex-col md:flex-row items-center gap-4 justify-between border-t border-border">

                    <div className="flex gap-2 w-full md:w-auto">
                        <Button
                            size="lg"
                            className="w-full md:w-auto rounded-xl flex-1 shadow-xl shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 h-14 text-lg font-bold hover:scale-[1.02] transition-transform"
                            onClick={handleDownloadAll}
                            disabled={zipping}
                        >
                            {zipping ? "Zipping..." : results.length > 1 ? "Download All Files" : "Download File"}
                        </Button>

                        {!hideShare && (
                            <div className="relative">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-11 w-11 rounded-xl"
                                    onClick={() => setShowShare(!showShare)}
                                >
                                    <Share2 className="h-5 w-5" />
                                </Button>

                                <AnimatePresence>
                                    {showShare && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-border shadow-xl rounded-xl p-2 z-50 flex flex-col gap-1"
                                        >
                                            <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1">Share Link</p>
                                            <button onClick={() => handleShare('copy')} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-secondary rounded-lg transition-colors text-left">
                                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                                                {copied ? "Copied!" : "Copy Link"}
                                            </button>
                                            {navigator.share && (
                                                <button onClick={() => handleShare('native')} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-secondary rounded-lg transition-colors text-left">
                                                    <Share2 className="h-4 w-4 text-muted-foreground" /> Share directly...
                                                </button>
                                            )}
                                            <button onClick={() => handleShare('whatsapp')} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-[#25D366]/10 hover:text-[#25D366] rounded-lg transition-colors text-left">
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                WhatsApp
                                            </button>
                                            <button onClick={() => handleShare('gmail')} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-[#EA4335]/10 hover:text-[#EA4335] rounded-lg transition-colors text-left">
                                                <Mail className="h-4 w-4" /> Gmail
                                            </button>
                                            <button onClick={() => handleShare('twitter')} className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] rounded-lg transition-colors text-left">
                                                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                                Twitter / X
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        onClick={onReset}
                        className="rounded-xl text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" /> Start Over
                    </Button>

                </div>
            </div>
        </motion.div>
    );
};

export default ResultView;
