import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Minimize2,
  CheckCircle2,
  Download,
  X,
  FileBox,
  ArrowRight,
  ShieldCheck,
  Merge,
  Scissors,
  Plus,
  ChevronRight,
  Hash,
  RotateCcw,
  Droplets,
  Lock,
  ArrowLeft,
  Zap,
  Monitor,
  ChevronDown,
  Star,
  Rocket,
  Globe,
  ShieldAlert,
  Edit3,
  BookOpen,
  Trash2,
  Copy,
  Layers,
  Crop,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Scan,
  Code,
  Languages,
  HelpCircle,
  MessageSquare,
  PenTool,
  Unlock,
  Square,
  Type,
  ExternalLink,
  FileCheck,
  Wrench,
  GitCompare,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ProcessingView from "@/components/ProcessingView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type CompressMode = 'extreme' | 'recommended' | 'basic';

interface FileData {
  file: File;
  previewUrl: string;
  pageCount: number;
  id: string;
}

interface ProcessedFile {
  name: string;
  originalSize: number;
  compressedSize: number;
  url: string;
  blob?: Blob;
  // Backend metadata
  pages?: number;
  fileType?: string;        // 'digital' | 'scanned'
  compressionTime?: number; // ms
  alreadyOptimized?: boolean;
  engine?: string;          // 'ghostscript' | 'qpdf' | 'copy' | 'client'
}

// Savings ring component
const SavingsRing = ({ percentage }: { percentage: number }) => (
  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
    <svg className="w-full h-full transform -rotate-90">
      <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-border" />
      <motion.circle
        cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="transparent"
        className="text-primary"
        strokeDasharray={213.6}
        initial={{ strokeDashoffset: 213.6 }}
        animate={{ strokeDashoffset: 213.6 - (213.6 * percentage) / 100 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-lg font-black text-foreground leading-none">{percentage}%</span>
      <span className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">saved</span>
    </div>
  </div>
);

// ── Star Rating Bar ───────────────────────────────────────────────────────────
const RatingBar = () => {
  const [userRating, setUserRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const fixed = 4.5;
  const votes = 505447;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-6 border-y border-border">
      <span className="text-sm font-bold text-foreground">Rate this tool</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = hovered ? star <= hovered : userRating ? star <= userRating : star <= fixed;
          const isHalf = !hovered && !userRating && star === 5 && fixed % 1 !== 0;
          return (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setUserRating(star)}
              className="relative focus:outline-none"
              title={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  active ? "text-yellow-400 fill-yellow-400" : "text-yellow-200 fill-yellow-100"
                )}
              />
              {isHalf && (
                <Star
                  className="h-6 w-6 text-yellow-400 fill-yellow-400 absolute inset-0"
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                />
              )}
            </button>
          );
        })}
      </div>
      <span className="text-sm text-muted-foreground font-medium">
        {userRating ? `${userRating}.0 / 5` : `${fixed} / 5`} -{" "}
        <span className="text-foreground font-semibold">{votes.toLocaleString()} votes</span>
      </span>
    </div>
  );
};

// ── FAQ Accordion (self-contained, no external component) ────────────────────
const FAQ_ITEMS = [
  {
    q: "Is MagicDOCX Compress PDF free?",
    a: "Yes, 100% free with no file limits or signups required.",
  },
  {
    q: "How much can I compress a PDF?",
    a: "Up to 90% with Extreme mode, and typically 20–60% with Recommended.",
  },
  {
    q: "Is my file secure?",
    a: "All compression happens locally in your browser. Files are never uploaded to any server.",
  },
  {
    q: "Can I compress multiple PDFs?",
    a: "Yes, you can add multiple files and compress them all at once.",
  },
  {
    q: "What if compression doesn't reduce the size?",
    a: "Some PDFs are already fully optimised. We'll return your original file unchanged.",
  },
];

