import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DID_YOU_KNOW_TIPS = [
  "Use the 'Edit Text' tool to revise the content in your document",
  "You can merge multiple PDFs into one with our Merge PDF tool",
  "Our Compress PDF can reduce file sizes by up to 95%",
  "You can convert PDFs to Word while keeping the original layout",
  "Add watermarks to protect your documents from unauthorized use",
  "Our OCR tool can extract text from scanned documents",
  "You can add page numbers to your PDF in just a few clicks",
  "Protect your PDF with a password using our Protect PDF tool",
  "Split large PDFs into smaller files for easy sharing",
  "Convert your PDFs to PowerPoint for editable presentations",
  "Remove pages from a PDF without any software installation",
  "Our tools process files locally — your data never leaves your browser",
];

interface ProcessingViewProps {
    files: File[];
    processing: boolean;
    progress: number;
    onProcess: () => void;
    buttonText: string;
    processingText: string;
    estimateText?: string;
    disabled?: boolean;
    error?: string | null;
    onRetry?: () => void;
}

const ProcessingView = ({
    files,
    processing,
    progress,
    onProcess,
    buttonText,
    processingText,
    estimateText = "Estimated time: ~5-15 seconds",
    disabled = false,
    error = null,
    onRetry
}: ProcessingViewProps) => {
    const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * DID_YOU_KNOW_TIPS.length));

    useEffect(() => {
        if (!processing) return;
        const interval = setInterval(() => {
            setTipIndex((prev) => (prev + 1) % DID_YOU_KNOW_TIPS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [processing]);

    if (files.length === 0) return null;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={error ? "error" : processing ? "processing" : "idle"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-6 flex flex-col items-center gap-4 w-full"
            >
                {/* Error State */}
                {error ? (
                    <div className="w-full max-w-md bg-destructive/5 text-destructive border border-destructive/20 rounded-2xl p-6 text-center space-y-4">
                        <AlertCircle className="h-10 w-10 mx-auto text-destructive animate-in zoom-in duration-300" />
                        <div>
                            <p className="font-bold text-lg mb-1">Processing Failed</p>
                            <p className="text-sm opacity-90">{error}</p>
                        </div>
                        <Button 
                            variant="destructive" 
                            className="mt-4 w-full rounded-xl h-12 font-bold shadow-lg shadow-destructive/20"
                            onClick={onRetry || onProcess}
                        >
                            <RotateCcw className="mr-2 h-4 w-4" /> Try Again
                        </Button>
                    </div>
                ) : 
                
                /* Before Processing */
                !processing ? (
                    <Button
                        size="lg"
                        onClick={onProcess}
                        disabled={disabled}
                        className="rounded-xl w-full max-w-xs md:max-w-md bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 text-lg font-bold shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300"
                    >
                        {buttonText}
                    </Button>
                ) : 
                
                /* During Processing */
                (
                    <div className="w-full max-w-lg space-y-6 text-center bg-card border border-border/50 shadow-lg rounded-3xl p-8">
                        <h3 className="text-xl font-bold text-foreground">
                            Processing your document...
                        </h3>

                        {/* Progress Bar */}
                        <div className="space-y-3">
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/30">
                                <motion.div
                                    className="h-full bg-primary rounded-full relative overflow-hidden"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${Math.max(progress, 2)}%` }}
                                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                </motion.div>
                            </div>
                            <p className="text-lg font-bold text-foreground">{progress}%</p>
                        </div>

                        {/* Did You Know Card */}
                        <div className="bg-primary rounded-2xl p-5 text-left flex items-center gap-4">
                            <div className="shrink-0 w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                                <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="inline-block bg-primary-foreground/20 text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mb-1.5">
                                    Did you know?
                                </span>
                                <AnimatePresence mode="wait">
                                    <motion.p
                                        key={tipIndex}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.3 }}
                                        className="text-sm font-semibold text-primary-foreground leading-relaxed"
                                    >
                                        {DID_YOU_KNOW_TIPS[tipIndex]}
                                    </motion.p>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default ProcessingView;
