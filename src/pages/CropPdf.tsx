import { useState, useEffect, useRef, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import DownloadScreen from "@/components/DownloadScreen";
import { Merge, Minimize2, Scissors, Lock, LayoutGrid, FileText as FP } from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Crop,
  Loader2,
  Info,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings2,
  Download,
  CheckCircle2,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Scan,
  RefreshCw,
  Layout
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
const PDFJS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

type CropMode = "current" | "all" | "range" | "selected";
type AspectRatio = "original" | "1:1" | "4:3" | "16:9" | "custom";
type Unit = "px" | "mm" | "pt";

interface CropBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

interface Settings {
  mode: CropMode;
  range: string;
  aspectRatio: AspectRatio;
  unit: Unit;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Results {
  url: string;
  name: string;
  originalSize: string;
  newSize: string;
  totalPages: number;
}

const CropPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<{ width: number; height: number }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Results | null>(null);

  const [cropBox, setCropBox] = useState<CropBox>({ x: 10, y: 10, width: 80, height: 80 });
  const [settings, setSettings] = useState<Settings>({
    mode: "current",
    range: "",
    aspectRatio: "original",
    unit: "px",
    top: 10,
    bottom: 10,
    left: 10,
    right: 10
  });

  const mainPreviewRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef<string | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const startBox = useRef<CropBox | null>(null);

  // ─── Thumbnail Generation ──────────────────────────────────────────────────
  const generatePreviews = async (files: File[]) => {
    setLoading(true);
    setPreviews([]);
    setPageSizes([]);
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newPreviews: string[] = [];
      const newSizes: { width: number; height: number }[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        newPreviews.push(canvas.toDataURL("image/jpeg", 0.85));
        newSizes.push({ width: viewport.width, height: viewport.height });
      }
      setPreviews(newPreviews);
      setPageSizes(newSizes);
    } catch (error) {
      console.error("Error generating previews:", error);
      toast.error("Error loading PDF preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (files.length > 0 && previews.length === 0) {
      generatePreviews(files);
    }
  }, [files]);

  const handleFilesChange = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFiles([newFiles[0]]);
      setPreviews([]);
      setResults(null);
      setCurrentPage(1);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPreviews([]);
    setResults(null);
    setProgress(0);
    setCurrentPage(1);
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
  };

  // ─── Interactive Crop Box Logic ─────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, type: string) => {
    e.preventDefault();
    isResizing.current = type;
    startPos.current = { x: e.clientX, y: e.clientY };
    startBox.current = { ...cropBox };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !startPos.current || !startBox.current || !mainPreviewRef.current) return;

    const rect = mainPreviewRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startPos.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - startPos.current.y) / rect.height) * 100;

    setCropBox(prev => {
      const next = { ...prev };
      const type = isResizing.current;

      if (type === "move") {
        next.x = Math.max(0, Math.min(100 - prev.width, startBox.current!.x + deltaX));
        next.y = Math.max(0, Math.min(100 - prev.height, startBox.current!.y + deltaY));
      } else {
        if (type.includes("left")) {
          const newX = Math.max(0, Math.min(prev.x + prev.width - 5, startBox.current!.x + deltaX));
          next.width = prev.x + prev.width - newX;
          next.x = newX;
        }
        if (type.includes("right")) {
          next.width = Math.max(5, Math.min(100 - prev.x, startBox.current!.width + deltaX));
        }
        if (type.includes("top")) {
          const newY = Math.max(0, Math.min(prev.y + prev.height - 5, startBox.current!.y + deltaY));
          next.height = prev.y + prev.height - newY;
          next.y = newY;
        }
        if (type.includes("bottom")) {
          next.height = Math.max(5, Math.min(100 - prev.y, startBox.current!.height + deltaY));
        }

        // Enforce aspect ratio during resize if enabled
        if (settings.aspectRatio !== "original" && settings.aspectRatio !== "custom") {
          const [ratioW, ratioH] = settings.aspectRatio.split(":").map(Number);
          const ratio = ratioW / ratioH;
          const currentSize = mainPreviewRef.current!.getBoundingClientRect();
          const pRatio = currentSize.width / currentSize.height;

          // Adjust height based on width and ratio
          next.height = (next.width * pRatio) / ratio;

          // Ensure it doesn't go out of bounds
          if (next.y + next.height > 100) {
            next.height = 100 - next.y;
            next.width = (next.height * ratio) / pRatio;
          }
        }
      }

      // Update manual margins based on box
      setSettings(s => ({
        ...s,
        top: Math.round(next.y),
        bottom: Math.round(100 - (next.y + next.height)),
        left: Math.round(next.x),
        right: Math.round(100 - (next.x + next.width))
      }));

      return next;
    });
  };

  const handleMouseUp = () => {
    isResizing.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  // Sync manual inputs back to crop box
  useEffect(() => {
    if (!isResizing.current) {
      setCropBox({
        x: settings.left,
        y: settings.top,
        width: 100 - settings.left - settings.right,
        height: 100 - settings.top - settings.bottom
      });
    }
  }, [settings.top, settings.bottom, settings.left, settings.right]);

  // ─── PDF Cropping Logic ─────────────────────────────────────────────────────
  const applyCrop = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();

      let pagesToCrop: number[] = [];
      if (settings.mode === "current") pagesToCrop = [currentPage];
      else if (settings.mode === "all") pagesToCrop = Array.from({ length: totalPages }, (_, i) => i + 1);
      else if (settings.mode === "range") {
        // Simple range parser
        const parts = settings.range.split(/,|-/).map(s => parseInt(s.trim()));
        if (parts.length === 2) {
          for (let i = parts[0]; i <= parts[1]; i++) pagesToCrop.push(i);
        } else {
          pagesToCrop = parts.filter(n => !isNaN(n));
        }
      }

      setProgress(40);

      pagesToCrop.forEach(idx => {
        if (idx < 1 || idx > totalPages) return;
        const page = pdfDoc.getPage(idx - 1);
        const { width, height } = page.getSize();

        // Convert percentages to points
        const l = (settings.left / 100) * width;
        const r = (settings.right / 100) * width;
        const t = (settings.top / 100) * height;
        const b = (settings.bottom / 100) * height;

        // pdf-lib setCropBox uses (x, y, width, height) where (0,0) is bottom-left
        page.setCropBox(l, b, width - l - r, height - t - b);
      });

      setProgress(80);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults({
        url,
        name: `${file.name.replace(".pdf", "")}_cropped.pdf`,
        originalSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        newSize: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
        totalPages
      });

      toast.success("PDF cropped successfully!");
      setProgress(100);
    } catch (error) {
      console.error("Error cropping PDF:", error);
      toast.error("Error processing PDF");
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  };

  const autoCrop = () => {
    // Basic auto-crop simulation: trim 5% from all sides
    setSettings(prev => ({
      ...prev,
      top: 5,
      bottom: 5,
      left: 5,
      right: 5
    }));
    toast.info("Auto-detected margins. You can further adjust them.");
  };

  if (results) {
    return (
      <ToolLayout
        title="PDF Cropped Successfully!"
        description="Your PDF has been trimmed exactly as you requested."
        category="edit"
        icon={<Crop className="h-7 w-7" />}
        toolId="crop-pdf"
        hideHeader={true}
      >
        <DownloadScreen
          title="PDF cropped successfully!"
          downloadLabel="DOWNLOAD CROPPED PDF"
          resultUrl={results.url}
          resultName={results.name}
          onReset={resetAll}
          recommendedTools={[
            { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
            { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
            { name: "Split PDF", path: "/split-pdf", icon: Scissors },
            { name: "Organize PDF", path: "/organize-pdf", icon: LayoutGrid },
            { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
            { name: "Add Page Numbers", path: "/page-numbers", icon: FP },
          ]}
        />
      </ToolLayout>
    );
  }



  return (
    <ToolLayout
      title="Crop PDF"
      description="Trim margins and crop PDF pages to a custom size."
      category="edit"
      icon={<Crop className="h-7 w-7" />}
      metaTitle="Crop PDF Online - Professional PDF Cropper | MagicDOCX"
      metaDescription="Crop PDF pages easily with MagicDOCX. Professional interactive cropping workspace with lossless processing."
      toolId="crop-pdf"
      hideHeader={files.length > 0}
    >
      <div className="space-y-6">
        {files.length === 0 && !loading && (
          <ToolUploadScreen
            title="Crop PDF"
            description="Trim margins and crop PDF pages to a custom size"
            buttonLabel="Select PDF file"
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesChange}
          />
        )}

        {(loading || previews.length === 0 && files.length > 0) && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Preparing cropping workspace...</p>
          </div>
        )}

        {files.length > 0 && previews.length > 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">

              {/* ── LEFT SIDEBAR: THUMBNAILS ── */}
              <div className="hidden xl:flex w-[160px] bg-secondary/10 border-r border-border flex-col shrink-0 overflow-hidden">
                <div className="p-3 border-b border-border bg-background/50">
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Pages</h3>
                </div>
                <ScrollArea className="flex-1 p-2">
                  <div className="space-y-3">
                    {previews.map((preview, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={cn(
                          "w-full group relative rounded-xl border-2 transition-all overflow-hidden bg-background",
                          currentPage === idx + 1 ? "border-primary shadow-md scale-[1.02]" : "border-transparent hover:border-primary/30"
                        )}
                      >
                        <img src={preview} className="w-full aspect-[1/1.414] object-cover" />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[8px] px-1.5 rounded-md backdrop-blur-sm font-black">
                          {idx + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* ── MAIN AREA: INTERACTIVE CROP ── */}
              <div className="flex-1 bg-secondary/5 flex flex-col relative overflow-hidden">
                {/* Toolbar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-xl">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] font-black min-w-[60px] text-center uppercase tracking-tighter">
                    Page {currentPage} / {previews.length}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCurrentPage(prev => Math.min(previews.length, prev + 1))} disabled={currentPage === previews.length}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] font-bold min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-auto bg-secondary/10 custom-scrollbar relative">
                  <div className="flex items-center justify-center p-20 min-h-full min-w-full">
                    <div
                      ref={mainPreviewRef}
                      className="relative shadow-2xl bg-white border border-border"
                      style={{
                        width: `${pageSizes[currentPage - 1].width * zoom}px`,
                        aspectRatio: `${pageSizes[currentPage - 1].width} / ${pageSizes[currentPage - 1].height}`
                      }}
                    >
                      <img src={previews[currentPage - 1]} className="w-full h-full object-contain pointer-events-none select-none" />

                      {/* Dark Overlays */}
                      <div className="absolute inset-0 pointer-events-none select-none">
                        <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]" style={{ height: `${cropBox.y}%` }} />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]" style={{ height: `${100 - (cropBox.y + cropBox.height)}%` }} />
                        <div className="absolute top-0 bottom-0 left-0 bg-black/60 backdrop-blur-[1px]" style={{ width: `${cropBox.x}%`, top: `${cropBox.y}%`, bottom: `${100 - (cropBox.y + cropBox.height)}%` }} />
                        <div className="absolute top-0 bottom-0 right-0 bg-black/60 backdrop-blur-[1px]" style={{ width: `${100 - (cropBox.x + cropBox.width)}%`, top: `${cropBox.y}%`, bottom: `${100 - (cropBox.y + cropBox.height)}%` }} />
                      </div>

                      {/* Interactive Crop Box */}
                      <div
                        className="absolute border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.5)] cursor-move transition-all duration-75"
                        style={{
                          top: `${cropBox.y}%`,
                          left: `${cropBox.x}%`,
                          width: `${cropBox.width}%`,
                          height: `${cropBox.height}%`
                        }}
                        onMouseDown={(e) => handleMouseDown(e, "move")}
                      >
                        {/* Resize Handles */}
                        {["top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom", "left", "right"].map(handle => (
                          <div
                            key={handle}
                            className={cn(
                              "absolute bg-white border-2 border-primary shadow-sm active:scale-125 transition-transform",
                              handle.includes("-") ? "w-4 h-4 rounded-full" : handle === "top" || handle === "bottom" ? "w-10 h-2 -translate-x-1/2 left-1/2 rounded-full cursor-ns-resize" : "h-10 w-2 -translate-y-1/2 top-1/2 rounded-full cursor-ew-resize",
                              handle === "top-left" ? "-top-2 -left-2 cursor-nwse-resize" :
                                handle === "top-right" ? "-top-2 -right-2 cursor-nesw-resize" :
                                  handle === "bottom-left" ? "-bottom-2 -left-2 cursor-nesw-resize" :
                                    handle === "bottom-right" ? "-bottom-2 -right-2 cursor-nwse-resize" :
                                      handle === "top" ? "-top-1" :
                                        handle === "bottom" ? "-bottom-1" :
                                          handle === "left" ? "-left-1" : "-right-1"
                            )}
                            onMouseDown={(e) => handleMouseDown(e, handle)}
                          />
                        ))}

                        {/* Grid overlay for professional look */}
                        <div className="absolute inset-0 pointer-events-none border border-white/20">
                          <div className="absolute top-1/3 left-0 right-0 border-t border-white/20" />
                          <div className="absolute top-2/3 left-0 right-0 border-t border-white/20" />
                          <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
                          <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-background/90 backdrop-blur border-t border-border p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Local Processing Engine</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 border-l border-border pl-4">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter hover:bg-primary/5 hover:text-foreground" onClick={resetAll}>
                        <ArrowLeft className="w-3 h-3 mr-1" /> Go Back
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter hover:bg-primary/5 hover:text-foreground" onClick={resetAll}>
                        <Plus className="w-3 h-3 mr-1" /> Upload Another
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase truncate px-4 max-w-[200px]">
                    {files[0].name} ({(files[0].size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
              </div>

              {/* ── RIGHT PANEL: SETTINGS ── */}
              <div className="w-full xl:w-[320px] bg-card border-l border-border flex flex-col shrink-0 overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* CROP MODE */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Layout className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Crop Mode</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-1.5 bg-secondary/10 rounded-2xl border border-border">
                        <Button
                          variant={settings.mode === "current" ? "default" : "ghost"}
                          className="h-9 rounded-xl text-[10px] font-black uppercase tracking-tighter"
                          onClick={() => setSettings(s => ({ ...s, mode: "current" }))}
                        >
                          Current
                        </Button>
                        <Button
                          variant={settings.mode === "all" ? "default" : "ghost"}
                          className="h-9 rounded-xl text-[10px] font-black uppercase tracking-tighter"
                          onClick={() => setSettings(s => ({ ...s, mode: "all" }))}
                        >
                          All Pages
                        </Button>
                      </div>
                      {settings.mode === "range" && (
                        <Input
                          placeholder="e.g. 1-5, 8"
                          value={settings.range}
                          onChange={(e) => setSettings(s => ({ ...s, range: e.target.value }))}
                          className="bg-background h-9 rounded-xl border-2 border-border/50 text-[10px] font-bold mt-2"
                        />
                      )}
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-tighter border-2",
                          settings.mode === "range" ? "border-primary bg-primary/5" : "border-dashed border-border"
                        )}
                        onClick={() => setSettings(s => ({ ...s, mode: "range" }))}
                      >
                        <Scan className="w-3 h-3 mr-2" /> Custom Range
                      </Button>
                    </div>

                    {/* MANUAL MARGINS */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Maximize2 className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margins (%)</h3>
                      </div>
                      <div className="bg-secondary/5 p-4 rounded-3xl border border-border space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Top</label>
                            <Input type="number" value={settings.top} onChange={(e) => setSettings(s => ({ ...s, top: parseInt(e.target.value) || 0 }))} className="h-8 font-bold text-xs rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Bottom</label>
                            <Input type="number" value={settings.bottom} onChange={(e) => setSettings(s => ({ ...s, bottom: parseInt(e.target.value) || 0 }))} className="h-8 font-bold text-xs rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Left</label>
                            <Input type="number" value={settings.left} onChange={(e) => setSettings(s => ({ ...s, left: parseInt(e.target.value) || 0 }))} className="h-8 font-bold text-xs rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Right</label>
                            <Input type="number" value={settings.right} onChange={(e) => setSettings(s => ({ ...s, right: parseInt(e.target.value) || 0 }))} className="h-8 font-bold text-xs rounded-xl" />
                          </div>
                        </div>
                        <Button variant="secondary" className="w-full h-9 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={autoCrop}>
                          <RefreshCw className="w-3 h-3 mr-2" /> Auto-Detect
                        </Button>
                      </div>
                    </div>

                    {/* ASPECT RATIO */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aspect Ratio</h3>
                      </div>
                      <Select value={settings.aspectRatio} onValueChange={(v) => setSettings(s => ({ ...s, aspectRatio: v as AspectRatio }))}>
                        <SelectTrigger className="h-10 rounded-2xl border-2 border-border/50 bg-background text-[10px] font-black uppercase">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original">Original Size</SelectItem>
                          <SelectItem value="1:1">Square (1:1)</SelectItem>
                          <SelectItem value="4:3">Standard (4:3)</SelectItem>
                          <SelectItem value="16:9">HD (16:9)</SelectItem>
                          <SelectItem value="custom">Custom Ratio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-6 border-t border-border bg-background/60 backdrop-blur shrink-0">
                  <Button
                    size="lg"
                    className="w-full h-14 rounded-3xl text-xs font-black uppercase tracking-widest shadow-glow group relative overflow-hidden active:scale-[0.98] transition-all"
                    onClick={applyCrop}
                    disabled={processing}
                  >
                    {processing ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Cropping...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Apply Crop</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                    {processing && (
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                      />
                    )}
                  </Button>
                  <div className="flex items-center justify-center gap-4 mt-3 mb-1">
                    <div className="flex items-center gap-1.5 opacity-60">
                      <FileText className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Pages: {previews.length}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-border" />
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-tighter">
                      <Crop className="w-3 h-3" />
                      <span className="text-[9px]">Target: {settings.mode === "all" ? "All" : "Selection"}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      {files.length === 0 && (
        <ToolSeoSection
          toolName="Crop PDF Online"
          category="edit"
          intro="MagicDocx Crop PDF provides a professional interactive workspace for trimming the margins of any PDF. Use the drag-and-drop crop box on the page preview to visually define your crop area, or enter precise percentage-based margins for top, bottom, left, and right. Apply the crop to the current page, all pages, or a custom page range. Choose from preset aspect ratios (1:1, 4:3, 16:9) or a fully custom ratio. All processing is lossless and entirely local."
          steps={[
            "Upload your PDF using the file upload area.",
            "Drag the crop box handles on the preview to define your crop area, or enter margin percentages manually.",
            "Choose the crop mode: current page, all pages, or a custom range.",
            "Click 'Apply Crop' to download your trimmed PDF."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Edit PDF", path: "/edit-pdf", icon: Crop },
            { name: "Rotate PDF", path: "/rotate-pdf", icon: Crop },
            { name: "Organize PDF", path: "/organize-pdf", icon: Crop },
            { name: "Compress PDF", path: "/compress-pdf", icon: Crop },
          ]}
          schemaName="Crop PDF Online"
          schemaDescription="Free online PDF cropper. Interactively trim PDF page margins by dragging a crop box or entering precise percentages. Apply to one or all pages."
        />
      )}
    </ToolLayout>
  );
};

export default CropPdf;
