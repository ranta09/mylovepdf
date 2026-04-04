import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Scissors, Loader2, ShieldCheck, Download, Trash2, Plus, ArrowRight,
  CheckCircle2, FileBox, FileText, X, LayoutGrid, Layers, Zap, Merge,
  FileOutput, ChevronRight, ChevronDown, Star, ArrowLeft, Lock, Monitor,
  Minimize2, RotateCcw, Hash, Droplets, Edit3, Copy, Scan,
  FileSpreadsheet, Presentation, PenTool, Unlock, Square, Globe,
  ShieldAlert, Wrench, GitCompare, Crop, Image as ImageIcon,
  Layout, FileOutput as FileOut,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ProcessingView from "@/components/ProcessingView";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

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
        {userRating ? `${userRating}.0 / 5` : `${fixed} / 5`} —{" "}
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
    a: "All splitting happens locally in your browser — your files are never uploaded to any server.",
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

      // Generate thumbnails for all pages
      const thumbList: PageThumbnail[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport }).promise;
        thumbList.push({
          pageIndex: i - 1,
          dataUrl: canvas.toDataURL()
        });

        // Update incrementally for perceived speed
        if (i % 5 === 0 || i === pdf.numPages) {
          setThumbnails([...thumbList]);
        }
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
    <ToolLayout title="Split PDF Online" description="Extract specific pages or split one PDF into multiple files" category="split" icon={<Scissors className="h-7 w-7" />}
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
                <button
                  className="h-20 px-8 md:px-20 w-full md:w-auto md:min-w-[420px] rounded-2xl font-bold text-lg md:text-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-3 justify-center uppercase tracking-wider"
                  onClick={() => {
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
                  }}
                >
                  <Download className="h-6 w-6" />
                  {results.length > 1 ? "Download All (ZIP)" : "Download PDF"}
                </button>
              </div>

              {/* ── FILE LIST ── */}
              <div className="bg-background rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Generated Files</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-full text-muted-foreground uppercase">{results.length} files</span>
                </div>
                <div className="divide-y divide-border max-h-80 overflow-y-auto custom-scrollbar">
                  {results.slice(0, 50).map((res, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-secondary/30 transition-colors">
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

              {/* Split Another */}
              <div className="flex justify-center">
                <Button variant="outline" className="h-12 px-8 text-sm font-bold border-2" onClick={resetAll}>
                  Split Another PDF
                </Button>
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
                      desc: "Your security matters. All splitting happens locally in your browser — files are never uploaded to any server. No copies are retained, ensuring your documents remain 100% private.",
                    },
                    {
                      icon: ShieldCheck,
                      title: "Encrypted & Secure PDF Splitting",
                      desc: "Every file is handled with the highest security standards. Even sensitive documents stay completely private while you split, extract, or reorganise your PDF pages.",
                    },
                    {
                      icon: Monitor,
                      title: "Split PDFs on Any Device",
                      desc: "Our PDF splitter works online across all devices and operating systems. Whether you're on Windows, Mac, Linux, iOS, or Android — no software download needed.",
                    },
                    {
                      icon: Zap,
                      title: "Free PDF Splitter with Unlimited Use",
                      desc: "Split as many PDF files as you like instantly — no limits, no account required. Completely free and always available.",
                    },
                    {
                      icon: Merge,
                      title: "All-in-One PDF Tools Beyond Splitting",
                      desc: "More than just a splitter — MagicDOCX offers powerful tools to merge, compress, rotate, and convert PDFs. Everything you need for working with PDFs, in one place.",
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
                      desc: "Step-by-step guide to extracting specific pages from any PDF document — free, fast, and without installing any software.",
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
                      desc: "Define custom page ranges to divide a large PDF into exactly the sections you need — no extra software required.",
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
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
              {/* LEFT SIDE: PREVIEW PANEL */}
              <div className="flex-1 bg-card border-r border-border flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Page Preview</h2>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{totalPages} Pages Total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2">
                      {selectedPages.length} selected
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary" onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i))}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500" onClick={() => setSelectedPages([])}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-secondary/10 custom-scrollbar">
                  {loadingThumbnails && thumbnails.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Loading thumbnails...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const thumb = thumbnails.find(t => t.pageIndex === idx);
                        const isSelected = selectedPages.includes(idx);

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (idx % 10) * 0.03 }}
                            className={cn(
                              "relative group cursor-pointer transition-all duration-300 transform-gpu",
                              isSelected ? "scale-[1.02]" : "hover:scale-[1.05]"
                            )}
                            onClick={(e) => togglePageSelection(idx, e)}
                          >
                            <div className={cn(
                              "aspect-[3/4] rounded-xl border-2 overflow-hidden shadow-sm transition-all duration-300",
                              isSelected
                                ? "border-primary bg-primary/[0.03] ring-4 ring-primary/10 shadow-glow"
                                : "border-background bg-background hover:border-primary/40 hover:shadow-md"
                            )}>
                              {thumb ? (
                                <img src={thumb.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 scale-110">
                                  <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                  <div className="w-8 h-1 bg-muted-foreground/10 rounded-full animate-pulse"></div>
                                </div>
                              )}

                              {/* Overlay for selection */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                  <div className="bg-primary text-white p-2 rounded-full shadow-glow transform scale-110">
                                    <CheckCircle2 className="h-6 w-6" />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between px-1">
                              <span className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter transition-colors",
                                isSelected ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                              )}>
                                Page {idx + 1}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: CONFIGURATION PANEL */}
              <div className="w-full lg:w-[400px] flex flex-col shrink-0 bg-card overflow-hidden">
                <div className="bg-card p-6 flex flex-col relative overflow-hidden flex-1 min-h-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

                  <div className="mb-6 relative z-10 shrink-0">
                    <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                      Split Settings
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-3.5 uppercase tracking-widest leading-relaxed">Choose how you want to split your file</p>
                  </div>

                  <div className="space-y-4 relative z-10 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'extract', label: 'Extract', icon: Layers },
                        { id: 'range', label: 'Ranges', icon: LayoutGrid },
                        { id: 'every', label: 'Every Page', icon: FileBox },
                        { id: 'fixed', label: 'Fixed Split', icon: Scissors }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSplitMode(m.id as SplitMode)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 gap-2 group",
                            splitMode === m.id
                              ? "border-primary bg-primary/[0.03] shadow-inner-sm text-primary"
                              : "border-border bg-background hover:border-primary/30 hover:shadow-sm text-muted-foreground"
                          )}
                        >
                          <m.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", splitMode === m.id ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-border mt-4">
                      <AnimatePresence mode="wait">
                        {splitMode === 'extract' && (
                          <motion.div
                            key="extract"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                          >
                            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                              <div className="flex justify-between items-center mb-3">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Extraction Mode</Label>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                                <span className="text-xs font-bold text-foreground">Merge into one PDF</span>
                                <Switch checked={mergeSelected} onCheckedChange={setMergeSelected} />
                              </div>
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground text-center px-4 leading-relaxed italic">
                              Tip: Click page thumbnails on the left to select pages or Shift-Click for a range.
                            </p>
                          </motion.div>
                        )}

                        {splitMode === 'range' && (
                          <motion.div
                            key="range"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-3"
                          >
                            <div className="space-y-2">
                              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Define Custom Ranges</Label>
                              {ranges.map((r, idx) => (
                                <div key={idx} className="flex items-center gap-2 group animate-in fade-in slide-in-from-right-1">
                                  <div className="flex-1 flex items-center gap-2 bg-secondary/30 p-1.5 rounded-xl border border-border/50 transition-all hover:border-primary/30">
                                    <Input
                                      placeholder="From"
                                      value={r.from}
                                      onChange={(e) => updateRange(idx, 'from', e.target.value)}
                                      className="h-8 text-xs font-black bg-transparent border-none focus-visible:ring-0 text-center"
                                    />
                                    <div className="h-px w-2 bg-muted-foreground/30"></div>
                                    <Input
                                      placeholder="To"
                                      value={r.to}
                                      onChange={(e) => updateRange(idx, 'to', e.target.value)}
                                      className="h-8 text-xs font-black bg-transparent border-none focus-visible:ring-0 text-center"
                                    />
                                  </div>
                                  {ranges.length > 1 && (
                                    <button onClick={() => removeRange(idx)} className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-lg transition-colors">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" className="w-full h-10 border-dashed border-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl" onClick={handleAddRange}>
                              <Plus className="h-3.5 w-3.5 mr-2" /> Add Range
                            </Button>
                          </motion.div>
                        )}

                        {splitMode === 'every' && (
                          <motion.div
                            key="every"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6 bg-primary/[0.03] border border-primary/20 rounded-2xl text-center"
                          >
                            <FileBox className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                            <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Split Every Page</h4>
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium leading-relaxed italic">
                              Every page of your PDF will be extracted into a separate document.
                              A {totalPages} page PDF will result in {totalPages} separate files.
                            </p>
                          </motion.div>
                        )}

                        {splitMode === 'fixed' && (
                          <motion.div
                            key="fixed"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                          >
                            <div className="p-6 bg-secondary/30 rounded-2xl border border-border/50 text-center space-y-4">
                              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Split Every N Pages</Label>
                              <div className="flex items-center justify-center gap-6">
                                <button
                                  className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 text-foreground transition-all"
                                  onClick={() => setFixedPageCount(Math.max(1, fixedPageCount - 1))}
                                >
                                  <X className="h-4 w-4 rotate-45" />
                                </button>
                                <span className="text-3xl font-black text-primary tracking-tighter w-12">{fixedPageCount}</span>
                                <button
                                  className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 text-foreground transition-all"
                                  onClick={() => setFixedPageCount(Math.min(totalPages, fixedPageCount + 1))}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                Result: {Math.ceil(totalPages / fixedPageCount)} files
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="shrink-0 pt-4 pb-6 mt-auto border-t border-border bg-card">
                    <Button
                      size="lg"
                      className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-elevated rounded-2xl group relative overflow-hidden"
                      onClick={startSplitting}
                      disabled={splitMode === 'extract' && selectedPages.length === 0}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      Split PDF
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </ToolLayout>
  );
};

export default SplitPdf;
