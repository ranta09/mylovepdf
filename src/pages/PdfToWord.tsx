import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import * as pdfjsLib from "pdfjs-dist";
import {
  FileText, FileBox, CheckCircle2, RotateCcw,
  ShieldCheck, Settings, Layout, Sparkles, Upload,
  Maximize, Layers, Image as ImageIcon, Globe,
  Type, Languages, Download, FileDown,
  MousePointer2, Loader2, X, Sparkle, Search, Plus, ArrowRight, ArrowLeft, RefreshCw
} from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { saveAs } from "file-saver";
import { convertPdfToWord } from "@/lib/pdfToWordEngine";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToWord = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analyzing structure...");

  // Settings State
  const [outputFormat, setOutputFormat] = useState("docx");
  const [conversionMode, setConversionMode] = useState<"exact" | "text">("exact");
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState("eng");
  const [imageHandling, setImageHandling] = useState("keep");
  const [pageRange, setPageRange] = useState("all");
  const [customRange, setCustomRange] = useState("");

  // Modal State
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [pendingConversion, setPendingConversion] = useState<{ file: File, isScanned: boolean } | null>(null);

  // Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  useEffect(() => {
    if (files.length > 0) {
      loadPdf(files[0]);
    } else {
      setPdfDoc(null);
      setNumPages(0);
      setThumbnails([]);
    }
  }, [files]);

  const loadPdf = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);

      // Generate thumbnails
      const thumbs: string[] = [];
      const count = Math.min(pdf.numPages, 10); // Limit thumbs for performance
      for (let i = 1; i <= count; i++) {
        const page = await pdf.getPage(i);
        const canvas = document.createElement("canvas");
        const viewport = page.getViewport({ scale: 0.2 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
        thumbs.push(canvas.toDataURL());
      }
      setThumbnails(thumbs);
    } catch (error) {
      console.error("PDF loading failed:", error);
      toast.error("Failed to load PDF preview.");
    }
  };

  const detectScanned = async (file: File): Promise<boolean> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Check first few pages for text content
      const checkPages = Math.min(pdf.numPages, 3);
      let hasText = false;

      for (let i = 1; i <= checkPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.length > 0) {
          hasText = true;
          break;
        }
      }
      return !hasText;
    } catch (e) {
      console.error("Detection failed:", e);
      return false;
    }
  };

  const convert = async (forceOcr?: boolean) => {
    if (files.length === 0) return;

    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`File ${file.name} is not a PDF.`);
        return;
      }
    }

    // Check if any file is scanned
    if (!forceOcr && conversionMode === 'exact') {
      const isScanned = await detectScanned(files[0]);
      if (isScanned) {
        setPendingConversion({ file: files[0], isScanned: true });
        setShowOcrModal(true);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);

    const newResults: ProcessingResult[] = [];

    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let pagesToConvert: number[] = [];
        if (pageRange === "all") {
          pagesToConvert = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
        } else {
          const parts = customRange.split(',').map(p => p.trim());
          parts.forEach(p => {
            if (p.includes('-')) {
              const [start, end] = p.split('-').map(Number);
              if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) if (i > 0 && i <= pdf.numPages) pagesToConvert.push(i);
              }
            } else {
              const n = Number(p);
              if (!isNaN(n) && n > 0 && n <= pdf.numPages) pagesToConvert.push(n);
            }
          });
          pagesToConvert = [...new Set(pagesToConvert)].sort((a, b) => a - b);
        }

        if (pagesToConvert.length === 0) {
          toast.error("Invalid page range specified.");
          setProcessing(false);
          return;
        }

        const blob = await convertPdfToWord(file, {
          mode: conversionMode,
          pages: pagesToConvert,
          useOcr: !!forceOcr || conversionMode === 'text',
          ocrLang: ocrLanguage
        }, (p, s) => {
          setProgress(p);
          setStatusText(s);
        });

        const outName = file.name.replace(/\.[^/.]+$/, "") + "_converted.docx";
        saveAs(blob, outName);
        newResults.push({ file: blob, url: URL.createObjectURL(blob), filename: outName });
      }

      setResults(newResults);
      toast.success("Conversion successful!");
    } catch (error) {
      console.error(error);
      toast.error("Conversion failed");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setResults([]);
    setProgress(0);
    setStatusText("Analyzing structure...");
  };

  const FileCard = ({ file, index }: { file: File, index: number }) => {
    const [thumb, setThumb] = useState<string | null>(null);

    useEffect(() => {
      const generateThumb = async () => {
        try {
          const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context!, viewport }).promise;
          setThumb(canvas.toDataURL());
        } catch (e) {
          console.error(e);
        }
      };
      generateThumb();
    }, [file]);

    return (
      <div className="relative group w-full max-w-[220px]">
        <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-transparent group-hover:border-red-500 transition-all duration-300 flex flex-col items-center">
          <div className="absolute top-3 left-3 h-6 w-6 rounded-lg bg-secondary flex items-center justify-center text-[9px] font-black tabular-nums text-muted-foreground z-10 group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm">
            {index + 1}
          </div>

          <div className="aspect-[3/4] w-full rounded-2xl bg-secondary/30 overflow-hidden border border-border/50 relative mb-4">
            {thumb ? (
              <img src={thumb} alt="thumb" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
          </div>

          <div className="w-full text-center space-y-1">
            <p className="text-[11px] font-black text-foreground truncate w-full px-2" title={file.name}>{file.name}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">{formatSize(file.size)}</span>
              <span className="text-[9px] font-black text-red-600/60 uppercase tracking-tighter italic">PDF</span>
            </div>
          </div>

          <button
            onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-lg border border-border flex items-center justify-center text-muted-foreground hover:text-red-500 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <ToolLayout
      title="PDF to Word"
      description="Convert PDF documents into editable Word files"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="PDF to Word Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert PDF to Word (DOCX) online for free. Extract text and preserve layout. Fast, accurate, and secure PDF to Word conversion — no sign-up needed."
      toolId="pdf-to-word"
      hideHeader={results.length > 0}
      className="pdf-to-word-page"
    >
      <style>{`
        .pdf-to-word-page h1, 
        .pdf-to-word-page h2, 
        .pdf-to-word-page h3,
        .pdf-to-word-page span,
        .pdf-to-word-page button,
        .pdf-to-word-page p,
        .pdf-to-word-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>
      {results.length > 0 ? (
        <ResultView
          results={results}
          hideShare={true}
          hideIndividualDownload={true}
          onReset={resetAll}
        />
      ) : processing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-secondary/5 min-h-[60vh]">
          <div className="w-full max-w-lg space-y-8 text-center">
            <div className="relative flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-red-500/20 border-t-red-600 animate-spin" />
              <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground">{statusText}</h3>
              <Progress value={progress} className="h-3 rounded-full bg-secondary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tabular-nums">{progress}% Complete</p>
            </div>
          </div>
        </div>
      ) : files.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-display">
          {/* LEFT SIDE: Thumbnails Grid - 70% Width */}
          <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="h-8 w-8 p-0 rounded-full hover:bg-secondary/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                <div className="flex items-center gap-2 text-left">
                  <FileBox className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{files.length} Files</span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const newFiles = Array.from(e.target.files || []);
                  if (newFiles.length > 0) setFiles(prev => [...prev, ...newFiles]);
                }}
                accept=".pdf"
                multiple
                className="hidden"
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {files.map((file, idx) => (
                    <FileCard key={idx} file={file} index={idx} />
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] border-2 border-dashed border-border hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 hover:bg-red-500/5 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    Add More
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Settings Sidebar - 30% Width */}
          <div className="flex-1 lg:w-[30%] bg-secondary/10 flex flex-col overflow-hidden relative">
            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold uppercase tracking-tighter text-foreground font-heading">PDF to Word</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Conversion Modes</Label>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setConversionMode('exact')}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group",
                        conversionMode === 'exact' ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30"
                      )}
                    >
                      <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", conversionMode === 'exact' ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                        <Type className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-black uppercase tracking-widest", conversionMode === 'exact' ? "text-red-600" : "text-foreground")}>Exact Layout Conversion</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 leading-tight">Convert the PDF to Word while preserving the original layout, formatting, images, and structure as closely as possible.</p>
                      </div>
                      {conversionMode === 'exact' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    </button>

                    <button
                      onClick={() => setConversionMode('text')}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group",
                        conversionMode === 'text' ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30"
                      )}
                    >
                      <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", conversionMode === 'text' ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                        <Languages className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-xs font-black uppercase tracking-widest", conversionMode === 'text' ? "text-red-600" : "text-foreground")}>Text Only (OCR)</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 leading-tight">Extract only the text from the document and convert it into editable Word text using OCR.</p>
                      </div>
                      {conversionMode === 'text' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-border bg-card/80 backdrop-blur-md shrink-0">
              <Button
                onClick={() => convert()}
                disabled={processing}
                className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Convert to Word
                <ArrowRight className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <FileUpload
          accept=".pdf"
          onFilesChange={setFiles}
          files={files}
          label="Drop PDF here"
          maxSize={300}
        />
      )}

      <AlertDialog open={showOcrModal} onOpenChange={setShowOcrModal}>
        <AlertDialogContent className="max-w-md rounded-3xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-tighter text-center">
              You are trying to convert a scanned PDF
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-4 space-y-4">
              <p className="text-sm font-bold text-foreground">
                To extract content from scanned documents, OCR is required.
                Premium users can convert scanned PDFs to editable Word files using OCR.
              </p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider italic">
                Otherwise, the content of your document will be converted as an image inside a non-editable Word file.
              </p>
              <p className="text-sm font-bold uppercase tracking-widest pt-4">
                Do you want to apply OCR?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
              onClick={() => {
                setShowOcrModal(false);
                convert(); // Continue without OCR
              }}
            >
              Continue without OCR
            </Button>
            <AlertDialogAction asChild>
              <Button
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                onClick={() => {
                  setConversionMode("text");
                  convert(true); // Apply OCR
                }}
              >
                Apply OCR
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToolSeoSection
        toolName="PDF to Word Converter"
        category="convert"
        intro="MagicDocx PDF to Word converter lets you transform any PDF document into a fully editable Microsoft Word file in seconds. Whether you need to extract text for editing, reuse content from a report, or update an old document, our tool handles standard PDFs and scanned PDFs with OCR support. Download your converted DOCX file instantly — no email, no sign-up, no software required."
        steps={[
          "Upload your PDF file by dragging and dropping or clicking the upload zone.",
          "Choose a conversion mode: Exact Layout or OCR (for scanned PDFs).",
          "Click \"Convert to WORD\" — the conversion runs in your browser.",
          "Download your editable DOCX file immediately."
        ]}
        formats={["PDF", "DOC", "DOCX"]}
        relatedTools={[
          { name: "PDF to Excel", path: "/pdf-to-excel", icon: FileText },
          { name: "PDF to PPT", path: "/pdf-to-ppt", icon: FileText },
          { name: "Compress PDF", path: "/compress-pdf", icon: FileText },
          { name: "Merge PDF", path: "/merge-pdf", icon: FileText },
        ]}
        schemaName="PDF to Word Converter Online"
        schemaDescription="Free online PDF to Word converter. Convert PDF documents to editable DOCX files with layout preservation and OCR support."
      />
    </ToolLayout >
  );
};

export default PdfToWord;
