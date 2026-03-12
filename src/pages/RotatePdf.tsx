import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { RotateCw, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";

const RotatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Generate preview URL for the first file to show a Live Preview of the rotation
  useState(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  });

  const rotate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(30);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach(page => page.setRotation(degrees(page.getRotation().angle + angle)));
      setProgress(80);

      const pdfBytes = await doc.save();
      setProgress(100);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{
        file: blob,
        url,
        filename: files[0].name.replace(/\.pdf$/i, "_rotated.pdf")
      }]);

      toast.success("PDF rotated!");
    } catch {
      toast.error("Failed to rotate PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Rotate PDF" description="Rotate all pages in your PDF document" category="edit" icon={<RotateCw className="h-7 w-7" />}
      metaTitle="Rotate PDF — Rotate PDF Pages Online Free" metaDescription="Rotate PDF pages by 90, 180 or 270 degrees. Free online PDF rotation tool." toolId="rotate" hideHeader>
      <ToolHeader
        title="Rotate PDF"
        description="Permanently rotate pages in your PDF"
        icon={<RotateCw className="h-5 w-5 text-primary-foreground" />}
      />
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
            }} multiple={false} label="Select a PDF to rotate" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-6 text-center">Rotation Settings</h3>

                <div className="flex flex-col items-center gap-6">
                  {/* Live Visual Preview */}
                  {previewUrl && (
                    <div className="relative h-48 w-48 rounded-xl border-2 border-dashed border-primary/30 bg-secondary/30 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-inner">
                      <div
                        className="transition-transform duration-500 ease-in-out w-full flex justify-center scale-[0.5] origin-center"
                        style={{ transform: `rotate(${angle}deg) scale(0.5)` }}
                      >
                        <Document file={previewUrl} loading={<Loader2 className="animate-spin text-primary" />}>
                          <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} width={200} />
                        </Document>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-muted-foreground border border-border">
                        Preview
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 w-full">
                    {[90, 180, 270].map(a => (
                      <button
                        key={a}
                        onClick={() => setAngle(a)}
                        className={`flex-1 py-3 px-4 rounded-xl border flex flex-col justify-center items-center gap-2 transition-all duration-200 ${angle === a ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-background border-border text-foreground hover:bg-secondary hover:border-primary/50"}`}
                      >
                        <RotateCw className={`h-5 w-5 ${angle === a ? "text-primary-foreground" : "text-muted-foreground"}`} style={{ transform: `rotate(${a}deg)` }} />
                        <span className="font-semibold">{a}°</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={rotate}
              buttonText={`Rotate PDF ${angle}°`}
              processingText="Rotating..."
              estimateText="Estimated time: ~2-3 seconds"
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

export default RotatePdf;
