import { useState, useEffect, useRef, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import DownloadScreen from "@/components/DownloadScreen";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Trash2,
  Loader2,
  Info,
  ShieldCheck,
  Download,
  CheckCircle2,
  Settings,
  X,
  Plus,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  FileBox,
  FileText,
  Zap,
  CheckSquare,
  Square,
  Undo2,
  RotateCcw,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  Merge,
  Minimize2,
  Scissors,
  Lock
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { parseRange } from "@/lib/parseRange";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PageData {
  id: string;
  originalIndex: number; // 0-indexed reference to original PDF
  thumbnail: string;
}

interface DeletionHistory {
  deletedPages: PageData[];
  type: "single" | "selected" | "range";
}

const DeletePages = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageData[]>([]); // Current visible pages
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<DeletionHistory[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [results, setResults] = useState<{
    url: string;
    name: string;
    originalCount: number;
    remainingCount: number;
    deletedCount: number;
    size: string;
  } | null>(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [activeTab, setActiveTab] = useState<"configure" | "options">("configure");
  const [deletionTargetTab, setDeletionTargetTab] = useState<"interactive" | "range">("interactive");
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFilesChange = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      resetAll();
      return;
    }

    const file = newFiles[0];
    setFiles([file]);
    setLoadingThumbnails(true);
    setPages([]);
    setSelectedPageIds(new Set());
    setHistory([]);
    setResults(null);
    setRangeInput("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      const newPageDatas: PageData[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        newPageDatas.push({
          id: generateId(),
          originalIndex: i - 1,
          thumbnail: canvas.toDataURL('image/jpeg', 0.8),
        });

        if (i % 8 === 0 || i === pageCount) {
          setPages([...newPageDatas]);
        }
      }
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error("Failed to load PDF. It might be corrupted or protected.");
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const togglePageSelection = (e: React.MouseEvent, pageId: string) => {
    const newSelection = new Set(selectedPageIds);
    const currentIndex = pages.findIndex(p => p.id === pageId);

    if (e.shiftKey && lastSelectedId) {
      const lastIndex = pages.findIndex(p => p.id === lastSelectedId);
      if (lastIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        for (let i = start; i <= end; i++) {
          newSelection.add(pages[i].id);
        }
      }
    } else {
      // Toggle logic instead of exclusive selection
      if (newSelection.has(pageId)) {
        newSelection.delete(pageId);
      } else {
        newSelection.add(pageId);
      }
    }

    setSelectedPageIds(newSelection);
    setLastSelectedId(pageId);
  };

  const selectAll = () => {
    if (selectedPageIds.size === pages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pages.map(p => p.id)));
    }
  };

  const deleteSingle = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    const pageToDelete = pages.find(p => p.id === pageId);
    if (!pageToDelete) return;

    if (pages.length <= 1) {
      toast.error("Document must have at least one page.");
      return;
    }

    setHistory(prev => [...prev, { deletedPages: [pageToDelete], type: "single" }]);
    setPages(prev => prev.filter(p => p.id !== pageId));

    const newSelection = new Set(selectedPageIds);
    newSelection.delete(pageId);
    setSelectedPageIds(newSelection);
  };

  const deleteSelected = () => {
    if (selectedPageIds.size === 0) {
      toast.error("Please select pages to delete.");
      return;
    }

    if (selectedPageIds.size >= pages.length) {
      toast.error("Cannot delete all pages. At least one must remain.");
      return;
    }

    const deletedOnes = pages.filter(p => selectedPageIds.has(p.id));
    setHistory(prev => [...prev, { deletedPages: deletedOnes, type: "selected" }]);
    setPages(prev => prev.filter(p => !selectedPageIds.has(p.id)));
    setSelectedPageIds(new Set());
  };

  const deleteByRange = () => {
    if (!rangeInput.trim()) {
      toast.error("Please enter a page range (e.g. 1-3, 5)");
      return;
    }

    // Since reordering isn't happening here, we can use the current grid indices
    const targetIndices = parseRange(rangeInput, pages.length).map(n => n - 1);
    if (targetIndices.length === 0) {
      toast.error("Invalid range format.");
      return;
    }

    if (targetIndices.length >= pages.length) {
      toast.error("Cannot delete all pages.");
      return;
    }

    const deletedOnes = pages.filter((_, idx) => targetIndices.includes(idx));
    setHistory(prev => [...prev, { deletedPages: deletedOnes, type: "range" }]);
    setPages(prev => prev.filter((_, idx) => !targetIndices.includes(idx)));
    setRangeInput("");
  };

  const undoDelete = () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    // Put them back. For simplicity, we'll append. For a pro tool we should restore positions.
    // However, since we keep 'originalIndex', the final generation will be correct regardless of grid position.
    // To make it look right for the user, we should sort by originalIndex.
    const newPages = [...pages, ...lastAction.deletedPages].sort((a, b) => a.originalIndex - b.originalIndex);

    setPages(newPages);
    setHistory(prev => prev.slice(0, -1));
    toast.info("Deletion undone");
  };

  const restoreAll = () => {
    handleFilesChange(files); // Easiest way to restore full state
    toast.success("All pages restored");
  };

  const applyChanges = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const file = files[0];
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      const pagesToKeep = pages.map(p => p.originalIndex);
      const newDoc = await PDFDocument.create();

      // Copy in chunks for progress reporting
      const chunkSize = 10;
      for (let i = 0; i < pagesToKeep.length; i += chunkSize) {
        const chunk = pagesToKeep.slice(i, i + chunkSize);
        const copiedPages = await newDoc.copyPages(doc, chunk);
        copiedPages.forEach(p => newDoc.addPage(p));
        setProgress(Math.round(((i + chunk.length) / pagesToKeep.length) * 100));
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const name = file.name.replace(/\.pdf$/i, "_edited.pdf");

      const result = {
        url,
        name,
        originalCount: doc.getPageCount(),
        remainingCount: pages.length,
        deletedCount: doc.getPageCount() - pages.length,
        size: (blob.size / (1024 * 1024)).toFixed(2) + " MB"
      };

      setResults(result);
      toast.success("PDF updated successfully!");
    } catch (err) {
      console.error("Save failed", err);
      toast.error("Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPages([]);
    setSelectedPageIds(new Set());
    setHistory([]);
    setResults(null);
    setProgress(0);
    setRangeInput("");
    setActiveTab("configure");
    setDeletionTargetTab("interactive");
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  return (
    <ToolLayout
      title="Delete PDF Pages"
      description="Remove specific pages from your document with professional accuracy"
      category="edit"
      icon={<Trash2 className="h-7 w-7" />}
      metaTitle="Delete PDF Pages | Remove Pages Online Free"
      metaDescription="Delete multiple pages from your PDF document easily. Use our grid view to select and remove pages by range or individually."
      toolId="delete-pages"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <ToolUploadScreen
            title="Delete PDF Pages"
            description="Remove specific pages from your document with professional accuracy"
            buttonLabel="Select PDF file"
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesChange}
          />
        ) : processing ? (
          <div className="mt-4 mx-auto max-w-2xl w-full rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-6 relative flex justify-center items-center h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <Trash2 className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Removing Pages...</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">Reconstructing your document</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span>Process Progress</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
                <motion.div
                  className="h-full bg-primary rounded-full shadow-glow"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : results ? (
          <DownloadScreen
            title="Pages deleted successfully!"
            downloadLabel="DOWNLOAD PDF"
            resultUrl={results.url}
            resultName={results.name}
            onReset={resetAll}
            recommendedTools={[
              { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
              { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
              { name: "Split PDF", path: "/split-pdf", icon: Scissors },
              { name: "Extract Pages", path: "/extract-pages", icon: FileText },
              { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
              { name: "Organize PDF", path: "/organize-pdf", icon: LayoutGrid },
            ]}
          />
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
              {/* MOBILE TAB CONTROL */}
              <div className="xl:hidden bg-card border-b border-border p-2 flex gap-1 shadow-sm shrink-0">
                <button
                  onClick={() => setActiveTab("configure")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Manage Pages</span>
                </button>
                <button
                  onClick={() => setActiveTab("options")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "options" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Controls</span>
                </button>
              </div>

              {/* SHARED CONTENT AREA */}
              <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
                
                {/* Tab 1: Manage Pages (Gallery) */}
                <div className={cn(
                  "flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative border-r border-border",
                  activeTab !== "configure" && "hidden xl:flex"
                )}>
                  {/* Background Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
                  
                  <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar relative z-10">
                    {loadingThumbnails && pages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Scanning Document...</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 sm:gap-8 justify-center items-start max-w-5xl mx-auto pb-20">
                        <AnimatePresence mode="popLayout">
                          {pages.map((page, idx) => {
                            const isSelected = selectedPageIds.has(page.id);

                            return (
                              <motion.div
                                key={page.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className={cn(
                                  "group relative bg-card border rounded-2xl shadow-sm w-[130px] sm:w-[155px] lg:w-[175px] overflow-hidden transition-all duration-300 flex-shrink-0 cursor-pointer",
                                  isSelected ? "border-primary shadow-glow ring-2 ring-primary/20 scale-[1.02] z-20" : "border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                                )}
                                onClick={(e) => togglePageSelection(e, page.id)}
                              >
                                {/* Selection Indicator */}
                                <div className="absolute top-2 left-2 z-20">
                                  {isSelected ? (
                                    <div className="bg-primary text-white rounded-md p-1 shadow-sm animate-success-pop">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </div>
                                  ) : (
                                    <div className="bg-white/90 text-muted-foreground/30 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50">
                                      <Square className="h-3.5 w-3.5" />
                                    </div>
                                  )}
                                </div>

                                {/* Quick Delete Button */}
                                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="bg-red-500 text-white rounded-md p-1 shadow-elevated hover:bg-red-600 hover:scale-110 transition-all"
                                    onClick={(e) => deleteSingle(e, page.id)}
                                    title="Delete this page"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Thumbnail Area */}
                                <div className="w-full aspect-[3/4.2] bg-secondary/10 flex items-center justify-center p-3 relative overflow-hidden">
                                  {page.thumbnail ? (
                                    <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="max-w-[95%] max-h-[95%] object-contain rounded shadow-sm group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                  ) : (
                                    <div className="flex flex-col items-center gap-1 opacity-20">
                                      <FileText className="h-8 w-8" />
                                      <div className="w-8 h-1 bg-current rounded-full animate-pulse" />
                                    </div>
                                  )}
                                  {isSelected && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
                                </div>

                                {/* Page Number Footer */}
                                <div className="p-2 bg-secondary/30 flex justify-center border-t border-border/50">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {idx + 1}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab 2: Controls Sidebar */}
                <div className={cn(
                  "w-full xl:w-[380px] shrink-0 flex flex-col min-h-0 bg-background overflow-hidden",
                  activeTab !== "options" && "hidden xl:flex"
                )}>
                  <div className="flex-1 flex flex-col min-h-0 p-6 relative">
                    <div className="mb-6 shrink-0">
                      <h2 className="text-xl sm:text-2xl font-black text-foreground text-center border-b border-border pb-4 tracking-tighter capitalize transition-all">Delete Pages</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 touch-pan-y">
                      <div className="space-y-8 pb-24">
                        {/* Main Category Tabs */}
                        <div className="flex bg-secondary/50 p-1 rounded-2xl relative z-10 border border-border/50">
                          <button 
                            onClick={() => setDeletionTargetTab("interactive")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                              deletionTargetTab === "interactive" 
                                ? "bg-background text-primary shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Interactive
                          </button>
                          <button 
                            onClick={() => setDeletionTargetTab("range")}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                              deletionTargetTab === "range" 
                                ? "bg-background text-primary shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            By Range
                          </button>
                        </div>

                        {/* Context-Aware Settings */}
                        <div className="pt-2">
                          <AnimatePresence mode="wait">
                            {deletionTargetTab === 'interactive' ? (
                              <motion.div 
                                key="interactive"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-8"
                              >
                                <div className="space-y-4">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Selection Tools</h3>
                                  <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={selectAll}>{selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}</Button>
                                    <Button variant="outline" className="h-10 px-4 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => setSelectedPageIds(new Set())} disabled={selectedPageIds.size === 0}>Clear</Button>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Actions</h3>
                                  <Button
                                    variant="destructive"
                                    className="w-full h-14 rounded-xl justify-between shadow-lg shadow-red-500/10 group font-black uppercase tracking-[0.1em] text-[11px]"
                                    disabled={selectedPageIds.size === 0}
                                    onClick={deleteSelected}
                                  >
                                    <span className="flex items-center gap-3">
                                      <Trash2 className="h-4 w-4" />
                                      Remove Selected
                                    </span>
                                    <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px]">{selectedPageIds.size}</span>
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter leading-relaxed italic opacity-70 px-1 text-center italic">Selected pages will be removed from the document.</p>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="range"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                              >
                                <div className="space-y-4">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Quick Range</h3>
                                  <div className="relative group">
                                    <Input value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} placeholder="Example: 1-3, 5" className="h-12 border-2 rounded-xl font-bold placeholder:font-medium placeholder:text-muted-foreground/40 pl-10 group-hover:border-primary/30 transition-colors" />
                                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                  </div>
                                </div>
                                <Button variant="secondary" className="w-full h-11 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border border-border/50 hover:bg-secondary/80 transition-all" onClick={deleteByRange}>
                                  Remove Pages In Range
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Workspace Options (History) */}
                        <div className="pt-4 border-t border-border border-dashed space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                            <RotateCcw className="h-3 w-3" />
                            Workspace History
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="h-10 rounded-xl gap-2 text-[9px] font-black uppercase tracking-widest border-2" disabled={history.length === 0} onClick={undoDelete}>
                              <Undo2 className="h-3.5 w-3.5" />
                              Undo
                            </Button>
                            <Button variant="outline" className="h-10 rounded-xl gap-2 text-[9px] font-black uppercase tracking-widest border-2" onClick={restoreAll}>
                              <RefreshCw className="h-3.5 w-3.5" />
                              Reset All
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Execution Button */}
                    <div className="hidden xl:block shrink-0 pt-6 border-t border-border bg-background">
                      <Button
                        size="lg"
                        className="w-full h-14 sm:h-16 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                        onClick={applyChanges}
                        disabled={pages.length === 0}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        Apply & Save
                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                          <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="xl:hidden shrink-0 pt-4 pb-6 px-4 bg-background border-t border-border">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                  onClick={applyChanges}
                  disabled={pages.length === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Apply & Save
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" multiple={false} accept=".pdf" onChange={(e) => {
        if (e.target.files?.length) handleFilesChange(Array.from(e.target.files));
      }} />
      {files.length === 0 && !results && !processing && (
        <ToolSeoSection
          toolName="Delete PDF Pages"
          category="edit"
          intro="MagicDocx Delete PDF Pages tool gives you a visual grid workspace to precisely remove unwanted pages from any PDF document. Click individual page thumbnails to mark them for deletion, use the range field to remove pages like '1-3, 5', select all and delete in bulk, or hover over a thumbnail to delete it instantly with one click. Undo the last deletion or restore all pages if you change your mind. Changes are applied client-side | your file never leaves your browser."
          steps={[
            "Upload your PDF using the file upload area.",
            "Click page thumbnails to select them, or type a range like '1-3, 5' in the Range Deletion field.",
            "Use 'Delete Selected' or 'Remove Range' to remove the chosen pages from the preview.",
            "Click 'Apply Changes' to create and download your new PDF with those pages removed."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Organize PDF", path: "/organize-pdf", icon: Trash2 },
            { name: "Extract Pages", path: "/extract-pages", icon: Trash2 },
            { name: "Split PDF", path: "/split-pdf", icon: Trash2 },
            { name: "Rotate PDF", path: "/rotate-pdf", icon: Trash2 },
          ]}
          schemaName="Delete PDF Pages Online"
          schemaDescription="Free online tool to delete specific pages from a PDF. Use a visual grid, click to select, range input, or instant hover deletion."
        />
      )}
    </ToolLayout>
  );
};

export default DeletePages;
