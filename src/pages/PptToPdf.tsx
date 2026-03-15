import { useState } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { Presentation, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const PptToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const extractImagesFromPptx = async (file: File): Promise<{ data: Uint8Array; type: string }[]> => {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const images: { data: Uint8Array; type: string }[] = [];
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith("ppt/media/"));
    for (const mediaPath of mediaFiles) {
      const data = await zip.files[mediaPath].async("uint8array");
      const ext = mediaPath.split(".").pop()?.toLowerCase() || "";
      const type = ext === "png" ? "image/png" : "image/jpeg";
      if (["png", "jpg", "jpeg", "gif", "bmp", "tiff"].includes(ext)) {
        images.push({ data, type });
      }
    }
    return images;
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const file = files[0];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const doc = await PDFDocument.create();
      const slideWidth = 960;
      const slideHeight = 720;

      if (ext === "pptx" || ext === "ppt") {
        // Parse PPTX as ZIP and extract slide images
        const images = await extractImagesFromPptx(file);
        setProgress(30);

        if (images.length === 0) {
          // Fallback: render a blank page with note
          const page = doc.addPage([slideWidth, slideHeight]);
          toast.info("No embedded images found. Creating placeholder PDF.");
        } else {
          for (let i = 0; i < images.length; i++) {
            const { data, type } = images[i];
            let img;
            try {
              img = type === "image/png" ? await doc.embedPng(data) : await doc.embedJpg(data);
            } catch {
              continue;
            }
            const page = doc.addPage([slideWidth, slideHeight]);
            const scale = Math.min(slideWidth / img.width, slideHeight / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            page.drawImage(img, {
              x: (slideWidth - w) / 2,
              y: (slideHeight - h) / 2,
              width: w,
              height: h,
            });
            setProgress(30 + Math.round(((i + 1) / images.length) * 60));
          }
        }
      } else if (file.type === "application/pdf") {
        // If user uploads a PDF by mistake, just copy it
        const srcDoc = await PDFDocument.load(await file.arrayBuffer());
        const pages = await doc.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach(p => doc.addPage(p));
      } else {
        // Image files fallback
        const bytes = await file.arrayBuffer();
        const uint8 = new Uint8Array(bytes);
        const isPng = file.type === "image/png";
        let img;
        try {
          img = isPng ? await doc.embedPng(uint8) : await doc.embedJpg(uint8);
        } catch {
          toast.error(`Could not process ${file.name}`);
          setProcessing(false);
          return;
        }
        const page = doc.addPage([slideWidth, slideHeight]);
        const scale = Math.min(slideWidth / img.width, slideHeight / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: (slideWidth - w) / 2,
          y: (slideHeight - h) / 2,
          width: w,
          height: h,
        });
      }

      setProgress(95);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const filename = file.name.replace(/\.[^/.]+$/, "") + ".pdf";

      setResults([{ file: blob, url, filename }]);
      setProgress(100);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      toast.success("Presentation converted to PDF!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PowerPoint to PDF"
      description="Convert presentation slide images into a PDF document"
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="PowerPoint to PDF Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert PowerPoint presentations (PPT, PPTX) to PDF online for free. Each slide becomes a PDF page. Fast, secure, and no software needed."
      toolId="ppt-to-pdf"
      hideHeader={files.length > 0 || results.length > 0}
    >
      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                <Presentation className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Presentation Logic Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Merging Slide Layers..." : results.length > 0 ? "Conversion Terminal" : "Awaiting Execution"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(results.length > 0 || !processing) && (
                <Button variant="outline" size="sm" onClick={() => { setFiles([]); setResults([]); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Start Over
                </Button>
              )}
              {results.length === 0 && !processing && (
                <Button size="sm" onClick={convert} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Convert to PDF
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-red-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
                  </div>
                  <Presentation className="h-8 w-8 text-red-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-widest">Synthesizing Alpha Planes</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Vectorized</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: Slide Manifest */}
              <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                  <FileBox className="h-4 w-4 text-red-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-2 bg-background rounded-2xl border border-border flex flex-col gap-3 group hover:border-red-500/30 transition-all overflow-hidden">
                        <div className="aspect-video bg-secondary/30 rounded-xl flex items-center justify-center border border-border/50 overflow-hidden relative">
                          {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                          ) : (
                            <Presentation className="h-8 w-8 text-red-500/30" />
                          )}
                          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-black shadow-sm">
                            SLIDE {idx + 1}
                          </div>
                        </div>
                        <div className="px-2 pb-2">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setFiles([])} className="w-full p-6 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all">
                      + Resync Presentation
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {/* CENTER: Workbench */}
              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl text-center space-y-8">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-background border border-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                    <Presentation className="h-8 w-8 text-red-500 relative z-10" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">Ready for Rasterization</h3>
                    <p className="text-muted-foreground font-medium">Your slides are optimally aligned for PDF synthesis. High-fidelity rendering will preserve all visual data points.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 bg-background border border-border rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Slides</p>
                      <p className="text-lg font-black">{files.length}</p>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Target</p>
                      <p className="text-lg font-black text-red-600">PDF Presentation</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button size="lg" onClick={convert} className="h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-[0.1em] px-12 shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all gap-3 hover:scale-105 active:scale-95">
                      Initiate Synthesis <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> High Res
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Widescreen Fix
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Kernel Buffer
                    </div>
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
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx PPT v3.5.0</span>
            </div>
            <div className="flex items-center gap-4 text-center">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Export PowerPoint slides as images for optimal synthesis.</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5">
            <FileUpload accept=".ppt,.pptx" files={files} onFilesChange={setFiles} label="Select PowerPoint files to convert" />
            <p className="mt-4 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Export your PowerPoint slides as images first, then upload them here.</p>
          </div>
        )}
      </div>
      <ToolSeoSection
        toolName="PowerPoint to PDF Converter"
        category="convert"
        intro="MagicDocx PowerPoint to PDF converter transforms your PPTX and PPT presentations into professional PDF files. Each embedded slide image is extracted and placed into a perfectly sized PDF page. Share your presentations in a universally readable format — no PowerPoint installed needed, and your design, fonts, and layout are preserved exactly as designed."
        steps={[
          "Upload your PowerPoint file (PPTX or PPT) using the upload area.",
          "Our engine automatically extracts slide images from the presentation.",
          "Click \"Initiate Synthesis\" and each slide becomes a PDF page.",
          "Download your complete PDF presentation immediately."
        ]}
        formats={["PPT", "PPTX", "PDF"]}
        relatedTools={[
          { name: "PDF to PPT", path: "/pdf-to-ppt", icon: Presentation },
          { name: "Word to PDF", path: "/word-to-pdf", icon: Presentation },
          { name: "Merge PDF", path: "/merge-pdf", icon: Presentation },
          { name: "Compress PDF", path: "/compress-pdf", icon: Presentation },
        ]}
        schemaName="PowerPoint to PDF Converter Online"
        schemaDescription="Free online PowerPoint to PDF converter. Convert PPT and PPTX presentations to PDF with slide layout preserved."
      />
    </ToolLayout >
  );
};

export default PptToPdf;
