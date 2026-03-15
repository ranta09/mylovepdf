import { useState, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { Image, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileText, Layers, Upload } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToJpg = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  // Options
  const [quality, setQuality] = useState("high"); // low, medium, high
  const [dpi, setDpi] = useState("300"); // 150, 300, 600
  const [pageRange, setPageRange] = useState(""); // e.g. "1-3,5"

  const parsePageRange = (range: string, total: number): number[] => {
    if (!range.trim()) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>();
    range.split(",").forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(Number);
        for (let i = Math.max(1, start); i <= Math.min(total, end); i++) pages.add(i);
      } else {
        const n = Number(trimmed);
        if (n >= 1 && n <= total) pages.add(n);
      }
    });
    return [...pages].sort((a, b) => a - b);
  };

  const convert = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setPreviews([]);
    setResults([]);
    try {
      const qualityMap: Record<string, number> = { low: 0.6, medium: 0.8, high: 0.95 };
      const scaleMap: Record<string, number> = { "150": 1.5, "300": 2, "600": 4 };
      const jpgQuality = qualityMap[quality] || 0.95;
      const scale = scaleMap[dpi] || 2;

      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pagesToConvert = parsePageRange(pageRange, pdf.numPages);
      const totalPages = pagesToConvert.length;
      const images: string[] = [];
      const newResults: ProcessingResult[] = [];

      for (let idx = 0; idx < totalPages; idx++) {
        const pageNum = pagesToConvert[idx];
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", jpgQuality);
        images.push(dataUrl);

        // Create blob for each page
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        newResults.push({
          file: blob,
          url,
          filename: `page-${pageNum}.jpg`,
        });

        setProgress(Math.round(((idx + 1) / totalPages) * 90));
      }

      setPreviews(images);
      setProgress(95);

      // If multiple pages, also create a ZIP
      if (newResults.length > 1) {
        const zip = new JSZip();
        for (const r of newResults) {
          zip.file(r.filename, r.file);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        newResults.unshift({
          file: zipBlob,
          url: zipUrl,
          filename: "all-pages.zip",
        });
      }

      setResults(newResults);
      setProgress(100);

      // Auto download (ZIP if multiple, single if one)
      if (newResults.length > 0) {
        const a = document.createElement("a");
        a.href = newResults[0].url;
        a.download = newResults[0].filename;
        a.click();
      }

      toast.success(`Converted ${totalPages} page${totalPages > 1 ? "s" : ""} to JPG!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [files, quality, dpi, pageRange]);

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Convert each PDF page into a high-quality JPG image"
      category="convert"
      icon={<Image className="h-7 w-7" />}
      metaTitle="PDF to JPG Converter – Convert PDF Pages to Images | MagicDocx"
      metaDescription="Convert PDF pages to high-resolution JPG images. Choose quality, DPI, and specific pages. Free online PDF to image converter."
      toolId="pdf-to-jpg"
      hideHeader={files.length > 0 || results.length > 0 || processing}
    >
      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Raster Imaging Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Encoding Scanlines..." : results.length > 0 ? "Imaging Terminal" : "Awaiting Execution"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(results.length > 0 || !processing) && (
                <Button variant="outline" size="sm" onClick={() => { setFiles([]); setResults([]); setPreviews([]); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Start Over
                </Button>
              )}
              {results.length === 0 && !processing && (
                <Button size="sm" onClick={convert} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Convert to JPG
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                  </div>
                  <Image className="h-8 w-8 text-purple-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Decompressing PDF Stream</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Rendered</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); setPreviews([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: File Manifest */}
              <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                  <FileBox className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-purple-500/30 transition-all">
                        <div className="h-12 w-10 bg-purple-50 dark:bg-purple-950/30 rounded border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setFiles([])} className="w-full p-4 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all">
                      + Resync Payload
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {/* CENTER: Workbench */}
              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center">
                <div className="w-full max-w-4xl space-y-8">
                  {/* Configuration Map */}
                  <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-border bg-secondary/5">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Settings className="h-4 w-4 text-purple-500" />
                        Rasterization Protocol
                      </h3>
                    </div>
                    <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                      <div className="space-y-6 text-center">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Compression</label>
                          <h4 className="text-lg font-black uppercase tracking-tighter leading-none">Image Quality</h4>
                        </div>
                        <Select value={quality} onValueChange={setQuality}>
                          <SelectTrigger className="h-14 rounded-2xl border-2 border-border bg-card font-black uppercase tracking-widest text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="low" className="text-xs font-bold uppercase">Low (Small Size)</SelectItem>
                            <SelectItem value="medium" className="text-xs font-bold uppercase">Medium</SelectItem>
                            <SelectItem value="high" className="text-xs font-bold uppercase">High (Best Fidelity)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-6 text-center">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pixel Density</label>
                          <h4 className="text-lg font-black uppercase tracking-tighter leading-none">Resolution (DPI)</h4>
                        </div>
                        <Select value={dpi} onValueChange={setDpi}>
                          <SelectTrigger className="h-14 rounded-2xl border-2 border-border bg-card font-black uppercase tracking-widest text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="150" className="text-xs font-bold uppercase">150 DPI (Email)</SelectItem>
                            <SelectItem value="300" className="text-xs font-bold uppercase">300 DPI (Standard)</SelectItem>
                            <SelectItem value="600" className="text-xs font-bold uppercase">600 DPI (Archive)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-6 text-center">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scope</label>
                          <h4 className="text-lg font-black uppercase tracking-tighter leading-none">Page Range</h4>
                        </div>
                        <Input
                          placeholder="e.g. 1-3, 5"
                          value={pageRange}
                          onChange={e => setPageRange(e.target.value)}
                          className="h-14 rounded-2xl border-2 border-border bg-card font-bold text-center"
                        />
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Empty for all pages</p>
                      </div>
                    </div>
                  </div>

                  {/* Execution Readiness */}
                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for {files.length} documents · {dpi} DPI Matrix</span>
                    </div>

                    <Button size="lg" onClick={convert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                      Initiate Extraction <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Kernel Secure</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Imaging v1.1.0</span>
            </div>
            <div className="flex items-center gap-4 text-center">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest uppercase">High Speed OCR-Ready Buffer Integration</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5 text-center">
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
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
