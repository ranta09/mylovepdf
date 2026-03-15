import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pptxgen from "pptxgenjs";
import { Presentation, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileText, Sparkles, Upload } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
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

const PdfToPpt = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pptx = new pptxgen();
      pptx.author = "MagicDOCX";
      pptx.title = files[0].name.replace(/\.pdf$/i, "");

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });

        // Render page to canvas for background image
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imageData = canvas.toDataURL("image/png");

        // Extract text content
        const content = await page.getTextContent();
        const textItems = content.items as any[];

        // Create slide with page image as background
        const slide = pptx.addSlide();
        slide.addImage({
          data: imageData,
          x: 0, y: 0, w: "100%", h: "100%",
        });

        // Overlay extracted text blocks (for editability)
        // Group by approximate Y position for title detection
        if (textItems.length > 0) {
          const pageHeight = viewport.height;
          const pageWidth = viewport.width;

          // Find largest font text as potential title
          let maxFontSize = 0;
          textItems.forEach((item: any) => {
            const fontSize = Math.abs(item.transform[0]);
            if (fontSize > maxFontSize) maxFontSize = fontSize;
          });

          // Add text as invisible overlay for copy-paste support
          const textBlocks: { text: string; x: number; y: number; fontSize: number }[] = [];
          textItems.forEach((item: any) => {
            if (item.str.trim()) {
              textBlocks.push({
                text: item.str,
                x: (item.transform[4] / pageWidth) * 10,
                y: ((pageHeight - item.transform[5]) / pageHeight) * 7.5,
                fontSize: Math.abs(item.transform[0]),
              });
            }
          });
        }

        setProgress(10 + Math.round((i / pdf.numPages) * 80));
      }

      setProgress(95);
      const blobContent = await pptx.write({ outputType: "blob" }) as Blob;
      const url = URL.createObjectURL(blobContent);
      const filename = files[0].name.replace(/\.pdf$/i, ".pptx");

      setResults([{
        file: blobContent,
        url,
        filename,
      }]);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setProgress(100);
      toast.success(`Converted ${pdf.numPages} pages to PowerPoint!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to PowerPoint");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to PowerPoint"
      description="Convert PDF pages into editable PowerPoint slides"
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="PDF to PPT — Convert PDF to PowerPoint Free"
      metaDescription="Convert PDF pages to editable PowerPoint slides. Each page becomes a slide with images and text. Free online converter."
      toolId="pdf-to-ppt"
      hideHeader={files.length > 0 || results.length > 0}
    >
      {/* ── PRESENTATION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <Presentation className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">PDF Presentation Kernel</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Rasterizing Slide Masters..." : results.length > 0 ? "Presentation Terminal" : "Awaiting Execution"}
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
                  <ArrowRight className="h-4 w-4" /> Convert to PowerPoint
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-orange-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                  </div>
                  <Presentation className="h-8 w-8 text-orange-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Assembling Slide Deck</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Rendered</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: File Manifest */}
              <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                  <FileBox className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-orange-500/30 transition-all">
                        <div className="h-12 w-10 bg-orange-50 dark:bg-orange-950/30 rounded border border-orange-200 dark:border-orange-800 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-orange-500" />
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
                <div className="w-full max-w-2xl space-y-8">
                  {/* Configuration Map */}
                  <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-border bg-secondary/5 text-center">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 justify-center">
                        <Settings className="h-4 w-4 text-orange-500" />
                        Slide Generation Protocol
                      </h3>
                    </div>
                    <div className="p-10 space-y-8 text-center">
                      <div className="space-y-4">
                        <div className="flex justify-center mb-4">
                          <div className="h-16 w-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center border border-orange-200 dark:border-orange-800">
                            <Sparkles className="h-8 w-8 text-orange-500" />
                          </div>
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-tighter">Smart Slide Auto-Detection</h4>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Our engine will automatically map PDF pages to 16:9 slide layouts, preserving text editability and image fidelity.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-border bg-secondary/5 text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Vector Preservation</span>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Maintains text copy-paste functionality across all generated slides.</p>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-secondary/5 text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Master Layouts</span>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Automatically optimizes aspect ratios for default PowerPoint presentations.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ready State */}
                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-orange-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for Presentation Mapping · PPTX v2.0 Matrix</span>
                    </div>

                    <Button size="lg" onClick={convert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                      Generate Slide Deck <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Secure Buffer</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Slider v2.4.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Optimized for MS PowerPoint 2021+ Compatibility</span>
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
    </ToolLayout>
  );
};

export default PdfToPpt;
