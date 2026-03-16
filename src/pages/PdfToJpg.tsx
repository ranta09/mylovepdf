import { useState, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { Image, FileBox, CheckCircle2, ArrowRight, RotateCw, RotateCcw, ShieldCheck, Settings, Layout, FileText, Layers, Upload, Trash2, RefreshCw, Plus, ArrowLeft } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

import { convertPdfToImages, packageImagesToZip, ImageResult, PageConversionOptions } from "@/lib/pdfToImageEngine";
import { useRef } from "react";

interface FileData {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface PageData {
  id: string;
  fileId: string;
  originalIndex: number; // 1-indexed
  thumbnail: string;
  rotation: number;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToJpg = () => {
  const [filesData, setFilesData] = useState<FileData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [outputFormat, setOutputFormat] = useState<"zip" | "separate">("zip");
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisableGlobalFeatures(filesData.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [filesData.length, processing, results.length, setDisableGlobalFeatures]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFilesChange = async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    
    // Convert to FileData
    const newFilesData: FileData[] = newFiles.map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size
    }));

    setFilesData(prev => [...prev, ...newFilesData]);

    // Generate thumbnails for each new file
    for (const fileData of newFilesData) {
      try {
        const arrayBuffer = await fileData.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const newPages: PageData[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const p = await pdf.getPage(i);
          const canvas = document.createElement("canvas");
          const v = p.getViewport({ scale: 0.6 }); // Further improved scale for high-clarity previews
          canvas.height = v.height;
          canvas.width = v.width;
          await p.render({ canvasContext: canvas.getContext("2d")!, viewport: v }).promise;
          
          newPages.push({
            id: generateId(),
            fileId: fileData.id,
            originalIndex: i,
            thumbnail: canvas.toDataURL(),
            rotation: 0
          });
        }
        setPages(prev => [...prev, ...newPages]);
      } catch (err) {
        console.error("Failed to process file:", fileData.name, err);
        toast.error(`Failed to process ${fileData.name}`);
      }
    }
  };

  const removePage = (pageId: string) => {
    setPages(prev => prev.filter(p => p.id !== pageId));
  };

  const rotatePage = (pageId: string) => {
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p
    ));
  };

  // Options
  const [quality, setQuality] = useState("high"); // low, medium, high
  const [dpi, setDpi] = useState("300"); // 150, 300, 600
  const [pageRange, setPageRange] = useState(""); // e.g. "1-3,5"

  const convert = useCallback(async () => {
    if (pages.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setPreviews([]);
    setResults([]);

    try {
      const getQualityFromDpi = (d: string) => {
        if (d === "300") return 0.95;
        if (d === "200") return 0.85;
        return 0.7; // 150 DPI
      };
      const jpgQuality = getQualityFromDpi(dpi);
      const scaleDpi = parseInt(dpi) || 300;

      const allImageResults: ImageResult[] = [];
      const distinctFileIds = [...new Set(pages.map(p => p.fileId))];
      const activeFilesData = filesData.filter(f => distinctFileIds.includes(f.id));

      for (let i = 0; i < activeFilesData.length; i++) {
        const fileData = activeFilesData[i];
        const filePages = pages.filter(p => p.fileId === fileData.id);
        
        const res = await convertPdfToImages(fileData.file, {
          format: "jpg",
          quality: jpgQuality,
          dpi: scaleDpi,
          pages: filePages.map(p => p.originalIndex),
          pageSettings: filePages.map(p => ({
            page: p.originalIndex,
            rotation: p.rotation
          }))
        }, (p) => {
          const overallP = Math.round(((i + (p / 100)) / activeFilesData.length) * 100);
          setProgress(overallP);
        });
        
        // Ensure the order in allImageResults matches the order in 'pages'
        // This is a bit tricky if pages are interleaved from different files.
        // Let's just collect them and then re-sort based on the 'pages' array.
        allImageResults.push(...res);
      }

      // Final sorting to match the user's page order (if we implement reordering later)
      // For now, it matches the order of files and then pages within files.

      const processedResults: ProcessingResult[] = allImageResults.map(res => ({
        file: res.blob,
        url: res.dataUrl,
        filename: res.filename
      }));

      setPreviews(allImageResults.map(res => res.dataUrl));

      if (outputFormat === "zip" && processedResults.length > 0) {
        const zipBlob = await packageImagesToZip(allImageResults);
        const zipUrl = URL.createObjectURL(zipBlob);
        const zipName = `${filesData[0].name.replace(/\.[^/.]+$/, "")}_images.zip`;
        const zipResult = { file: zipBlob, url: zipUrl, filename: zipName };
        setResults([zipResult, ...processedResults]);
        saveAs(zipBlob, zipName);
      } else {
        setResults(processedResults);
        const toDownload = processedResults.slice(0, 10);
        toDownload.forEach((res, i) => {
          setTimeout(() => {
            const a = document.createElement("a");
            a.href = res.url;
            a.download = res.filename;
            a.click();
          }, i * 250);
        });
        if (processedResults.length > 10) {
          toast.info("Downloaded first 10 images. Use the results panel to download the rest.");
        }
      }

      toast.success(`Converted ${allImageResults.length} page${allImageResults.length > 1 ? "s" : ""} to JPG!`);
    } catch (err) {
      console.error(err);
      toast.error("Conversion failed. Please try again.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [pages, filesData, dpi, outputFormat]);

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Convert each PDF page into a high-quality JPG image"
      category="convert"
      icon={<Image className="h-7 w-7" />}
      metaTitle="PDF to JPG Converter – Convert PDF Pages to Images | MagicDocx"
      metaDescription="Convert PDF pages to high-resolution JPG images. Choose quality, DPI, and specific pages. Free online PDF to image converter."
      toolId="pdf-to-jpg"
      hideHeader={filesData.length > 0 || results.length > 0 || processing}
      className="pdf-to-jpg-page"
    >
      <style>{`
        .pdf-to-jpg-page h1, 
        .pdf-to-jpg-page h2, 
        .pdf-to-jpg-page h3,
        .pdf-to-jpg-page span,
        .pdf-to-jpg-page button,
        .pdf-to-jpg-page p,
        .pdf-to-jpg-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(filesData.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden font-sans">


          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                  <Image className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Decompressing PDF Stream</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{progress}% Rendered</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView hideShare results={results} onReset={() => { setFilesData([]); setResults([]); setPreviews([]); setPages([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: Preview */}
              <div className="flex-1 bg-secondary/10 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Document Preview</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                      {pages.length} Pages • {filesData.length} Files
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/5 text-[10px] font-bold uppercase tracking-widest gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add More
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      multiple 
                      accept=".pdf"
                      onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))}
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 p-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 max-w-6xl mx-auto">
                    {pages.map((page, i) => (
                      <div key={page.id} className="relative group animate-in fade-in zoom-in-95 duration-300 select-none" style={{ animationDelay: `${i * 30}ms` }}>
                        <div 
                          className="aspect-[3/4] rounded-xl border-2 border-border bg-background shadow-md overflow-hidden transition-all duration-300 relative"
                          style={{ transform: `rotate(${page.rotation}deg)` }}
                        >
                          <img src={page.thumbnail} alt={`Page ${page.originalIndex}`} className="w-full h-full object-cover pointer-events-none" />
                        </div>
                        
                        {/* Page Overlay Tools */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl z-20">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => rotatePage(page.id)}
                              className="h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-all outline-none"
                              title="Rotate 90°"
                            >
                              <RotateCw className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => removePage(page.id)}
                              className="h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-all outline-none"
                              title="Remove Page"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-foreground bg-white/80 px-2 py-1 rounded-md shadow-sm">
                            Page {page.originalIndex}
                          </span>
                        </div>

                        {/* Page Badge */}
                        <div className="absolute top-2 right-2 h-6 w-6 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center justify-center shadow-lg z-30">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT PANEL: Actions */}
              <div className="w-[400px] border-l border-border bg-card flex flex-col shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-8 space-y-10">
                    {/* Tool Branding / Context */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold uppercase tracking-tighter">PDF to JPG</span>
                        </div>
                        <button 
                          onClick={() => { setFilesData([]); setResults([]); setPreviews([]); setPages([]); }}
                          className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors active:scale-95"
                        >
                          <RefreshCw className="h-3 w-3" /> Start Over
                        </button>
                      </div>
                      <div className="h-px bg-border border-dashed" />
                    </div>


                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Image Quality</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Normal", value: "150" },
                              { label: "Recommended", value: "200" },
                              { label: "High", value: "300" }
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setDpi(opt.value)}
                                className={cn(
                                  "h-11 rounded-xl border-2 text-[9px] font-bold uppercase tracking-widest transition-all",
                                  dpi === opt.value 
                                    ? "border-primary bg-primary/5 text-primary" 
                                    : "border-border bg-background text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Output Format</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setOutputFormat("zip")}
                              className={cn(
                                "h-11 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                outputFormat === "zip" ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              Download ZIP
                            </button>
                            <button
                              onClick={() => setOutputFormat("separate")}
                              className={cn(
                                "h-11 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                outputFormat === "separate" ? "border-primary bg-primary/5 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/30"
                              )}
                            >
                              Separate JPGs
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Selection</Label>
                          <div className="relative">
                            <Input
                              placeholder="e.g. 1-3, 5"
                              value={pageRange}
                              onChange={e => setPageRange(e.target.value)}
                              className="h-12 rounded-xl border-border bg-background font-medium text-xs pl-4"
                            />
                          </div>
                          <p className="text-[9px] font-medium text-muted-foreground uppercase ml-1">Page Range (Empty for all)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                {/* Right Panel Footer Action */}
                <div className="p-8 border-t border-border bg-card/50">
                  <div className="mb-6 flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">System Optimized</span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary tabular-nums min-w-[80px] text-right">
                      {dpi} DPI Matrix
                    </span>
                  </div>
                  <Button size="lg" onClick={convert} className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all gap-3 hover:scale-[1.02] active:scale-[0.98]">
                    Initiate Extraction <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      <div className="mt-5">
        {filesData.length === 0 && (
          <div className="mt-5 text-center">
            <FileUpload accept=".pdf" files={filesData.map(f => f.file)} onFilesChange={handleFilesChange} label="Select a PDF to convert" />
          </div>
        )}
      </div>
      <ToolSeoSection
        toolName="PDF to JPG Converter"
        category="convert"
        intro="MagicDocx PDF to JPG converter exports each page of your PDF as a high-resolution JPEG image. Whether you need a single page screenshot, a full document image export, or images for web and print, our tool gives you full control over quality and DPI. Export at 150, 300, or 600 DPI and download all images instantly as a ZIP file."
        steps={[
          "Upload a PDF file by dragging and dropping or clicking the upload area.",
          "Select your image quality (Low, Medium, High) and pixel density (DPI).",
          "Optionally specify a custom page range (e.g. 1-3, 5) or leave blank for all pages.",
          "Click \"Initiate Extraction\" and download your JPG images instantly."
        ]}
        formats={["PDF", "JPG", "JPEG", "ZIP"]}
        relatedTools={[
          { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          { name: "JPG to PDF", path: "/jpg-to-pdf", icon: Image },
          { name: "Compress PDF", path: "/compress-pdf", icon: Layers },
          { name: "Merge PDF", path: "/merge-pdf", icon: FileBox },
        ]}
        schemaName="PDF to JPG Converter Online"
        schemaDescription="Free online PDF to JPG converter. Export PDF pages as high-resolution images with custom quality and DPI settings."
      />
    </ToolLayout>
  );
};

export default PdfToJpg;