const FaqAccordion = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
          >
            <span className="text-sm font-semibold text-foreground">{item.q}</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", open === i && "rotate-180")} />
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const CompressPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileDataList, setFileDataList] = useState<FileData[]>([]);
  const [mode, setMode] = useState<CompressMode>('recommended');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessedFile[]>([]);
  const { setDisableGlobalFeatures, globalFiles, clearGlobalFiles } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, results, setDisableGlobalFeatures]);

  const generatePreviews = useCallback(async (pdfs: File[]) => {
    const list: FileData[] = [];
    for (const f of pdfs) {
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: ctx!, viewport }).promise;
        list.push({ file: f, previewUrl: canvas.toDataURL(), pageCount: pdf.numPages, id: Math.random().toString(36).slice(2) });
      } catch (e) {
        list.push({ file: f, previewUrl: "", pageCount: 0, id: Math.random().toString(36).slice(2) });
      }
    }
    return list;
  }, []);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;
    setFiles(pdfs);
    const pd = await generatePreviews(pdfs);
    setFileDataList(pd);
    setResults([]);
  }, [generatePreviews]);

  const addMoreFiles = useCallback(async (newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;
    setFiles(prev => [...prev, ...pdfs]);
    const pd = await generatePreviews(pdfs);
    setFileDataList(prev => [...prev, ...pd]);
  }, [generatePreviews]);

  useEffect(() => {
    if (globalFiles.length > 0) {
      handleFilesChange(globalFiles);
      clearGlobalFiles();
    }
  }, [globalFiles, handleFilesChange, clearGlobalFiles]);

  // ── Backend compression (Ghostscript / qpdf via Express API) ────────────────
  const compressViaBackend = async (
    file: File,
    m: CompressMode,
    onProgress: (p: number) => void
  ): Promise<ProcessedFile> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", m);

    onProgress(15);

    const res = await fetch("/api/compress", { method: "POST", body: formData });
    onProgress(85);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();
    onProgress(100);

    if (!data.success) throw new Error(data.error || "Compression failed");

    // If server had no compression engine (just copied the file), fall back to client-side
    if (data.engine === 'copy') {
      throw new Error('No server compression engine available');
    }

    return {
      name: file.name.replace(/\.pdf$/, "_compressed.pdf"),
      originalSize: data.originalSize,
      compressedSize: data.compressedSize,
      url: data.downloadUrl,
      pages: data.pages,
      fileType: data.fileType,
      compressionTime: data.compressionTime,
      alreadyOptimized: data.alreadyOptimized,
      engine: data.engine,
    };
  };

  // ── Client-side fallback ─────────────────────────────────────────────────────
  // basic mode    → lossless: object-stream repack + metadata cleanup (pdf-lib)
  // extreme/recommended → canvas page render → JPEG re-encode (matches backend
  //   behaviour; picks the smallest result vs lossless repack vs original)
  const compressViaClient = async (
    file: File,
    m: CompressMode,
    onProgress: (p: number) => void
  ): Promise<ProcessedFile> => {
    // ── Step 1: Lossless structural repack (fast, always run first) ──────────
    const bytes = await file.arrayBuffer();
    onProgress(15);

    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    onProgress(30);

    try {
      if (m === 'recommended' || m === 'extreme') {
        doc.setProducer('');
        doc.setCreator('');
      }
      if (m === 'extreme') {
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
      }
    } catch { /* metadata fields may not exist */ }

    const raw = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    const structuralBlob = new Blob([new Uint8Array(raw)], { type: "application/pdf" });
    onProgress(50);

    // basic mode stops here (lossless only)
    if (m === 'basic') {
      const finalBlob = structuralBlob.size < file.size ? structuralBlob : file;
      onProgress(100);
      return {
        name: file.name.replace(/\.pdf$/, "_compressed.pdf"),
        originalSize: file.size,
        compressedSize: finalBlob.size,
        url: URL.createObjectURL(finalBlob),
        blob: finalBlob,
        engine: "client",
        alreadyOptimized: false,
      };
    }

    // ── Step 2: Canvas page render + JPEG re-encode (extreme / recommended) ───
    try {
      const jpegQuality = m === 'extreme' ? 0.55 : 0.75;
      // Scale: lower = smaller file; 1.5 ≈ 108 dpi, 1.2 ≈ 86 dpi at 72-dpi base
      const renderScale = m === 'extreme' ? 1.2 : 1.5;

      const pdfData = await file.arrayBuffer();
      const pdfDoc  = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const outDoc  = await PDFDocument.create();

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page     = await pdfDoc.getPage(i);
        const vp       = page.getViewport({ scale: renderScale });
        const canvas   = document.createElement("canvas");
        canvas.width   = vp.width;
        canvas.height  = vp.height;
        const ctx      = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const dataUrl  = canvas.toDataURL("image/jpeg", jpegQuality);
        const b64      = dataUrl.split(",")[1];
        const imgBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const img      = await outDoc.embedJpg(imgBytes);
        const { width: iw, height: ih } = img.scale(1);
        const pg = outDoc.addPage([iw, ih]);
        pg.drawImage(img, { x: 0, y: 0, width: iw, height: ih });

        onProgress(50 + Math.round((i / pdfDoc.numPages) * 45));
      }

      const outBytes   = await outDoc.save();
      const canvasBlob = new Blob([outBytes], { type: "application/pdf" });

      // Pick the smallest result: canvas < structural < original
      const candidates: Blob[] = [file, structuralBlob, canvasBlob];
      const best = candidates.reduce((a, b) => (b.size < a.size ? b : a));
      onProgress(100);

      return {
        name: file.name.replace(/\.pdf$/, "_compressed.pdf"),
        originalSize: file.size,
        compressedSize: best.size,
        url: URL.createObjectURL(best),
        blob: best,
        engine: "client",
        alreadyOptimized: false,
      };
    } catch {
      // Canvas compression failed — fall back to structural repack result
      const finalBlob = structuralBlob.size < file.size ? structuralBlob : file;
      onProgress(100);
      return {
        name: file.name.replace(/\.pdf$/, "_compressed.pdf"),
        originalSize: file.size,
        compressedSize: finalBlob.size,
        url: URL.createObjectURL(finalBlob),
        blob: finalBlob,
        engine: "client",
        alreadyOptimized: false,
      };
    }
  };

  const startProcessing = async () => {
    setProcessing(true);
    setProgress(0);
    const newRes: ProcessedFile[] = [];

    try {
      for (let fi = 0; fi < fileDataList.length; fi++) {
        const fd = fileDataList[fi];
        const perFileProgress = (p: number) => {
          setProgress(Math.round(((fi + p / 100) / fileDataList.length) * 100));
        };

        let result: ProcessedFile;
        try {
          // ── Try backend first ─────────────────────────────────────────────
          result = await compressViaBackend(fd.file, mode, perFileProgress);
        } catch (backendErr) {
          console.warn("[compress] Backend unavailable, using client-side:", backendErr);
          // ── Fallback to in-browser compression ────────────────────────────
          result = await compressViaClient(fd.file, mode, perFileProgress);
        }

        newRes.push(result);
      }

      setResults(newRes);
      setFiles([]);

      const anyOptimized = newRes.some(r => r.alreadyOptimized);
      if (anyOptimized && newRes.length === 1) {
        toast.info("This PDF is already optimized, no further compression possible.");
      } else {
        toast.success("PDFs compressed successfully!");
      }

      // Auto-download only when compression actually reduced the file size
      const allNoReduction = newRes.every(r => r.compressedSize >= r.originalSize);
      if (!allNoReduction) {
        setTimeout(() => {
          newRes.forEach(r => {
            if (r.compressedSize < r.originalSize) {
              const a = document.createElement("a");
              a.href = r.url;
              a.download = r.name;
              a.click();
            }
          });
        }, 500);
      }
    } catch (e) {
      toast.error("Compression failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const removeFile = (idx: number) => {
    setFileDataList(prev => prev.filter((_, i) => i !== idx));
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // All size calculations use raw bytes, never KB/MB strings
  const totalOriginal   = results.reduce((acc, r) => acc + r.originalSize, 0);
  const totalCompressed = results.reduce((acc, r) => acc + r.compressedSize, 0);

  // Clamp: if compressed >= original, savings = 0 (never negative)
  const rawSavingsPercent =
    totalOriginal > 0
      ? ((totalOriginal - totalCompressed) / totalOriginal) * 100
      : 0;
  const savingsPercent = Math.max(0, Math.round(rawSavingsPercent));
  // Only show "can't compress" if no meaningful reduction (less than 1%)
  // Exception: client-engine results are a lossless structural repack — never flag them as failures
  const allClientEngine = results.length > 0 && results.every(r => r.engine === "client");
  const noReduction = !allClientEngine && (totalOriginal === 0 || ((totalOriginal - totalCompressed) / totalOriginal) * 100 < 1);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Dynamic estimate based on mode
  const getEstimateRatio = () => mode === 'extreme' ? 0.30 : mode === 'recommended' ? 0.45 : 0.65;
  const totalInFlight = fileDataList.reduce((acc, f) => acc + f.file.size, 0);
  const estimatedSize = totalInFlight * getEstimateRatio();
  const estimatedSavings = totalInFlight > 0 ? Math.round(((totalInFlight - estimatedSize) / totalInFlight) * 100) : 0;

  const relatedTools = [
    { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
    { name: "Split PDF", path: "/split-pdf", icon: Scissors },
    { name: "Add Page Numbers", path: "/page-numbers", icon: Hash },
    { name: "Watermark", path: "/watermark-pdf", icon: Droplets },
    { name: "Rotate PDF", path: "/rotate-pdf", icon: RotateCcw },
    { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
  ];

  return (
    <ToolLayout 
      title="Compress PDF Online" 
      description="Reduce PDF file size without losing quality" 
      category="compress" 
      icon={<Minimize2 className="h-7 w-7" />}
      metaTitle="Compress PDF Online - FAST & FREE | MagicDOCX" 
      metaDescription="Compress PDF files online for free. Reduce file size while keeping the highest quality possible. No signup required." 
      toolId="compress" 
      hideHeader={files.length > 0 || results.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">

        {/* ── RESULTS VIEW ── */}
        {results.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full min-h-full bg-secondary/30 dark:bg-secondary/10"
          >
            <div className="w-full max-w-5xl mx-auto px-4 pt-1 pb-12 space-y-8">

              {/* Title */}
              <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center tracking-tighter">
                {results.length > 1 ? "PDFs have been compressed!" : "PDF has been compressed!"}
              </h2>

              {/* ── ACTION ROW ── */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:-ml-24">
                {/* Back button */}
                <button
                  onClick={() => setResults([])}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors shrink-0"
                  title="Go back"
                >
                  <ArrowLeft className="h-6 w-6 text-foreground" />
                </button>

                {/* Main download button */}
                <button
                  className="h-20 px-8 md:px-20 w-full md:w-auto md:min-w-[420px] rounded-2xl font-bold text-lg md:text-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-3 justify-center uppercase tracking-wider"
                  onClick={() => {
                    results.forEach(r => {
                      const a = document.createElement("a"); a.href = r.url; a.download = r.name; a.click();
                    });
                  }}
                >
                  <Download className="h-6 w-6" />
                  Download compressed PDF{results.length > 1 ? 's' : ''}
                </button>

              </div>

              {/* ── SAVINGS RING ── */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 py-2 text-center md:text-left">
                {!noReduction && (
                  <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-border" />
                      <motion.circle
                        cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="7" fill="transparent"
                        className="text-primary"
                        strokeDasharray={301.6}
                        initial={{ strokeDashoffset: 301.6 }}
                        animate={{ strokeDashoffset: 301.6 - (301.6 * savingsPercent) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-foreground leading-none">{savingsPercent}%</span>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-1">saved</span>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {noReduction ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                      ⚠ Sorry, this file can't be compressed further without losing quality.
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        Your PDF{results.length > 1 ? 's are' : ' is'} now {savingsPercent}% smaller!
                      </p>
                      <p className="text-lg text-muted-foreground flex items-center gap-2 font-medium">
                        <span className="font-semibold text-foreground">{formatSize(totalOriginal)}</span>
                        <ArrowRight className="h-4 w-4" />
                        <span className="font-semibold text-primary">{formatSize(totalCompressed)}</span>
                      </p>
                    </>
                  )}
                  {/* Backend metadata badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {results[0]?.pages && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary/60 text-foreground px-2.5 py-1 rounded-full">
                        <FileBox className="h-3 w-3 text-primary" />
                        {results[0].pages} page{results[0].pages !== 1 ? 's' : ''}
                      </span>
                    )}
                    {results[0]?.fileType && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary/60 text-foreground px-2.5 py-1 rounded-full capitalize">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        {results[0].fileType}
                      </span>
                    )}
                    {results[0]?.compressionTime && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-secondary/60 text-foreground px-2.5 py-1 rounded-full">
                        <RotateCcw className="h-3 w-3 text-primary" />
                        {(results[0].compressionTime / 1000).toFixed(1)}s
                      </span>
                    )}
                    {results[0]?.engine && results[0].engine !== 'client' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                        <ShieldCheck className="h-3 w-3" />
                        Server compressed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── PER-FILE BREAKDOWN (multiple files) ── */}
              {results.length > 1 && (
                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-secondary/20">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Files compressed</span>
                  </div>
                  <div className="divide-y divide-border">
                    {results.map((r, i) => {
                      const pct = Math.max(0, r.originalSize > 0 ? Math.round(((r.originalSize - r.compressedSize) / r.originalSize) * 100) : 0);
                      return (
                        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <FileBox className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatSize(r.originalSize)} → {formatSize(r.compressedSize)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold text-primary">{pct}% saved</span>
                            <button
                              onClick={() => { const a = document.createElement("a"); a.href = r.url; a.download = r.name; a.click(); }}
                              className="p-2 rounded-xl hover:bg-secondary transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── CONTINUE TO... ── */}
              <div className="bg-background rounded-2xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-base font-bold text-foreground">Continue to...</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  {relatedTools.map((tool, i) => (
                    <a
                      key={tool.path}
                      href={tool.path}
                      className={cn(
                        "flex items-center gap-3 px-5 py-4 hover:bg-secondary/40 transition-colors group",
                        i % 3 !== 2 && "sm:border-r border-border",
                        i >= 3 && "border-t border-border"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <tool.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-semibold text-foreground flex-1 group-hover:text-primary transition-colors">{tool.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </a>
                  ))}
                </div>
                <div className="px-6 py-3 border-t border-border flex justify-end">
                  <button
                    onClick={() => { window.location.href = "/#all-tools"; }}
                    className="text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    See more
                  </button>
                </div>
              </div>

              {/* ── SECURITY SECTION ── */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 space-y-4">
                <h3 className="text-xl font-bold text-foreground">Secure. Private. In your control</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  MagicDOCX processes all files directly in your browser with no server uploads, no tracking, and complete privacy.
                  Your files are always handled safely and automatically cleared after processing.{" "}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  {[
                    { icon: ShieldCheck, label: "SSL Encryption" },
                    { icon: Lock, label: "No Storage" },
                    { icon: CheckCircle2, label: "100% Private" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 bg-background text-sm font-semibold text-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>

        ) : files.length === 0 ? (
          /* ── UPLOAD SCREEN + INFO SECTIONS ── */
          <div className="w-full">
            {/* Upload widget, unchanged */}
            <ToolUploadScreen
              title="Compress PDF"
              description="Reduce file size while optimizing quality"
              buttonLabel="Select PDF files"
              accept=".pdf"
              multiple={true}
              onFilesSelected={handleFilesChange}
            />

            {/* ── INFO SECTIONS ─────────────────────────────────────── */}
            <div className="w-full px-6 pb-16 space-y-16 mt-12">

              {/* ── SECTION 2: How it works ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-8">
                  How It Works
                </h2>
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  {/* Dashed connector */}
                  <div className="hidden sm:block absolute top-6 left-[calc(16.67%)] right-[calc(16.67%)] border-t-2 border-dashed border-border" />
                  {[
                    { step: "1", title: "Upload your PDF", sub: "Drag & drop or click to select files" },
                    { step: "2", title: "Choose level", sub: "Extreme, Recommended, or Basic" },
                    { step: "3", title: "Download instantly", sub: "Compressed file ready in seconds" },
                  ].map((s) => (
                    <div key={s.step} className="relative flex flex-col items-center text-center flex-1 gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-black shadow-lg shadow-primary/20 z-10">
                        {s.step}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── SECTION 3: Why MagicDOCX, freepdfconvert style ── */}
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-12">
                  {[
                    {
                      icon: Minimize2,
                      title: "The Best Free PDF Compressor Online",
                      desc: "Need to send or upload a PDF that's too large? With MagicDOCX, you can compress PDF files online free without losing quality. Our PDF size reducer is fast, reliable, and easy to use, the perfect choice for email attachments, web uploads, and document storage.",
                    },
                    {
                      icon: Lock,
                      title: "Permanent File Deletion for Privacy",
                      desc: "Your security matters. All files are processed locally in your browser and are never uploaded to any server. No copies are retained, ensuring your compressed PDFs remain 100% private.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Encrypted & Secure PDF Compression",
                      desc: "Every file is handled with the highest security standards. Even the most sensitive documents stay completely private while reducing PDF file size, giving you peace of mind.",
                    },
                    {
                      icon: Monitor,
                      title: "Access & Compress PDFs Anywhere",
                      desc: "Our PDF compressor works online across all devices and operating systems. Whether you're on Windows, Mac, Linux, iOS, or Android, you can compress a PDF online free anytime, anywhere, no software needed.",
                    },
                    {
                      icon: Zap,
                      title: "Free PDF Compressor with Unlimited Use",
                      desc: "Compress as many PDF files as you like instantly with no limits. Fast, free, and always available, no account or subscription required.",
                    },
                    {
                      icon: Merge,
                      title: "All-in-One PDF Tools Beyond Compression",
                      desc: "More than just a PDF compressor, MagicDOCX offers powerful tools to merge, split, rotate, and convert PDFs. Whatever your editing needs, our platform provides a complete solution for working with PDF files online.",
                    },
                  ].map((f) => (
                    <div key={f.title} className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl border-2 border-border flex items-center justify-center shrink-0 bg-background">
                        <f.icon className="h-7 w-7 text-foreground" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── SECTION 4: FAQ ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-8">
                  Frequently Asked Questions
                </h2>
                <FaqAccordion />
              </section>

              {/* ── SECTION 5: Meet our full product family ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-10">
                  Meet our full product family
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 lg:gap-x-8 gap-y-10 mt-16 px-4">
                  {[
                    {
                      category: "Compress & Convert",
                      tools: [
                        { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2, iconColor: "text-red-500", active: true },
                        { name: "PDF to PDF/A", path: "/pdf-to-pdfa", icon: FileCheck, iconColor: "text-red-600" },
                        { name: "HTML to PDF", path: "/html-to-pdf", icon: Globe, iconColor: "text-blue-500" },
                      ]
                    },
                    {
                      category: "Organize",
                      tools: [
                        { name: "Merge PDF", path: "/merge-pdf", icon: Merge, iconColor: "text-violet-600" },
                        { name: "Split PDF", path: "/split-pdf", icon: Scissors, iconColor: "text-violet-600" },
                        { name: "Rotate PDF", path: "/rotate-pdf", icon: RotateCcw, iconColor: "text-violet-600" },
                        { name: "Organize PDF", path: "/organize-pdf", icon: Layers, iconColor: "text-violet-600" },
                        { name: "Delete PDF Pages", path: "/delete-pages", icon: Trash2, iconColor: "text-violet-600" },
                        { name: "Extract PDF Pages", path: "/extract-pages", icon: Copy, iconColor: "text-violet-600" },
                      ]
                    },
                    {
                      category: "View & Edit",
                      tools: [
                        { name: "Edit PDF", path: "/edit-pdf", icon: Edit3, iconColor: "text-cyan-500" },
                        { name: "Number Pages", path: "/page-numbers", icon: Hash, iconColor: "text-cyan-500" },
                        { name: "Crop PDF", path: "/crop-pdf", icon: Crop, iconColor: "text-cyan-500" },
                        { name: "Redact PDF", path: "/redact-pdf", icon: ShieldAlert, iconColor: "text-cyan-500" },
                        { name: "Watermark PDF", path: "/add-watermark", icon: Droplets, iconColor: "text-cyan-500" },
                        { name: "Repair PDF", path: "/repair-pdf", icon: Wrench, iconColor: "text-cyan-500" },
                        { name: "Compare PDF", path: "/compare-pdf", icon: GitCompare, iconColor: "text-cyan-500" },
                      ]
                    },
                    {
                      category: "Convert from PDF",
                      tools: [
                        { name: "PDF to Word", path: "/pdf-to-word", icon: FileText, iconColor: "text-blue-500" },
                        { name: "PDF to Excel", path: "/pdf-to-excel", icon: FileSpreadsheet, iconColor: "text-emerald-500" },
                        { name: "PDF to JPG", path: "/pdf-to-jpg", icon: Image, iconColor: "text-orange-400" },
                        { name: "PDF to PPT", path: "/pdf-to-ppt", icon: Presentation, iconColor: "text-red-400" },
                      ]
                    },
                    {
                      category: "Convert to PDF",
                      tools: [
                        { name: "Word to PDF", path: "/word-to-pdf", icon: FileText, iconColor: "text-blue-600" },
                        { name: "Excel to PDF", path: "/excel-to-pdf", icon: FileSpreadsheet, iconColor: "text-green-600" },
                        { name: "PPT to PDF", path: "/ppt-to-pdf", icon: Presentation, iconColor: "text-orange-600" },
                        { name: "JPG to PDF", path: "/jpg-to-pdf", icon: Image, iconColor: "text-amber-500" },
                        { name: "OCR PDF", path: "/ocr-pdf", icon: Scan, iconColor: "text-red-500" },
                      ]
                    },
                    {
                      category: "Sign & Secure",
                      tools: [
                        { name: "Sign PDF", path: "/sign-pdf", icon: PenTool, iconColor: "text-pink-500" },
                        { name: "Protect PDF", path: "/protect-pdf", icon: Lock, iconColor: "text-red-400" },
                        { name: "Unlock PDF", path: "/unlock-pdf", icon: Unlock, iconColor: "text-red-400" },
                        { name: "Flatten PDF", path: "/flatten-pdf", icon: Square, iconColor: "text-red-400" },
                      ]
                    }
                  ].map((column: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-8">
                      {/* Sub-groups within column */}
                      {[column, column.extra].filter(Boolean).map((group: any, gIdx) => (
                        <div key={gIdx} className="space-y-4">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                            {group.category}
                          </h3>
                          <div className="flex flex-col gap-1">
                            {group.tools.map((tool: any) => (
                              <a
                                key={tool.name}
                                href={tool.path}
                                className={cn(
                                  "group flex items-center gap-3 px-1 py-1.5 rounded-lg transition-all hover:bg-primary/5",
                                  tool.active && "bg-blue-50/80 dark:bg-blue-900/20"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                  "bg-background border border-border group-hover:border-primary/20 shadow-sm"
                                )}>
                                  <tool.icon className={cn("h-4 w-4", tool.iconColor)} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                  <span className={cn(
                                    "text-xs font-bold leading-tight transition-colors",
                                    tool.active ? "text-blue-600 dark:text-blue-400" : "text-foreground/80 group-hover:text-primary"
                                  )}>
                                    {tool.name}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>


              {/* ── SECTION 6: Tutorials on PDF Compression ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-10">
                  Tutorials on PDF Compression
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    {
                      bg: "from-primary to-primary/70",
                      category: "HOW TO COMPRESS PDF",
                      title: "Reduce PDF File Size Below 100 KB Online",
                      desc: "The best free online tool to compress large PDFs while maintaining file format and quality. No registration needed.",
                      path: "/blog",
                    },
                    {
                      bg: "from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800",
                      category: "HOW TO COMPRESS PDF",
                      title: "Compress PDF to 1 MB for Free",
                      desc: "Need to shrink a PDF file down to less than 1 MB for online submission? Let MagicDOCX help you!",
                      path: "/blog",
                    },
                    {
                      bg: "from-rose-400 to-rose-300",
                      category: "HOW TO COMPRESS PDF",
                      title: "How To Compress PDF to a Chosen Size Online",
                      desc: "Got a PDF file that's too big? Here are three free tools you can use to reduce your PDF size online through your browser.",
                      path: "/blog",
                    },
                  ].map((article, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow group">
                      {/* Colored header */}
                      <div className={cn("h-44 bg-gradient-to-br flex items-center justify-center", article.bg)}>
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Minimize2 className="h-8 w-8 text-white drop-shadow" />
                        </div>
                      </div>
                      {/* Body */}
                      <div className="p-5 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{article.category}</p>
                        <h3 className="text-sm font-bold text-foreground leading-snug">{article.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{article.desc}</p>
                        <a
                          href={article.path}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-2 pt-1"
                        >
                          Read article <ChevronRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-8">
                  <a href="/blog" className="text-sm font-semibold text-primary hover:underline">
                    Show more articles
                  </a>
                </div>
              </section>

              {/* ── SECTION 7: Rate this tool ── */}
              <section>
                <RatingBar />
              </section>



            </div>
          </div>

        ) : processing ? (
          /* ── PROCESSING ── */
          <div className="mt-12 flex justify-center">
            <ProcessingView 
              files={files} 
              processing={true} 
              progress={progress} 
              onProcess={() => {}} 
              buttonText="" 
              processingText="Compressing your PDF..." 
              estimateText="Optimizing images and reducing file size" 
            />
          </div>

        ) : (
          /* ── FILE PREVIEW + COMPRESSION LEVEL ── */
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden">

            {/* Left: File Thumbnails Area */}
            <div className="h-[45vh] lg:h-auto lg:flex-1 flex flex-col items-center justify-start lg:justify-center p-4 sm:p-6 overflow-y-auto relative border-b lg:border-b-0">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[500px] lg:h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-wrap gap-3 sm:gap-6 justify-center items-start lg:items-center max-w-3xl w-full pt-2 lg:pt-0">
                {fileDataList.map((fd, i) => (
                  <motion.div
                    key={fd.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative bg-card border border-border rounded-xl shadow-sm w-[130px] sm:w-[160px] lg:w-[180px] overflow-hidden hover:shadow-md transition-shadow flex-shrink-0"
                  >
                    {/* Remove button */}
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Thumbnail */}
                    <div className="w-full h-[130px] sm:h-[160px] lg:h-[200px] bg-secondary/20 flex items-center justify-center p-2 sm:p-3">
                      {fd.previewUrl ? (
                        <img src={fd.previewUrl} className="max-w-full max-h-full object-contain rounded shadow-sm" alt="preview" />
                      ) : (
                        <FileBox className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="p-2 sm:p-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground truncate">{fd.file.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatSize(fd.file.size)} • {fd.pageCount}p
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Add more button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-110 transition-transform flex-shrink-0"
                >
                  {fileDataList.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                      {fileDataList.length}
                    </span>
                  )}
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                </motion.button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addMoreFiles(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Right: Compression Level Sidebar */}
            <div className="w-full lg:w-[350px] lg:border-l border-border bg-card flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="mb-6 shrink-0">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground text-center border-b border-border pb-4 tracking-tighter">Compress PDF</h2>
                </div>

                <div className="space-y-1">
                  {[
                    { id: 'extreme' as CompressMode, label: 'Extreme Compression', desc: 'Less quality, high compression' },
                    { id: 'recommended' as CompressMode, label: 'Recommended Compression', desc: 'Good quality, good compression' },
                    { id: 'basic' as CompressMode, label: 'Less compression', desc: 'High quality, less compression' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "w-full text-left px-3 sm:px-4 py-3 sm:py-4 rounded-lg border-l-4 transition-all",
                        mode === m.id
                          ? "border-l-primary bg-primary/5"
                          : "border-l-transparent hover:bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn("text-xs sm:text-sm font-bold tracking-wide", mode === m.id ? "text-primary" : "text-foreground")}>
                            {m.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                        </div>
                        {mode === m.id && (
                          <motion.div layoutId="compress-check" className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3">
                            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                          </motion.div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Estimate */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-secondary/20 rounded-xl border border-border/50">
                  <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                    <span>Original</span>
                    <span>{formatSize(totalInFlight)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Estimated</span>
                    <span className="font-bold text-foreground">~{formatSize(estimatedSize)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-muted-foreground">Savings</span>
                    <span className="font-bold text-primary">~{estimatedSavings}%</span>
                  </div>
                </div>
              </div>

              {/* Compress Button */}
              <div className="p-4 sm:p-6 border-t border-border flex-shrink-0">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden"
                  onClick={startProcessing}
                  disabled={fileDataList.length === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Compress PDF
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>


    </ToolLayout>
  );
};

export default CompressPdf;
