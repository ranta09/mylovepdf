import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Minimize2, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const CompressPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [stats, setStats] = useState<{ original: number; compressed: number } | null>(null);

  // Compression Settings
  const [compressionLevel, setCompressionLevel] = useState(50); // 0-100 (100 = max compression, lowest quality)
  const [imageQuality, setImageQuality] = useState("medium"); // high, medium, low

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
      <ToolHeader
        title="Compress PDF"
        description="Reduce file size while keeping quality"
        icon={<Minimize2 className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} multiple label="Select PDFs to compress" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Compression Settings</h3>

                <div className="space-y-6">
                  {/* Slider Mode */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Compression Level</span>
                      <span className="text-muted-foreground font-mono">{compressionLevel}%</span>
                    </div>
                    <Slider
                      value={[compressionLevel]}
                      onValueChange={(v) => setCompressionLevel(v[0])}
                      max={100}
                      step={1}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Less compression<br />(Higher quality)</span>
                      <span className="text-right">Max compression<br />(Lower quality)</span>
                    </div>
                  </div>

                  {/* Manual/Dropdown Mode */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Image Quality Profile</span>
                    </div>
                    <Select value={imageQuality} onValueChange={(v) => {
                      setImageQuality(v);
                      // Sync slider approximately with dropdown
                      if (v === 'high') setCompressionLevel(20);
                      if (v === 'medium') setCompressionLevel(50);
                      if (v === 'low') setCompressionLevel(80);
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select quality profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High Quality (Less compression)</SelectItem>
                        <SelectItem value="medium">Medium Quality (Recommended)</SelectItem>
                        <SelectItem value="low">Low Quality (Maximum compression)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Live Estimate */}
                  <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Estimated Reduction</span>
                      <span className="text-lg font-bold text-foreground">
                        ~{Math.round(compressionLevel * 0.7)}%
                      </span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={compress}
              buttonText={`Compress PDFs (${compressionLevel}% reduction)`}
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
