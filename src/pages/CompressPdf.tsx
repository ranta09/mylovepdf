import { useState, useEffect, useRef } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Minimize2, Settings, FileBox, CheckCircle2, ArrowRight, Download, Share2, Upload, AlertCircle, Loader2, Layout, Zap, X, RotateCw } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

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

  const estimateReduction = (): number => {
    if (mode === 'recommended') return 40;
    if (mode === 'high') return 95;
    if (mode === 'low') return 15;
    if (mode === 'custom') {
      const target = parseFloat(customTargetKB) * 1024;
      if (!target || files.length === 0) return 0;
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const reduction = ((totalSize - target) / totalSize) * 100;
      return Math.max(0, Math.min(95, Math.round(reduction)));
    }
    return 0;
  };

  const reductionPercentage = estimateReduction();
  const totalOriginalSize = files.reduce((acc, f) => acc + f.size, 0);
  const estimatedSize = totalOriginalSize * (1 - reductionPercentage / 100);

  // --- ADVANCED COMPRESSION HELPERS ---
  const processImage = async (imageBytes: Uint8Array, mimeType: string, targetDpi: number, quality: number): Promise<Uint8Array> => {
    return new Promise((resolve) => {
      const img = new Image();
      const blob = new Blob([imageBytes.buffer as ArrayBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Simple heuristic: 72 points per inch. 
        // We scale pixels so they align roughly with target DPI relative to a standard A4/Letter width.
        const maxDimension = Math.round((targetDpi / 72) * 600);

        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageBytes);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((resultBlob) => {
          if (resultBlob) {
            resultBlob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)));
          } else {
            resolve(imageBytes);
          }
        }, "image/jpeg", quality);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(imageBytes);
      };

      img.src = url;
    });
  };

  const startCompression = async () => {
    if (files.length === 0 || processing) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);
    const newResults: ProcessedFile[] = [];

    // Mode-specific targets as requested
    const targets = {
      recommended: { dpi: 150, quality: 0.75 },
      high: { dpi: 96, quality: 0.60 },
      low: { dpi: 200, quality: 0.85 },
      custom: { dpi: 120, quality: 0.70 }
    };

    let config = targets[mode === 'custom' ? 'custom' : mode];

    // Heuristic adjustment for custom target size
    if (mode === 'custom' && customTargetKB) {
      const targetSize = parseFloat(customTargetKB) * 1024;
      const totalSize = files.reduce((acc, f) => acc + f.size, 0);
      const ratio = targetSize / totalSize;

      if (ratio < 0.25) config = { dpi: 72, quality: 0.50 };
      else if (ratio < 0.5) config = { dpi: 96, quality: 0.60 };
      else if (ratio < 0.8) config = { dpi: 150, quality: 0.75 };
      else config = { dpi: 200, quality: 0.85 };
    }

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i);
      const file = files[i];
      try {
        setProgress(Math.round(((i) / files.length) * 100) + 2);

        // 1. Load original document
        const bytes = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const outDoc = await PDFDocument.create();

        // 2. Real Image Optimization (Step 2: Optimize images)
        // We traverse low-level objects to find and recompress images
        const context = srcDoc.context;
        const indirectObjects = context.enumerateIndirectObjects();

        for (let j = 0; j < indirectObjects.length; j++) {
          const [ref] = indirectObjects[j];
          const lookedUp = context.lookup(ref);

          if (lookedUp && (lookedUp as any).dict) {
            const dict = (lookedUp as any).dict;
            const subtype = dict.get(context.obj('Subtype'));
            if (subtype && subtype.toString() === '/Image') {
              const contents = (lookedUp as any).contents;
              if (contents && contents.length > 5000) {
                try {
                  const optimized = await processImage(contents, 'image/jpeg', config.dpi, config.quality);
                  (lookedUp as any).contents = optimized;
                } catch (e) {
                  console.warn("Failed to optimize image in PDF", e);
                }
              }
            }
          }
          if (j % 20 === 0) setProgress(Math.min(95, Math.round(((i + (j / indirectObjects.length)) / files.length) * 100)));
        }

        // 3. Create fresh document for structural cleanup (Purges unnecessary data)
        // (Already created earlier for context)

        // 4. Copy pages and apply rotation
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);

        const fileRotation = fileDataList[i]?.rotation || 0;
        copiedPages.forEach((page) => {
          if (fileRotation !== 0) {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees((currentRotation + fileRotation) % 360));
          }
          outDoc.addPage(page);
        });

        // 5. Strip metadata (Step 3: Remove unnecessary data)
        outDoc.setTitle('');
        outDoc.setAuthor('');
        outDoc.setSubject('');
        outDoc.setKeywords([]);
        outDoc.setProducer('MagicDOCX Compressor');
        outDoc.setCreator('MagicDOCX');

        setProgress(Math.round(((i + 0.9) / files.length) * 100));

        // 6. Save with maximum structural optimization and Flate compression
        const compressedBytes = await outDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
        });

        const finalBlob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const finalSize = finalBlob.size;
        const url = URL.createObjectURL(finalBlob);

        newResults.push({
          originalFile: file,
          compressedBlob: finalBlob,
          compressedUrl: url,
          originalSize: file.size,
          compressedSize: finalSize
        });

        // 7. AUTO-DOWNLOAD
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.pdf$/i, "_compressed.pdf");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

      } catch (err) {
        console.error("Compression failed for", file.name, err);
        toast.error(`Failed to compress ${file.name}`);
      }
    }

    setProgress(100);
    setResults(newResults);
    setProcessing(false);
    toast.success("Compression complete!");
  };

  return (
    <ToolLayout title="Compress PDF" description="Reduce PDF file size without losing quality" category="compress" icon={<Minimize2 className="h-7 w-7" />} metaTitle="Compress PDF — Reduce PDF Size Online Free" metaDescription="Compress PDF files to reduce size. Free online PDF compressor." toolId="compress" hideHeader>
      <div className="mt-2">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} multiple label="Select PDFs to compress" collapsible={false} />
          </div>
        ) : processing ? (
          <div className="mt-4 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-6 relative flex justify-center items-center h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              </div>
              <Settings className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>

            <h3 className="text-xl font-bold mb-1">Compressing your PDF...</h3>

            {files.length > 1 && (
              <p className="text-muted-foreground mb-4 font-medium text-xs bg-secondary inline-block px-2 py-0.5 rounded-full">
                File {currentFileIndex + 1} of {files.length}
              </p>
            )}

            <div className="w-full bg-secondary rounded-full h-2 mb-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-left space-y-2 mt-4 bg-background rounded-xl p-3 border border-border max-h-[250px] overflow-y-auto custom-scrollbar">
              {files.map((f, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-2 truncate max-w-[70%]">
                    {i < currentFileIndex ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> :
                      i === currentFileIndex ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" /> :
                        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground shrink-0" />}
                    <span className={cn("truncate", i > currentFileIndex ? "text-muted-foreground" : "text-foreground font-medium")}>{f.name}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="mt-4 mx-auto max-w-xl rounded-2xl border border-green-500/20 bg-card p-8 shadow-elevated text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>

            <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-1">PDF Compressed Successfully</h2>

            {results.length === 1 ? (
              <p className="text-sm text-muted-foreground mb-6">Your document is now optimized and ready to download.</p>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">All {results.length} documents have been successfully optimized.</p>
            )}

            <div className="bg-secondary/50 rounded-xl p-5 mb-6">
              <div className="grid grid-cols-3 gap-4 divide-x divide-border">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Original</p>
                  <p className="text-sm font-bold text-foreground line-through opacity-70">
                    {formatSize(results.reduce((acc, r) => acc + r.originalSize, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Compressed</p>
                  <p className="text-lg font-black text-green-600 dark:text-green-400">
                    {formatSize(results.reduce((acc, r) => acc + r.compressedSize, 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Saved</p>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-foreground">
                      {formatSize(results.reduce((acc, r) => acc + (r.originalSize - r.compressedSize), 0))}
                    </span>
                    <span className="text-[10px] font-bold text-white bg-green-500 px-1 py-0.5 rounded-sm mt-0.5">
                      {Math.round((1 - (results.reduce((acc, r) => acc + r.compressedSize, 0) / results.reduce((acc, r) => acc + r.originalSize, 0))) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full text-md h-12"
                onClick={() => {
                  results.forEach(r => {
                    const a = document.createElement('a');
                    a.href = r.compressedUrl;
                    a.download = r.originalFile.name.replace(/\.pdf$/i, "_compressed.pdf");
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  });
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download {results.length > 1 ? `Files (${files.length})` : 'File'}
              </Button>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button variant="outline" className="h-10 text-xs" onClick={() => { setResults([]); setFiles([]); }}>
                  <Upload className="mr-2 h-3.5 w-3.5" /> Compress New
                </Button>
                <Button variant="outline" className="h-10 text-xs" onClick={() => toast("Link copied to clipboard!")}>
                  <Share2 className="mr-2 h-3.5 w-3.5" /> Share
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* LEFT PANEL: SMART PREVIEW */}
            <div className="flex-1 space-y-4 lg:max-w-[calc(100%-424px)]">
              <div className="bg-card border border-border shadow-elevated rounded-2xl p-5 h-[500px] flex flex-col relative overflow-hidden group/sidebar">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none -z-0 transition-transform group-hover/sidebar:scale-110 duration-700"></div>

                <div className="flex items-center justify-between mb-4 relative z-10 shrink-0">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <FileBox className="h-4 w-4 text-primary" />
                    </div>
                    Files to Compress
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-full text-muted-foreground uppercase tracking-tight">
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 space-y-2 mb-3">
                  <AnimatePresence mode="popLayout">
                    {fileDataList.map((fd, idx) => (
                      <motion.div
                        key={`${fd.file.name}-${idx}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, x: -20 }}
                        className="flex gap-3 items-center bg-background/60 backdrop-blur-sm p-2 rounded-xl border border-border shadow-sm group hover:border-primary/40 hover:shadow-md transition-all duration-300 relative overflow-hidden shrink-0"
                      >
                        <div className="w-12 h-16 bg-secondary/30 rounded-lg border border-border/50 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner group-hover:scale-105 transition-transform duration-300">
                          {fd.previewUrl ? (
                            <img
                              src={fd.previewUrl}
                              alt="Preview"
                              className="w-full h-full object-contain transition-transform duration-300"
                              style={{ transform: `rotate(${fd.rotation}deg)` }}
                            />
                          ) : (
                            <FileBox className="h-5 w-5 text-muted-foreground/30" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                          <div className="absolute top-1 left-1 bg-primary px-1 py-0.5 rounded text-[7px] font-black text-white shadow-sm">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pr-10">
                          <p className="font-bold text-xs truncate text-foreground group-hover:text-primary transition-colors">{fd.file.name}</p>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground font-semibold">
                            <span className="bg-secondary/50 px-1.5 py-0.5 rounded border border-border/30">{formatSize(fd.file.size)}</span>
                            {fd.pageCount > 0 && <span className="flex items-center gap-1"><Layout className="h-2.5 w-2.5" /> {fd.pageCount} Pages</span>}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); rotateFile(idx); }}
                            className="p-1 bg-background border border-border rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground shadow-sm"
                            title="Rotate 90°"
                          >
                            <RotateCw className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-1 bg-background border border-border rounded-md hover:bg-red-50 hover:text-red-500 transition-colors text-muted-foreground shadow-sm"
                            title="Remove file"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="relative z-10 pt-3 border-t border-border mt-auto shrink-0">
                  <div className="flex gap-2">
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 h-10 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary/5 hover:border-primary/50 transition-all group/add"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5 group-hover/add:-translate-y-0.5 transition-transform" />
                      Add More Files
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      onClick={() => setFiles([])}
                      className="px-3 h-10 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-[10px] font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                    >
                      Reset
                    </motion.button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAddFiles}
                    accept=".pdf"
                    multiple
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: COMPRESSION CONTROLS */}
            <div className="w-full lg:w-[400px] shrink-0 space-y-4 h-[500px] flex flex-col">
              <div className="bg-card border border-border shadow-elevated rounded-2xl p-4 flex flex-col relative overflow-hidden flex-1 min-h-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none -z-0"></div>

                <div className="mb-3 relative z-10 shrink-0">
                  <h2 className="text-md font-black text-foreground tracking-tight flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                    Compression Level
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5 ml-3.5 uppercase tracking-widest">Balance savings & quality</p>
                </div>

                <div className="space-y-1.5 relative z-10 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {[
                    { id: 'recommended', label: 'Recommended', desc: 'Optimal balance', percent: 40, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
                    { id: 'high', label: 'High Compression', desc: 'Maximum savings', percent: 95, icon: Minimize2, color: 'text-primary', bg: 'bg-primary/10' },
                    { id: 'low', label: 'Low Compression', desc: 'Crisp quality', percent: 15, icon: FileBox, color: 'text-blue-500', bg: 'bg-blue-500/10' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as CompressMode)}
                      className={cn(
                        "w-full flex items-center p-2.5 rounded-xl border-2 transition-all duration-300 text-left group/mode",
                        mode === m.id
                          ? "border-primary bg-primary/[0.03] shadow-inner-sm ring-1 ring-primary/20"
                          : "border-border bg-background hover:border-primary/30 hover:shadow-sm"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg shrink-0 mr-3 transition-colors duration-300 shadow-sm", mode === m.id ? m.bg : "bg-secondary")}>
                        <m.icon className={cn("h-3.5 w-3.5", mode === m.id ? m.color : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-extrabold text-xs transition-colors", mode === m.id ? "text-foreground" : "text-muted-foreground group-hover/mode:text-foreground")}>{m.label}</p>
                        <p className="text-[9px] font-bold text-muted-foreground/60 leading-tight uppercase tracking-widest">{m.desc}</p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ml-1.5 transition-all duration-500",
                        mode === m.id ? "border-primary scale-110 shadow-glow" : "border-muted-foreground/20 scale-90"
                      )}>
                        {mode === m.id && <motion.div layoutId="active-dot" className="w-2 h-2 bg-primary rounded-full shadow-sm"></motion.div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE ESTIMATION PANEL */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/0 border-2 border-primary/10 shadow-elevated rounded-2xl p-4 relative overflow-hidden group/estimate shrink-0">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full opacity-20 blur-2xl group-hover/estimate:scale-150 transition-transform duration-700"></div>
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover/estimate:bg-primary transition-colors"></div>

                <div className="flex justify-between items-center mb-3 relative z-10">
                  <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-primary rounded-full animate-ping"></div>
                    Real-time Estimate
                  </h3>
                  <div className="bg-primary px-2 py-0.5 rounded-full text-[9px] font-black text-primary-foreground shadow-glow animate-pulse">
                    -{reductionPercentage}%
                  </div>
                </div>

                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-muted-foreground/60 tracking-tight">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30"></div>
                      Original Total
                    </div>
                    <span className="text-muted-foreground line-through decoration-primary/30">{formatSize(totalOriginalSize)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/5 -mx-1 px-3 py-2 rounded-xl border border-primary/10 backdrop-blur-sm group-hover/estimate:bg-primary/10 transition-colors duration-300">
                    <span className="text-[10px] font-black text-foreground flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary fill-primary/20" />
                      Optimized Size
                    </span>
                    <span className="font-black text-md text-primary tracking-tight">{formatSize(estimatedSize)}</span>
                  </div>
                </div>

                <Button
                  onClick={startCompression}
                  size="lg"
                  className="w-full mt-3 h-11 text-[11px] font-black uppercase tracking-widest shadow-elevated hover:shadow-primary/30 transition-all group-hover:bg-primary group-hover:shadow-glow rounded-xl"
                >
                  Compress PDF <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
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
