import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ProcessingViewProps {
    files: File[];
    processing: boolean;
    progress: number;
    onProcess: () => void;
    buttonText: string;
    processingText: string;
    estimateText?: string;
}

const ProcessingView = ({
    files,
    processing,
    progress,
    onProcess,
    buttonText,
    processingText,
    estimateText = "Estimated time: ~5-15 seconds",
}: ProcessingViewProps) => {
    if (files.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center gap-4"
        >
            {/* Before Processing */}
            {!processing && (
                <Button
                    size="lg"
                    onClick={onProcess}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 text-base shadow-lg shadow-primary/20"
                >
                    {buttonText}
                </Button>
            )}

            {/* During Processing */}
            {processing && (
                <div className="w-full max-w-md space-y-4 text-center">
                    <Progress value={progress} className="h-3" />
                    <div className="flex flex-col items-center gap-1">
                        <p className="flex items-center text-sm font-medium text-foreground">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
                            {processingText} ({progress}%)
                        </p>
                        {estimateText && (
                            <p className="text-xs text-muted-foreground">{estimateText}</p>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ProcessingView;
