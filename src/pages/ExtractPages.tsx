import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import DownloadScreen from "@/components/DownloadScreen";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  FileDown,
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
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Files,
  Archive,
  Merge,
  Minimize2,
  Scissors,
  Lock,
  Trash2
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
  originalIndex: number; // 0-indexed
  thumbnail: string;
  rotation: number;
}

type ExtractionMode = "merge" | "zip";

const ExtractPages = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [mode, setMode] = useState<ExtractionMode>("merge");
  const [zoom, setZoom] = useState(1);
  const [results, setResults] = useState<{
    url: string;
    zipUrl?: string;
    name: string;
    originalCount: number;
    extractedCount: number;
    mode: ExtractionMode;
    size: string;
  } | null>(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [activeTab, setActiveTab] = useState<"configure" | "options">("configure");
  const [extractionTargetTab, setExtractionTargetTab] = useState<"interactive" | "range">("interactive");
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
    setResults(null);
    setRangeInput("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      const newPageDatas: PageData[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        newPageDatas.push({
          id: generateId(),
          originalIndex: i - 1,
          thumbnail: canvas.toDataURL('image/jpeg', 0.8),
          rotation: 0
        });

        if (i % 8 === 0 || i === pageCount) {
          setPages([...newPageDatas]);
        }
      }
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error("Failed to load PDF. Ensure it is not protected.");
    } finally {
      setLoadingThumbnails(false);
    }
  };

  // Sync range input with selection
  useEffect(() => {
    if (!rangeInput.trim()) return;
    const requested = parseRange(rangeInput, pages.length);
    const newSelection = new Set<string>();
    requested.forEach(idx => {
      const p = pages[idx - 1];
      if (p) newSelection.add(p.id);
    });
    setSelectedPageIds(newSelection);
  }, [rangeInput, pages.length]);

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
      if (newSelection.has(pageId)) newSelection.delete(pageId);
      else newSelection.add(pageId);
    }

    setSelectedPageIds(newSelection);
    setLastSelectedId(pageId);

    // Update range input to reflect selection (concisely)
    // For now we'll just keep it manual or auto-populate if user wants
  };

  const selectAll = () => {
    if (selectedPageIds.size === pages.length) setSelectedPageIds(new Set());
    else setSelectedPageIds(new Set(pages.map(p => p.id)));
  };

  const rotateSingle = (e: React.MouseEvent, pageId: string, deg: number) => {
    e.stopPropagation();
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    ));
  };

  const rotateSelected = (deg: number) => {
    if (selectedPageIds.size === 0) return;
    setPages(prev => prev.map(p =>
      selectedPageIds.has(p.id) ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    ));
    toast.info(`Rotated ${selectedPageIds.size} pages`);
  };

  const applyExtraction = async () => {
    if (files.length === 0 || selectedPageIds.size === 0) {
      toast.error("Please select pages to extract.");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const file = files[0];
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      const selectedPages = pages
        .filter(p => selectedPageIds.has(p.id))
        .sort((a, b) => a.originalIndex - b.originalIndex); // Maintain original order unless we add reordering

      if (mode === "merge") {
        const newDoc = await PDFDocument.create();
        for (let i = 0; i < selectedPages.length; i++) {
          const pData = selectedPages[i];
          const [copiedPage] = await newDoc.copyPages(doc, [pData.originalIndex]);

          // Apply rotation if any
          if (pData.rotation !== 0) {
            const currentRot = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRot + pData.rotation));
          }

          newDoc.addPage(copiedPage);
          setProgress(Math.round(((i + 1) / selectedPages.length) * 100));
        }

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const name = file.name.replace(/\.pdf$/i, "_extracted.pdf");

        setResults({
          url,
          name,
          originalCount: pages.length,
          extractedCount: selectedPages.length,
          mode: "merge",
          size: (blob.size / (1024 * 1024)).toFixed(2) + " MB"
        });
      } else {
        // ZIP Mode
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (let i = 0; i < selectedPages.length; i++) {
          const pData = selectedPages[i];
          const pageDoc = await PDFDocument.create();
          const [copiedPage] = await pageDoc.copyPages(doc, [pData.originalIndex]);

          if (pData.rotation !== 0) {
            const currentRot = copiedPage.getRotation().angle;
            copiedPage.setRotation(degrees(currentRot + pData.rotation));
          }

          pageDoc.addPage(copiedPage);
          const pageBytes = await pageDoc.save();
          zip.file(`page_${pData.originalIndex + 1}.pdf`, pageBytes);
          setProgress(Math.round(((i + 1) / selectedPages.length) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const name = file.name.replace(/\.pdf$/i, "_extracted_pages.zip");

        setResults({
          url,
          zipUrl: url,
          name,
          originalCount: pages.length,
          extractedCount: selectedPages.length,
          mode: "zip",
          size: (zipBlob.size / (1024 * 1024)).toFixed(2) + " MB"
        });
      }

      toast.success("Extraction complete!");
    } catch (err) {
      console.error("Extraction failed", err);
      toast.error("Failed to extract pages.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPages([]);
    setSelectedPageIds(new Set());
    setResults(null);
    setProgress(0);
    setRangeInput("");
    setZoom(1);
    setActiveTab("configure");
    setExtractionTargetTab("interactive");
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  return (
    <ToolLayout
      title="Extract PDF Pages"
      description="Pull specific pages into a new document or separate files with professional precision"
      category="edit"
      icon={<FileDown className="h-7 w-7" />}
      metaTitle="Extract PDF Pages | Pull Pages Online Free"
      metaDescription="Extract specific pages from PDF into a new file or individual PDFs. Professional workspace for visual page extraction."
      toolId="extract-pages"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <ToolUploadScreen
            title="Extract PDF Pages"
            description="Pull specific pages into a new document or separate files"
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
              <FileDown className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Extracting Pages...</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">Processing your document for clean extraction</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span>Progress</span>
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
            title="Pages extracted successfully!"
            downloadLabel={results.mode === "merge" ? "DOWNLOAD EXTRACTED PDF" : "DOWNLOAD ALL FILES (ZIP)"}
            resultUrl={results.url}
            resultName={results.name}
            onReset={resetAll}
            recommendedTools={[
              { name: "Delete Pages", path: "/delete-pages", icon: Trash2 },
              { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
              { name: "Split PDF", path: "/split-pdf", icon: Scissors },
              { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
              { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
              { name: "Organize PDF", path: "/organize-pdf", icon: LayoutGrid },
            ]}
          />
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
              {/* MOBILE TAB CONTROL */}
              <div className="lg:hidden bg-card border-b border-border p-2 flex gap-1 shadow-sm shrink-0">
                <button
                  onClick={() => setActiveTab("configure")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Select Pages</span>
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
                  activeTab !== "configure" && "hidden lg:flex"
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 xxl:grid-cols-4 gap-4 sm:gap-6 justify-center items-start max-w-7xl mx-auto pb-20">
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
                                  "group relative bg-card border rounded-2xl shadow-sm w-full overflow-hidden transition-all duration-300 cursor-pointer",
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

                                {/* Quick Rotate Button */}
                                <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="bg-secondary text-primary rounded-md p-1 shadow-elevated hover:bg-primary hover:text-primary-foreground hover:scale-110 transition-all"
                                    onClick={(e) => rotateSingle(e, page.id, 90)}
                                    title="Rotate page"
                                  >
                                    <RotateCw className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Thumbnail Area */}
                                <div className="w-full aspect-[3/4.2] bg-secondary/10 flex items-center justify-center p-3 relative overflow-hidden">
                                  {page.thumbnail ? (
                                    <img 
                                      src={page.thumbnail} 
                                      alt={`Page ${idx + 1}`} 
                                      className="max-w-[95%] max-h-[95%] object-contain rounded shadow-sm group-hover:scale-105 transition-transform duration-500" 
                                      style={{ transform: `rotate(${page.rotation}deg)` }}
                                      loading="lazy" 
                                    />
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
                  "w-full lg:w-[350px] xl:w-[380px] shrink-0 flex flex-col min-h-0 bg-background overflow-hidden",
                  activeTab !== "options" && "hidden lg:flex"
                )}>
                  <div className="flex-1 flex flex-col min-h-0 p-6 relative">
                    <div className="mb-6 shrink-0">
                      <h2 className="text-xl sm:text-2xl font-black text-foreground text-center border-b border-border pb-4 tracking-tighter capitalize transition-all">Extract Settings</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 touch-pan-y">
                      <div className="space-y-8 pb-20">
                        {/* Main Category Tabs */}
                        <div className="flex bg-secondary/50 p-1 rounded-2xl relative z-10 border border-border/50">
                          <button 
                            onClick={() => setExtractionTargetTab("interactive")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                                extractionTargetTab === "interactive" 
                                  ? "bg-background text-primary shadow-sm" 
                                  : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Interactive
                          </button>
                          <button 
                            onClick={() => setExtractionTargetTab("range")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                                extractionTargetTab === "range" 
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
                            {extractionTargetTab === 'interactive' ? (
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
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Extraction Mode */}
                        <div className="pt-6 border-t border-border border-dashed space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l-2 border-primary/50 ml-1 px-1">Extraction Mode</h3>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={() => setMode("merge")}
                              className={cn(
                                "p-4 rounded-xl border-2 text-left transition-all group relative overflow-hidden",
                                mode === "merge" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                              )}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                <div className={cn("p-2 rounded-lg transition-colors", mode === "merge" ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>
                                  <Files className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-tight">Merge Extracted Pages</p>
                                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Single PDF document</p>
                                </div>
                              </div>
                              {mode === "merge" && <div className="absolute top-2 right-2"><CheckCircle2 className="h-3 w-3 text-primary animate-success-pop" /></div>}
                            </button>

                            <button
                              onClick={() => setMode("zip")}
                              className={cn(
                                "p-4 rounded-xl border-2 text-left transition-all group relative overflow-hidden",
                                mode === "zip" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                              )}
                            >
                              <div className="flex items-center gap-3 relative z-10">
                                <div className={cn("p-2 rounded-lg transition-colors", mode === "zip" ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>
                                  <Archive className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-tight">Extract Separate PDFs</p>
                                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Download as ZIP archive</p>
                                </div>
                              </div>
                              {mode === "zip" && <div className="absolute top-2 right-2"><CheckCircle2 className="h-3 w-3 text-primary animate-success-pop" /></div>}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Execution Button */}
                    <div className="hidden lg:block shrink-0 pt-6 border-t border-border bg-background">
                      <Button
                        size="lg"
                        className="w-full h-14 sm:h-16 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                        onClick={applyExtraction}
                        disabled={selectedPageIds.size === 0}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        Extract Pages
                        <div className="bg-white/20 h-6 w-6 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="lg:hidden shrink-0 pt-4 pb-6 px-4 bg-background border-t border-border">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                  onClick={applyExtraction}
                  disabled={selectedPageIds.size === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Extract Pages
                  <div className="bg-white/20 h-6 w-6 rounded-full flex items-center justify-center">
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
          toolName="Extract PDF Pages"
          category="edit"
          intro="MagicDocx Extract PDF Pages lets you pull specific pages from any PDF document and save them as a new PDF or as individual files packaged in a ZIP archive. Use the visual grid to click-select pages, type a range like '1-3, 5', or use Select All. You can also rotate pages before extracting. All processing happens entirely in your browser | no uploads, no servers, no data retention."
          steps={[
            "Upload your PDF using the drag-and-drop area.",
            "Click thumbnails to select pages, or type a range (e.g. '1-3, 5') to auto-select.",
            "Choose your output mode: merge extracted pages into one PDF, or get each page as a separate PDF in a ZIP.",
            "Click 'Extract Pages' to download your extracted document(s)."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Delete Pages", path: "/delete-pages", icon: FileDown },
            { name: "Split PDF", path: "/split-pdf", icon: FileDown },
            { name: "Organize PDF", path: "/organize-pdf", icon: FileDown },
            { name: "Merge PDF", path: "/merge-pdf", icon: FileDown },
          ]}
          schemaName="Extract PDF Pages Online"
          schemaDescription="Free online tool to extract specific pages from a PDF. Download as a merged PDF or individual pages in a ZIP archive."
        />
      )}
    </ToolLayout>
  );
};

export default ExtractPages;
