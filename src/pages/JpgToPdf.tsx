import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { FileImage, GripVertical, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, ChevronUp, ChevronDown, Upload } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const JpgToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Settings
  const [pageSize, setPageSize] = useState("fit");
  const [orientation, setOrientation] = useState("portrait");

  // Generate previews when files change
  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    // Generate previews
    const urls = newFiles.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  }, []);

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const newFiles = [...files];
    const [moved] = newFiles.splice(from, 1);
    newFiles.splice(to, 0, moved);
    handleFilesChange(newFiles);
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const doc = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const uint8 = new Uint8Array(bytes);
        const isPng = files[i].type === "image/png";
        let img;
        try {
          img = isPng ? await doc.embedPng(uint8) : await doc.embedJpg(uint8);
        } catch {
          toast.error(`Could not process ${files[i].name}`);
          continue;
        }

        let pw = img.width;
        let ph = img.height;

        if (pageSize === "a4") {
          pw = orientation === "portrait" ? 595.28 : 841.89;
          ph = orientation === "portrait" ? 841.89 : 595.28;
        } else if (pageSize === "letter") {
          pw = orientation === "portrait" ? 612 : 792;
          ph = orientation === "portrait" ? 792 : 612;
        }

        const page = doc.addPage([pw, ph]);
        const scale = Math.min(pw / img.width, ph / img.height);
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const x = (pw - imgWidth) / 2;
        const y = (ph - imgHeight) / 2;
        page.drawImage(img, { x, y, width: imgWidth, height: imgHeight });
        setProgress(10 + ((i + 1) / files.length) * 80);
      }

      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{ file: blob, url, filename: "images_converted.pdf" }]);
      toast.success("Images converted to PDF!");
    } catch {
      toast.error("Failed to convert images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="JPG to PDF"
      description="Convert JPG and PNG images into a PDF document"
      category="convert"
      icon={<FileImage className="h-7 w-7" />}
      metaTitle="JPG to PDF — Convert Images to PDF Online Free"
      metaDescription="Convert JPG, JPEG, and PNG images to a single PDF document. Drag to reorder, choose page size and orientation. Free online converter."
      toolId="jpg-to-pdf"
      hideHeader={files.length > 0 || results.length > 0}
    >
      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <FileImage className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Image Mapping Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Compressing Pixels..." : results.length > 0 ? "Conversion Terminal" : "Awaiting Execution"}
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
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                  <FileImage className="h-8 w-8 text-indigo-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Encoding Visual Buffers</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Vectorized</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); setPreviews([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: File Manifest / Sequence */}
              <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                  <FileBox className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-indigo-500/30 transition-all">
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => moveFile(i, i - 1)} disabled={i === 0} className="p-1 rounded bg-secondary/50 text-muted-foreground hover:text-indigo-500 disabled:opacity-30 transition-colors">
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button onClick={() => moveFile(i, i + 1)} disabled={i === files.length - 1} className="p-1 rounded bg-secondary/50 text-muted-foreground hover:text-indigo-500 disabled:opacity-30 transition-colors">
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="h-12 w-12 bg-secondary/30 rounded border border-border flex items-center justify-center shrink-0 overflow-hidden relative">
                          {previews[i] ? (
                            <img src={previews[i]} className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="h-5 w-5 text-indigo-500/30" />
                          )}
                          <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black px-1 rounded-bl leading-none h-3.5 flex items-center">
                            {i + 1}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => handleFilesChange([])} className="w-full p-6 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all">
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
                        <Settings className="h-4 w-4 text-indigo-500" />
                        Engine Parameters
                      </h3>
                    </div>
                    <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                      {/* Page Size Selection */}
                      <div className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Output Format</label>
                          <h4 className="text-lg font-black uppercase tracking-tighter">Page Dimensions</h4>
                        </div>
                        <Select value={pageSize} onValueChange={setPageSize}>
                          <SelectTrigger className="h-14 rounded-2xl border-2 border-border bg-card font-black uppercase tracking-widest text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="fit" className="text-xs font-bold uppercase">Auto-Fit to Image</SelectItem>
                            <SelectItem value="a4" className="text-xs font-bold uppercase">A4 (Standard)</SelectItem>
                            <SelectItem value="letter" className="text-xs font-bold uppercase">US Letter</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed">
                          Selecting 'Auto-Fit' will preserve the exact aspect ratio of each source image in the final document stream.
                        </p>
                      </div>

                      {/* Orientation Selection */}
                      <div className="space-y-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Layout Matrix</label>
                          <h4 className="text-lg font-black uppercase tracking-tighter">Orientation</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {['portrait', 'landscape'].map((o) => (
                            <button
                              key={o}
                              onClick={() => setOrientation(o)}
                              disabled={pageSize === 'fit'}
                              className={cn(
                                "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group",
                                orientation === o ? "border-indigo-500 bg-indigo-500/5" : "border-border bg-card/50 hover:border-indigo-500/30",
                                pageSize === 'fit' && "opacity-30 cursor-not-allowed"
                              )}>
                              <Layout className={cn("h-8 w-8 transition-transform group-hover:scale-110", orientation === o ? "text-indigo-500" : "text-muted-foreground")} style={{ transform: o === 'landscape' ? 'rotate(90deg)' : 'none' }} />
                              <span className={cn("text-[10px] font-black uppercase tracking-widest", orientation === o ? "text-indigo-500" : "text-muted-foreground")}>{o}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Readiness */}
                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for {files.length} images · {pageSize} template</span>
                    </div>

                    <Button size="lg" onClick={convert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                      Synthesize PDF Buffer <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> AES-256 Kernel</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Image v6.1.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest uppercase">Target Buffer: PDF Stream</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5">
            <FileUpload
              accept=".jpg,.jpeg,.png"
              multiple
              files={files}
              onFilesChange={handleFilesChange}
              label="Select images to convert (JPG, JPEG, PNG)"
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default JpgToPdf;
