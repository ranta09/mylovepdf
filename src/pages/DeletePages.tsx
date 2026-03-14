import { useState, useEffect, useRef, useCallback } from "react";
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
  ChevronRight
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
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

    toast.info("Page removed from preview");
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
    toast.success(`${deletedOnes.length} pages removed from preview`);
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
    toast.success(`${deletedOnes.length} pages removed by range`);
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

      // Auto download
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();

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
      metaTitle="Delete PDF Pages — Remove Pages Online Free"
      metaDescription="Delete multiple pages from your PDF document easily. Use our grid view to select and remove pages by range or individually."
      toolId="delete-pages"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload
              accept=".pdf"
              files={files}
              onFilesChange={handleFilesChange}
              label="Select PDF to remove pages"

            />
          </div>
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
          <div className="mt-4 mx-auto max-w-2xl w-full text-center space-y-6">
            <div className="bg-card border-2 border-green-500/20 shadow-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-500/10 rounded-3xl flex items-center justify-center border border-green-500/20 shadow-sm">
                  <CheckCircle2 className="h-8 sm:h-10 w-8 sm:w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">Pages Removed Successfully</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Your new PDF is ready for download.</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Original</p>
                  <p className="text-lg font-black text-foreground">{results.originalCount}</p>
                </div>
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Deleted</p>
                  <p className="text-lg font-black text-red-500">{results.deletedCount}</p>
                </div>
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Remaining</p>
                  <p className="text-lg font-black text-primary">{results.remainingCount}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 h-14 text-sm font-black uppercase tracking-widest shadow-glow" onClick={() => {
                const a = document.createElement('a');
                a.href = results.url;
                a.download = results.name;
                a.click();
              }}>
                <Download className="mr-2 h-5 w-5" /> Download PDF
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-sm font-black uppercase tracking-widest border-2" onClick={resetAll}>
                <RefreshCw className="mr-2 h-5 w-5" /> Delete More
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Looking for another tool? <Button variant="link" className="text-xs p-0 h-auto font-black uppercase tracking-widest" onClick={() => (window.location.href = "/")}>Browse Tools</Button></p>
          </div>
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
              {/* MOBILE TAB CONTROL */}
              <div className="xl:hidden bg-card border-b border-border p-2 flex gap-1 shadow-sm shrink-0">
                <button onClick={() => setActiveTab("configure")} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all", activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary")}>
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Manage Pages</span>
                </button>
                <button onClick={() => setActiveTab("options")} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all", activeTab === "options" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary")}>
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Controls</span>
                </button>
              </div>

              {/* LEFT PANEL: GRID */}
              <div className={cn("flex-1 bg-card border-r border-border flex flex-col overflow-hidden", activeTab !== "configure" && "hidden xl:flex")}>
                <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors -ml-1" onClick={resetAll} title="Go Back">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Document Pages</h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
                          {pages.length} Pages • {selectedPageIds.size} Selected
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-2 gap-2" onClick={() => fileInputRef.current?.click()}><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Add Files</span></Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-2" onClick={selectAll}>{selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}</Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-secondary/10 custom-scrollbar">
                  {loadingThumbnails && pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading Pages...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20 justify-items-center">
                      <AnimatePresence mode="popLayout">
                        {pages.map((page, idx) => (
                          <motion.div
                            key={page.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="relative group cursor-pointer w-full max-w-[240px]"
                            onClick={(e) => togglePageSelection(e, page.id)}
                          >
                            <div className={cn(
                              "relative aspect-[3/4.2] w-full bg-white border-2 rounded-2xl shadow-elevated transition-all duration-300 overflow-hidden ring-offset-2",
                              selectedPageIds.has(page.id) ? "border-primary ring-2 ring-primary shadow-glow bg-primary/5" : "border-border hover:border-primary/40"
                            )}>
                              {/* Actions Overlay */}
                              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="h-8 w-8 rounded-xl shadow-lg hover:scale-110 transition-transform"
                                  onClick={(e) => deleteSingle(e, page.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-white" />
                                </Button>
                              </div>

                              {/* Checkbox Overlay */}
                              <div className="absolute top-2 left-2 z-10">
                                {selectedPageIds.has(page.id) ? (
                                  <div className="bg-primary text-white rounded-lg p-1 animate-in zoom-in-50 duration-200 shadow-md">
                                    <CheckSquare className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <div className="bg-white/80 border border-border/80 rounded-lg p-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <Square className="h-4 w-4 text-muted-foreground/30" />
                                  </div>
                                )}
                              </div>

                              <div className="w-full h-full p-2 flex items-center justify-center bg-white/50">
                                <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="max-w-[85%] max-h-[85%] object-contain" />
                              </div>

                              <div className="absolute bottom-0 left-0 right-0 py-2 bg-secondary/90 backdrop-blur-sm border-t border-border flex items-center justify-center gap-1.5 font-black uppercase tracking-widest text-[10px]">
                                Page {idx + 1}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: ACTIONS */}
              <div className={cn("w-full xl:w-[380px] shrink-0 flex flex-col overflow-hidden", activeTab !== "options" && "hidden xl:flex")}>
                <div className="bg-card p-6 flex flex-col relative overflow-hidden flex-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />
                  <div className="mb-8 relative z-10 shrink-0">
                    <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      Delete Controls
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-4 uppercase tracking-widest leading-relaxed">Remove unwanted pages</p>
                  </div>

                  <ScrollArea className="flex-1 pr-2 -mr-2">
                    <div className="space-y-6 relative z-10 pb-6 pr-1">
                      {/* Bulk Selection Actions */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l-2 border-primary/40 pl-2">Selection Actions</h3>
                        <div className="space-y-2">
                          <Button
                            variant="destructive"
                            className="w-full h-12 rounded-xl justify-between shadow-sm group font-bold tracking-tight"
                            disabled={selectedPageIds.size === 0}
                            onClick={deleteSelected}
                          >
                            <span className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Delete Selected
                            </span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black">{selectedPageIds.size}</span>
                          </Button>
                        </div>
                      </div>

                      {/* Page Range Actions */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l-2 border-primary/40 pl-2">Range Deletion</h3>
                        <div className="space-y-3">
                          <div className="relative group">
                            <Input
                              placeholder="Example: 1-3, 5"
                              value={rangeInput}
                              onChange={(e) => setRangeInput(e.target.value)}
                              className="h-12 rounded-xl border-2 pl-10 font-bold focus:ring-red-500"
                            />
                            <LayoutGrid className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </div>
                          <Button variant="secondary" className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm" onClick={deleteByRange}>
                            Remove Range
                          </Button>
                        </div>
                      </div>

                      {/* History Actions */}
                      <div className="space-y-4 pt-4 border-t border-border border-dashed">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <RotateCcw className="h-3 w-3" />
                          Workspace Options
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          <Button variant="outline" className="h-11 rounded-xl justify-start gap-3 text-xs font-black uppercase tracking-widest border-2" disabled={history.length === 0} onClick={undoDelete}>
                            <Undo2 className="h-4 w-4 text-primary" />
                            Undo Last Delete
                          </Button>
                          <Button variant="outline" className="h-11 rounded-xl justify-start gap-3 text-xs font-black uppercase tracking-widest border-2" onClick={restoreAll}>
                            <RefreshCw className="h-4 w-4 text-primary" />
                            Restore All Pages
                          </Button>
                        </div>
                      </div>

                      <div className="pt-6">
                        <div className="bg-secondary/30 p-4 rounded-2xl space-y-3 border border-border/50">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-normal font-medium italic">High-Fidelity: Deleting pages is non-destructive to metadata and file quality.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-normal font-medium">Auto-Download: Changes are applied instantly upon confirmation.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="hidden xl:block shrink-0 pt-4 border-t border-border mt-auto">
                    <Button
                      size="lg"
                      className="w-full h-16 text-md font-black uppercase tracking-[0.2em] shadow-elevated rounded-[1.5rem] group relative overflow-hidden bg-primary"
                      onClick={applyChanges}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-transparent opacity-0 group-hover:opacity-20 transition-opacity" />
                      Apply Changes
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="xl:hidden shrink-0 pt-2 pb-6 px-4 mb-4 mt-auto border-t border-border bg-background">
                <Button size="lg" className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-glow rounded-2xl" onClick={applyChanges}>
                  Apply Changes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" multiple={false} accept=".pdf" onChange={(e) => {
        if (e.target.files?.length) handleFilesChange(Array.from(e.target.files));
      }} />
    </ToolLayout>
  );
};

export default DeletePages;
