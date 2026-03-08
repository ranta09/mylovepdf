import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Presentation, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const PptToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      // Convert images to PDF (user exports slides as images first)
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
        // Landscape slide dimensions
        const slideWidth = 960;
        const slideHeight = 720;
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
        setProgress(10 + Math.round(((i + 1) / files.length) * 80));
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "presentation.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("Slides converted to PDF!");
    } catch {
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="PowerPoint to PDF" description="Convert presentation slide images into a PDF document" category="convert" icon={<Presentation className="h-7 w-7" />}
      metaTitle="PowerPoint to PDF — Convert Slides to PDF Free" metaDescription="Convert presentation slides to PDF. Free online converter." toolId="ppt-to-pdf" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Presentation className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">PowerPoint to PDF</h1>
            <p className="text-sm text-muted-foreground">Convert presentation slide images into a PDF document</p>
            <p className="mt-1 text-xs text-muted-foreground/70">◗ Works great with exported slides, lecture materials, and visual presentations. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".jpg,.jpeg,.png" multiple files={files} onFilesChange={setFiles} label="Select slide images (JPG/PNG)" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : `Convert ${files.length} slide${files.length > 1 ? "s" : ""}`}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-10 seconds</p>}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Export your PowerPoint slides as images first, then upload them here.</p>
    </ToolLayout>
  );
};

export default PptToPdf;
