import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, Search } from "lucide-react";
import { tools, aiTools, categoryColors } from "@/lib/tools";
import { getRecommendedTools } from "@/lib/fileDetection";

const allTools = [...aiTools, ...tools];

interface SmartSuggestionsProps {
    files: File[];
    onSelect: (path: string) => void;
    onClose: () => void;
    onRemoveFile: (index: number) => void;
}

const SmartSuggestions = ({ files, onSelect, onClose, onRemoveFile }: SmartSuggestionsProps) => {
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const suggestedGroups = useMemo(() => {
        return getRecommendedTools(files);
    }, [files]);

    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return suggestedGroups;

        const lowerQuery = searchQuery.toLowerCase();

        // Either filter within the discovered groups, or search ALL tools if they type something
        const matchingAllTools = allTools.filter(t =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery)
        );

        if (matchingAllTools.length > 0) {
            return [{ category: "Search Results", tools: matchingAllTools }];
        }

        return [];
    }, [searchQuery, suggestedGroups]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(8px)", background: "hsl(220 25% 9% / 0.65)" }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, y: 24, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 12, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-foreground"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* File info */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {files.length === 1 ? "File detected" : `${files.length} Files detected`}
                        </p>
                    </div>

                    <div className="max-h-[140px] overflow-y-auto rounded-xl border border-border bg-secondary/20 p-2 space-y-2 pr-2 custom-scrollbar">
                        {files.map((file, idx) => {
                            const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
                            return (
                                <div key={idx} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm group">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                                        <span className="text-[10px] font-bold uppercase text-primary">{fileExt || "?"}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                    </div>
                                    <button
                                        onClick={() => onRemoveFile(idx)}
                                        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search for a tool..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary/50 focus:bg-background"
                    />
                </div>

                {/* Suggestions */}
                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto px-1 custom-scrollbar pb-2">
                    {filteredGroups.length > 0 ? (
                        filteredGroups.map((group, groupIdx) => (
                            <div key={group.category} className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                                    {group.category}
                                </p>
                                <div className="flex flex-col gap-2">
                                    {group.tools.map((tool, i) => {
                                        const Icon = tool.icon;
                                        return (
                                            <motion.button
                                                key={tool.id}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: (groupIdx * 0.1) + (i * 0.04) }}
                                                onClick={() => onSelect(tool.path)}
                                                className="group flex w-full items-center gap-4 rounded-xl border border-border bg-background px-4 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                                            >
                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground ${categoryColors[tool.category]}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground">{tool.name}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{tool.description}</p>
                                                </div>
                                                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {searchQuery ? "No tools found matching your search." : "No direct tool found for this file. Try searching above."}
                        </p>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    Or{" "}
                    <button
                        className="font-medium text-primary underline-offset-2 hover:underline"
                        onClick={() => {
                            onClose();
                            if (window.location.pathname === "/") {
                                document.getElementById("search-tools")?.scrollIntoView({ behavior: "smooth" });
                            } else {
                                navigate("/");
                                setTimeout(() => {
                                    document.getElementById("search-tools")?.scrollIntoView({ behavior: "smooth" });
                                }, 100);
                            }
                        }}
                    >
                        browse all tools
                    </button>
                </p>
            </motion.div>
        </motion.div>
    );
};

export default SmartSuggestions;
