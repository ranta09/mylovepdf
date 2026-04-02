import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Hash,
  Loader2,
  Info,
  ShieldCheck,
  Download,
  CheckCircle2,
  Settings2,
  X,
  Plus,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Undo2,
  Redo2,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  LayoutGrid,
  Type,
  Maximize2,
  Palette,
  AlignJustify,
  FileText,
  Sliders
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

type Position = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
type NumberFormat = "1" | "01" | "Page 1" | "Page 1 of n" | "1 / n";
type FontFamily = "helvetica" | "times" | "courier";

interface Settings {
  position: Position;
  range: string;
  startNumber: number;
  format: NumberFormat;
  fontSize: number;
  color: string;
  fontFamily: FontFamily;
  bold: boolean;
  opacity: number;
  hOffset: number;
  vOffset: number;
}

interface Results {
  url: string;
  name: string;
  size: string;
  totalPages: number;
  numberedPages: number;
}

const PageNumbers = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [settings, setSettings] = useState<Settings>({
    position: "top-left",
    range: "all",
    startNumber: 1,
    format: "1",
    fontSize: 14,
    color: "#000000",
    fontFamily: "helvetica",
    bold: true,
    opacity: 100,
    hOffset: 10,
    vOffset: 11
  });

  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  // ─── Thumbnail Generation ──────────────────────────────────────────────────
  const generatePreviews = async (files: File[]) => {
    setLoading(true);
    setPreviews([]);
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newPreviews: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        newPreviews.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      setPreviews(newPreviews);
      if (settings.range === "all") {
        setSettings(prev => ({ ...prev, range: `1-${numPages}` }));
      }
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
      setFiles([newFiles[0]]); // Only one file for page numbers
      setPreviews([]);
      setResults(null);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPreviews([]);
    setResults(null);
    setProgress(0);
    setSettings({
      position: "top-left",
      range: "all",
      startNumber: 1,
      format: "1",
      fontSize: 14,
      color: "#000000",
      fontFamily: "helvetica",
      bold: true,
      opacity: 100,
      hOffset: 10,
      vOffset: 11
    });
  };

  // ─── Page Range Logic ──────────────────────────────────────────────────────
  const getNumberedPages = useMemo(() => {
    if (settings.range.toLowerCase() === "all") {
      return Array.from({ length: previews.length }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    const parts = settings.range.split(/,| /).filter(Boolean);
    parts.forEach(part => {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            if (i > 0 && i <= previews.length) pages.add(i);
          }
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num > 0 && num <= previews.length) pages.add(num);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  }, [settings.range, previews.length]);

  // ─── Format Logic ───────────────────────────────────────────────────────────
  const formatPageNumber = (num: number, total: number) => {
    const displayNum = num + settings.startNumber - 1;
    const paddedNum = displayNum.toString().padStart(settings.format === "01" ? 2 : 1, '0');

    switch (settings.format) {
      case "01": return paddedNum;
      case "Page 1": return `Page ${paddedNum}`;
      case "Page 1 of n": return `Page ${paddedNum} of ${total}`;
      case "1 / n": return `${paddedNum} / ${total}`;
      default: return paddedNum;
    }
  };

  // ─── PDF Generation ────────────────────────────────────────────────────────
  const applyPageNumbers = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();
      const numberedPages = getNumberedPages;

      setProgress(30);

      const fontMap = {
        helvetica: settings.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica,
        times: settings.bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman,
        courier: settings.bold ? StandardFonts.CourierBold : StandardFonts.Courier
      };
      const font = await pdfDoc.embedFont(fontMap[settings.fontFamily] || StandardFonts.Helvetica);

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      const color = hexToRgb(settings.color);
      const opacity = settings.opacity / 100;

      numberedPages.forEach((pageNum, index) => {
        const page = pdfDoc.getPage(pageNum - 1);
        const { width, height } = page.getSize();
        const text = formatPageNumber(index + 1, totalPages);
        const textSize = settings.fontSize;
        const textWidth = font.widthOfTextAtSize(text, textSize);

        let x = 0;
        let y = 0;

        const hOff = (settings.hOffset / 100) * width;
        const vOff = (settings.vOffset / 100) * height;

        switch (settings.position) {
          case "top-left": x = hOff; y = height - vOff - textSize; break;
          case "top-center": x = (width - textWidth) / 2; y = height - vOff - textSize; break;
          case "top-right": x = width - hOff - textWidth; y = height - vOff - textSize; break;
          case "bottom-left": x = hOff; y = vOff; break;
          case "bottom-center": x = (width - textWidth) / 2; y = vOff; break;
          case "bottom-right": x = width - hOff - textWidth; y = vOff; break;
        }

        page.drawText(text, {
          x,
          y,
          size: textSize,
          font,
          color,
          opacity
        });
      });

      setProgress(80);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const name = `${file.name.replace(".pdf", "")}-numbered.pdf`;

      setResults({
        url,
        name,
        size: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
        totalPages,
        numberedPages: numberedPages.length
      });

      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();

      toast.success("Page numbers added successfully!");
      setProgress(100);
    } catch (error) {
      console.error("Error adding page numbers:", error);
      toast.error("Error processing PDF");
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  };

  if (results) {
    return (
      <ToolLayout
        title="Page Numbers Added!"
        description="Your PDF has been numbered exactly as you requested."
        category="edit"
        icon={<Hash className="h-7 w-7" />}
        toolId="page-numbers"
        hideHeader={true}
      >
        <div className="max-w-4xl mx-auto py-12 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-black mb-4 uppercase tracking-tight">Success!</h1>
            <p className="text-muted-foreground text-lg">Your file is ready for download.</p>
          </motion.div>

          <div className="bg-card border-2 border-border rounded-3xl p-8 mb-8 shadow-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Document Name</p>
                  <p className="font-black text-xl truncate max-w-[200px]">{results.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total Pages</p>
                  <p className="text-xl font-black text-primary">{results.totalPages}</p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Numbered</p>
                  <p className="text-xl font-black text-primary">{results.numberedPages}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="flex-1 h-14 text-sm font-black uppercase tracking-widest shadow-glow" onClick={() => {
              const a = document.createElement('a'); a.href = results.url; a.download = results.name; a.click();
            }}>
              <Download className="mr-2 h-5 w-5" /> Download Numbered PDF
            </Button>
            <Button size="lg" variant="secondary" className="flex-1 h-14 text-sm font-black uppercase tracking-widest" onClick={resetAll}>
              <Plus className="mr-2 h-5 w-5" /> Upload More
            </Button>
          </div>
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout
      title="Add Page Numbers"
      description="Professional PDF page numbering at your fingertips."
      category="edit"
      icon={<Hash className="h-7 w-7" />}
      metaTitle="Add Page Numbers to PDF Online Free | MagicDocx"
      metaDescription="Add page numbers to any PDF online for free. Customize font, size, position, format, and range. Live preview included. No sign-up required."
      toolId="page-numbers"
      hideHeader={files.length > 0}
    >
      <div className="space-y-6">
        {files.length === 0 && !loading && (
          <ToolUploadScreen
            title="Add Page Numbers"
            description="Professional PDF page numbering at your fingertips"
            buttonLabel="Select PDF file"
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFilesChange}
          />
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Preparing documents...</p>
          </div>
        )}

        {files.length > 0 && previews.length > 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">

              {/* ── MAIN AREA: PREVIEW ── */}
              <div className="flex-1 bg-secondary/10 flex flex-col relative overflow-hidden order-2 xl:order-1">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button variant="secondary" size="icon" className="rounded-full shadow-md h-10 w-10" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <div className="bg-background/80 backdrop-blur px-3 py-2 rounded-full shadow-md text-xs font-bold border border-border flex items-center min-w-[60px] justify-center">
                    {Math.round(zoom * 100)}%
                  </div>
                  <Button variant="secondary" size="icon" className="rounded-full shadow-md h-10 w-10" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 overflow-auto bg-secondary/5 custom-scrollbar" ref={scrollRef}>
                  <div className="flex flex-col items-center gap-12 p-12 pb-20 min-h-full">
                    {previews.map((preview, idx) => {
                      const isNumbered = getNumberedPages.includes(idx + 1);
                      const indexInSelection = getNumberedPages.indexOf(idx + 1);
                      const text = isNumbered ? formatPageNumber(indexInSelection + 1, previews.length) : "";

                      return (
                        <div
                          key={idx}
                          className="relative group bg-white shadow-2xl rounded-sm ring-1 ring-border shrink-0"
                          style={{ width: `${600 * zoom}px`, maxWidth: "100%", aspectRatio: "1 / 1.414" }}
                          ref={el => { pageRefs.current[idx] = el; }}
                        >
                          <img src={preview} className="w-full h-full object-contain pointer-events-none" />

                          {isNumbered && (
                            <div
                              className="absolute pointer-events-none transition-all duration-300 flex items-center justify-center p-2"
                              style={{
                                left: settings.position.includes("left") ? `${settings.hOffset / 2}%` : settings.position.includes("right") ? "auto" : "50%",
                                right: settings.position.includes("right") ? `${settings.hOffset / 2}%` : "auto",
                                top: settings.position.includes("top") ? `${settings.vOffset / 2}%` : "auto",
                                bottom: settings.position.includes("bottom") ? `${settings.vOffset / 2}%` : "auto",
                                transform: settings.position.includes("center") ? "translateX(-50%)" : "none",
                                fontSize: `${settings.fontSize * 1.5 * zoom}px`,
                                color: settings.color,
                                fontFamily: settings.fontFamily === "times" ? "serif" : settings.fontFamily === "courier" ? "monospace" : "sans-serif",
                                fontWeight: settings.bold ? "bold" : "normal",
                                opacity: settings.opacity / 100,
                                minWidth: "40px",
                                lineHeight: 1
                              }}
                            >
                              {text}
                            </div>
                          )}

                          <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-black text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            Page {idx + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-background/80 backdrop-blur border-t border-border p-4 flex items-center justify-between shrink-0">
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
              <div className="w-full xl:w-[380px] bg-card border-l border-border flex flex-col shrink-0 overflow-hidden order-1 xl:order-2">
                <ScrollArea className="flex-1 pr-4 -mr-4">
                  <div className="p-6 space-y-6">

                    {/* POSITION */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Position</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-3 bg-secondary/30 rounded-2xl border-2 border-border/50">
                        {[
                          "top-left", "top-center", "top-right",
                          "bottom-left", "bottom-center", "bottom-right"
                        ].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setSettings(s => ({ ...s, position: pos as Position }))}
                            className={cn(
                              "h-20 rounded-xl border-2 transition-all flex p-2 hover:scale-105 active:scale-95 shadow-sm",
                              pos.includes("top") ? "items-start" : "items-end",
                              pos.includes("left") ? "justify-start" : pos.includes("right") ? "justify-end" : "justify-center",
                              settings.position === pos
                                ? "bg-primary border-primary shadow-glow ring-4 ring-primary/20"
                                : "bg-background border-border hover:border-primary/50"
                            )}
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all",
                              settings.position === pos ? "bg-white scale-125" : "bg-muted-foreground/30"
                            )} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* TYPOGRAPHY */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Type className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Typography</h3>
                      </div>
                      <div className="bg-secondary/20 p-3 rounded-2xl border border-border space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Font Family</label>
                          <Select value={settings.fontFamily} onValueChange={(v) => setSettings(s => ({ ...s, fontFamily: v as FontFamily }))}>
                            <SelectTrigger className="bg-background h-10 rounded-xl border-2 border-border/50 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="helvetica" className="font-sans">Sans Serif</SelectItem>
                              <SelectItem value="times" className="font-serif">Serif (Times)</SelectItem>
                              <SelectItem value="courier" className="font-mono">Monospace</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-baseline px-1">
                              <label className="text-[9px] font-black uppercase text-muted-foreground">Size</label>
                              <span className="text-[9px] font-black text-primary">{settings.fontSize}px</span>
                            </div>
                            <Slider value={[settings.fontSize]} onValueChange={([v]) => setSettings(s => ({ ...s, fontSize: v }))} min={8} max={72} step={1} className="py-1" />
                          </div>
                          <div className="w-[70px] space-y-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Color</label>
                            <div className="relative group/color cursor-pointer h-9 w-full rounded-xl border-2 border-border/50 overflow-hidden shadow-sm">
                              <input
                                type="color"
                                value={settings.color}
                                onChange={(e) => setSettings(s => ({ ...s, color: e.target.value }))}
                                className="absolute inset-0 w-[120%] h-[120%] -top-[10%] -left-[10%] cursor-pointer border-none p-0"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 h-10 rounded-xl border-2 font-black text-[10px] uppercase transition-all",
                              settings.bold ? "bg-primary text-primary-foreground border-primary shadow-glow" : "bg-background border-border/50"
                            )}
                            onClick={() => setSettings(s => ({ ...s, bold: !s.bold }))}
                          >
                            Bold
                          </Button>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between px-1">
                              <label className="text-[9px] font-black uppercase text-muted-foreground italic">Opacity</label>
                              <span className="text-[9px] font-black text-primary">{settings.opacity}%</span>
                            </div>
                            <Slider value={[settings.opacity]} onValueChange={([v]) => setSettings(s => ({ ...s, opacity: v }))} min={10} max={100} step={5} className="py-1" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RANGE AND FORMAT */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Sliders className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Range & Format</h3>
                      </div>
                      <div className="bg-secondary/20 p-3 rounded-2xl border border-border space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest pl-1">Number Format</label>
                          <Select value={settings.format} onValueChange={(v) => setSettings(s => ({ ...s, format: v as NumberFormat }))}>
                            <SelectTrigger className="bg-background h-10 rounded-xl border-2 border-border/50 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1, 2, 3</SelectItem>
                              <SelectItem value="01">01, 02, 03</SelectItem>
                              <SelectItem value="Page 1">Page 1</SelectItem>
                              <SelectItem value="Page 1 of n">Page 1 of {previews.length}</SelectItem>
                              <SelectItem value="1 / n">1 / {previews.length}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between px-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Pages to Number</label>
                            <span className="text-[9px] font-medium text-muted-foreground italic truncate max-w-[100px]">e.g. 1-5, 8</span>
                          </div>
                          <Input
                            value={settings.range}
                            onChange={(e) => setSettings(s => ({ ...s, range: e.target.value }))}
                            placeholder="e.g. 1-10"
                            className="bg-background h-10 rounded-xl border-2 border-border/50 font-bold text-xs focus-visible:ring-primary shadow-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-muted-foreground pl-1">Start numbering from</label>
                          <Input
                            type="number"
                            value={settings.startNumber}
                            onChange={(e) => setSettings(s => ({ ...s, startNumber: parseInt(e.target.value) || 1 }))}
                            className="bg-background h-10 rounded-xl border-2 border-border/50 font-bold text-xs focus-visible:ring-primary shadow-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* MARGINS */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Maximize2 className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Margins</h3>
                      </div>
                      <div className="bg-secondary/20 p-3 rounded-2xl border border-border space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline px-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Horizontal Offset</label>
                            <span className="text-[9px] font-black text-primary">{settings.hOffset}%</span>
                          </div>
                          <Slider value={[settings.hOffset]} onValueChange={([v]) => setSettings(s => ({ ...s, hOffset: v }))} min={0} max={100} step={1} className="py-1" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-baseline px-1">
                            <label className="text-[9px] font-black uppercase text-muted-foreground">Vertical Offset</label>
                            <span className="text-[9px] font-black text-primary">{settings.vOffset}%</span>
                          </div>
                          <Slider value={[settings.vOffset]} onValueChange={([v]) => setSettings(s => ({ ...s, vOffset: v }))} min={0} max={100} step={1} className="py-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-6 border-t border-border bg-background/60 backdrop-blur shrink-0">
                  <Button
                    size="lg"
                    className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-glow group relative overflow-hidden active:scale-[0.98] transition-all"
                    onClick={applyPageNumbers}
                    disabled={processing}
                  >
                    {processing ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Adding Page Numbers...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>Add Page Numbers</span>
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
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Total: {previews.length}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-border" />
                    <div className="flex items-center gap-1.5 text-primary font-black uppercase tracking-tighter">
                      <Hash className="w-3 h-3" />
                      <span className="text-[10px]">Processing: {getNumberedPages.length}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      <ToolSeoSection
        toolName="Add Page Numbers to PDF"
        category="edit"
        intro="MagicDocx Add Page Numbers tool makes it easy to number the pages of any PDF document. Choose from 6 placement positions, multiple number formats (1, 01, Page 1, Page 1 of N), full typography controls (font, size, color, bold, opacity), and even specify horizontal and vertical margin offsets. A live preview shows exactly where your page numbers will appear before you process the file."
        steps={[
          "Upload your PDF file using the drag-and-drop area.",
          "Set your page number position, format (e.g. 'Page 1 of N'), and typography settings.",
          "Specify the page range to number (e.g. 1-10) and the starting number.",
          "Click 'Add Page Numbers' to download your numbered PDF."
        ]}
        formats={["PDF"]}
        relatedTools={[
          { name: "Edit PDF", path: "/edit-pdf", icon: Hash },
          { name: "Add Watermark", path: "/watermark", icon: Hash },
          { name: "Organize PDF", path: "/organize-pdf", icon: Hash },
          { name: "Rotate PDF", path: "/rotate-pdf", icon: Hash },
        ]}
        schemaName="Add Page Numbers to PDF Online"
        schemaDescription="Free online tool to add page numbers to PDF. Customize font, size, position, format and range with live preview."
      />
    </ToolLayout>
  );
};

export default PageNumbers;
