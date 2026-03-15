import { useState, useEffect } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Layers, Loader2, Info, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, FileText } from "lucide-react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const FlattenPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  const flatten = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();

      // Render each page to canvas and rebuild as flat PDF (burns in all annotations/forms)
      const srcPdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const outDoc = await PDFDocument.create();
      setProgress(20);

      for (let i = 1; i <= srcPdf.numPages; i++) {
        const page = await srcPdf.getPage(i);
        const origViewport = page.getViewport({ scale: 1 });
        const scale = 2; // render at 2x for quality
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert to JPEG
        const jpegBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92)
        );
        const jpegData = new Uint8Array(await jpegBlob.arrayBuffer());
        const jpegImage = await outDoc.embedJpg(jpegData);

        const pdfPage = outDoc.addPage([origViewport.width, origViewport.height]);
        pdfPage.drawImage(jpegImage, {
          x: 0, y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });

        setProgress(20 + Math.round((i / srcPdf.numPages) * 70));
      }

      const pdfBytes = await outDoc.save({ useObjectStreams: true });
      setProgress(95);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const filename = files[0].name.replace(/\.pdf$/i, "_flattened.pdf");

      setResults([{ file: blob, url, filename }]);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setProgress(100);
      toast.success("PDF flattened successfully!");
    } catch {
      toast.error("Failed to flatten PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Flatten PDF" description="Flatten form fields and annotations into the PDF" category="edit" icon={<Layers className="h-7 w-7" />}
      metaTitle="Flatten PDF Online Free – Remove Form Fields | MagicDocx" metaDescription="Flatten PDF form fields, annotations, and interactive elements online for free. Makes your PDF static and printer-ready. No sign-up."
      toolId="flatten-pdf"
      hideHeader={files.length > 0 || results.length > 0 || processing}>

      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Flatten Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Burning Annotations..." : results.length > 0 ? "Flatten Terminal" : "Awaiting Execution"}
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
                <Button size="sm" onClick={flatten} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Flatten PDF
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                  </div>
                  <Layers className="h-8 w-8 text-purple-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Flattening Layers</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Complete</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
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
                  </div>
                </ScrollArea>
              </div>
              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl text-center space-y-8">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-background border border-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors" />
                    <Layers className="h-8 w-8 text-purple-500 relative z-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Ready to Flatten</h3>
                    <p className="text-muted-foreground font-medium">All form fields, annotations, and interactive elements will be permanently burned into the document as static content.</p>
                  </div>
                  <div className="flex justify-center">
                    <Button size="lg" onClick={flatten} className="h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-[0.1em] px-12 shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all gap-3 hover:scale-105 active:scale-95">
                      Flatten Document <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-6 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Form Fields
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Annotations
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Comments
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Secure Buffer</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Flatten v2.0.0</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && results.length === 0 && (
          <div className="mt-5">
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to flatten" />
          </div>
        )}
      </div>
      {!files.length && (
        <ToolSeoSection
          toolName="Flatten PDF Online"
          category="edit"
          intro="MagicDocx Flatten PDF permanently merges all interactive form fields, annotations, and digital signatures into the PDF's static page content. Once flattened, form fields can no longer be edited, and the document appears the same in every PDF viewer. This is essential before archiving, sharing, or printing documents with filled-in forms that must not be modified. All processing is 100% client-side."
          steps={[
            "Upload your PDF form using the file upload area.",
            "Review the detected element counts (form fields, annotations, etc.).",
            "Click 'Flatten PDF' to merge all interactive elements into static content.",
            "Your flattened PDF will download automatically."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Edit PDF", path: "/edit-pdf", icon: Layers },
            { name: "Protect PDF", path: "/protect-pdf", icon: Layers },
            { name: "Compress PDF", path: "/compress-pdf", icon: Layers },
            { name: "Repair PDF", path: "/repair-pdf", icon: Layers },
          ]}
          schemaName="Flatten PDF Online"
          schemaDescription="Free online PDF flattener. Permanently merge form fields, annotations, and interactive elements into a static PDF document."
        />
      )}
    </ToolLayout>
  );
};

export default FlattenPdf;
