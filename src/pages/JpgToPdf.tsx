import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileImage, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const JpgToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

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
        const img = isPng ? await doc.embedPng(uint8) : await doc.embedJpg(uint8);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        setProgress(10 + ((i + 1) / files.length) * 80);
      }
      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "images.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Images converted to PDF!");
    } catch {
      toast.error("Failed to convert images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="JPG to PDF" description="Convert JPG and PNG images into a PDF document" category="convert" icon={<FileImage className="h-7 w-7" />}
      metaTitle="JPG to PDF — Convert Images to PDF Online Free" metaDescription="Convert JPG and PNG images to PDF. Free online image to PDF converter." toolId="jpg-to-pdf" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <FileImage className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">JPG to PDF</h1>
            <p className="text-sm text-muted-foreground">Convert JPG and PNG images into a PDF document</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Works great with photos, screenshots, scanned images, and artwork. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".jpg,.jpeg,.png" multiple files={files} onFilesChange={setFiles} label="Select images to convert" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : `Convert ${files.length} image${files.length > 1 ? "s" : ""}`}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-10 seconds</p>}
        </div>
      )}
    </ToolLayout>
  );
};

export default JpgToPdf;
