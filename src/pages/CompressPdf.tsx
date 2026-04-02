import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { 
  Minimize2, 
  CheckCircle2, 
  Download, 
  RotateCw, 
  X, 
  FileBox, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Merge,
  Scissors,
  FileText,
  Plus,
  ChevronRight,
  Hash,
  RotateCcw,
  Droplets,
  Lock,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ProcessingView from "@/components/ProcessingView";
import ToolSeoSection from "@/components/ToolSeoSection";
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
  blob: Blob;
}

// Savings ring component
const SavingsRing = ({ percentage }: { percentage: number }) => (
  <div className="relative w-24 h-24 flex items-center justify-center">
    <svg className="w-full h-full transform -rotate-90">
      <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-secondary" />
      <motion.circle
        cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="7" fill="transparent"
        className="text-primary"
        strokeDasharray={263.9}
        initial={{ strokeDashoffset: 263.9 }}
        animate={{ strokeDashoffset: 263.9 - (263.9 * percentage) / 100 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-2xl font-black text-foreground">{percentage}%</span>
      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">saved</span>
    </div>
  </div>
);

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

  const compressSinglePdf = async (file: File, m: CompressMode, onP: (p: number) => void) => {
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const out = await PDFDocument.create();
    
    const config = m === 'extreme' ? { dpi: 72, q: 0.4 } : m === 'recommended' ? { dpi: 120, q: 0.7 } : { dpi: 200, q: 0.85 };
    const scale = config.dpi / 72;

    for (let i = 1; i <= pdf.numPages; i++) {
        onP(Math.round((i / pdf.numPages) * 90));
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        const jpg = await new Promise<Blob>(r => canvas.toBlob(blob => r(blob!), "image/jpeg", config.q));
        const img = await out.embedJpg(await jpg.arrayBuffer());
        const origVp = page.getViewport({ scale: 1 });
        const p = out.addPage([origVp.width, origVp.height]);
        p.drawImage(img, { x: 0, y: 0, width: origVp.width, height: origVp.height });
    }
    const raw = await out.save({ useObjectStreams: true });
    return new Blob([new Uint8Array(raw)], { type: "application/pdf" });
  };

  const startProcessing = async () => {
    setProcessing(true);
    setProgress(0);
    const newRes: ProcessedFile[] = [];
    try {
      for (let fi = 0; fi < fileDataList.length; fi++) {
        const fd = fileDataList[fi];
        const compressed = await compressSinglePdf(fd.file, mode, (p) => {
          const fileProgress = Math.round(((fi + p / 100) / fileDataList.length) * 100);
          setProgress(fileProgress);
        });
        newRes.push({
          name: fd.file.name.replace(/\.pdf$/, "_compressed.pdf"),
          originalSize: fd.file.size,
          compressedSize: compressed.size,
          url: URL.createObjectURL(compressed),
          blob: compressed
        });
      }
      setResults(newRes);
      setFiles([]);
      toast.success("PDFs compressed successfully!");
      // Auto-download
      setTimeout(() => {
        newRes.forEach(r => {
          const a = document.createElement("a"); a.href = r.url; a.download = r.name; a.click();
        });
      }, 500);
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

  const totalOriginal = results.reduce((acc, r) => acc + r.originalSize, 0);
  const totalCompressed = results.reduce((acc, r) => acc + r.compressedSize, 0);
  const totalSaved = totalOriginal - totalCompressed;
  const savingsPercent = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Dynamic estimate based on mode
  const getEstimateRatio = () => mode === 'extreme' ? 0.15 : mode === 'recommended' ? 0.4 : 0.7;
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
          <div className="mt-4 mx-auto max-w-2xl w-full space-y-6 pb-20">
            {/* Title */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <h2 className="text-2xl font-black text-foreground">PDFs have been compressed!</h2>
            </motion.div>

            {/* Download Button */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <Button 
                size="lg" 
                className="w-full h-14 rounded-xl font-bold text-lg shadow-xl shadow-primary/25"
                onClick={() => {
                  results.forEach(r => {
                    const a = document.createElement("a"); a.href = r.url; a.download = r.name; a.click();
                  });
                }}
              >
                <Download className="mr-2 h-5 w-5" />
                Download compressed PDF{results.length > 1 ? 's' : ''}
              </Button>
            </motion.div>

            {/* Savings Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-6 py-6"
            >
              <SavingsRing percentage={savingsPercent} />
              <div className="text-left">
                <p className="text-sm text-muted-foreground">
                  Your PDF{results.length > 1 ? 's are' : ' is'} now <span className="font-bold text-foreground">{savingsPercent}%</span> smaller!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatSize(totalOriginal)} → {formatSize(totalCompressed)}
                </p>
              </div>
            </motion.div>

            {/* Continue to... related tools */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <h3 className="text-sm font-bold text-foreground mb-4">Continue to...</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {relatedTools.map(tool => (
                  <a 
                    key={tool.path}
                    href={tool.path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                  >
                    <tool.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground font-medium">{tool.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Start Over */}
            <div className="text-center pt-2">
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => { setResults([]); setFileDataList([]); setFiles([]); }}
              >
                <RotateCw className="mr-2 h-4 w-4" /> Compress more PDFs
              </Button>
            </div>
          </div>

        ) : files.length === 0 ? (
          /* ── UPLOAD SCREEN ── */
          <ToolUploadScreen
            title="Compress PDF"
            description="Reduce file size while optimizing quality"
            buttonLabel="Select PDF files"
            accept=".pdf"
            multiple={true}
            onFilesSelected={handleFilesChange}
          />

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
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-wrap gap-6 justify-center items-center max-w-3xl">
                {fileDataList.map((fd, i) => (
                  <motion.div 
                    key={fd.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative bg-card border border-border rounded-xl shadow-sm w-[180px] overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Remove button */}
                    <button 
                      onClick={() => removeFile(i)}
                      className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-white hover:border-destructive transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {/* Thumbnail */}
                    <div className="w-full h-[200px] bg-secondary/20 flex items-center justify-center p-3">
                      {fd.previewUrl ? (
                        <img src={fd.previewUrl} className="max-w-full max-h-full object-contain rounded shadow-sm" alt="preview" />
                      ) : (
                        <FileBox className="h-12 w-12 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="p-3 border-t border-border/50">
                      <p className="text-xs font-semibold text-foreground truncate">{fd.file.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatSize(fd.file.size)} • {fd.pageCount} page{fd.pageCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* Add more button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-[60px] h-[60px] rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  {fileDataList.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                      {fileDataList.length}
                    </span>
                  )}
                  <Plus className="h-6 w-6" />
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
            <div className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col">
              <div className="p-6 flex-1">
                <h2 className="text-lg font-bold text-foreground mb-6">Compression level</h2>
                
                <div className="space-y-1">
                  {[
                    { id: 'extreme' as CompressMode, label: 'EXTREME COMPRESSION', desc: 'Less quality, high compression', color: 'text-primary' },
                    { id: 'recommended' as CompressMode, label: 'RECOMMENDED COMPRESSION', desc: 'Good quality, good compression', color: 'text-primary' },
                    { id: 'basic' as CompressMode, label: 'LESS COMPRESSION', desc: 'High quality, less compression', color: 'text-primary' }
                  ].map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => setMode(m.id)}
                      className={cn(
                        "w-full text-left px-4 py-4 rounded-lg border-l-4 transition-all",
                        mode === m.id 
                          ? "border-l-primary bg-primary/5" 
                          : "border-l-transparent hover:bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={cn("text-sm font-bold tracking-wide", mode === m.id ? "text-primary" : "text-foreground")}>
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
                <div className="mt-6 p-4 bg-secondary/20 rounded-xl border border-border/50">
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
              <div className="p-6 border-t border-border">
                <Button 
                  size="lg" 
                  className="w-full h-14 rounded-xl font-bold text-lg shadow-xl shadow-primary/25 group relative overflow-hidden" 
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

      <ToolSeoSection
        toolName="Compress PDF"
        category="compress"
        intro="MagicDocx Compress PDF lets you reduce the size of your documents while maintaining professional quality. Our Hierarchical Compression Engine offers three distinct modes: Extreme (up to 95% savings), Recommended (perfect balance), and Basic (high fidelity). Our browser-based processing ensures your files never leave your device."
        steps={[
          "Select the PDF files you want to compress from your computer or drag and drop them into the tool.",
          "Choose your preferred compression level: Extreme, Recommended, or Basic quality.",
          "Our engine will optimize images and clean up document headers locally in your browser.",
          "Download your compressed PDFs instantly. You can see the space saved by our Savings Ring gauge."
        ]}
        formats={["PDF"]}
        relatedTools={[
          { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
          { name: "Split PDF", path: "/split-pdf", icon: Scissors },
          { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          { name: "Protect PDF", path: "/protect-pdf", icon: ShieldCheck },
        ]}
        schemaName="Compress PDF Online"
        schemaDescription="Free online tool to compress PDF files. Reduce file size without losing quality."
      />
    </ToolLayout>
  );
};

export default CompressPdf;
