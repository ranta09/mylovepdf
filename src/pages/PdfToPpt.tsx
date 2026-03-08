import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Presentation, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToPpt = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const zip = new JSZip();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        zip.file(`slide-${i}.png`, base64, { base64: true });
        setProgress(10 + Math.round((i / pdf.numPages) * 80));
      }

      setProgress(95);
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "presentation-slides.zip");
      setProgress(100);
      toast.success(`Exported ${pdf.numPages} slides as images! Import them into PowerPoint.`);
    } catch {
      toast.error("Failed to convert PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="PDF to PowerPoint" description="Export PDF pages as slide images for presentations" category="convert" icon={<Presentation className="h-7 w-7" />}
      metaTitle="PDF to PowerPoint — Convert PDF to Slides Free" metaDescription="Convert PDF pages to presentation slides. Free online PDF to PowerPoint converter." toolId="pdf-to-ppt" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Presentation className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">PDF to PowerPoint</h1>
            <p className="text-sm text-muted-foreground">Export PDF pages as slide images for presentations</p>
            <p className="mt-1 text-xs text-muted-foreground/70">◗ Works great with lecture slides, pitch decks, and visual presentations. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Export as Slides"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~5-20 seconds</p>}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Pages are exported as high-quality PNG images. Import them into PowerPoint as slides.</p>
    </ToolLayout>
  );
};

export default PdfToPpt;
