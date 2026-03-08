import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Crop } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const CropPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [top, setTop] = useState("0");
  const [bottom, setBottom] = useState("0");
  const [left, setLeft] = useState("0");
  const [right, setRight] = useState("0");

  const crop = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const t = parseFloat(top) || 0;
      const b = parseFloat(bottom) || 0;
      const l = parseFloat(left) || 0;
      const r = parseFloat(right) || 0;

      for (let i = 0; i < doc.getPageCount(); i++) {
        const page = doc.getPage(i);
        const { width, height } = page.getSize();
        page.setCropBox(l, b, width - l - r, height - t - b);
      }
      setProgress(80);

      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cropped.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF cropped successfully!");
    } catch {
      toast.error("Failed to crop PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Crop PDF" description="Trim margins and crop PDF pages to a custom size" category="edit" icon={<Crop className="h-7 w-7" />}
      metaTitle="Crop PDF — Trim Margins Online Free" metaDescription="Crop PDF pages and trim margins. Free online PDF cropping tool.">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to crop" />
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium text-foreground">Margins to crop (in points, 72pt = 1 inch)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Top</label>
              <Input type="number" min="0" value={top} onChange={e => setTop(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Bottom</label>
              <Input type="number" min="0" value={bottom} onChange={e => setBottom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Left</label>
              <Input type="number" min="0" value={left} onChange={e => setLeft(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Right</label>
              <Input type="number" min="0" value={right} onChange={e => setRight(e.target.value)} />
            </div>
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex justify-center">
            <Button size="lg" onClick={crop} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Cropping…" : "Crop PDF"}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default CropPdf;
