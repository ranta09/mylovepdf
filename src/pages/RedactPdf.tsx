import { useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { EyeOff } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const RedactPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pageNum, setPageNum] = useState("1");
  const [x, setX] = useState("50");
  const [y, setY] = useState("700");
  const [w, setW] = useState("200");
  const [h, setH] = useState("20");

  const redact = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const page = parseInt(pageNum) - 1;
      if (page < 0 || page >= doc.getPageCount()) { toast.error("Invalid page number"); setProcessing(false); return; }

      const pdfPage = doc.getPage(page);
      pdfPage.drawRectangle({
        x: parseFloat(x),
        y: parseFloat(y),
        width: parseFloat(w),
        height: parseFloat(h),
        color: rgb(0, 0, 0),
      });
      setProgress(80);

      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "redacted.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF redacted successfully!");
    } catch {
      toast.error("Failed to redact PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Redact PDF" description="Black out sensitive information in your PDF" category="edit" icon={<EyeOff className="h-7 w-7" />}
      metaTitle="Redact PDF — Black Out Text Online Free" metaDescription="Redact sensitive information from PDF files. Free online PDF redaction tool.">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to redact" />
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Specify the area to black out (in PDF points from bottom-left)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Page</label>
              <Input type="number" min="1" value={pageNum} onChange={e => setPageNum(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">X Position</label>
              <Input type="number" min="0" value={x} onChange={e => setX(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Y Position</label>
              <Input type="number" min="0" value={y} onChange={e => setY(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Width</label>
              <Input type="number" min="1" value={w} onChange={e => setW(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Height</label>
              <Input type="number" min="1" value={h} onChange={e => setH(e.target.value)} />
            </div>
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex justify-center">
            <Button size="lg" onClick={redact} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Redacting…" : "Redact PDF"}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default RedactPdf;
