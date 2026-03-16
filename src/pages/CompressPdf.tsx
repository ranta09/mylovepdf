import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Minimize2, Settings, FileBox, CheckCircle2, ArrowRight, Download, Share2, Upload, AlertCircle, Loader2, Layout, Zap, X, RotateCw, RefreshCw, Plus, ShieldCheck, Merge, Scissors, FileText, LayoutGrid } from "lucide-react";
import JSZip from "jszip";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type CompressMode = 'recommended' | 'high' | 'low' | 'custom';

interface FileData {
  file: File;
  previewUrl: string;
  pageCount: number;
  rotation: number;
}

interface ProcessedFile {
  originalFile: File;
  compressedBlob: Blob;
  compressedUrl: string;
  originalSize: number;
  compressedSize: number;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const CompressPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileDataList, setFileDataList] = useState<FileData[]>([]);
  const [mode, setMode] = useState<CompressMode>('recommended');
  const [customTargetKB, setCustomTargetKB] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [results, setResults] = useState<ProcessedFile[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      fileDataList.forEach(fd => URL.revokeObjectURL(fd.previewUrl));
      results.forEach(r => URL.revokeObjectURL(r.compressedUrl));
    };
  }, [fileDataList, results]);

  const loadFilePreviews = async (newFiles: File[]) => {
    const newData: FileData[] = [];
    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          const previewUrl = canvas.toDataURL("image/jpeg", 0.8);
          newData.push({ file, previewUrl, pageCount: pdf.numPages, rotation: 0 });
        }
      } catch (err) {
        console.error("Error generating preview:", err);
        newData.push({ file, previewUrl: "", pageCount: 0, rotation: 0 }); // Fallback
      }
    }
    setFileDataList(newData);
  };

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResults([]);
    setCurrentFileIndex(0);
    setProgress(0);
    if (newFiles.length > 0) {
      loadFilePreviews(newFiles);
    } else {
      setFileDataList([]);
    }
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      const mergedFiles = [...files, ...newFiles];
      setFiles(mergedFiles);

      // Load previews ONLY for the new files and append
      const loadMorePreviews = async () => {
        const newData: FileData[] = [];
        for (const file of newFiles) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport }).promise;
              const previewUrl = canvas.toDataURL("image/jpeg", 0.8);
              newData.push({ file, previewUrl, pageCount: pdf.numPages, rotation: 0 });
            }
          } catch (err) {
            console.error("Error generating preview:", err);
            newData.push({ file, previewUrl: "", pageCount: 0, rotation: 0 });
          }
        }
        setFileDataList(prev => [...prev, ...newData]);
      };
      loadMorePreviews();
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileDataList(prev => {
      const newList = prev.filter((_, i) => i !== index);
      // Revoke the URL of the removed file to prevent leaks
      if (prev[index]?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev[index].previewUrl);
      }
      return newList;
    });
  };

  const rotateFile = (index: number) => {
    setFileDataList(prev => prev.map((item, i) =>
      i === index ? { ...item, rotation: (item.rotation + 90) % 360 } : item
    ));
  };

  // Estimate compressed size based on page count and DPI/quality settings
  const estimateCompressedSize = (): number => {
    const totalPages = fileDataList.reduce((acc, fd) => acc + fd.pageCount, 0);
    if (totalPages === 0) return 0;

    const configs: Record<string, { dpi: number; quality: number }> = {
      recommended: { dpi: 150, quality: 0.75 },
      high: { dpi: 96, quality: 0.60 },
      low: { dpi: 200, quality: 0.85 },
      custom: { dpi: 120, quality: 0.70 },
    };

    let config = configs[mode] || configs.recommended;

    if (mode === 'custom' && customTargetKB) {
      const targetBytes = parseFloat(customTargetKB) * 1024;
      if (targetBytes > 0) return targetBytes;
    }

    const widthPx = 8.27 * config.dpi;
    const heightPx = 11.69 * config.dpi;
    const totalPixels = widthPx * heightPx;
    const bytesPerPage = totalPixels * config.quality * 0.15;
    const pdfOverhead = totalPages * 5000 + 2000;

    return Math.round(bytesPerPage * totalPages + pdfOverhead);
  };

  const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);
  const estimatedSize = Math.min(totalOriginalSize, estimateCompressedSize());
  const reductionPercentage = totalOriginalSize > 0
    ? Math.round(((totalOriginalSize - estimatedSize) / totalOriginalSize) * 100)
    : 0;

  const compressSinglePdf = async (
    file: File,
    dpi: number,
    quality: number,
    onProgress: (p: number) => void
  ): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdfDoc.numPages;
    const outDoc = await PDFDocument.create();
    const scale = dpi / 72;

    for (let i = 1; i <= numPages; i++) {
      onProgress(Math.round((i / numPages) * 90));

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpegBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob!),
          "image/jpeg",
          quality
        );
      });

      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
      const jpegImage = await outDoc.embedJpg(jpegBytes);
      const origViewport = page.getViewport({ scale: 1 });
      const pdfPage = outDoc.addPage([origViewport.width, origViewport.height]);
      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });
    }

    outDoc.setProducer("MagicDOCX");
    outDoc.setCreator("MagicDOCX");
    onProgress(95);

    const compressedBytes = await outDoc.save({ useObjectStreams: true });
    const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: "application/pdf" });

    return { blob, originalSize: file.size, compressedSize: blob.size };
  };

  const startCompression = async () => {
    if (files.length === 0 || processing) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setZipUrl(null);
    const newResults: ProcessedFile[] = [];
    const zip = files.length > 1 ? new JSZip() : null;

    const targets = {
      recommended: { dpi: 150, quality: 0.75 },
      high: { dpi: 96, quality: 0.60 },
      low: { dpi: 200, quality: 0.85 },
      custom: { dpi: 120, quality: 0.70 },
    };

    let config = targets[mode === "custom" ? "custom" : mode];

    if (mode === "custom" && customTargetKB) {
      const targetSize = parseFloat(customTargetKB) * 1024;
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const ratio = targetSize / totalSize;
      if (ratio < 0.1) config = { dpi: 72, quality: 0.40 };
      else if (ratio < 0.25) config = { dpi: 72, quality: 0.50 };
      else if (ratio < 0.5) config = { dpi: 96, quality: 0.60 };
      else if (ratio < 0.8) config = { dpi: 150, quality: 0.75 };
      else config = { dpi: 200, quality: 0.85 };
    }

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i);
      const file = files[i];

      try {
        const result = await compressSinglePdf(
          file,
          config.dpi,
          config.quality,
          (p) => setProgress(Math.round(((i + p / 100) / files.length) * 100))
        );

        const url = URL.createObjectURL(result.blob);

        newResults.push({
          originalFile: file,
          compressedBlob: result.blob,
          compressedUrl: url,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
        });

        if (zip) {
          zip.file(file.name.replace(/\.pdf$/i, "_compressed.pdf"), result.blob);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name.replace(/\.pdf$/i, "_compressed.pdf");
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error("Compression failed for", file.name, err);
        toast.error(`Failed to compress ${file.name}`);
      }
    }

    if (zip && newResults.length > 0) {
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      setZipUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = "MagicDOCX_Compressed_PDFs.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    setProgress(100);
    setResults(newResults);
    setProcessing(false);
    if (newResults.length > 0) toast.success("Compression complete!");
  };

  return (
    <ToolLayout title="Compress PDF Online" description="Reduce PDF file size without losing quality" category="compress" icon={<Minimize2 className="h-7 w-7" />} metaTitle="Compress PDF Online Free – Fast & Secure | MagicDocx" metaDescription="Compress PDF files to reduce size online for free. Choose strong, recommended, or professional compression. Fast, secure, and no installation needed." toolId="compress" hideHeader={files.length > 0}>
      <div className="mt-2 text-left">
        {files.length === 0 && !processing && results.length === 0 && (
          <div className="mt-10 text-center">
            <FileUpload
              accept=".pdf"
              files={files}
              onFilesChange={handleFilesChange}
              label="Select PDF files to compress"
            />
          </div>
        )}

        {files.length > 0 && !processing && results.length === 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT SIDE: Thumbnails Grid (Small Window Preview) */}
            <div className="w-full lg:w-[60%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
              <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFiles([]); setFileDataList([]); }}
                    className="h-8 w-8 p-0 rounded-full hover:bg-secondary/20"
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </Button>
                  <div className="h-4 w-[1px] bg-border mx-1" />
                  <div className="flex items-center gap-2 text-left">
                    <FileBox className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{files.length} Files</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFiles([]); setFileDataList([]); }}
                    className="h-8 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive/5 px-3"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleAddFiles} accept=".pdf" multiple className="hidden" />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {fileDataList.map((fd, idx) => (
                      <div key={idx} className="group flex flex-col gap-2 p-2 bg-background border border-border hover:border-primary/50 rounded-xl transition-all duration-200 text-left relative">
                        <div className="aspect-[3/4] w-full bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-border/10">
                          {fd.previewUrl ? (
                            <img src={fd.previewUrl} alt="Preview" className="w-full h-full object-contain" style={{ transform: `rotate(${fd.rotation}deg)` }} />
                          ) : (
                            <FileBox className="h-8 w-8 text-muted-foreground/30" />
                          )}
                          <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => rotateFile(idx)} className="p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:text-primary transition-colors shadow-sm border border-border/50"><RotateCw className="h-3 w-3" /></button>
                            <button onClick={() => removeFile(idx)} className="p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:text-destructive transition-colors shadow-sm border border-border/50"><X className="h-3 w-3" /></button>
                          </div>
                          <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase text-muted-foreground">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="px-1 min-w-0">
                          <p className="text-[9px] font-bold text-foreground uppercase tracking-tight truncate">{fd.file.name}</p>
                          <p className="text-[8px] font-bold text-primary uppercase">{formatSize(fd.file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[3/4] border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <Plus className="h-5 w-5" />
                      Add More
                    </button>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* RIGHT SIDE: Workbench Settings */}
            <div className="flex-1 bg-secondary/10 flex flex-col p-6 lg:pt-8 lg:pb-12 lg:px-12 overflow-y-auto">
              <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-background border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-0" />
                    <div className="relative z-10 space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Weight</p>
                      <p className="text-3xl font-bold text-foreground tracking-tighter">{formatSize(totalOriginalSize)}</p>
                    </div>
                  </div>
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -z-0" />
                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Post Estimation</p>
                        <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-glow">-{reductionPercentage}%</span>
                      </div>
                      <p className="text-3xl font-bold text-primary tracking-tighter">{formatSize(estimatedSize)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-background border border-border rounded-3xl p-8 space-y-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-base font-bold uppercase tracking-tighter">Compression Engine</h3>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Advanced neural optimization active</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      { id: 'high', label: 'Strong Compression', desc: 'Smaller files and lower quality', icon: Minimize2, color: 'text-primary' },
                      { id: 'recommended', label: 'Recommended', desc: 'Balanced size and quality', icon: CheckCircle2, color: 'text-green-500' },
                      { id: 'low', label: 'Professional', desc: 'Best quality and minimal compression', icon: FileBox, color: 'text-blue-500' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as CompressMode)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-300 group relative overflow-hidden",
                          mode === m.id ? "border-primary bg-primary/5 shadow-inner" : "border-border bg-background hover:border-primary/20"
                        )}
                      >
                        <m.icon className={cn("h-6 w-6 shrink-0", mode === m.id ? m.color : "text-muted-foreground/40")} />
                        <div className="flex flex-col">
                          <p className={cn("text-[11px] font-bold uppercase tracking-widest", mode === m.id ? "text-foreground" : "text-muted-foreground")}>{m.label}</p>
                          <p className="text-[9px] font-medium text-muted-foreground/40 uppercase leading-none tracking-tight">{m.desc}</p>
                        </div>
                        {mode === m.id && <div className="ml-auto"><CheckCircle2 className="h-4 w-4 text-primary" /></div>}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={startCompression}
                    size="lg"
                    className="w-full h-16 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all gap-4 group"
                  >
                    Start Neural Compression
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Processing View ─────────────────────────────────────────────── */}
        {processing && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="w-full max-w-xl space-y-8 text-center bg-card border border-border p-12 rounded-3xl shadow-2xl">
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Settings className="h-10 w-10 text-primary animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold uppercase tracking-tighter">Compressing Document Architecture</h3>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{files.length > 1 ? `Optimizing File ${currentFileIndex + 1} of ${files.length}` : "Generating Neural Preview..."}</p>
              </div>

              <div className="space-y-2">
                <Progress value={progress} className="h-2 rounded-full" />
                <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{progress}% Complete</p>
              </div>

              <div className="pt-4 border-t border-border mt-8 space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {files.map((f, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] font-medium uppercase tracking-widest">
                    <span className="flex items-center gap-2 max-w-[70%] truncate">
                      {i < currentFileIndex ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : i === currentFileIndex ? <Loader2 className="h-3 w-3 text-primary animate-spin" /> : <div className="h-3 w-3 rounded-full border border-border" />}
                      <span className={cn(i === currentFileIndex ? "text-foreground" : "text-muted-foreground")}>{f.name}</span>
                    </span>
                    <span className="text-muted-foreground">{formatSize(f.size)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS PHASE ─────────────────────────────────────────────── */}
        {results.length > 0 && !processing && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-50 bg-background flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-card border border-primary/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-primary/5 border-b border-primary/10 p-12 text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/30">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-3xl font-bold uppercase tracking-tighter leading-none">Architectural Optimization Complete</h2>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Documents have been successfully compressed</p>
                </div>

                <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border grid grid-cols-3 gap-6 divide-x divide-border shadow-sm">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Input size</p>
                    <p className="text-md font-medium text-muted-foreground/60 line-through tracking-tighter">{formatSize(totalOriginalSize)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Optimized Weight</p>
                    <p className="text-2xl font-bold text-primary tracking-tighter">{formatSize(results.reduce((acc, r) => acc + r.compressedSize, 0))}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Neutral Savings</p>
                    <div className="flex flex-col items-center">
                      <p className="text-md font-medium text-foreground tracking-tighter">{formatSize(totalOriginalSize - results.reduce((acc, r) => acc + r.compressedSize, 0))}</p>
                      <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1">
                        {Math.round((1 - (results.reduce((acc, r) => acc + r.compressedSize, 0) / (totalOriginalSize || 1))) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-3">
                <Button
                  size="lg"
                  className="w-full h-16 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/30 transition-all hover:scale-[1.01]"
                  onClick={() => {
                    if (zipUrl) {
                      const a = document.createElement('a');
                      a.href = zipUrl;
                      a.download = "MagicDOCX_Compressed_PDFs.zip";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    } else {
                      results.forEach(r => {
                        const a = document.createElement('a');
                        a.href = r.compressedUrl;
                        a.download = r.originalFile.name.replace(/\.pdf$/i, "_compressed.pdf");
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      });
                    }
                  }}
                >
                  <Download className="h-5 w-5 mr-3" /> Download {results.length > 1 ? 'ZIP Archive' : 'Optimized PDF'}
                </Button>
                <Button variant="ghost" className="w-full h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground" onClick={() => { setResults([]); setFiles([]); }}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Start New Compression
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToolSeoSection
        toolName="Compress PDF"
        category="compress"
        intro="MagicDocx Compress PDF reduces your PDF file size without sacrificing readability. It's ideal for emailing large reports, uploading to portals with size limits, or optimizing documents for the web. Choose from three professional compression modes — Strong, Recommended, or Professional — or enter a custom target size. All processing happens in your browser, keeping your files private and secure."
        steps={[
          "Upload one or more PDF files to the compress tool.",
          "Select a compression mode: Strong, Recommended, or Professional quality.",
          "Optionally, specify a custom target file size in KB.",
          "Click \"Start Compression\" and your optimized PDF will download automatically."
        ]}
        formats={["PDF"]}
        relatedTools={[
          { name: "Merge PDF", path: "/merge-pdf", icon: Merge },
          { name: "Split PDF", path: "/split-pdf", icon: Scissors },
          { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          { name: "Organize Pages", path: "/organize-pdf", icon: LayoutGrid },
        ]}
        schemaName="Compress PDF Online"
        schemaDescription="Free online PDF compressor. Reduce PDF file size with multiple compression modes without losing quality."
      />
    </ToolLayout>
  );
};

export default CompressPdf;
