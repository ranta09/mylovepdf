import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Minimize2, Loader2, Info } from "lucide-react";
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
        <div className="rounded-2xl border border-tool-compress/20 bg-tool-compress/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-compress">
              <Minimize2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Compress PDF</h1>
              <p className="text-sm text-muted-foreground">Reduce file size without losing quality</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Optimize your PDF for sharing and uploading. Compression happens in your browser — files stay private.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} label="Select a PDF to compress" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "We optimize the file" },
            { step: "3", text: "Download smaller PDF" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-compress text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && !result && (
          <Button size="lg" onClick={compress} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Compressing…</> : <><Minimize2 className="mr-2 h-5 w-5" />Compress PDF</>}
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
