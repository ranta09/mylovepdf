import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileImage, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader, { ToolSteps } from "@/components/ToolHeader";
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
      <div className="space-y-6">
        <ToolHeader
          icon={<FileImage className="h-5 w-5 text-primary-foreground" />}
          title="JPG to PDF"
          subtitle="Convert images into a PDF document"
          category="convert"
          infoText="Upload JPG or PNG images and combine them into a single PDF. Each image becomes one page. Max file size: 100MB. Your files are private and automatically deleted."
        />
        <FileUpload accept=".jpg,.jpeg,.png" multiple files={files} onFilesChange={setFiles} label="Select images to convert" />
        <ToolSteps steps={[
          { step: "1", text: "Upload your images" },
          { step: "2", text: "Click convert" },
          { step: "3", text: "Download your PDF" },
        ]} category="convert" />
        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && (
          <Button size="lg" onClick={convert} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Converting…</> : `Convert ${files.length} image${files.length > 1 ? "s" : ""}`}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-10 seconds</p>}
      </div>
    </ToolLayout>
  );
};

export default JpgToPdf;
