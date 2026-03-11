import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Minimize2, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";

const CompressPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [stats, setStats] = useState<{ original: number; compressed: number } | null>(null);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResults([]);
    setStats(null);
  };

  const compress = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    const newResults: ProcessingResult[] = [];
    let totalOriginal = 0;
    let totalCompressed = 0;
    const totalFiles = files.length;

    try {
      for (let f = 0; f < totalFiles; f++) {
        const file = files[f];
        totalOriginal += file.size;

        const bytes = await file.arrayBuffer();
        setProgress(Math.round(((f + 0.3) / totalFiles) * 100));

        const doc = await PDFDocument.load(bytes);
        const pdfBytes = await doc.save({ useObjectStreams: true });

        setProgress(Math.round(((f + 0.9) / totalFiles) * 100));

        totalCompressed += pdfBytes.length;

        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        newResults.push({
          file: blob,
          url,
          filename: file.name.replace(/\.pdf$/i, "_compressed.pdf")
        });
      }

      setStats({ original: totalOriginal, compressed: totalCompressed });
      setResults(newResults);
      setProgress(100);
      toast.success(`Compressed ${totalFiles} PDF(s)!`);
    } catch {
      toast.error("Failed to compress PDF(s)");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const formatSize = (b: number) => (b / (1024 * 1024)).toFixed(2) + " MB";
  const reduction = stats ? Math.max(0, Math.round((1 - stats.compressed / stats.original) * 100)) : 0;

  return (
    <ToolLayout title="Compress PDF" description="Reduce PDF file size without losing quality" category="compress" icon={<Minimize2 className="h-7 w-7" />}
      metaTitle="Compress PDF — Reduce PDF Size Online Free" metaDescription="Compress PDF files to reduce size. Free online PDF compressor." toolId="compress" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Minimize2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Compress PDF</h1>
            <p className="text-sm text-muted-foreground">Reduce PDF file size without losing quality</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with large scanned documents, image-heavy PDFs, and email attachments. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} multiple label="Select PDFs to compress" />
            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={compress}
              buttonText="Compress PDFs"
              processingText="Compressing..."
              estimateText="Estimated time: ~3-5 seconds per file"
            />
          </>
        ) : (
          <div className="mt-6 space-y-4">
            {stats && (
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card max-w-2xl mx-auto">
                <p className="font-display text-2xl font-bold text-foreground">{reduction}% smaller</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatSize(stats.original)} → {formatSize(stats.compressed)}
                </p>
              </div>
            )}
            <ResultView
              results={results}
              onReset={() => {
                setFiles([]);
                setResults([]);
                setStats(null);
              }}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default CompressPdf;
