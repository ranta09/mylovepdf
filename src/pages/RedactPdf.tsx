import { useState, useEffect, useRef, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import {
  EyeOff,
  Loader2,
  Info,
  ShieldCheck,
  Download,
  CheckCircle2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Search,
  Undo2,
  Redo2,
  Palette,
  Maximize2,
  FileText,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Eraser,
  Type,
  Square,
  Scan,
  Check,
  AlertTriangle,
  Lock,
  History,
  Sparkles
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Set worker path for pdfjs
const PDFJS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

type RedactionType = "area" | "text" | "page";
type RedactionStyle = "black" | "blur" | "white" | "custom";

interface Redaction {
  id: string;
  type: RedactionType;
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number }; // Percentage based
  content?: string;
  style: RedactionStyle;
  customText?: string;
}

interface Results {
  url: string;
  name: string;
  originalSize: string;
  newSize: string;
  redactionsCount: number;
  totalPages: number;
}

interface TextItem {
  str: string;
  rect: { x: number; y: number; width: number; height: number }; // Percentage based
}

const RedactPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<{ width: number; height: number }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [mode, setMode] = useState<RedactionType | "search">("area");
  const [selectedStyle, setSelectedStyle] = useState<RedactionStyle>("black");
  const [customText, setCustomText] = useState("REDACTED");
  const [searchQuery, setSearchQuery] = useState("");
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [history, setHistory] = useState<Redaction[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  // Page-specific text items for interaction
  const [pageTextItems, setPageTextItems] = useState<TextItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  const mainPreviewRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [tempRect, setTempRect] = useState<Redaction['rect'] | null>(null);

  // ─── Thumbnail & Text Extraction ───────────────────────────────────────────
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
        newSizes.push({ width: viewport.width / 1.5, height: viewport.height / 1.5 });
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

  const loadPageTextContent = async (pageIdx: number) => {
    if (files.length === 0) return;
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageIdx + 1);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const items: TextItem[] = textContent.items.map((item: any) => {
        const [x, y, w, h] = [item.transform[4], item.transform[5], item.width, item.height || 10];
        return {
          str: item.str,
          rect: {
            x: (x / viewport.width) * 100,
            y: ((viewport.height - y - h) / viewport.height) * 100,
            width: (w / viewport.width) * 100,
            height: (h / viewport.height) * 100
          }
        };
      }).filter(item => item.str.trim() !== "");

      setPageTextItems(items);
    } catch (error) {
      console.error("Error loading text content:", error);
    }
  };

  useEffect(() => {
    if (files.length > 0 && previews.length === 0) {
      generatePreviews(files);
    }
  }, [files]);

  useEffect(() => {
    if (previews.length > 0) {
      loadPageTextContent(currentPage - 1);
    }
  }, [currentPage, previews]);

  const handleFilesChange = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFiles([newFiles[0]]);
      setPreviews([]);
      setResults(null);
      setCurrentPage(1);
      setRedactions([]);
      setHistory([]);
      setHistoryIndex(-1);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPreviews([]);
    setResults(null);
    setProgress(0);
    setCurrentPage(1);
    setRedactions([]);
    setHistory([]);
    setHistoryIndex(-1);
    setPageTextItems([]);
  };

  // ─── Interaction Logic ─────────────────────────────────────────────────────
  const addToHistory = (newRedactions: Redaction[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newRedactions);
    if (newHistory.length > 30) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setRedactions(history[historyIndex - 1]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setRedactions([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRedactions(history[historyIndex + 1]);
    }
  };

  const addRedaction = (redaction: Redaction | Redaction[]) => {
    const newRedactions = Array.isArray(redaction) ? [...redactions, ...redaction] : [...redactions, redaction];
    setRedactions(newRedactions);
    addToHistory(newRedactions);
  };

  const removeRedaction = (id: string) => {
    const newRedactions = redactions.filter(r => r.id !== id);
    setRedactions(newRedactions);
    addToHistory(newRedactions);
  };

  // ─── Drawing Logic ──────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode !== "area" || !mainPreviewRef.current) return;
    const rect = mainPreviewRef.current.getBoundingClientRect();
    isDrawing.current = true;
    startPos.current = {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || !startPos.current || !mainPreviewRef.current) return;
    const rect = mainPreviewRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    setTempRect({
      x: Math.min(startPos.current.x, currentX),
      y: Math.min(startPos.current.y, currentY),
      width: Math.abs(currentX - startPos.current.x),
      height: Math.abs(currentY - startPos.current.y)
    });
  };

  const handleMouseUp = () => {
    if (isDrawing.current && tempRect && tempRect.width > 0.5 && tempRect.height > 0.5) {
      addRedaction({
        id: Math.random().toString(36).substr(2, 9),
        type: "area",
        pageIndex: currentPage - 1,
        rect: tempRect,
        style: selectedStyle,
        customText: selectedStyle === "custom" ? customText : undefined
      });
    }
    isDrawing.current = false;
    startPos.current = null;
    setTempRect(null);
  };

  // ─── Text Click Redaction ───────────────────────────────────────────────────
  const redactTextItem = (item: TextItem) => {
    addRedaction({
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      pageIndex: currentPage - 1,
      rect: item.rect,
      content: item.str,
      style: selectedStyle,
      customText: selectedStyle === "custom" ? customText : undefined
    });
  };

  // ─── Search & Redact Logic ──────────────────────────────────────────────────
  const redactAllSearchResults = async () => {
    if (!searchQuery.trim() || files.length === 0) return;
    setIsSearching(true);
    const toastId = toast.loading("Searching and marking text...");
    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newRedactions: Redaction[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        textContent.items.forEach((item: any) => {
          if (item.str.toLowerCase().includes(searchQuery.toLowerCase())) {
            const [x, y, w, h] = [item.transform[4], item.transform[5], item.width, item.height || 10];
            newRedactions.push({
              id: Math.random().toString(36).substr(2, 9),
              type: "text",
              pageIndex: i - 1,
              rect: {
                x: (x / viewport.width) * 100,
                y: ((viewport.height - y - h) / viewport.height) * 100,
                width: (w / viewport.width) * 100,
                height: (h / viewport.height) * 100
              },
              content: item.str,
              style: selectedStyle,
              customText: selectedStyle === "custom" ? customText : undefined
            });
          }
        });
      }

      if (newRedactions.length > 0) {
        addRedaction(newRedactions);
        toast.success(`Found and marked ${newRedactions.length} occurrences.`, { id: toastId });
      } else {
        toast.info("No matches found in the document.", { id: toastId });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error searching document.", { id: toastId });
    } finally {
      setIsSearching(false);
    }
  };

  const redactWholePage = () => {
    addRedaction({
      id: Math.random().toString(36).substr(2, 9),
      type: "page",
      pageIndex: currentPage - 1,
      rect: { x: 0, y: 0, width: 100, height: 100 },
      style: selectedStyle,
      customText: selectedStyle === "custom" ? customText : undefined
    });
  };

  // ─── OCR Logic ──────────────────────────────────────────────────────────────
  const runOcrOnCurrentPage = async () => {
    if (previews.length === 0 || isOcrLoading) return;
    setIsOcrLoading(true);
    const toastId = toast.loading("Applying OCR to detect text...");

    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(previews[currentPage - 1]);
      const { data } = ret;

      const img = new Image();
      img.src = previews[currentPage - 1];
      await new Promise(r => img.onload = r);

      const newItems: TextItem[] = (data as any).words.map((word: any) => ({
        str: word.text,
        rect: {
          x: (word.bbox.x0 / img.width) * 100,
          y: (word.bbox.y0 / img.height) * 100,
          width: ((word.bbox.x1 - word.bbox.x0) / img.width) * 100,
          height: ((word.bbox.y1 - word.bbox.y0) / img.height) * 100
        }
      }));

      setPageTextItems(prev => [...prev, ...newItems]);
      await worker.terminate();
      toast.success("OCR completed! Text is now selectable.", { id: toastId });
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("OCR failed. Try improving image quality.", { id: toastId });
    } finally {
      setIsOcrLoading(false);
    }
  };

  // ─── PDF Redaction Logic ────────────────────────────────────────────────────
  const applyRedactions = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    const toastId = toast.loading("Permanently removing content...");

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();

      setProgress(30);

      const redactionsByPage = redactions.reduce((acc, r) => {
        if (!acc[r.pageIndex]) acc[r.pageIndex] = [];
        acc[r.pageIndex].push(r);
        return acc;
      }, {} as Record<number, Redaction[]>);

      Object.entries(redactionsByPage).forEach(([pageIdxStr, pageRedactions]) => {
        const pageIdx = parseInt(pageIdxStr);
        if (pageIdx < 0 || pageIdx >= totalPages) return;
        const page = pdfDoc.getPage(pageIdx);
        const { width, height } = page.getSize();

        pageRedactions.forEach(r => {
          const rx = (r.rect.x / 100) * width;
          const ry = height - ((r.rect.y + r.rect.height) / 100) * height;
          const rw = (r.rect.width / 100) * width;
          const rh = (r.rect.height / 100) * height;

          if (r.style === "black") {
            page.drawRectangle({ x: rx, y: ry, width: rw, height: rh, color: rgb(0, 0, 0) });
          } else if (r.style === "white") {
            page.drawRectangle({ x: rx, y: ry, width: rw, height: rh, color: rgb(1, 1, 1), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
          } else if (r.style === "blur") {
            for (let i = 0; i < 6; i++) {
              page.drawRectangle({ x: rx, y: ry, width: rw, height: rh, color: rgb(0.7, 0.7, 0.7), opacity: 0.2 });
            }
          } else if (r.style === "custom") {
            page.drawRectangle({ x: rx, y: ry, width: rw, height: rh, color: rgb(0, 0, 0) });
            const fontSize = Math.min(rh * 0.6, 10);
            page.drawText(r.customText || "REDACTED", {
              x: rx + 2,
              y: ry + (rh - fontSize) / 2,
              size: fontSize,
              color: rgb(1, 1, 1),
            });
          }
        });
      });

      setProgress(80);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults({
        url,
        name: `${file.name.replace(".pdf", "")}_redacted.pdf`,
        originalSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
        newSize: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
        redactionsCount: redactions.length,
        totalPages
      });

      toast.success("Redaction complete. Content permanently removed.", { id: toastId });
      setProgress(100);
    } catch (error) {
      console.error("Error redacting PDF:", error);
      toast.error("Failed to process document.", { id: toastId });
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  };

  if (results) {
    return (
      <ToolLayout
        title="Redacted Successfully!"
        description="Your sensitive information has been permanently removed."
        category="edit"
        icon={<EyeOff className="h-7 w-7" />}
        toolId="redact-pdf"
        hideHeader={true}
      >
        <div className="max-w-4xl mx-auto py-12 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-black mb-4 uppercase tracking-tight">Secured!</h1>
            <p className="text-muted-foreground text-lg">Your redacted document is ready for download.</p>
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
                <div className="bg-secondary/30 rounded-2xl p-4 text-center border border-border/50">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Redactions</p>
                  <p className="text-xl font-black text-primary">{results.redactionsCount}</p>
                </div>
                <div className="bg-secondary/30 rounded-2xl p-4 text-center border border-border/50">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">New Size</p>
                  <p className="text-xl font-black text-primary">{results.newSize}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="flex-1 h-14 text-sm font-black uppercase tracking-widest shadow-glow" onClick={() => {
              const a = document.createElement('a'); a.href = results.url; a.download = results.name; a.click();
            }}>
              <Download className="mr-2 h-5 w-5" /> Download Redacted PDF
            </Button>
            <Button size="lg" variant="secondary" className="flex-1 h-14 text-sm font-black uppercase tracking-widest" onClick={resetAll}>
              <Plus className="mr-2 h-5 w-5" /> Start New Task
            </Button>
          </div>
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout
      title="Redact PDF"
      description="Permanently remove sensitive information from your PDF files."
      category="edit"
      icon={<EyeOff className="h-7 w-7" />}
      metaTitle="Redact PDF Online - Professional PDF Redaction | MagicDOCX"
      metaDescription="Securely redact text and areas from PDF documents. Professional tool for permanent information removal."
      toolId="redact-pdf"
      hideHeader={files.length > 0}
    >
      <div className="space-y-6">
        {files.length === 0 && !loading && (
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesChange={handleFilesChange}
            label="Click or drag to upload PDF for redaction"
          />
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Setting up professional workspace...</p>
          </div>
        )}

        {files.length > 0 && previews.length > 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col">
            {/* ── TOP TOOLBAR ── */}
            <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="hidden md:flex gap-2 font-bold text-xs uppercase hover:bg-secondary/50" onClick={resetAll}>
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </Button>
                <div className="h-8 w-px bg-border hidden md:block" />
                <div className="flex bg-secondary/30 p-1 rounded-xl border border-border">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={mode === "area" ? "default" : "ghost"}
                          className="h-8 w-10 p-0 rounded-lg shrink-0"
                          onClick={() => setMode("area")}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Redact Area (Select Rectangle)</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={mode === "text" ? "default" : "ghost"}
                          className="h-8 w-10 p-0 rounded-lg shrink-0"
                          onClick={() => setMode("text")}
                        >
                          <Type className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Redact Text (Click Text Blocks)</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={mode === "search" ? "default" : "ghost"}
                          className="h-8 w-10 p-0 rounded-lg shrink-0"
                          onClick={() => setMode("search")}
                        >
                          <Search className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search & Redact All</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={mode === "page" ? "default" : "ghost"}
                          className="h-8 w-10 p-0 rounded-lg shrink-0"
                          onClick={() => { setMode("page"); redactWholePage(); }}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Redact Whole Page</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {mode === "search" && (
                  <div className="flex items-center gap-2 animate-in slide-in-from-left-2 transition-all">
                    <div className="relative hidden md:block">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Keyword to redact..."
                        className="h-9 w-48 pl-9 text-[10px] font-black uppercase rounded-xl border-primary/20 focus-visible:ring-primary/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && redactAllSearchResults()}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9 rounded-xl px-3 text-[10px] font-black uppercase tracking-wider"
                      onClick={redactAllSearchResults}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-yellow-400" />}
                      Redact All Matches
                    </Button>
                  </div>
                )}

                {mode === "text" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 rounded-xl px-4 text-[10px] font-black uppercase border border-primary/20 hover:bg-primary/5"
                    onClick={runOcrOnCurrentPage}
                    disabled={isOcrLoading}
                  >
                    {isOcrLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Scan className="w-4 h-4 mr-2 text-primary" />}
                    Scan Page for Text (OCR)
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={undo} disabled={historyIndex < 0}>
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={redo} disabled={historyIndex >= history.length - 1}>
                    <Redo2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="h-8 w-px bg-border mx-1" />
                <Button
                  size="sm"
                  className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest shadow-glow h-10"
                  onClick={applyRedactions}
                  disabled={processing || redactions.length === 0}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2" />}
                  Finalize & Apply
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* ── LEFT SIDEBAR: THUMBNAILS ── */}
              <div className="w-[180px] border-r border-border flex flex-col shrink-0 bg-secondary/5 hidden md:flex text-left">
                <div className="p-4 border-b border-border bg-background">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Pages
                  </h3>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-4">
                    {previews.map((preview, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={cn(
                          "w-full group relative rounded-xl border-2 transition-all overflow-hidden bg-background",
                          currentPage === idx + 1 ? "border-primary shadow-lg scale-[1.02] ring-4 ring-primary/10" : "border-transparent opacity-70 hover:opacity-100 hover:border-primary/30"
                        )}
                      >
                        <img src={preview} className="w-full aspect-[1/1.414] object-cover" />
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-md backdrop-blur-sm font-black text-left min-w-[20px] text-center">
                          {idx + 1}
                        </div>
                        {redactions.some(r => r.pageIndex === idx) && (
                          <div className="absolute top-1 right-1 bg-primary text-white p-1 rounded-full shadow-md animate-in fade-in zoom-in">
                            <EyeOff className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* ── MAIN AREA: EDITOR ── */}
              <div className="flex-1 flex flex-col min-w-0 bg-secondary/10 relative">
                {/* Editor Controls Overlay */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-xl border border-border/50 hover:bg-background" onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <div className="bg-background/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm border border-border text-[9px] font-black text-center text-primary">
                    {Math.round(zoom * 100)}%
                  </div>
                  <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-xl border border-border/50 hover:bg-background" onClick={() => setZoom(prev => Math.max(0.3, prev - 0.1))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </div>

                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-background/90 backdrop-blur px-4 py-2 rounded-full border border-border shadow-2xl">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] font-black min-w-[70px] text-center uppercase tracking-tighter text-primary">
                    Page {currentPage} of {previews.length}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10" onClick={() => setCurrentPage(prev => Math.min(previews.length, prev + 1))} disabled={currentPage === previews.length}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="min-h-full flex items-center justify-center p-8 md:p-14">
                    {previews.length > 0 && pageSizes.length > 0 && (
                      <div
                        ref={mainPreviewRef}
                        className="relative bg-white shadow-[0_30px_70px_rgba(0,0,0,0.15)] border border-border/50 transition-all duration-300 ease-out select-none"
                        style={{
                          width: `${pageSizes[currentPage - 1].width * zoom}px`,
                          aspectRatio: `${pageSizes[currentPage - 1].width} / ${pageSizes[currentPage - 1].height}`,
                          cursor: mode === "area" ? "crosshair" : mode === "text" ? "text" : "default"
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <img
                          src={previews[currentPage - 1]}
                          className="w-full h-full object-contain pointer-events-none"
                          draggable={false}
                        />

                        {/* Interactive Text Layer (Click to redact) */}
                        {(mode === "text" || mode === "search") && pageTextItems.map((item, id) => {
                          const isMatch = mode === "search" && searchQuery.length > 1 && item.str.toLowerCase().includes(searchQuery.toLowerCase());
                          return (
                            <div
                              key={id}
                              className={cn(
                                "absolute transition-all cursor-pointer",
                                mode === "text" ? "bg-primary/0 hover:bg-primary/20 border-b border-primary/0 hover:border-primary/40" :
                                  isMatch ? "bg-yellow-400/30 border border-yellow-600/50 animate-pulse" : "pointer-events-none opacity-0"
                              )}
                              style={{
                                left: `${item.rect.x}%`,
                                top: `${item.rect.y}%`,
                                width: `${item.rect.width}%`,
                                height: `${item.rect.height}%`
                              }}
                              onClick={() => mode === "text" && redactTextItem(item)}
                            />
                          );
                        })}

                        {/* Redaction Overlays */}
                        {redactions.filter(r => r.pageIndex === currentPage - 1).map(r => (
                          <div
                            key={r.id}
                            className={cn(
                              "absolute group border border-white/20 transition-all shadow-sm",
                              r.style === "black" ? "bg-black" :
                                r.style === "white" ? "bg-white border-border" :
                                  r.style === "blur" ? "bg-black/30 backdrop-blur-md" :
                                    "bg-black"
                            )}
                            style={{
                              left: `${r.rect.x}%`,
                              top: `${r.rect.y}%`,
                              width: `${r.rect.width}%`,
                              height: `${r.rect.height}%`,
                              zIndex: 5
                            }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); removeRedaction(r.id); }}
                              className="absolute -top-7 left-1/2 -translate-x-1/2 bg-destructive text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-[60]"
                            >
                              <Eraser className="w-3.5 h-3.5" />
                            </button>
                            {r.style === "custom" && (
                              <div className="flex items-center justify-center w-full h-full text-[8px] font-black text-white/70 overflow-hidden text-center p-0.5 uppercase tracking-tighter">
                                {r.customText}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Temporary Selection Rect */}
                        {tempRect && (
                          <div
                            className="absolute border-2 border-primary bg-primary/10 shadow-[0_0_0_1px_white] ring-1 ring-primary/30 z-[55]"
                            style={{
                              left: `${tempRect.x}%`,
                              top: `${tempRect.y}%`,
                              width: `${tempRect.width}%`,
                              height: `${tempRect.height}%`
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Mobile Floating Action */}
                <div className="md:hidden bg-background border-t border-border p-4">
                  <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-glow" onClick={applyRedactions}>
                    Process Document
                  </Button>
                </div>
              </div>

              {/* ── RIGHT PANEL: CONTROLS ── */}
              <div className="w-[300px] border-l border-border flex flex-col shrink-0 bg-background hidden xl:flex text-left">
                <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5" /> Tools & History
                  </h3>
                  <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-full">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black text-primary">{redactions.length} Marks</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 p-5">
                    <div className="space-y-8">
                      {/* Appearance Config */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Style Settings</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {(["black", "blur", "white", "custom"] as const).map(style => (
                            <button
                              key={style}
                              onClick={() => setSelectedStyle(style)}
                              className={cn(
                                "h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all relative overflow-hidden",
                                selectedStyle === style ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/30 hover:bg-secondary/50"
                              )}
                            >
                              <div className={cn(
                                "w-8 h-4 rounded-md shadow-sm border",
                                style === "black" ? "bg-black" :
                                  style === "white" ? "bg-white" :
                                    style === "blur" ? "bg-slate-300 blur-[1.5px]" :
                                      "bg-gradient-to-br from-primary to-primary-foreground"
                              )} />
                              <span className="text-[9px] font-black uppercase tracking-wider">{style}</span>
                              {selectedStyle === style && <Check className="absolute top-1 right-1 w-2.5 h-2.5 text-primary" />}
                            </button>
                          ))}
                        </div>

                        <AnimatePresence>
                          {selectedStyle === "custom" && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                              <Input
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                                placeholder="E.g. [SENSITIVE]"
                                className="h-10 rounded-xl text-xs mt-3 uppercase font-black tracking-widest border-primary/20 focus:border-primary"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Redaction List */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Layer List</h4>
                        </div>
                        <div className="space-y-2.5">
                          {redactions.length === 0 ? (
                            <div className="py-16 flex flex-col items-center text-center opacity-30 border-2 border-dashed border-border rounded-3xl">
                              <Sparkles className="w-8 h-8 mb-3" />
                              <p className="text-[10px] font-black uppercase">Start marking content</p>
                            </div>
                          ) : (
                            redactions.map(r => (
                              <div key={r.id} className="group p-3.5 rounded-2xl border border-border bg-secondary/20 flex items-center justify-between hover:border-primary/40 hover:bg-background transition-all">
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-3.5 h-3.5 rounded-full shadow-md shrink-0 border border-white/20",
                                    r.style === "black" ? "bg-black" :
                                      r.style === "white" ? "bg-white border-border" :
                                        r.style === "blur" ? "bg-slate-400" : "bg-primary"
                                  )} />
                                  <div>
                                    <p className="text-[10px] font-black uppercase leading-none mb-1">Page {r.pageIndex + 1}</p>
                                    <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">{r.type} Mark</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => removeRedaction(r.id)}>
                                  <Eraser className="w-4 h-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>

                  <div className="p-5 border-t border-border bg-secondary/5 space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-orange-400/5 border border-orange-400/20 text-orange-600">
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold leading-tight">Proceeding will permanently delete these bytes from the file. This action cannot be undone.</p>
                    </div>
                    <Button
                      className="w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
                      onClick={applyRedactions}
                      disabled={processing || redactions.length === 0}
                    >
                      {processing ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Lock className="w-5 h-5 mr-3" />}
                      Finalize Output
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Footer */}
            <div className="h-10 bg-muted/50 border-t border-border flex items-center justify-center px-4 shrink-0">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3 h-3 text-primary" /> MagicDOCX uses localized processing. Your files never leave your device.
              </p>
            </div>
          </div>
        )}
      </div>
      {files.length === 0 && (
        <ToolSeoSection
          toolName="Redact PDF Online"
          category="edit"
          intro="MagicDocx Redact PDF is a professional workspace for permanently removing sensitive information from your PDF documents. Choose from four redaction modes: draw a rectangle over any area, click on text blocks to redact individual words or sentences, search the entire document for a keyword and redact all occurrences at once, or redact an entire page. Four appearance styles are available: solid black, white cover, blur effect, or a custom label. The output PDF has the information permanently deleted — not just hidden."
          steps={[
            "Upload your PDF using the file upload area.",
            "Select your redaction tool from the toolbar: Area (draw box), Text (click words), Search & Redact All, or Full Page.",
            "For scanned PDFs, use the 'Scan Page for Text (OCR)' button to make text selectable first.",
            "Click 'Finalize & Apply' to permanently remove all marked content and download your redacted PDF."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Edit PDF", path: "/edit-pdf", icon: EyeOff },
            { name: "OCR PDF", path: "/ocr-pdf", icon: EyeOff },
            { name: "Add Watermark", path: "/watermark", icon: EyeOff },
            { name: "Compress PDF", path: "/compress-pdf", icon: EyeOff },
          ]}
          schemaName="Redact PDF Online"
          schemaDescription="Free online PDF redaction tool. Permanently remove sensitive text and areas using area, text, search, or full-page redaction modes."
        />
      )}
    </ToolLayout>
  );
};

export default RedactPdf;
