import { useState, useEffect, useRef, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import DownloadScreen from "@/components/DownloadScreen";
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
  Square,
  Merge,
  Minimize2,
  Scissors,
  Lock
} from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
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
  const [rotationTargetTab, setRotationTargetTab] = useState<"interactive" | "range">("interactive");
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
  };

  const rotateAll = (deg: number) => {
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + deg + 360) % 360 })));
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
          <ToolUploadScreen
            title="Rotate PDF"
            description="Permanently rotate pages in your PDF document"
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
          <DownloadScreen
            title="PDF has been rotated!"
            downloadLabel="DOWNLOAD ROTATED PDF"
            resultUrl={results.url}
            resultName={results.name}
            onReset={resetAll}
            recommendedTools={[
              { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
              { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
              { name: "Split PDF", path: "/split-pdf", icon: Scissors },
              { name: "Add Page Numbers", path: "/page-numbers", icon: FileText },
              { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
              { name: "Organize PDF", path: "/organize-pdf", icon: LayoutGrid },
            ]}
          />
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden select-none">
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
                {/* DESKTOP SIDE-BY-SIDE */}
                <div className="hidden xl:flex flex-1 gap-0 h-full overflow-hidden">
                  {/* Left Panel: Gallery */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative border-r border-border">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
                    <div className="flex-1 overflow-y-auto min-h-0 p-8 custom-scrollbar relative z-10">
                      <div className="flex flex-wrap gap-8 justify-center items-start max-w-5xl mx-auto pb-20">
                        {pages.map((page, idx) => (
                          <div
                            key={page.id}
                            className={cn(
                              "group relative bg-card border rounded-2xl shadow-sm w-[130px] sm:w-[155px] lg:w-[175px] overflow-hidden transition-all duration-300 flex-shrink-0 cursor-pointer",
                              selectedPageIds.has(page.id) ? "border-primary shadow-glow ring-2 ring-primary/20 scale-[1.02] z-20" : "border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                            )}
                            onClick={() => togglePageSelection(page.id)}
                          >
                            <div className="absolute top-2 left-2 z-20">
                              {selectedPageIds.has(page.id) ? (
                                <div className="bg-primary text-white rounded-md p-1 shadow-sm">
                                  <CheckSquare className="h-3.5 w-3.5" />
                                </div>
                              ) : (
                                <div className="bg-white/90 text-muted-foreground/30 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50">
                                  <Square className="h-3.5 w-3.5" />
                                </div>
                              )}
                            </div>
                            <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); rotateSingle(page.id, -90); }} className="p-1.5 bg-primary text-white rounded-lg hover:scale-110 transition-transform shadow-elevated">
                                <RotateCcw className="h-3 w-3" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); rotateSingle(page.id, 90); }} className="p-1.5 bg-primary text-white rounded-lg hover:scale-110 transition-transform shadow-elevated">
                                <RotateCw className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="w-full aspect-[3/4.2] bg-secondary/10 flex items-center justify-center p-3 relative overflow-hidden transition-transform duration-500 ease-out" style={{ transform: `rotate(${page.rotation}deg)` }}>
                              <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="max-w-[95%] max-h-[95%] object-contain rounded shadow-sm group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            </div>
                            <div className="p-2 bg-secondary/30 flex justify-center border-t border-border/50">
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {idx + 1}</span>
                            </div>
                          </div>
                        ))}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current?.click()} className="w-[130px] sm:w-[155px] lg:w-[175px] aspect-[3/4.2] border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                            <Plus className="h-5 w-5" />
                          </div>
                          <div className="text-center px-2">
                            <p className="text-[9px] font-black uppercase tracking-widest">Upload</p>
                            <p className="text-[8px] font-bold uppercase opacity-50">Another PDF</p>
                          </div>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: Controls */}
                  <div className="w-[380px] shrink-0 flex flex-col min-h-0 bg-background overflow-hidden">
                    <div className="p-6 flex flex-col relative h-full">
                      <div className="mb-6 shrink-0">
                        <h2 className="text-xl sm:text-2xl font-black text-foreground text-center border-b border-border pb-4 tracking-tighter">Rotate PDF</h2>
                      </div>
                      <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-8 pb-10">
                          {/* Targeting Tabs */}
                          <div className="flex bg-secondary/50 p-1 rounded-2xl relative z-10 border border-border/50">
                            <button 
                              onClick={() => setRotationTargetTab("interactive")}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                                rotationTargetTab === "interactive" 
                                  ? "bg-background text-primary shadow-sm" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              Interactive
                            </button>
                            <button 
                              onClick={() => setRotationTargetTab("range")}
                              className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                                rotationTargetTab === "range" 
                                  ? "bg-background text-primary shadow-sm" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              By Range
                            </button>
                          </div>

                          {/* Unified Rotation Controls */}
                          <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Rotation Controls</h3>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Left', icon: RotateCcw, deg: -90 },
                                { label: 'Right', icon: RotateCw, deg: 90 },
                                { label: 'Flip', icon: RefreshCw, deg: 180 }
                              ].map((btn) => (
                                <Button 
                                  key={btn.label}
                                  variant="outline" 
                                  className="flex-col h-20 border-2 rounded-2xl gap-2 hover:bg-primary/5 hover:border-primary/40 hover:text-primary group transition-all"
                                  onClick={() => {
                                    if (rotationTargetTab === 'range') {
                                      applyRangeRotation(btn.deg);
                                    } else if (selectedPageIds.size > 0) {
                                      rotateSelected(btn.deg);
                                    } else {
                                      rotateAll(btn.deg);
                                    }
                                  }}
                                >
                                  <btn.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                                  <span className="text-[9px] font-black uppercase tracking-tighter">{btn.label}</span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Context-Aware Settings */}
                          <div className="pt-2">
                            <AnimatePresence mode="wait">
                              {rotationTargetTab === 'interactive' ? (
                                <motion.div 
                                  key="interactive"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="space-y-6"
                                >
                                  <div className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Selection Tools</h3>
                                    <div className="flex gap-2">
                                      <Button variant="outline" className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors" onClick={selectAll}>{selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}</Button>
                                      <Button variant="outline" className="h-10 px-4 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors" onClick={() => setSelectedPageIds(new Set())} disabled={selectedPageIds.size === 0}>Clear</Button>
                                    </div>
                                  </div>
                                  {selectedPageIds.size > 0 ? (
                                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
                                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Active Target</p>
                                      <p className="text-xs font-bold text-foreground">{selectedPageIds.size} Selected Pages</p>
                                    </div>
                                  ) : (
                                    <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50 space-y-1">
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Target</p>
                                      <p className="text-xs font-bold text-foreground">Whole Document ({pages.length} Pages)</p>
                                    </div>
                                  )}
                                </motion.div>
                              ) : (
                                <motion.div 
                                  key="range"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="space-y-4"
                                >
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Define Range</h3>
                                  <div className="relative group">
                                    <Input value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} placeholder="Example: 1-3, 5" className="h-12 border-2 rounded-xl font-bold placeholder:font-medium placeholder:text-muted-foreground/40 pl-10 group-hover:border-primary/30 transition-colors" />
                                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                  </div>
                                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter leading-relaxed italic opacity-70 px-1">Rotation buttons above will apply ONLY to this range.</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </ScrollArea>
                      <div className="shrink-0 pt-6 border-t border-border bg-background">
                        <Button size="lg" className="w-full h-14 sm:h-16 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3" onClick={applyRotation} disabled={pages.length === 0}>
                          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          Apply Rotation
                          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors"><ArrowRight className="h-3.5 w-3.5 text-white" /></div>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MOBILE LAYOUT (Tabbed) */}
                <div className="xl:hidden flex-1 flex flex-col overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeTab === "configure" ? (
                      <motion.div
                        key="configure"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col min-h-0 bg-background relative"
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
                        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 custom-scrollbar relative z-10">
                          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center items-start pb-20">
                            {pages.map((page, idx) => (
                              <div key={page.id} className={cn("group relative bg-card border rounded-2xl shadow-sm w-[130px] sm:w-[155px] overflow-hidden transition-all duration-300 flex-shrink-0 cursor-pointer", selectedPageIds.has(page.id) ? "border-primary shadow-glow ring-2 ring-primary/20 scale-[1.02] z-20" : "border-border hover:border-primary/40")} onClick={() => togglePageSelection(page.id)}>
                                <div className="absolute top-2 left-2 z-20">{selectedPageIds.has(page.id) ? <div className="bg-primary text-white rounded-md p-1 shadow-sm"><CheckSquare className="h-3 w-3" /></div> : <div className="bg-white/90 text-muted-foreground/30 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50"><Square className="h-3 w-3" /></div>}</div>
                                <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5"><button onClick={(e) => { e.stopPropagation(); rotateSingle(page.id, -90); }} className="p-1.5 bg-primary text-white rounded-lg"><RotateCcw className="h-3 w-3" /></button><button onClick={(e) => { e.stopPropagation(); rotateSingle(page.id, 90); }} className="p-1.5 bg-primary text-white rounded-lg"><RotateCw className="h-3 w-3" /></button></div>
                                <div className="w-full aspect-[3/4.2] bg-secondary/10 flex items-center justify-center p-3 relative overflow-hidden transition-transform duration-500 ease-out" style={{ transform: `rotate(${page.rotation}deg)` }}><img src={page.thumbnail} alt={`Page ${idx + 1}`} className="max-w-[95%] max-h-[95%] object-contain" loading="lazy" /></div>
                                <div className="p-2 bg-secondary/30 flex justify-center border-t border-border/50"><span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Page {idx + 1}</span></div>
                              </div>
                            ))}
                            <button onClick={() => fileInputRef.current?.click()} className="w-[130px] sm:w-[155px] aspect-[3/4.2] border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm"><Plus className="h-5 w-5" /></div>
                              <div className="text-center px-2"><p className="text-[9px] font-black uppercase tracking-widest">Upload</p><p className="text-[8px] font-bold uppercase opacity-50">Another</p></div>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="options"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col h-full bg-background"
                      >
                        <ScrollArea className="flex-1 p-6">
                          <div className="space-y-8 pb-10">
                            <div className="space-y-3">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Selection Tools</h3>
                              <div className="flex gap-2"><Button variant="outline" className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl" onClick={selectAll}>{selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}</Button><Button variant="outline" className="h-10 px-4 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl" onClick={() => setSelectedPageIds(new Set())} disabled={selectedPageIds.size === 0}>Clear</Button></div>
                            </div>
                            <div className="space-y-4">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Bulk Rotation</h3>
                              <div className="grid grid-cols-3 gap-2"><Button variant="outline" className="flex-col h-20 border-2 rounded-2xl gap-2 active:bg-primary/5 active:border-primary/40" onClick={() => rotateAll(-90)}><RotateCcw className="h-5 w-5 text-primary" /><span className="text-[9px] font-black uppercase tracking-tighter">Left -90°</span></Button><Button variant="outline" className="flex-col h-20 border-2 rounded-2xl gap-2 active:bg-primary/5 active:border-primary/40" onClick={() => rotateAll(90)}><RotateCw className="h-5 w-5 text-primary" /><span className="text-[9px] font-black uppercase tracking-tighter">Right +90°</span></Button><Button variant="outline" className="flex-col h-20 border-2 rounded-2xl gap-2 active:bg-primary/5 active:border-primary/40" onClick={() => rotateAll(180)}><RefreshCw className="h-5 w-5 text-primary" /><span className="text-[9px] font-black uppercase tracking-tighter">Flip 180°</span></Button></div>
                            </div>
                            <AnimatePresence>{selectedPageIds.size > 0 && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-2 overflow-hidden"><h3 className="text-[10px] font-black uppercase tracking-widest text-primary px-1 border-l-2 border-primary ml-1 flex justify-between"><span>Selected ({selectedPageIds.size} Pages)</span></h3><div className="grid grid-cols-2 gap-2"><Button variant="outline" className="h-12 border-2 rounded-xl gap-2 hover:bg-primary/10 hover:border-primary transition-all text-[9px] font-black uppercase tracking-widest" onClick={() => rotateSelected(-90)}>Rotate Left</Button><Button variant="outline" className="h-12 border-2 rounded-xl gap-2 hover:bg-primary/10 hover:border-primary transition-all text-[9px] font-black uppercase tracking-widest" onClick={() => rotateSelected(90)}>Rotate Right</Button></div></motion.div>)}</AnimatePresence>
                            <div className="space-y-4 pt-2">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Range Rotation</h3>
                              <div className="space-y-3"><div className="relative"><Input value={rangeInput} onChange={(e) => setRangeInput(e.target.value)} placeholder="Example: 1-3, 5" className="h-12 border-2 rounded-xl font-bold placeholder:font-medium placeholder:text-muted-foreground/40 pl-10" /><FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" /></div><div className="grid grid-cols-2 gap-2"><Button variant="secondary" className="text-[9px] font-black uppercase tracking-widest h-11 rounded-xl border border-border" onClick={() => applyRangeRotation(90)}>Rotate +90°</Button><Button variant="secondary" className="text-[9px] font-black uppercase tracking-widest h-11 rounded-xl border border-border" onClick={() => applyRangeRotation(-90)}>Rotate -90°</Button></div></div>
                            </div>
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="xl:hidden shrink-0 pt-4 pb-6 px-4 bg-background border-t border-border">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                  onClick={applyRotation}
                  disabled={pages.length === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Apply Rotation
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
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
      {files.length === 0 && !results && !processing && (
        <ToolSeoSection
          toolName="Rotate PDF Online"
          category="edit"
          intro="MagicDocx Rotate PDF tool permanently rotates pages in your PDF without any loss of quality. Select specific pages by clicking, choose a range like '1-3, 5', or rotate the entire document at once. Individually rotate pages using the hover buttons, or use the bulk rotation controls to apply 90°, 180°, or -90° to all selected pages. Your PDF is processed locally | files never leave your device."
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
      )}
    </ToolLayout>
  );
};

export default RotatePdf;
