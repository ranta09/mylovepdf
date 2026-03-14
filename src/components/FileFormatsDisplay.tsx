import { useState } from "react";
import {
    ChevronDown, FileText, FileSpreadsheet, Presentation,
    Image as ImageIcon, FileType, FileCode, Book,
    Table2, Layout, FileImage, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FormatGroup {
    label: string;
    extensions: string[];
    icon: any;
    colorClass: string;
}

const formatGroups: FormatGroup[] = [
    {
        label: "Documents",
        extensions: ["PDF", "DOC", "DOCX", "TXT", "RTF", "ODT", "EPUB"],
        icon: FileText,
        colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
        label: "Spreadsheets",
        extensions: ["XLS", "XLSX", "CSV"],
        icon: FileSpreadsheet,
        colorClass: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    {
        label: "Presentations",
        extensions: ["PPT", "PPTX"],
        icon: Presentation,
        colorClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
        label: "Images",
        extensions: ["PNG", "JPG", "JPEG", "WEBP", "TIFF", "BMP"],
        icon: ImageIcon,
        colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
];

const FileFormatsDisplay = ({
    acceptedExtensions,
    collapsible = true
}: {
    acceptedExtensions: string[],
    collapsible?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(!collapsible);

    // Filter groups to only show extensions that are actually accepted by this tool instance
    const cleanAccepted = acceptedExtensions.map(ext => ext.replace(".", "").toUpperCase());

    const filteredGroups = formatGroups.map(group => ({
        ...group,
        extensions: group.extensions.filter(ext => cleanAccepted.includes(ext))
    })).filter(group => group.extensions.length > 0);

    if (filteredGroups.length === 0) return null;

    return (
        <div className="w-full mx-auto mt-4 px-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {collapsible && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                        Supported file formats
                    </span>
                    <ChevronDown className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300",
                        isOpen ? "rotate-180" : ""
                    )} />
                </button>
            )}

            <AnimatePresence>
                {(isOpen || !collapsible) && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-3 pb-5">
                            {filteredGroups.flatMap(g => g.extensions).map((ext) => (
                                <div
                                    key={ext}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition-all duration-200 cursor-default hover:brightness-95",
                                        getFormatStyle(ext)
                                    )}
                                >
                                    {getSmallIcon(ext)}
                                    {ext}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-center">
                            <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground font-medium italic opacity-80 decoration-dotted underline-offset-4 decoration-border/50">
                                <ShieldCheck className="h-3 w-3 text-green-500" />
                                Secure & Local
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper for specific format styling to give that "SaaS Chip" feel
const getFormatStyle = (ext: string) => {
    switch (ext) {
        case "PDF": return "bg-red-50/50 text-red-600 border-red-100 dark:bg-red-500/5 dark:border-red-500/20";
        case "DOC":
        case "DOCX": return "bg-blue-50/50 text-blue-600 border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20";
        case "XLS":
        case "XLSX": return "bg-emerald-50/50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20";
        case "PPT":
        case "PPTX": return "bg-orange-50/50 text-orange-600 border-orange-100 dark:bg-orange-500/5 dark:border-orange-500/20";
        case "TXT": return "bg-slate-50/50 text-slate-600 border-slate-100 dark:bg-slate-500/5 dark:border-slate-500/20";
        case "CSV": return "bg-teal-50/50 text-teal-600 border-teal-100 dark:bg-teal-500/5 dark:border-teal-500/20";
        case "EPUB": return "bg-indigo-50/50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/5 dark:border-indigo-500/20";
        case "PNG":
        case "JPG":
        case "JPEG":
        case "WEBP": return "bg-purple-50/50 text-purple-600 border-purple-100 dark:bg-purple-500/5 dark:border-purple-500/20";
        default: return "bg-secondary/50 text-muted-foreground border-border/50";
    }
};

const getSmallIcon = (ext: string) => {
    const iconClass = "h-3 w-3 shrink-0";
    switch (ext) {
        case "PDF": return <FileText className={iconClass} />;
        case "DOC":
        case "DOCX": return <FileType className={iconClass} />;
        case "XLS":
        case "XLSX": return <Table2 className={iconClass} />;
        case "CSV": return <FileCode className={iconClass} />;
        case "PPT":
        case "PPTX": return <Layout className={iconClass} />;
        case "EPUB": return <Book className={iconClass} />;
        case "TXT": return <AlignLeftIcon className={iconClass} />;
        case "PNG":
        case "JPG":
        case "JPEG":
        case "WEBP":
        case "TIFF":
        case "BMP": return <FileImage className={iconClass} />;
        default: return <FileText className={iconClass} />;
    }
};

const AlignLeftIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="21" y1="6" x2="3" y2="6"></line>
        <line x1="15" y1="12" x2="3" y2="12"></line>
        <line x1="17" y1="18" x2="3" y2="18"></line>
    </svg>
);

export default FileFormatsDisplay;
