import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Scissors, Loader2, ShieldCheck, Download, Trash2, Plus, ArrowRight,
  CheckCircle2, FileBox, FileText, X, LayoutGrid, Layers, Zap, Merge,
  FileOutput, ChevronRight, ChevronDown, Star, ArrowLeft, Lock, Monitor, Eye, Settings,
  Minimize2, RotateCcw, Hash, Droplets, Edit3, Copy, Scan,
  FileSpreadsheet, Presentation, PenTool, Unlock, Square, Globe,
  ShieldAlert, Wrench, GitCompare, Crop, Image as ImageIcon,
  Layout, FileOutput as FileOut,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ProcessingView from "@/components/ProcessingView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { ScrollArea } from "@/components/ui/scroll-area";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type SplitMode = 'extract' | 'range' | 'every' | 'fixed';

interface PageThumbnail {
  pageIndex: number; // 0-indexed
  dataUrl: string;
}

interface SplitResult {
  blob: Blob;
  filename: string;
  url: string;
  pages: string;
}

// ── Star Rating Bar ───────────────────────────────────────────────────────────
const RatingBar = () => {
  const [userRating, setUserRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const fixed = 4.5;
  const votes = 412893;

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

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "Is MagicDOCX Split PDF free?",
    a: "Yes, completely free with no file limits or account required.",
  },
  {
    q: "How many ways can I split a PDF?",
    a: "Four modes: Extract selected pages, Custom page ranges, Split every page into its own file, or Fixed chunk size (e.g. every 5 pages).",
  },
  {
    q: "Is my file secure?",
    a: "All splitting happens locally in your browser, your files are never uploaded to any server.",
  },
  {
    q: "Can I split a large PDF?",
    a: "Yes, files with hundreds of pages are fully supported. Pages load progressively so you can start selecting immediately.",
  },
  {
    q: "What format are the output files?",
    a: "All output files are standard PDF format. Multiple files are bundled into a ZIP for easy download.",
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

const SplitPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  const [splitMode, setSplitMode] = useState<SplitMode>('extract');
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 0-indexed
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Mode specific states
  const [mergeSelected, setMergeSelected] = useState(true);
  const [ranges, setRanges] = useState<{ from: string, to: string }[]>([{ from: '1', to: '' }]);
  const [fixedPageCount, setFixedPageCount] = useState(2);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const [activeTab, setActiveTab] = useState<'preview' | 'configure'>('preview');

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      setFiles([]);
      setThumbnails([]);
      setTotalPages(0);
      return;
    }

    const file = newFiles[0]; // Split PDF only handles one source file
    setFiles([file]);
    setLoadingThumbnails(true);
    setThumbnails([]);
    setSelectedPages([]);
    setResults([]);
    setZipUrl(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);

      // Generate thumbnails (cap at 100 pages to prevent memory crashes/freezes on large PDFs)
      const MAX_PAGES = 100;
      const pagesToRender = Math.min(pdf.numPages, MAX_PAGES);
      const thumbList: PageThumbnail[] = [];
      
      for (let i = 1; i <= pagesToRender; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport }).promise;
        thumbList.push({
          pageIndex: i - 1,
          dataUrl: canvas.toDataURL('image/jpeg', 0.6) // Compress to save high RAM usage
        });

        // Update incrementally and yield thread to prevent UI blocking
        if (i % 5 === 0 || i === pagesToRender) {
          setThumbnails([...thumbList]);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      
      if (pdf.numPages > MAX_PAGES) {
        toast.info(`Preview limited to the first ${MAX_PAGES} pages for performance. You can still type higher ranges in manual split modes.`);
      }
    } catch (err) {
      console.error("Failed to load PDF thumbnails", err);
      toast.error("Failed to load PDF pages. The file might be corrupted or too large.");
    } finally {
      setLoadingThumbnails(false);
    }
  }, []);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  const togglePageSelection = (index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(index, lastSelectedIndex);
      const end = Math.max(index, lastSelectedIndex);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      setSelectedPages(prev => {
        const newSet = new Set(prev);
        range.forEach(p => newSet.add(p));
        return Array.from(newSet).sort((a, b) => a - b);
      });
    } else {
      setSelectedPages(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index].sort((a, b) => a - b)
      );
    }
    setLastSelectedIndex(index);
  };

  const handleAddRange = () => {
    setRanges([...ranges, { from: '', to: '' }]);
  };

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const updateRange = (index: number, field: 'from' | 'to', value: string) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };

  const startSplitting = async () => {
    if (files.length === 0 || processing) return;

    setProcessing(true);
    setProgress(0);
    const newResults: SplitResult[] = [];
    const sourceFile = files[0];

    try {
      const sourceBytes = await sourceFile.arrayBuffer();
      const sourceDoc = await PDFDocument.load(sourceBytes);
      const total = sourceDoc.getPageCount();

      let splitConfigs: { pages: number[], name: string }[] = [];

      if (splitMode === 'extract') {
        if (selectedPages.length === 0) {
          toast.error("Please select at least one page to extract.");
          setProcessing(false);
          return;
        }
        if (mergeSelected) {
          splitConfigs.push({
            pages: selectedPages,
            name: `${sourceFile.name.replace(/\.pdf$/i, '')}_extracted.pdf`
          });
        } else {
          selectedPages.forEach(p => {
            splitConfigs.push({
              pages: [p],
              name: `${sourceFile.name.replace(/\.pdf$/i, '')}_page_${p + 1}.pdf`
            });
          });
        }
      } else if (splitMode === 'every') {
        for (let i = 0; i < total; i++) {
          splitConfigs.push({
            pages: [i],
            name: `${sourceFile.name.replace(/\.pdf$/i, '')}_page_${i + 1}.pdf`
          });
        }
      } else if (splitMode === 'fixed') {
        for (let i = 0; i < total; i += fixedPageCount) {
          const end = Math.min(i + fixedPageCount, total);
          const range = Array.from({ length: end - i }, (_, k) => i + k);
          splitConfigs.push({
            pages: range,
            name: `${sourceFile.name.replace(/\.pdf$/i, '')}_pages_${i + 1}-${end}.pdf`
          });
        }
      } else if (splitMode === 'range') {
        ranges.forEach((r, idx) => {
          const from = parseInt(r.from);
          const to = parseInt(r.to) || from;
          if (!isNaN(from) && from > 0 && from <= total && to >= from && to <= total) {
            const rangeArr = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k);
            splitConfigs.push({
              pages: rangeArr,
              name: `${sourceFile.name.replace(/\.pdf$/i, '')}_range_${from}-${to}.pdf`
            });
          }
        });
        if (splitConfigs.length === 0) {
          toast.error("Please define at least one valid page range.");
          setProcessing(false);
          return;
        }
      }

      // Process each chunk
      for (let i = 0; i < splitConfigs.length; i++) {
        const config = splitConfigs[i];
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourceDoc, config.pages);
        copiedPages.forEach(p => newDoc.addPage(p));

        const bytes = await newDoc.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        newResults.push({
          blob,
          filename: config.name,
          url,
          pages: config.pages.length === 1 ? `Page ${config.pages[0] + 1}` : `Pages ${config.pages[0] + 1}-${config.pages[config.pages.length - 1] + 1}`
        });

        setProgress(Math.round(((i + 1) / splitConfigs.length) * 100));
      }

      // If multiple files, create a ZIP
      if (newResults.length > 1) {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        newResults.forEach(res => {
          zip.file(res.filename, res.blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setZipUrl(url);

        // Auto-download ZIP
        const a = document.createElement("a");
        a.href = url;
        a.download = "MagicDOCX_Split_PDFs.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (newResults.length === 1) {
        // Auto-download single PDF
        const a = document.createElement("a");
        a.href = newResults[0].url;
        a.download = newResults[0].filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setResults(newResults);
      toast.success("PDF split successfully!");
    } catch (err) {
      console.error("Splitting failed", err);
      toast.error("Failed to split PDF. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setThumbnails([]);
    setResults([]);
    setZipUrl(null);
    setSelectedPages([]);
    setProgress(0);
  };

  const relatedTools = [
    { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
    { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
    { name: "Rotate PDF", path: "/rotate-pdf", icon: RotateCcw },
    { name: "Extract Pages", path: "/extract-pages", icon: FileOutput },
    { name: "Delete Pages", path: "/delete-pages", icon: Trash2 },
    { name: "Organize PDF", path: "/organize-pdf", icon: Layout },
  ];

  return (
    <ToolLayout title="Split PDF Online" description="Separate pages or extract specific sections from your PDF" category="split" icon={<Scissors className="h-7 w-7" />}
      metaTitle="Split PDF Online Free – Fast & Secure | MagicDocx" metaDescription="Split PDF files into multiple documents online for free. Extract pages, define ranges, or split every page. Fast and secure | no software needed." toolId="split" hideHeader={files.length > 0}>

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
                {results.length > 1 ? `PDF has been split into ${results.length} files!` : "PDF has been split!"}
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
                <Button size="lg" className="h-20 px-8 md:px-20 w-full md:w-auto md:min-w-[420px] rounded-2xl font-bold text-lg md:text-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-3 justify-center uppercase tracking-wider" onClick={() => {
                  if (zipUrl) {
                    const a = document.createElement("a");
                    a.href = zipUrl;
                    a.download = "MagicDOCX_Split_PDFs.zip";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  } else if (results.length === 1) {
                    const a = document.createElement("a");
                    a.href = results[0].url;
                    a.download = results[0].filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                }}>
                  <Download className="h-6 w-6" />
                  {results.length > 1 ? "Download All (ZIP)" : "Download PDF"}
                </Button>
              </div>

              {/* ── FILE LIST ── */}
              <div className="bg-background rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Generated Files</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-full text-muted-foreground uppercase">{results.length} files</span>
                </div>
                <div className="divide-y divide-border max-h-80 overflow-y-auto custom-scrollbar">
                  {results.slice(0, 50).map((res, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-3.5 group hover:bg-secondary/30 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{res.filename}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 uppercase font-bold tracking-wide">{res.pages}</p>
                      </div>
                      <a
                        href={res.url}
                        download={res.filename}
                        className="p-2 rounded-xl hover:bg-secondary transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  ))}
                  {results.length > 50 && (
                    <p className="text-center text-[10px] text-muted-foreground py-3 font-bold uppercase tracking-widest">
                      + {results.length - 50} more files
                    </p>
                  )}
                </div>
              </div>

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
                        i > 0 && "border-t border-border sm:border-t-0",
                        i >= 3 && "sm:border-t sm:border-border"
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
                  Your files are always handled safely and automatically cleared after processing.
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
            <ToolUploadScreen
              title="Split PDF"
              description="Separate pages or extract specific sections from your PDF"
              buttonLabel="Select PDF file"
              accept=".pdf"
              multiple={false}
              onFilesSelected={handleFilesChange}
            />

            {/* ── INFO SECTIONS ─────────────────────────────────────── */}
            <div className="w-full px-6 pb-16 space-y-16 mt-12">

              {/* ── How it works ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-8">How It Works</h2>
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="hidden sm:block absolute top-6 left-[calc(16.67%)] right-[calc(16.67%)] border-t-2 border-dashed border-border" />
                  {[
                    { step: "1", title: "Upload your PDF", sub: "Drag & drop or click to select a file" },
                    { step: "2", title: "Choose split mode", sub: "Extract, range, every page, or fixed split" },
                    { step: "3", title: "Download instantly", sub: "Get individual PDFs or a ZIP bundle" },
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

              {/* ── Why MagicDOCX ── */}
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-12">
                  {[
                    {
                      icon: Scissors,
                      title: "The Best Free PDF Splitter Online",
                      desc: "Need to extract a specific page or divide a large PDF into smaller parts? MagicDOCX lets you split PDF files online free, with no quality loss and no software to install. Fast, flexible, and always free.",
                    },
                    {
                      icon: Lock,
                      title: "Permanent File Deletion for Privacy",
                      desc: "Your security matters. All splitting happens locally in your browser, files are never uploaded to any server. No copies are retained, ensuring your documents remain 100% private.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Encrypted & Secure PDF Splitting",
                      desc: "Every file is handled with the highest security standards. Even sensitive documents stay completely private while you split, extract, or reorganise your PDF pages.",
                    },
                    {
                      icon: Monitor,
                      title: "Split PDFs on Any Device",
                      desc: "Our PDF splitter works online across all devices and operating systems. Whether you're on Windows, Mac, Linux, iOS, or Android, no software download needed.",
                    },
                    {
                      icon: Zap,
                      title: "Free PDF Splitter with Unlimited Use",
                      desc: "Split as many PDF files as you like instantly, no limits, no account required. Completely free and always available.",
                    },
                    {
                      icon: Merge,
                      title: "All-in-One PDF Tools Beyond Splitting",
                      desc: "More than just a splitter, MagicDOCX offers powerful tools to merge, compress, rotate, and convert PDFs. Everything you need for working with PDFs, in one place.",
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

              {/* ── FAQ ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
                <FaqAccordion />
              </section>

              {/* ── Meet our full product family ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-10">Meet our full product family</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 lg:gap-x-8 gap-y-10 mt-16 px-4">
                  {[
                    {
                      category: "Compress & Convert",
                      tools: [
                        { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2, iconColor: "text-red-500" },
                        { name: "HTML to PDF", path: "/html-to-pdf", icon: Globe, iconColor: "text-blue-500" },
                      ]
                    },
                    {
                      category: "Organize",
                      tools: [
                        { name: "Merge PDF", path: "/merge-pdf", icon: Merge, iconColor: "text-violet-600" },
                        { name: "Split PDF", path: "/split-pdf", icon: Scissors, iconColor: "text-violet-600", active: true },
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
                        { name: "PDF to JPG", path: "/pdf-to-jpg", icon: ImageIcon, iconColor: "text-orange-400" },
                        { name: "PDF to PPT", path: "/pdf-to-ppt", icon: Presentation, iconColor: "text-red-400" },
                      ]
                    },
                    {
                      category: "Convert to PDF",
                      tools: [
                        { name: "Word to PDF", path: "/word-to-pdf", icon: FileText, iconColor: "text-blue-600" },
                        { name: "Excel to PDF", path: "/excel-to-pdf", icon: FileSpreadsheet, iconColor: "text-green-600" },
                        { name: "PPT to PDF", path: "/ppt-to-pdf", icon: Presentation, iconColor: "text-orange-600" },
                        { name: "JPG to PDF", path: "/jpg-to-pdf", icon: ImageIcon, iconColor: "text-amber-500" },
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
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                          {column.category}
                        </h3>
                        <div className="flex flex-col gap-1">
                          {column.tools.map((tool: any) => (
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
                              <span className={cn(
                                "text-xs font-bold leading-tight transition-colors",
                                tool.active ? "text-blue-600 dark:text-blue-400" : "text-foreground/80 group-hover:text-primary"
                              )}>
                                {tool.name}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Tutorials ── */}
              <section>
                <h2 className="text-2xl font-bold text-foreground text-center mb-10">Tutorials on PDF Splitting</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    {
                      bg: "from-primary to-primary/70",
                      category: "HOW TO SPLIT PDF",
                      title: "How to Extract Pages from a PDF Online",
                      desc: "Step-by-step guide to extracting specific pages from any PDF document, free, fast, and without installing any software.",
                      path: "/blog",
                    },
                    {
                      bg: "from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800",
                      category: "HOW TO SPLIT PDF",
                      title: "Split a Multi-Page PDF into Single Pages",
                      desc: "Need one file per page? Learn how to split every page of a PDF into its own document in just a few clicks.",
                      path: "/blog",
                    },
                    {
                      bg: "from-rose-400 to-rose-300",
                      category: "HOW TO SPLIT PDF",
                      title: "How to Split a PDF by Page Range",
                      desc: "Define custom page ranges to divide a large PDF into exactly the sections you need, no extra software required.",
                      path: "/blog",
                    },
                  ].map((article, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow group">
                      <div className={cn("h-44 bg-gradient-to-br flex items-center justify-center", article.bg)}>
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Scissors className="h-8 w-8 text-white drop-shadow" />
                        </div>
                      </div>
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
                  <a href="/blog" className="text-sm font-semibold text-primary hover:underline">Show more articles</a>
                </div>
              </section>

              {/* ── Rate this tool ── */}
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
              processingText="Splitting your PDF..."
              estimateText="Extracting pages and building documents"
            />
          </div>

        ) : (
          /* ── WORKSPACE: thumbnail grid + settings sidebar ── */
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
                  onClick={() => setActiveTab("preview")} // Using preview as "options" tab for compatibility with current logic or just renaming
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "preview" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Controls</span>
                </button>
              </div>

              {/* SHARED CONTENT AREA */}
              <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
                {/* DESKTOP SIDE-BY-SIDE + MOBILE ANIMATED TABS */}
                
                {/* Tab 1: Manage Pages (Gallery) */}
                <div className={cn(
                  "flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative border-r border-border",
                  activeTab !== "configure" && "hidden xl:flex"
                )}>
                  {/* Background Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
                  
                  <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar relative z-10">
                    {loadingThumbnails && thumbnails.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Preview...</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 sm:gap-8 justify-center items-start max-w-5xl mx-auto pb-20">
                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const thumb = thumbnails.find(t => t.pageIndex === idx);
                          const isSelected = selectedPages.includes(idx);

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "group relative bg-card border rounded-2xl shadow-sm w-[130px] sm:w-[155px] lg:w-[175px] overflow-hidden transition-all duration-300 flex-shrink-0 cursor-pointer",
                                isSelected ? "border-primary shadow-glow ring-2 ring-primary/20 scale-[1.02] z-20" : "border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                              )}
                              onClick={(e) => togglePageSelection(idx, e)}
                            >
                              {/* Selection Indicator */}
                              <div className="absolute top-2 left-2 z-20">
                                {isSelected ? (
                                  <div className="bg-primary text-white rounded-md p-1 shadow-sm">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </div>
                                ) : (
                                  <div className="bg-white/90 text-muted-foreground/30 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-border/50">
                                    <Square className="h-3.5 w-3.5" />
                                  </div>
                                )}
                              </div>

                              {/* Thumbnail Area */}
                              <div className="w-full aspect-[3/4.2] bg-secondary/10 flex items-center justify-center p-3 relative overflow-hidden">
                                {thumb ? (
                                  <img src={thumb.dataUrl} alt={`Page ${idx + 1}`} className="max-w-[95%] max-h-[95%] object-contain rounded shadow-sm group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab 2: Controls Sidebar */}
                <div className={cn(
                  "w-full xl:w-[380px] shrink-0 flex flex-col min-h-0 bg-background overflow-hidden",
                  activeTab !== "preview" && "hidden xl:flex"
                )}>
                  <div className="p-6 flex flex-col relative h-full">
                    <div className="mb-6 shrink-0">
                      <h2 className="text-xl sm:text-2xl font-black text-foreground text-center border-b border-border pb-4 tracking-tighter capitalize transition-all">Split PDF</h2>
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                      <div className="space-y-8 pb-10">
                        {/* Main Category Tabs */}
                        <div className="flex bg-secondary/50 p-1 rounded-2xl mb-8 relative z-10 border border-border/50">
                          <button 
                            onClick={() => setSplitMode(splitMode === 'fixed' ? 'fixed' : 'range')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                              (splitMode === 'range' || splitMode === 'fixed') 
                                ? "bg-background text-primary shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Ranges
                          </button>
                          <button 
                            onClick={() => setSplitMode(splitMode === 'every' ? 'every' : 'extract')}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest",
                              (splitMode === 'extract' || splitMode === 'every') 
                                ? "bg-background text-primary shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Extract
                          </button>
                        </div>

                        {/* Sub-Mode Selector */}
                        <div className="space-y-1">
                          {(splitMode === 'range' || splitMode === 'fixed') && (
                            <div className="flex gap-2 mb-4">
                              <button 
                                onClick={() => setSplitMode('range')}
                                className={cn(
                                  "flex-1 h-9 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest",
                                  splitMode === 'range' ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                Custom Ranges
                              </button>
                              <button 
                                onClick={() => setSplitMode('fixed')}
                                className={cn(
                                  "flex-1 h-9 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest",
                                  splitMode === 'fixed' ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                Fixed Split
                              </button>
                            </div>
                          )}

                          {(splitMode === 'extract' || splitMode === 'every') && (
                            <div className="flex gap-2 mb-4">
                              <button 
                                onClick={() => setSplitMode('extract')}
                                className={cn(
                                  "flex-1 h-9 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest",
                                  splitMode === 'extract' ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                Select Pages
                              </button>
                              <button 
                                onClick={() => setSplitMode('every')}
                                className={cn(
                                  "flex-1 h-9 rounded-xl border-2 transition-all text-[9px] font-black uppercase tracking-widest",
                                  splitMode === 'every' ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                Split Every Page
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Mode Specific Settings */}
                        <div className="pt-2">
                          <AnimatePresence mode="wait">
                            {splitMode === 'extract' && (
                              <motion.div
                                key="extract"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                              >
                                <div className="space-y-3">
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Selection Tools</h3>
                                  <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors" onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i))}>Select All</Button>
                                    <Button variant="outline" className="h-10 px-4 text-[9px] font-black uppercase tracking-widest border-2 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors" onClick={() => setSelectedPages([])} disabled={selectedPages.length === 0}>Clear</Button>
                                  </div>
                                </div>
                                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-foreground">Merge into one PDF</span>
                                    <Switch checked={mergeSelected} onCheckedChange={setMergeSelected} />
                                  </div>
                                  <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter leading-relaxed italic opacity-70 italic">Extract selected pages into a single combined file.</p>
                                </div>
                              </motion.div>
                            )}

                            {splitMode === 'range' && (
                              <motion.div
                                key="range"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                              >
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 border-l-2 border-primary/50 ml-1">Page Ranges</h3>
                                <div className="space-y-2">
                                  {ranges.map((r, idx) => (
                                    <div key={idx} className="flex items-center gap-2 group">
                                      <div className="flex-1 flex items-center gap-2 bg-secondary/30 p-2 rounded-xl border border-border/50 group-hover:border-primary/30 transition-all">
                                        <Input
                                          placeholder="From"
                                          value={r.from}
                                          onChange={(e) => updateRange(idx, 'from', e.target.value)}
                                          className="h-8 text-[11px] font-black bg-transparent border-none focus-visible:ring-0 text-center uppercase"
                                        />
                                        <div className="h-px w-2 bg-muted-foreground/30"></div>
                                        <Input
                                          placeholder="To"
                                          value={r.to}
                                          onChange={(e) => updateRange(idx, 'to', e.target.value)}
                                          className="h-8 text-[11px] font-black bg-transparent border-none focus-visible:ring-0 text-center uppercase"
                                        />
                                      </div>
                                      {ranges.length > 1 && (
                                        <button onClick={() => removeRange(idx)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <Button variant="outline" className="w-full h-11 border-dashed border-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl border-primary/30" onClick={handleAddRange}>
                                  <Plus className="h-3.5 w-3.5 mr-2" /> Add Another Range
                                </Button>
                              </motion.div>
                            )}

                            {splitMode === 'fixed' && (
                              <motion.div
                                key="fixed"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-5"
                              >
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Fixed Range Split</h3>
                                <div className="flex items-center justify-center gap-8">
                                  <button onClick={() => setFixedPageCount(Math.max(1, fixedPageCount - 1))} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all text-muted-foreground"><X className="h-4 w-4 rotate-45" /></button>
                                  <div className="flex flex-col items-center">
                                    <span className="text-4xl font-black text-primary leading-none">{fixedPageCount}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Pages</span>
                                  </div>
                                  <button onClick={() => setFixedPageCount(Math.min(totalPages, fixedPageCount + 1))} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 hover:text-primary transition-all text-muted-foreground"><Plus className="h-4 w-4" /></button>
                                </div>
                                <div className="pt-2 border-t border-primary/10">
                                  <p className="text-[9px] font-black text-primary uppercase tracking-widest">Expected Files: {Math.ceil(totalPages / fixedPageCount)}</p>
                                </div>
                              </motion.div>
                            )}

                            {splitMode === 'every' && (
                              <motion.div
                                key="every"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-6 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-3"
                              >
                                <FileBox className="h-10 w-10 text-primary/30 mx-auto" />
                                <h4 className="text-[11px] font-black text-foreground uppercase tracking-tight">One File Per Page</h4>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter leading-relaxed italic opacity-70">Splits the entire PDF into {totalPages} separate individual pages.</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </ScrollArea>

                    {/* Desktop Execution Button */}
                    <div className="hidden xl:block shrink-0 pt-6 border-t border-border bg-background">
                      <Button
                        size="lg"
                        className="w-full h-14 sm:h-16 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                        onClick={startSplitting}
                        disabled={splitMode === 'extract' && selectedPages.length === 0}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        Split PDF
                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                          <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="xl:hidden shrink-0 pt-4 pb-6 px-4 bg-background border-t border-border">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                  onClick={startSplitting}
                  disabled={splitMode === 'extract' && selectedPages.length === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Split PDF
                  <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default SplitPdf;
