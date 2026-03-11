import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MousePointerClick, UploadCloud, ClipboardPaste } from "lucide-react";
import { useLocation } from "react-router-dom";

const GlobalUploadHint = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Only show on the homepage, and only if it hasn't been dismissed manually
        if (location.pathname === "/" && !isDismissed) {
            // Delay showing the hint for a smoother entrance
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [location.pathname, isDismissed]);

    const handleDismiss = () => {
        setIsVisible(false);
        setIsDismissed(true);
        // Optional: save to localStorage so it doesn't show again on reload
        // localStorage.setItem("uploadHintDismissed", "true");
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, x: -50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-6 left-6 z-50 w-72 md:w-80 overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-elevated"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/50 bg-secondary/50 px-4 py-3">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <UploadCloud className="h-4 w-4 text-primary" />
                            Upload Instantly
                        </h4>
                        <button
                            onClick={handleDismiss}
                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                            aria-label="Dismiss hint"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4">
                        <p className="text-xs text-muted-foreground mb-3">
                            You don't need to find a button. You can upload files by:
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 text-sm text-foreground">
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <UploadCloud className="h-3 w-3" />
                                </div>
                                <span className="leading-tight"><strong>Dropping</strong> them anywhere on the page</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-foreground">
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                                    <MousePointerClick className="h-3 w-3" />
                                </div>
                                <span className="leading-tight"><strong>Double-clicking</strong> anywhere empty</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-foreground">
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                                    <ClipboardPaste className="h-3 w-3" />
                                </div>
                                <span className="leading-tight"><strong>Pasting</strong> files directly <span className="text-xs text-muted-foreground inline-block font-mono bg-secondary/80 rounded px-1 py-0.5 mt-0.5 w-max">Ctrl + V</span></span>
                            </li>
                        </ul>
                    </div>

                    {/* Decorative progress bar to show it auto-dismisses eventually (optional, currently static) */}
                    <div className="h-1 w-full bg-border">
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 15, ease: "linear" }}
                            onAnimationComplete={() => setIsVisible(false)} // Auto dismiss after 15s
                            className="h-full bg-primary"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalUploadHint;
