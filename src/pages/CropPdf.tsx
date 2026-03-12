import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Crop, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";

const CropPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [top, setTop] = useState("36"); // Default 0.5 inch (72 points = 1 inch)
  const [bottom, setBottom] = useState("36");
  const [left, setLeft] = useState("36");
  const [right, setRight] = useState("36");

  // Generate preview URL for the first file to show a Live Preview
  useState(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  });

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

      setResults([{
        file: blob,
        url,
        filename: files[0].name.replace(/\.pdf$/i, "_cropped.pdf")
      }]);

      toast.success("PDF cropped successfully!");
    } catch {
      toast.error("Failed to crop PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const t = parseFloat(top) || 0;
  const b = parseFloat(bottom) || 0;
  const l = parseFloat(left) || 0;
  const r = parseFloat(right) || 0;

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
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with scanned documents, presentations, and PDFs with large margins. Max file size: 100MB.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={async (f) => {
              setFiles(f);
              if (f.length > 0) {
                const url = URL.createObjectURL(f[0]);
                setPreviewUrl(url);
              } else {
                setPreviewUrl(null);
              }
            }} multiple={false} label="Select a PDF to crop" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-6">Crop Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                  {/* Visual Preview */}
                  <div className="flex flex-col items-center justify-center">
                    {previewUrl ? (
                      <div className="relative h-48 w-36 rounded-lg border-2 border-dashed border-primary/30 bg-secondary/30 flex items-center justify-center overflow-hidden shadow-inner">
                        <div className="w-full h-full flex justify-center scale-[0.45] origin-top">
                          <Document file={previewUrl} loading={<Loader2 className="animate-spin text-primary" />}>
                            <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} width={200} />
                          </Document>
                        </div>

                        {/* Overlay to show crop area dynamically */}
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Top Overlay */}
                          <div className="absolute top-0 left-0 right-0 bg-background/60 backdrop-blur-[1px]" style={{ height: `${Math.min(t / 2, 45)}%` }} />
                          {/* Bottom Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-background/60 backdrop-blur-[1px]" style={{ height: `${Math.min(b / 2, 45)}%` }} />
                          {/* Left Overlay */}
                          <div className="absolute top-0 bottom-0 left-0 bg-background/60 backdrop-blur-[1px]" style={{ width: `${Math.min(l / 2, 45)}%`, top: `${Math.min(t / 2, 45)}%`, bottom: `${Math.min(b / 2, 45)}%` }} />
                          {/* Right Overlay */}
                          <div className="absolute top-0 bottom-0 right-0 bg-background/60 backdrop-blur-[1px]" style={{ width: `${Math.min(r / 2, 45)}%`, top: `${Math.min(t / 2, 45)}%`, bottom: `${Math.min(b / 2, 45)}%` }} />

                          {/* Crop Box Border */}
                          <div
                            className="absolute border border-primary bg-primary/10 transition-all duration-300"
                            style={{
                              top: `${Math.min(t / 2, 45)}%`,
                              bottom: `${Math.min(b / 2, 45)}%`,
                              left: `${Math.min(l / 2, 45)}%`,
                              right: `${Math.min(r / 2, 45)}%`
                            }}
                          />
                        </div>

                        <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-muted-foreground border border-border">
                          Visual Preview
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 w-36 rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-secondary/30">
                        <span className="text-xs text-muted-foreground">Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Manual Inputs */}
                  <div className="flex flex-col justify-center">
                    <p className="text-sm font-medium text-foreground mb-4">Margins (Points, 72pt = 1 inch)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Top</Label>
                        <Input type="number" min="0" value={top} onChange={e => setTop(e.target.value)} className="h-9 font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bottom</Label>
                        <Input type="number" min="0" value={bottom} onChange={e => setBottom(e.target.value)} className="h-9 font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Left</Label>
                        <Input type="number" min="0" value={left} onChange={e => setLeft(e.target.value)} className="h-9 font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Right</Label>
                        <Input type="number" min="0" value={right} onChange={e => setRight(e.target.value)} className="h-9 font-mono" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={crop}
              buttonText="Crop PDF"
              processingText="Cropping..."
              estimateText="Estimated time: ~2-4 seconds"
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => {
              setFiles([]);
              setResults([]);
              setPreviewUrl(null);
            }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default CropPdf;
