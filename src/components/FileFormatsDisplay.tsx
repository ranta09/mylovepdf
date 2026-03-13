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

const FileFormatsDisplay = ({ acceptedExtensions }: { acceptedExtensions: string[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Filter groups to only show extensions that are actually accepted by this tool instance
    const cleanAccepted = acceptedExtensions.map(ext => ext.replace(".", "").toUpperCase());

    const filteredGroups = formatGroups.map(group => ({
        ...group,
        extensions: group.extensions.filter(ext => cleanAccepted.includes(ext))
    })).filter(group => group.extensions.length > 0);

    if (filteredGroups.length === 0) return null;

    return (
        <div className="w-full max-w-xl mx-auto mt-4 px-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 pb-6">
                            {filteredGroups.map((group) => (
                                <div key={group.label} className="space-y-2.5">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <group.icon className={cn("h-3.5 w-3.5", group.colorClass.split(" ")[1])} />
                                        <span className="text-[10px] font-extrabold uppercase tracking-tight text-foreground/70">
                                            {group.label}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.extensions.map((ext) => (
                                            <div
                                                key={ext}
                                                className={cn(
                                                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold border border-transparent shadow-sm transition-all hover:scale-105",
                                                    getFormatStyle(ext)
                                                )}
                                            >
                                                {getSmallIcon(ext)}
                                                {ext}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-center gap-1.5 py-2 border-t border-border/50 text-[10px] text-muted-foreground font-medium italic">
                            <ShieldCheck className="h-3 w-3 text-green-500" />
                            All processing is local and secure
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper for specific format styling to give that "Real File Icon" feel
const getFormatStyle = (ext: string) => {
    switch (ext) {
        case "PDF": return "bg-red-500/5 text-red-600 border-red-200/50 dark:border-red-500/20";
        case "DOC":
        case "DOCX": return "bg-blue-500/5 text-blue-600 border-blue-200/50 dark:border-blue-500/20";
        case "XLS":
        case "XLSX": return "bg-emerald-500/5 text-emerald-600 border-emerald-200/50 dark:border-emerald-500/20";
        case "PPT":
        case "PPTX": return "bg-orange-500/5 text-orange-600 border-orange-200/50 dark:border-orange-500/20";
        case "TXT": return "bg-slate-500/5 text-slate-600 border-slate-200/50 dark:border-slate-500/20";
        case "CSV": return "bg-teal-500/5 text-teal-600 border-teal-200/50 dark:border-teal-500/20";
        case "EPUB": return "bg-indigo-500/5 text-indigo-600 border-indigo-200/50 dark:border-indigo-500/20";
        default: return "bg-muted/50 text-muted-foreground border-border";
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
