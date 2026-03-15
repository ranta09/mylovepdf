import { useState, useEffect, useRef, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  RotateCw,
  RotateCcw,
  RefreshCw,
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
  Monitor,
  Layout,
  LayoutGrid,
  FileBox,
  FileText,
  Zap,
  ChevronRight,
  Eye,
  CheckSquare,
  Square
} from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PageData {
  id: string;
  originalIndex: number; // 0-indexed
  thumbnail: string;
  rotation: number; // 0, 90, 180, 270
}

const RotatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ url: string; name: string; size: string; pages: number } | null>(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [activeTab, setActiveTab] = useState<"configure" | "options">("configure");
  const [rangeInput, setRangeInput] = useState("");
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFilesChange = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    // Rotate PDF currently handles one source file for a focused workspace
    const file = newFiles[0];
    setFiles([file]);
    setLoadingThumbnails(true);
    setPages([]);
    setSelectedPageIds(new Set());
    setResults(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      const newPageDatas: PageData[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        // Better res for previews
        const viewport = page.getViewport({ scale: 1.2 });
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

        // Update incrementally for perceived speed if there are many pages
        if (i % 10 === 0 || i === pageCount) {
          setPages([...newPageDatas]);
        }
      }
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error("Failed to load PDF file. Please ensure it is not password protected.");
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const togglePageSelection = (pageId: string) => {
    const newSelection = new Set(selectedPageIds);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedPageIds(newSelection);
  };

  const selectAll = () => {
    if (selectedPageIds.size === pages.length) {
      setSelectedPageIds(new Set());
    } else {
      setSelectedPageIds(new Set(pages.map(p => p.id)));
    }
  };

  const rotateSingle = (pageId: string, deg: number) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    ));
  };

  const rotateSelected = (deg: number) => {
    if (selectedPageIds.size === 0) {
      toast.error("Please select pages to rotate.");
      return;
    }
    setPages(prev => prev.map(p =>
      selectedPageIds.has(p.id) ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    ));
    toast.success(`Rotated ${selectedPageIds.size} selected pages.`);
  };

  const rotateAll = (deg: number) => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + deg + 360) % 360 })));
    toast.success("Rotated all pages.");
  };

  const applyRangeRotation = (deg: number) => {
    if (!rangeInput.trim()) {
      toast.error("Please enter a page range (e.g., 1-3, 5).");
      return;
    }

    try {
      const targetIndices = new Set<number>();
      const parts = rangeInput.split(',').map(p => p.trim());

      parts.forEach(part => {
        if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              targetIndices.add(i - 1);
            }
          }
        } else {
          const num = Number(part);
          if (!isNaN(num)) targetIndices.add(num - 1);
        }
      });

      let rotatedCount = 0;
      setPages(prev => prev.map((p, idx) => {
        if (targetIndices.has(idx)) {
          rotatedCount++;
          return { ...p, rotation: (p.rotation + deg + 360) % 360 };
        }
        return p;
      }));

      if (rotatedCount > 0) {
        toast.success(`Rotated ${rotatedCount} pages in range.`);
      } else {
        toast.error("No valid pages found in the specified range.");
      }
    } catch (err) {
      toast.error("Invalid range format. Use like '1-3, 5'.");
    }
  };

  const applyRotation = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress(0);

    try {
      const file = files[0];
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pdfPages = doc.getPages();

      pages.forEach((pageData, idx) => {
        if (pageData.rotation !== 0) {
          const page = pdfPages[pageData.originalIndex];
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees(currentRotation + pageData.rotation));
        }
        setProgress(Math.round(((idx + 1) / pages.length) * 100));
      });

      const rotatedBytes = await doc.save();
      const blob = new Blob([rotatedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const result = {
        url,
        name: file.name.replace(/\.pdf$/i, "_rotated.pdf"),
        size: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
        pages: pages.length
      };

      setResults(result);

      // Auto-download
      const a = document.createElement('a');
      a.href = url;
      a.download = result.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("PDF rotated successfully!");
    } catch (err) {
      console.error("Rotation failed", err);
      toast.error("Failed to process PDF. Please try again.");
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
    setActiveTab("configure");
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  return (
    <ToolLayout
      title="Rotate PDF Online"
      description="Permanently rotate pages in your PDF document"
      category="edit"
      icon={<RotateCw className="h-7 w-7" />}
      metaTitle="Rotate PDF Online Free – Permanent Page Rotation | MagicDocx"
      metaDescription="Rotate PDF pages individually, in bulk, or by custom range online for free. Lossless rotation with select-all and custom range support. No sign-up needed."
      toolId="rotate"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload
              accept=".pdf"
              multiple={false}
              files={files}
              onFilesChange={handleFilesChange}
              label="Select PDF file to rotate"

            />
          </div>
        ) : processing ? (
          <div className="mt-4 mx-auto max-w-2xl w-full rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-6 relative flex justify-center items-center h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              </div>
              <RotateCw className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>

            <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Applying Rotation...</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">Updating document metadata</p>

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
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
            </div>
          </div>
        ) : results ? (
          <div className="mt-4 mx-auto max-w-2xl w-full text-center space-y-6">
            <div className="bg-card border-2 border-green-500/20 shadow-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-500/10 rounded-3xl flex items-center justify-center border border-green-500/20 shadow-sm">
                  <CheckCircle2 className="h-8 sm:h-10 w-8 sm:w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">PDF Rotated Successfully!</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Your document structure has been updated.</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pages Rotated</p>
                  <p className="text-lg sm:text-xl font-black text-primary">{results.pages}</p>
                </div>
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">File Size</p>
                  <p className="text-lg sm:text-xl font-black text-primary">{results.size}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 h-14 text-sm font-black uppercase tracking-widest shadow-glow" onClick={() => {
                const a = document.createElement('a');
                a.href = results.url;
                a.download = results.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}>
                <Download className="mr-2 h-5 w-5" /> Download PDF
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-sm font-black uppercase tracking-widest border-2" onClick={resetAll}>
                <RefreshCw className="mr-2 h-5 w-5" /> Rotate Another
              </Button>
            </div>
          </div>
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
              {/* MOBILE TAB CONTROL */}
              <div className="xl:hidden bg-card border-b border-border p-2 flex gap-1 shadow-sm shrink-0">
                <button
                  onClick={() => setActiveTab("configure")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Manage Pages</span>
                </button>
                <button
                  onClick={() => setActiveTab("options")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "options" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Controls</span>
                </button>
              </div>

              {/* LEFT PANEL: PAGE GALLERY */}
              <div className={cn(
                "flex-1 bg-card border-r border-border flex flex-col overflow-hidden",
                activeTab !== "configure" && "hidden xl:flex"
              )}>
                <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors -ml-1"
                      onClick={resetAll}
                      title="Go Back"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Document Gallery</h2>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
                          {pages.length} Pages • {selectedPageIds.size} Selected
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase tracking-widest border-2 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Upload Another</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase tracking-widest border-2"
                      onClick={selectAll}
                    >
                      {selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-secondary/10 custom-scrollbar">
                  {loadingThumbnails && pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-xs font-bold uppercase tracking-widest">Loading Previews...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-6 pb-20 justify-items-center">
                      {pages.map((page, idx) => (
                        <div key={page.id} className="relative group flex flex-col items-center w-full max-w-[240px]">
                          <div
                            className={cn(
                              "relative aspect-[3/4.2] w-full bg-white border-2 rounded-2xl shadow-elevated transition-all duration-300 overflow-hidden group cursor-pointer",
                              selectedPageIds.has(page.id) ? "border-primary shadow-glow ring-2 ring-primary/10" : "border-border hover:border-primary/40"
                            )}
                            onClick={() => togglePageSelection(page.id)}
                          >
                            {/* Selection Checkbox */}
                            <div className="absolute top-2 left-2 z-20">
                              {selectedPageIds.has(page.id) ? (
                                <div className="bg-primary text-white rounded-md p-0.5 shadow-sm">
                                  <CheckSquare className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="bg-white/90 text-muted-foreground/30 rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50">
                                  <Square className="h-4 w-4" />
                                </div>
                              )}
                            </div>

                            {/* Individual Rotate Controls */}
                            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); rotateSingle(page.id, -90); }}
                                className="p-1.5 bg-primary text-white rounded-lg hover:scale-110 transition-transform shadow-elevated"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); rotateSingle(page.id, 90); }}
                                className="p-1.5 bg-primary text-white rounded-lg hover:scale-110 transition-transform shadow-elevated"
                              >
                                <RotateCw className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Page Thumbnail with Rotation */}
                            <div
                              className="w-full h-full flex items-center justify-center p-3 transition-transform duration-500 ease-out"
                              style={{ transform: `rotate(${page.rotation}deg)` }}
                            >
                              <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="max-w-[90%] max-h-[90%] object-contain" />
                            </div>

                            {/* Page Number Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 py-1.5 bg-secondary/80 backdrop-blur-sm text-center border-t border-border">
                              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Page {idx + 1}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: CONTROL CENTER */}
              <div className={cn(
                "w-full xl:w-[400px] shrink-0 flex flex-col overflow-hidden",
                activeTab !== "options" && "hidden xl:flex"
              )}>
                <div className="bg-card p-6 flex flex-col relative overflow-hidden flex-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

                  <div className="mb-8 relative z-10 shrink-0">
                    <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                      Rotation Controls
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-3.5 uppercase tracking-widest leading-relaxed">Modify your PDF orientation</p>
                  </div>

                  <ScrollArea className="flex-1 pr-2 -mr-2">
                    <div className="space-y-6 relative z-10 pb-6 pr-1">
                      {/* Bulk Rotation Section */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Bulk Actions</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" className="flex-col h-20 border-2 rounded-2xl gap-2 hover:bg-primary/5 hover:border-primary/40 group" onClick={() => rotateAll(-90)}>
                            <RotateCcw className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Left -90°</span>
                          </Button>
                          <Button variant="outline" className="flex-col h-20 border-2 rounded-2xl gap-2 hover:bg-primary/5 hover:border-primary/40 group" onClick={() => rotateAll(90)}>
                            <RotateCw className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Right +90°</span>
                          </Button>
                          <Button variant="outline" className="flex-col h-20 border-2 rounded-2xl gap-2 hover:bg-primary/5 hover:border-primary/40 group" onClick={() => rotateAll(180)}>
                            <RefreshCw className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Flip 180°</span>
                          </Button>
                        </div>
                      </div>

                      {/* Selected Pages Actions */}
                      <AnimatePresence>
                        {selectedPageIds.size > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-2"
                          >
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-primary px-1 border-l-2 border-primary ml-1 flex justify-between">
                              <span>Selected ({selectedPageIds.size})</span>
                              <button onClick={() => setSelectedPageIds(new Set())} className="text-[8px] hover:underline underline-offset-2 uppercase font-black">Clear Selection</button>
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="outline" className="h-12 border-2 rounded-xl gap-2 hover:bg-primary/10 hover:border-primary transition-all text-[10px] font-black uppercase tracking-widest" onClick={() => rotateSelected(-90)}>
                                Rotate Left
                              </Button>
                              <Button variant="outline" className="h-12 border-2 rounded-xl gap-2 hover:bg-primary/10 hover:border-primary transition-all text-[10px] font-black uppercase tracking-widest" onClick={() => rotateSelected(90)}>
                                Rotate Right
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Range Rotation */}
                      <div className="space-y-4 pt-2">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Range Rotation</h3>
                        <div className="space-y-3">
                          <div className="relative group">
                            <Input
                              value={rangeInput}
                              onChange={(e) => setRangeInput(e.target.value)}
                              placeholder="Example: 1-3, 5"
                              className="h-12 border-2 rounded-xl font-bold placeholder:font-medium placeholder:text-muted-foreground/40 pl-10 group-hover:border-primary/30 transition-colors"
                            />
                            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="secondary"
                              className="text-[10px] font-black uppercase tracking-widest h-11 rounded-xl border border-border"
                              onClick={() => applyRangeRotation(90)}
                            >
                              Rotate +90°
                            </Button>
                            <Button
                              variant="secondary"
                              className="text-[10px] font-black uppercase tracking-widest h-11 rounded-xl border border-border"
                              onClick={() => applyRangeRotation(-90)}
                            >
                              Rotate -90°
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-border border-dashed">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-1">Tool Information</h3>
                        <div className="bg-secondary/30 p-4 rounded-2xl space-y-3 border border-border/50">
                          <div className="flex items-start gap-3">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-normal font-medium">Safe & Lossless: We only change the metadata orientation. Your PDF quality remains 100% intact.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] text-muted-foreground leading-normal font-medium">Instant Processing: Changes are applied locally and immediately available.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Primary Action Button */}
                  <div className="hidden xl:block shrink-0 pt-4 border-t border-border mt-auto">
                    <Button
                      size="lg"
                      className="w-full h-16 text-md font-black uppercase tracking-[0.2em] shadow-elevated rounded-[2rem] group relative overflow-hidden"
                      onClick={applyRotation}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      Apply Rotation
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="xl:hidden shrink-0 pt-2 pb-6 px-4 mb-4 mt-auto border-t border-border bg-background">
                <Button
                  size="lg"
                  className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-glow rounded-2xl"
                  onClick={applyRotation}
                >
                  Apply Rotation
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple={false}
        accept=".pdf"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesChange(Array.from(e.target.files));
          }
        }}
      />
      <ToolSeoSection
        toolName="Rotate PDF Online"
        category="edit"
        intro="MagicDocx Rotate PDF tool permanently rotates pages in your PDF without any loss of quality. Select specific pages by clicking, choose a range like '1-3, 5', or rotate the entire document at once. Individually rotate pages using the hover buttons, or use the bulk rotation controls to apply 90°, 180°, or -90° to all selected pages. Your PDF is processed locally — files never leave your device."
        steps={[
          "Upload your PDF file using the file upload area.",
          "Click on page thumbnails to select pages, or use 'Select All' for bulk rotation.",
          "Use the rotation controls on the right: rotate left (-90°), right (+90°), or flip (180°).",
          "Click 'Apply Rotation' to download your permanently rotated PDF."
        ]}
        formats={["PDF"]}
        relatedTools={[
          { name: "Organize PDF", path: "/organize-pdf", icon: RotateCw },
          { name: "Edit PDF", path: "/edit-pdf", icon: RotateCw },
          { name: "Compress PDF", path: "/compress-pdf", icon: RotateCw },
          { name: "Merge PDF", path: "/merge-pdf", icon: RotateCw },
        ]}
        schemaName="Rotate PDF Online"
        schemaDescription="Free online PDF page rotation. Permanently rotate PDF pages individually, in bulk, or by custom range without quality loss."
      />
    </ToolLayout>
  );
};

export default RotatePdf;
