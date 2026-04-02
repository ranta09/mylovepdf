import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import * as pdfjsLib from "pdfjs-dist";
import {
  FileText, CheckCircle2,
  Type, Languages, ArrowRight, ArrowLeft, Loader2, ScanSearch, FileBox, AlertTriangle
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import BatchProcessingView from "@/components/BatchProcessingView";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { convertPdfToWord } from "@/lib/pdfToWordEngine";
import { validatePdfFile, sanitizeFilename } from "@/lib/fileValidation";
import { globalMemoryManager } from "@/lib/memoryManager";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// ─────────────────────────────────────────────────────────────────────────────
// Per-Page Canvas Component — solves race condition completely
// Each page manages its own lifecycle mount → render → display
// ─────────────────────────────────────────────────────────────────────────────
interface PdfPageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
}

const PdfPageCanvas: React.FC<PdfPageProps> = ({ pdfDoc, pageNumber, containerWidth }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      // Cancel any ongoing render task
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        // PDF.js pages are 1-indexed — always correct
        const page = await pdfDoc.getPage(pageNumber);

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        // Scale so the page fits the container width; clamp between 1.0 and 1.5
        const targetWidth = Math.max(containerWidth - 80, 400);
        const scale = Math.min(Math.max(targetWidth / unscaledViewport.width, 1.0), 1.5);
        const viewport = page.getViewport({ scale });

        if (cancelled) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) { setStatus("error"); return; }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Clear before render
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (cancelled) return;

        // Validate — check if canvas has non-white pixels (retry once if blank first page)
        const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 50), Math.min(canvas.height, 50));
        const hasContent = imageData.data.some((v, i) => i % 4 !== 3 && v !== 255);
        
        if (!hasContent && pageNumber === 1) {
          // Retry once for first page with higher scale
          const retryViewport = page.getViewport({ scale: 1.2 });
          canvas.width = retryViewport.width;
          canvas.height = retryViewport.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const retryTask = page.render({ canvasContext: ctx, viewport: retryViewport });
          renderTaskRef.current = retryTask;
          await retryTask.promise;
        }

        if (!cancelled) setStatus("done");
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") return;
        console.error(`[PDF Preview] Page ${pageNumber} render failed:`, err);
        if (!cancelled) setStatus("error");
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDoc, pageNumber, containerWidth]);

  return (
    <div className="relative group w-full">
      {/* Skeleton shown while loading */}
      {status === "loading" && (
        <div className="w-full bg-white dark:bg-zinc-800 border border-border/10 rounded-sm shadow-lg animate-pulse" style={{ minHeight: "400px" }}>
          <div className="flex items-center justify-center h-full opacity-30 pt-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="w-full bg-white dark:bg-zinc-800 border border-red-200 rounded-sm shadow flex items-center justify-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest" style={{ minHeight: "160px" }}>
          <AlertTriangle className="h-4 w-4" />
          Failed to render page {pageNumber}
        </div>
      )}

      {/* The actual canvas — hidden while loading to avoid flash of white */}
      <canvas
        ref={canvasRef}
        className={cn("block rounded-sm max-w-full shadow-2xl bg-white", status === "done" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none")}
      />

      {/* Page badge */}
      {status === "done" && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Page {pageNumber}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Friendly error message — no fake "check internet connection"
// ─────────────────────────────────────────────────────────────────────────────
function friendlyConversionError(err: any): string {
  const msg = (err?.message || "").toLowerCase();

  console.error("[PDF to Word] Conversion error details:", {
    message: err?.message,
    name: err?.name,
    stack: err?.stack,
  });

  if (msg.includes("password") || err?.name === "PasswordException")
    return "This PDF is password-protected. Please unlock it first using our Unlock PDF tool.";
  if (msg.includes("invalid pdf") || msg.includes("corrupted") || msg.includes("malformed"))
    return "The file appears to be corrupted or invalid. Please try a different PDF.";
  if (msg.includes("memory") || msg.includes("heap") || msg.includes("out of memory"))
    return "File is too large to process in your browser. Try splitting it into smaller parts first.";
  if (msg.includes("cancelled") || msg.includes("canceled"))
    return "Processing was cancelled. Please try again.";

  // IMPORTANT: do NOT surface "check internet connection" for local in-browser errors
  return "File generation failed. Please try again. If the issue persists, try a simpler PDF.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const PdfToWord = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("Analyzing structure...");

  const [conversionMode, setConversionMode] = useState<"exact" | "text">("exact");
  const [ocrLanguage] = useState("eng");

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(700);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanned, setIsScanned] = useState<boolean | null>(null);

  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing);
    return () => {
      setDisableGlobalFeatures(false);
      globalMemoryManager.cleanup();
    };
  }, [files.length, processing, setDisableGlobalFeatures]);

  // Track container width for proper page scaling
  useEffect(() => {
    const el = viewerContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    obs.observe(el);
    setContainerWidth(el.clientWidth || 700);
    return () => obs.disconnect();
  }, [viewerContainerRef.current]);

  useEffect(() => {
    if (files.length > 0) {
      loadPdf(files[0]);
    } else {
      setPdfDoc(null);
      setNumPages(0);
      setIsScanned(null);
    }
  }, [files]);

  const detectScanned = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<boolean> => {
    try {
      const checkPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= checkPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const visibleItems = textContent.items.filter((it: any) => "str" in it && it.str.trim().length > 0);
        if (visibleItems.length > 3) return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const loadPdf = async (file: File) => {
    setIsAnalyzing(true);
    setPdfDoc(null);
    setNumPages(0);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      console.log(`[PDF Preview] Loaded PDF: ${pdf.numPages} pages`);

      setPdfDoc(pdf);
      setNumPages(pdf.numPages);

      const scanned = await detectScanned(pdf);
      setIsScanned(scanned);
      setConversionMode(scanned ? "text" : "exact");
    } catch (error: any) {
      console.error("[PDF Preview] Load failed:", error);
      toast.error("Failed to load PDF. Please check the file is not corrupted.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const initiateConversion = () => {
    if (files.length === 0 || numPages === 0) return;
    setProcessing(true);
  };

  const resetAll = () => {
    globalMemoryManager.cleanup();
    setFiles([]);
    setPdfDoc(null);
    setNumPages(0);
    setIsScanned(null);
    setStatusText("Analyzing structure...");
  };

  return (
    <ToolLayout
      title="PDF to Word"
      description="Convert PDF documents into editable Word files"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="PDF to Word Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert PDF to Word (DOCX) online for free. Extract text and preserve layout. Fast, accurate, and secure PDF to Word conversion | no sign-up needed."
      toolId="pdf-to-word"
      hideHeader={files.length > 0 || processing}
      className="pdf-to-word-page font-sans text-foreground"
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {(files.length > 0 || processing) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">

          {processing ? (
             <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur-md overflow-y-auto p-6">
                <BatchProcessingView
                    files={files}
                    title="Converting to Word..."
                    onReset={resetAll}
                    processItem={async (file, onProgress) => {
                        const validation = await validatePdfFile(file);
                        if (!validation.valid) throw new Error(validation.error);
                        
                        // We only have page-count for files[0] loaded in the preview right now.
                        // Wait, convertPdfToWord without pages array converts all pages by default!
                        const pdfArrayBuffer = await file.arrayBuffer();
                        const pdfRef = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
                        const totalPages = pdfRef.numPages;
                        const pagesToConvert = Array.from({ length: totalPages }, (_, i) => i + 1);

                        const blob = await convertPdfToWord(
                            file,
                            { mode: conversionMode, pages: pagesToConvert, useOcr: conversionMode === "text", ocrLang: ocrLanguage },
                            (p) => onProgress(p)
                        );
                        if (!blob || blob.size === 0) throw new Error("Generated file is empty");
                        
                        const outName = sanitizeFilename(file.name.replace(/\.[^/.]+$/, "") + ".docx");
                        return { blob, filename: outName };
                    }}
                />
             </div>
          ) : (
            <>
              {/* LEFT: PDF Viewer */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-[#F0F0F0] dark:bg-zinc-950 flex flex-col h-[60vh] lg:h-full overflow-hidden shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-3 shrink-0 shadow-sm backdrop-blur-md">
                  <Button variant="ghost" size="icon" onClick={resetAll} className="h-8 w-8 rounded-full hover:bg-secondary/20 hover:text-red-500 transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col">
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{files[0]?.name}</h4>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                      {isAnalyzing ? "Loading preview…" : `${numPages} page${numPages !== 1 ? "s" : ""} — PDF Preview`}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar py-8 px-4 flex flex-col items-center gap-6" ref={viewerContainerRef}>
                  {isAnalyzing || !pdfDoc ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-50">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest">Loading document…</span>
                    </div>
                  ) : (
                    // Each page is an independent component with its own lifecycle
                    Array.from({ length: numPages }, (_, i) => (
                      <PdfPageCanvas
                        key={i}
                        pdfDoc={pdfDoc}
                        pageNumber={i + 1}
                        containerWidth={containerWidth}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* RIGHT: Settings */}
              <div className="flex-1 bg-background flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2 shrink-0">
                  <ScanSearch className="h-4 w-4 text-red-600" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Document Intel</span>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Analysis Summary</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-secondary/30 rounded-xl border flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">File Size</span>
                          <span className="text-sm font-black">{files[0] ? formatSize(files[0].size) : "—"}</span>
                        </div>
                        <div className="p-4 bg-secondary/30 rounded-xl border flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Pages</span>
                          <span className="text-sm font-black">{numPages === 0 ? "—" : numPages}</span>
                        </div>
                      </div>

                      {isScanned !== null && (
                        <div className={cn("p-5 rounded-2xl border-2 flex items-start gap-4 relative overflow-hidden", isScanned ? "border-amber-500/50 bg-amber-500/5" : "border-emerald-500/50 bg-emerald-500/5")}>
                          <div className={cn("absolute inset-0 opacity-10 blur-xl", isScanned ? "bg-amber-500" : "bg-emerald-500")} />
                          <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center relative z-10", isScanned ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600")}>
                            {isScanned ? <Languages className="h-5 w-5" /> : <FileBox className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 relative z-10">
                            <h4 className={cn("text-xs font-black uppercase tracking-widest", isScanned ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                              {isScanned ? "Scanned PDF Detected" : "Text-Based PDF Detected"}
                            </h4>
                            <p className="text-[10px] font-medium leading-relaxed mt-1 text-muted-foreground">
                              {isScanned
                                ? "No embedded text found. OCR mode is auto-selected to extract text from images."
                                : "Vector text layer found. Exact Layout mode preserves formatting precisely."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Extraction Mode</h3>
                      <div className="space-y-3">
                        {[
                          { value: "exact" as const, label: "Exact Layout", desc: "Best for text-based PDFs. Preserves formatting, headings, and tables.", icon: <Type className="h-4 w-4" />, disabled: isScanned === true },
                          { value: "text" as const, label: "Text Machine (OCR)", desc: "Applies AI-based OCR. Best for scanned or image-based PDFs.", icon: <Languages className="h-4 w-4" />, disabled: false },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setConversionMode(opt.value)}
                            disabled={opt.disabled ?? false}
                            className={cn(
                              "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left",
                              conversionMode === opt.value ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30",
                              opt.disabled && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            <div className={cn("h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center", conversionMode === opt.value ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                              {opt.icon}
                            </div>
                            <div className="flex-1">
                              <p className={cn("text-xs font-black uppercase tracking-widest", conversionMode === opt.value ? "text-red-600" : "text-foreground")}>{opt.label}</p>
                              <p className="text-[9px] font-bold text-muted-foreground mt-1 leading-tight normal-case">{opt.desc}</p>
                            </div>
                            {conversionMode === opt.value && <CheckCircle2 className="h-5 w-5 text-red-500 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border bg-card shrink-0">
                  <Button
                    size="lg"
                    onClick={initiateConversion}
                    disabled={processing || isAnalyzing || numPages === 0}
                    className="w-full h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 transition-all gap-2 active:scale-[0.98]"
                  >
                    Generate Word File <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {files.length === 0 && !processing && (
        <ToolUploadScreen
          title="PDF to Word"
          description="Convert PDF documents into editable Word files"
          buttonLabel="Select PDF file"
          accept=".pdf"
          multiple={true}
          maxSize={50}
          onFilesSelected={setFiles}
        />
      )}

      {!files.length && !processing && (
        <ToolSeoSection
          toolName="PDF to Word Converter Online"
          category="convert"
          intro="MagicDocx PDF to Word converter intelligently extracts and reconstructs your PDF into a fully editable Microsoft Word document. Text-based PDFs get exact layout preservation; scanned PDFs get Tesseract OCR treatment."
          steps={[
            "Upload your PDF file to the secure dropzone.",
            "Document Intel auto-detects whether it's text-based or scanned.",
            "Choose Exact Layout or OCR mode and click Generate.",
            "Download your fully editable .docx file instantly."
          ]}
          formats={["PDF", "DOCX"]}
          relatedTools={[
            { name: "Sign PDF", path: "/sign-pdf", icon: FileText },
            { name: "Unlock PDF", path: "/unlock-pdf", icon: FileText },
            { name: "Protect PDF", path: "/protect-pdf", icon: FileText },
          ]}
          schemaName="PDF to Word Converter Online"
          schemaDescription="Free online PDF to Word converter with layout preservation and OCR support."
        />
      )}
    </ToolLayout>
  );
};

export default PdfToWord;
