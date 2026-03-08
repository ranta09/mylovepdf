import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Minimize2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const CompressPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null);

  const compress = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const original = files[0].size;
      const bytes = await files[0].arrayBuffer();
      setProgress(50);
      const doc = await PDFDocument.load(bytes);
      // Re-save with object stream optimization (basic compression)
      const pdfBytes = await doc.save({ useObjectStreams: true });
      setProgress(90);
      const compressed = pdfBytes.length;
      setResult({ original, compressed });
      setProgress(100);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
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
      metaTitle="Compress PDF — Reduce PDF Size Online Free" metaDescription="Compress PDF files to reduce size. Free online PDF compressor.">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to compress" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && !result && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={compress} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Compressing…" : "Compress PDF"}
          </Button>
        </div>
      )}
      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
          <p className="font-display text-2xl font-bold text-foreground">{reduction}% smaller</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatSize(result.original)} → {formatSize(result.compressed)}
          </p>
        </div>
      )}
    </ToolLayout>
  );
};

export default CompressPdf;
