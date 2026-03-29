import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
                    <div className="w-full max-w-md space-y-6 text-center bg-card border border-border/50 shadow-sm rounded-3xl p-8">
                        {/* Animated Spinner Icon */}
                        <div className="relative mx-auto w-16 h-16 flex items-center justify-center mb-2">
                           <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                           <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" style={{ animationDuration: '1.2s' }} />
                           <Loader2 className="h-6 w-6 text-primary absolute animate-pulse" />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-foreground mb-1">
                                {processingText}
                            </h3>
                            {estimateText && (
                                <p className="text-sm text-muted-foreground">{estimateText}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                                <span>Progress</span>
                                <span className={cn("transition-colors", progress > 0 ? "text-primary" : "")}>{progress}%</span>
                            </div>
                            
                            {/* Real Animated Custom Progress Bar */}
                            <div className="h-4 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
                                <motion.div
                                    className="h-full bg-primary rounded-full shadow-glow relative overflow-hidden"
                                    initial={{ width: "0%" }}
                                    animate={{ width: `${Math.max(progress, 2)}%` }} // Minimum width for visibility
                                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                >
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default ProcessingView;
