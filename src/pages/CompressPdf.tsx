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
  FileText
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

// --- DB Utility for Persistent Results ---
const DB_NAME = "MagicDocxDB";
const STORE_NAME = "CompressSessions";

const saveSession = async (results: any[]) => {
  try {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(results, "last-result");
    };
  } catch (e) { console.error("DB Save Fail", e); }
};

const loadSession = (): Promise<any[] | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
           resolve(null); return;
        }
        const tx = db.transaction(STORE_NAME, "readonly");
        const get = tx.objectStore(STORE_NAME).get("last-result");
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
};

const clearSession = async () => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onsuccess = () => {
    const db = request.result;
    if (db.objectStoreNames.contains(STORE_NAME)) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete("last-result");
    }
  };
};

type CompressMode = 'extreme' | 'recommended' | 'basic';

interface FileData {
  file: File;
  previewUrl: string;
  pageCount: number;
  rotation: number;
  id: string;
}

interface ProcessedFile {
  name: string;
  originalSize: number;
  compressedSize: number;
  url: string;
  blob: Blob;
}

const SavingsRing = ({ percentage }: { percentage: number }) => (
  <div className="relative w-32 h-32 flex items-center justify-center">
    <svg className="w-full h-full transform -rotate-90">
      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-secondary" />
      <motion.circle
        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
        className="text-primary"
        strokeDasharray={364.4}
        initial={{ strokeDashoffset: 364.4 }}
        animate={{ strokeDashoffset: 364.4 - (364.4 * percentage) / 100 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-3xl font-black text-foreground">{percentage}%</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Smaller</span>
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

  // --- Session Hydration ---
  useEffect(() => {
    loadSession().then(saved => { if (saved) setResults(saved); });
  }, []);

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
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: ctx!, viewport }).promise;
        list.push({ file: f, previewUrl: canvas.toDataURL(), pageCount: pdf.numPages, rotation: 0, id: Math.random().toString(36).slice(2) });
      } catch (e) {
        console.error("Preview fail", e);
        list.push({ file: f, previewUrl: "", pageCount: 0, rotation: 0, id: Math.random().toString(36).slice(2) });
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
    clearSession();
  }, [generatePreviews]);

  // --- Handoff Logic ---
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
    
    // Config based on mode
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
    const newRes: ProcessedFile[] = [];
    try {
      for (const fd of fileDataList) {
        const compressed = await compressSinglePdf(fd.file, mode, (p) => setProgress(p));
        newRes.push({
          name: fd.file.name.replace(/\.pdf$/, "_compressed.pdf"),
          originalSize: fd.file.size,
          compressedSize: compressed.size,
          url: URL.createObjectURL(compressed),
          blob: compressed
        });
      }
      setResults(newRes);
      saveSession(newRes);
      setFiles([]);
      toast.success("PDFs compressed successfully!");
    } catch (e) {
      toast.error("Compression failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const totalOriginalResults = results.reduce((acc, r) => acc + r.originalSize, 0);
  const totalCompressed = results.reduce((acc, r) => acc + r.compressedSize, 0);
  const totalSaved = totalOriginalResults - totalCompressed;
  const savingsPercent = totalOriginalResults > 0 ? Math.round((totalSaved / totalOriginalResults) * 100) : 0;
  const totalInFlight = fileDataList.reduce((acc, f) => acc + f.file.size, 0);

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
        {results.length > 0 ? (
          <div className="mt-8 mx-auto max-w-2xl w-full space-y-8 pb-20">
            <div className="bg-card border border-border/60 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl text-center">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -z-0"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="mb-8">
                  <SavingsRing percentage={savingsPercent} />
                </div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">Great job!</h2>
                <p className="text-muted-foreground font-medium mb-8">You've saved {(totalSaved / (1024 * 1024)).toFixed(2)} MB of space.</p>
                
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
                  <div className="bg-secondary/30 p-4 rounded-2xl border border-border/40">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Before</p>
                    <p className="text-lg font-black text-muted-foreground line-through opacity-50">{(totalOriginalResults / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">After</p>
                    <p className="text-lg font-black text-foreground">{(totalCompressed / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button size="lg" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.15em] shadow-glow" onClick={() => {
                      results.forEach(r => {
                          const a = document.createElement("a"); a.href = r.url; a.download = r.name; a.click();
                      });
                  }}>
                    <Download className="mr-2 h-4 w-4" /> Download Files
                  </Button>
                  <Button size="lg" variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.15em] border-2" onClick={() => { clearSession(); setResults([]); setFileDataList([]); }}>
                    <RotateCw className="mr-2 h-4 w-4" /> Start Over
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : files.length === 0 ? (
          <ToolUploadScreen
            title="Compress PDF"
            description="Reduce file size while optimization quality"
            buttonLabel="Select PDF files"
            accept=".pdf"
            multiple={true}
            onFilesSelected={handleFilesChange}
          />
        ) : processing ? (
          <div className="mt-12 flex justify-center">
            <ProcessingView 
              files={files} 
              processing={true} 
              progress={progress} 
              onProcess={() => {}} 
              buttonText="" 
              processingText="Optimizing your document..." 
              estimateText="Reducing file size without compromising quality" 
            />
          </div>
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col xl:flex-row overflow-hidden">
             <div className="w-full xl:w-[400px] border-r border-border bg-card flex flex-col py-6 px-4">
                <div className="px-4 mb-6 flex justify-between items-center">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Original Files ({fileDataList.length})</h2>
                   <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest" onClick={() => setFileDataList([])}>Reset</Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {fileDataList.map((fd, i) => (
                       <div key={fd.id} className="group p-3 rounded-2xl border border-border/40 bg-background hover:border-primary/30 transition-all flex items-center gap-3">
                           <div className="w-12 h-16 bg-secondary/30 rounded-lg border border-border flex items-center justify-center shrink-0 overflow-hidden text-muted-foreground/30">
                               {fd.previewUrl ? <img src={fd.previewUrl} className="w-full h-full object-contain p-1" alt="preview" /> : <FileBox className="h-6 w-6" />}
                           </div>
                           <div className="flex-1 min-w-0 pr-4">
                               <p className="text-[11px] font-black text-foreground truncate">{fd.file.name}</p>
                               <p className="text-[9px] font-bold text-muted-foreground mt-0.5 tracking-wider uppercase">{(fd.file.size / (1024 * 1024)).toFixed(2)} MB • {fd.pageCount} Pages</p>
                           </div>
                           <button onClick={() => setFileDataList(prev => prev.filter((_, idx) => idx !== i))} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-lg transition-all"><X className="h-3.5 w-3.5" /></button>
                       </div>
                   ))}
                </div>
                <div className="pt-4 mt-auto border-t border-border border-dashed">
                   <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-2" onClick={() => {}}>Add more files</Button>
                </div>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="max-w-md w-full space-y-10 relative z-10">
                   <div className="text-center">
                       <h1 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">Compression Settings</h1>
                       <p className="text-sm text-muted-foreground font-medium">Select the best mode for your needs</p>
                   </div>

                   <div className="grid grid-cols-1 gap-2">
                       {[
                           { id: 'extreme', label: 'Extreme Compression', desc: 'Less quality, high compression', icon: Sparkles, color: 'text-orange-500' },
                           { id: 'recommended', label: 'Recommended', desc: 'Good quality, good compression', icon: CheckCircle2, color: 'text-green-500' },
                           { id: 'basic', label: 'Basic Compression', desc: 'High quality, less compression', icon: Minimize2, color: 'text-blue-500' }
                       ].map(m => (
                           <button 
                             key={m.id} 
                             onClick={() => setMode(m.id as CompressMode)}
                             className={cn("w-full p-5 rounded-3xl border-2 transition-all duration-300 text-left flex items-center gap-4 group", mode === m.id ? "border-primary bg-primary/[0.03] shadow-glow" : "border-border bg-card hover:border-primary/20")}
                           >
                               <div className={cn("p-3 rounded-2xl transition-all duration-300", mode === m.id ? "bg-primary text-white" : "bg-background text-muted-foreground group-hover:text-primary") }>
                                   <m.icon className="h-5 w-5" />
                               </div>
                               <div className="flex-1 min-w-0">
                                   <p className={cn("text-sm font-black uppercase tracking-widest leading-none mb-1", mode === m.id ? "text-primary" : "text-foreground")}>{m.label}</p>
                                   <p className="text-[10px] text-muted-foreground font-medium opacity-60 truncate">{m.desc}</p>
                               </div>
                               {mode === m.id && <motion.div layoutId="mode-check" className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"><ArrowRight className="h-3 w-3" /></motion.div>}
                           </button>
                       ))}
                   </div>

                   <div className="pt-6 border-t border-border border-dashed">
                       <div className="flex justify-between items-baseline mb-6">
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimate</span>
                           <span className="text-2xl font-black text-foreground tracking-tighter">~{(totalInFlight / (1024 * 1024) * 0.4).toFixed(2)} MB <span className="text-xs text-primary font-black uppercase ml-1 animate-pulse">-60%</span></span>
                       </div>
                       <Button size="lg" className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/25 group relative overflow-hidden" onClick={startProcessing}>
                           <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                           Compress PDF
                       </Button>
                   </div>
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
