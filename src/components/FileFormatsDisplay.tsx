import {
    FileText, FileSpreadsheet, Presentation,
    Image as ImageIcon, FileType, FileCode, Book,
    Table2, Layout, FileImage, ShieldCheck
} from "lucide-react";
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
        colorClass: "bg-red-500/10 text-red-600 dark:text-red-400",
    },
    {
        label: "Images",
        extensions: ["PNG", "JPG", "JPEG", "WEBP", "TIFF", "BMP"],
        icon: ImageIcon,
        colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
];

const FileFormatsDisplay = ({
    acceptedExtensions
}: {
    acceptedExtensions: string[]
}) => {
    // Filter groups to only show extensions that are actually accepted by this tool instance
    const cleanAccepted = acceptedExtensions.map(ext => ext.replace(".", "").toUpperCase());

    const filteredGroups = formatGroups.map(group => ({
        ...group,
        extensions: group.extensions.filter(ext => cleanAccepted.includes(ext))
    })).filter(group => group.extensions.length > 0);

    if (filteredGroups.length === 0) return null;

    return (
        <div className="w-full mx-auto mt-4 px-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    Supported File Formats
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
                    {filteredGroups.flatMap(g => g.extensions).map((ext) => (
                        <div
                            key={ext}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition-all duration-200 cursor-default hover:brightness-95",
                                "bg-primary/5 text-primary border-primary/10 dark:bg-primary/10 dark:border-primary/20"
                            )}
                        >
                            {getSmallIcon(ext)}
                            {ext}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-2 flex justify-center">
                <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Secure & Local
                </div>
            </div>
        </div>
    );
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
