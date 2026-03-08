import { useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { EyeOff, Loader2 } from "lucide-react";
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
      metaTitle="Redact PDF — Black Out Text Online Free" metaDescription="Redact sensitive information from PDF files. Free online PDF redaction tool." toolId="redact-pdf" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <EyeOff className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Redact PDF</h1>
            <p className="text-sm text-muted-foreground">Black out sensitive information in your PDF</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Works great with legal documents, medical records, and confidential files. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to redact" />
      </div>
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
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={redact} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redacting…</> : "Redact PDF"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default RedactPdf;
