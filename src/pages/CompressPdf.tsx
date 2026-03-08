import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Minimize2, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader, { ToolSteps } from "@/components/ToolHeader";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const CompressPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
  };

  const compress = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const original = files[0].size;
      const bytes = await files[0].arrayBuffer();
      setProgress(50);
      const doc = await PDFDocument.load(bytes);
      const pdfBytes = await doc.save({ useObjectStreams: true });
      setProgress(90);
      const compressed = pdfBytes.length;
      setResult({ original, compressed });
      setProgress(100);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compressed.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF compressed!");
    } catch {
      toast.error("Failed to compress PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const formatSize = (b: number) => (b / (1024 * 1024)).toFixed(2) + " MB";
  const reduction = result ? Math.max(0, Math.round((1 - result.compressed / result.original) * 100)) : 0;

  return (
    <ToolLayout title="Compress PDF" description="Reduce PDF file size without losing quality" category="compress" icon={<Minimize2 className="h-7 w-7" />}
      metaTitle="Compress PDF — Reduce PDF Size Online Free" metaDescription="Compress PDF files to reduce size. Free online PDF compressor." toolId="compress" hideHeader>
      <div className="space-y-6">
        <ToolHeader
          icon={<Minimize2 className="h-5 w-5 text-primary-foreground" />}
          title="Compress PDF"
          subtitle="Reduce file size without losing quality"
          category="compress"
          infoText="Upload a PDF to reduce its file size by optimizing internal structure. Works great for email attachments and uploads. Max file size: 100MB. Your files are private and automatically deleted."
        />
        <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} label="Select a PDF to compress" />
        <ToolSteps steps={[
          { step: "1", text: "Upload your PDF file" },
          { step: "2", text: "Click compress" },
          { step: "3", text: "Download smaller PDF" },
        ]} category="compress" />
        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && !result && (
          <Button size="lg" onClick={compress} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Compressing…</> : "Compress PDF"}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-5 seconds</p>}
        {result && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
              <p className="font-display text-2xl font-bold text-foreground">{reduction}% smaller</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatSize(result.original)} → {formatSize(result.compressed)}
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" onClick={() => { setFiles([]); setResult(null); }} className="rounded-xl">
                Compress Another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default CompressPdf;
