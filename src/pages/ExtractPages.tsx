import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
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
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Files,
  Archive
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

        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
      } else {
        // ZIP Mode
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

        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
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
      metaTitle="Extract PDF Pages — Pull Pages Online Free"
      metaDescription="Extract specific pages from PDF into a new file or individual PDFs. Professional workspace for visual page extraction."
      toolId="extract-pages"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload
              accept=".pdf"
              files={files}
              onFilesChange={handleFilesChange}
              label="Select PDF to extract pages"
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
          <div className="mt-4 mx-auto max-w-2xl w-full text-center space-y-6">
            <div className="bg-card border-2 border-green-500/20 shadow-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-500/10 rounded-3xl flex items-center justify-center border border-green-500/20 shadow-sm">
                  <CheckCircle2 className="h-8 sm:h-10 w-8 sm:w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">Pages Extracted Successfully</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Your extracted files are ready.</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3 text-center">
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Original Pages</p>
                  <p className="text-lg font-black text-foreground">{results.originalCount}</p>
                </div>
                <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Extracted</p>
                  <p className="text-lg font-black text-primary">{results.extractedCount}</p>
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
                <Download className="mr-2 h-5 w-5" />
                {results.mode === "merge" ? "Download Extracted PDF" : "Download All Files (ZIP)"}
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-sm font-black uppercase tracking-widest border-2" onClick={resetAll}>
                <RefreshCw className="mr-2 h-5 w-5" /> Extract Pages from Another PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
              {/* MOBILE TAB CONTROL */}
              <div className="xl:hidden bg-card border-b border-border p-2 flex gap-1 shadow-sm shrink-0">
                <button onClick={() => setActiveTab("configure")} className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all", activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary")}>
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Select Pages</span>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors -ml-1" onClick={resetAll}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Document Preview</h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
                          {pages.length} Pages • {selectedPageIds.size} Selected
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center bg-secondary/30 rounded-full px-2 py-1 gap-1 border border-border/50">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}>
                        <ZoomOut className="h-3 w-3" />
                      </Button>
                      <span className="text-[9px] font-black w-8 text-center">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setZoom(prev => Math.min(1.6, prev + 0.2))}>
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-2" onClick={selectAll}>
                      {selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-secondary/10 custom-scrollbar">
                  {loadingThumbnails && pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading Document...</p>
                    </div>
                  ) : (
                    <div
                      className="grid gap-6 pb-20 justify-items-center"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${200 * zoom}px, 1fr))`
                      }}
                    >
                      <AnimatePresence mode="popLayout">
                        {pages.map((page, idx) => (
                          <motion.div
                            key={page.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group cursor-pointer w-full max-w-[280px]"
                            onClick={(e) => togglePageSelection(e, page.id)}
                          >
                            <div className={cn(
                              "relative aspect-[3/4.2] w-full bg-white border-2 rounded-2xl shadow-elevated transition-all duration-300 overflow-hidden ring-offset-2",
                              selectedPageIds.has(page.id) ? "border-primary ring-2 ring-primary shadow-glow bg-primary/5" : "border-border hover:border-primary/40"
                            )}>
                              {/* Actions Overlay */}
                              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="h-8 w-8 rounded-xl shadow-lg hover:bg-primary hover:text-white transition-all"
                                  onClick={(e) => rotateSingle(e, page.id, 90)}
                                >
                                  <RotateCw className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Checkbox Overlay */}
                              <div className="absolute top-2 left-2 z-10">
                                {selectedPageIds.has(page.id) ? (
                                  <div className="bg-primary text-white rounded-lg p-1 shadow-md">
                                    <CheckSquare className="h-4 w-4" />
                                  </div>
                                ) : (
                                  <div className="bg-white/80 border border-border/80 rounded-lg p-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <Square className="h-4 w-4 text-muted-foreground/30" />
                                  </div>
                                )}
                              </div>

                              <div
                                className="w-full h-full p-2 flex items-center justify-center bg-white/50 transition-transform duration-500"
                                style={{ transform: `rotate(${page.rotation}deg)` }}
                              >
                                <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="max-w-[85%] max-h-[85%] object-contain" />
                              </div>

                              <div className="absolute bottom-0 left-0 right-0 py-2 bg-secondary/90 backdrop-blur-sm border-t border-border flex items-center justify-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Page {idx + 1}</span>
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
                  <div className="mb-8 relative z-10">
                    <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Extract Settings
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-4 uppercase tracking-widest leading-relaxed">Customize your output</p>
                  </div>

                  <ScrollArea className="flex-1 pr-2 -mr-2">
                    <div className="space-y-8 relative z-10 pb-6 pr-1">
                      {/* Range Input */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l-2 border-primary/40 pl-2">Pages to Extract</h3>
                        <div className="space-y-3">
                          <div className="relative group">
                            <Input
                              placeholder="e.g. 1-3, 5, 8"
                              value={rangeInput}
                              onChange={(e) => setRangeInput(e.target.value)}
                              className="h-12 rounded-xl border-2 pl-10 font-bold"
                            />
                            <LayoutGrid className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">Enter specific pages or ranges to auto-select.</p>
                        </div>
                      </div>

                      {/* Extraction Mode */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l-2 border-primary/40 pl-2">Extraction Mode</h3>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            onClick={() => setMode("merge")}
                            className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all group relative overflow-hidden",
                              mode === "merge" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-3 relative z-10">
                              <div className={cn("p-2 rounded-lg", mode === "merge" ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>
                                <Files className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-tight">Merge Extracted Pages</p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Single PDF document</p>
                              </div>
                            </div>
                            {mode === "merge" && <div className="absolute top-2 right-2"><Check className="h-3 w-3 text-primary" /></div>}
                          </button>

                          <button
                            onClick={() => setMode("zip")}
                            className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all group relative overflow-hidden",
                              mode === "zip" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-3 relative z-10">
                              <div className={cn("p-2 rounded-lg", mode === "zip" ? "bg-primary text-white" : "bg-secondary text-muted-foreground")}>
                                <Archive className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-tight">Extract as Separate PDFs</p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Download as ZIP archive</p>
                              </div>
                            </div>
                            {mode === "zip" && <div className="absolute top-2 right-2"><Check className="h-3 w-3 text-primary" /></div>}
                          </button>
                        </div>
                      </div>

                      {/* Bulk Tools */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-l-2 border-primary/40 pl-2">Selection Options</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="h-11 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-2" onClick={() => rotateSelected(90)}>
                            <RotateCw className="h-3.5 w-3.5" /> Rotate
                          </Button>
                          <Button variant="outline" className="h-11 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-2" onClick={() => setSelectedPageIds(new Set())}>
                            <X className="h-3.5 w-3.5" /> Clear
                          </Button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50 space-y-3">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">Extract Pages is non-destructive and maintains 100% of original data quality.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <Zap className="h-4 w-4 text-primary mt-0.5" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">High performance: Optimized for documents up to 500 pages.</p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="hidden xl:block shrink-0 pt-4 border-t border-border mt-auto">
                    <Button
                      size="lg"
                      className="w-full h-16 text-md font-black uppercase tracking-[0.2em] shadow-elevated rounded-[1.5rem] group relative bg-primary"
                      disabled={selectedPageIds.size === 0}
                      onClick={applyExtraction}
                    >
                      Extract Pages
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="xl:hidden shrink-0 pt-2 pb-6 px-4 mb-4 mt-auto border-t border-border bg-background">
                <Button size="lg" className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-glow rounded-2xl" disabled={selectedPageIds.size === 0} onClick={applyExtraction}>
                  Extract Pages
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

export default ExtractPages;
