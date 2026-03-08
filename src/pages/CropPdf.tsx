import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Crop, Loader2 } from "lucide-react";
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
      metaTitle="Crop PDF — Trim Margins Online Free" metaDescription="Crop PDF pages and trim margins. Free online PDF cropping tool." toolId="crop-pdf" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Crop className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Crop PDF</h1>
            <p className="text-sm text-muted-foreground">Trim margins and crop PDF pages to a custom size</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Works great with scanned documents, presentations, and PDFs with large margins. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to crop" />
      </div>
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
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={crop} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cropping…</> : "Crop PDF"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default CropPdf;
