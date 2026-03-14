import { useState, useEffect } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { RotateCw, FileBox, CheckCircle2, ArrowRight, Download, Share2, Upload, Loader2, Settings } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Set worker path for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const RotatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [files]);

  const rotate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const newResults: ProcessingResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const bytes = await file.arrayBuffer();
        const doc = await PDFDocument.load(bytes);

        doc.getPages().forEach(page => {
          const currentRotation = page.getRotation().angle;
          page.setRotation(degrees(currentRotation + angle));
        });

        setProgress(10 + ((i + 1) / files.length) * 80);

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        newResults.push({
          file: blob,
          url,
          filename: file.name.replace(/\.pdf$/i, "_rotated.pdf")
        });
      }

      setProgress(100);
      setResults(newResults);
      toast.success(files.length > 1 ? "All PDFs rotated successfully!" : "PDF rotated!");
    } catch (err) {
      console.error("Rotation failed:", err);
      toast.error("Failed to rotate PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Rotate PDF"
      description="Permanently rotate pages in your PDF document"
      category="edit"
      icon={<RotateCw className="h-7 w-7" />}
      metaTitle="Rotate PDF — Rotate PDF Pages Online Free"
      metaDescription="Rotate PDF pages by 90, 180 or 270 degrees. Free online PDF rotation tool."
      toolId="rotate"
      hideHeader
    >
      <ToolHeader
        title="Rotate PDF"
        description="Permanently rotate pages in your PDF"
        icon={<RotateCw className="h-5 w-5 text-primary-foreground" />}
      />

      <div className="mt-5">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload
              accept=".pdf"
              files={files}
              onFilesChange={setFiles}
              multiple
              label="Select PDFs to rotate"
              collapsible={false}
            />
          </div>
        ) : processing ? (
          <div className="mt-8 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-8 relative flex justify-center items-center h-32">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              </div>
              <RotateCw className="h-8 w-8 text-primary absolute animate-pulse" />
            </div>

            <h3 className="text-2xl font-bold mb-2">Rotating your PDF...</h3>
            <div className="w-full bg-secondary rounded-full h-3 mb-4 overflow-hidden mt-6">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">Please wait while we process your files</p>
          </div>
        ) : results.length > 0 ? (
          <ResultView
            results={results}
            onReset={() => {
              setFiles([]);
              setResults([]);
            }}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 bg-secondary/30 rounded-3xl p-6 lg:p-8 border border-border">
            {/* LEFT PANEL: FILE LIST */}
            <div className="flex-1 space-y-6">
              <div className="bg-card border border-border shadow-sm rounded-2xl p-6 h-full min-h-[500px] flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileBox className="h-5 w-5 text-primary" />
                  Files to Rotate
                </h2>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-secondary/50 p-3 rounded-xl border border-border group hover:border-primary/30 transition-colors">
                      <div className="w-20 h-24 bg-card shadow-sm rounded-md border border-border/50 overflow-hidden shrink-0 flex items-center justify-center relative bg-white">
                        {idx === 0 && previewUrl ? (
                          <div className="scale-[0.4] origin-center">
                            <Document file={previewUrl} loading={<div className="h-4 w-4 bg-primary/10 rounded-full animate-pulse" />}>
                              <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} width={200} />
                            </Document>
                          </div>
                        ) : (
                          <FileBox className="h-8 w-8 text-muted-foreground/30" />
                        )}
                        <div className="absolute top-1 left-1 bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate text-foreground">{file.name}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-medium">
                          <span className="bg-background px-2 py-1 rounded-md border border-border/50">{formatSize(file.size)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setFiles([])}
                    className="w-full h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-primary/50 transition-all group"
                  >
                    <Upload className="h-4 w-4 mr-2 group-hover:-translate-y-1 transition-transform" />
                    Start Over / Upload More
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: ROTATION CONTROLS */}
            <div className="w-full lg:w-[420px] shrink-0 space-y-6">
              <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none -z-0"></div>

                <h2 className="text-xl font-bold mb-2 relative z-10">Rotation Angle</h2>
                <p className="text-sm text-muted-foreground mb-6 relative z-10">Select the desired rotation for your documents.</p>

                <div className="grid grid-cols-1 gap-3 relative z-10">
                  {[
                    { a: 90, label: "90° Clockwise" },
                    { a: 180, label: "180° Flip" },
                    { a: 270, label: "90° Counter-Clockwise" }
                  ].map((item) => (
                    <button
                      key={item.a}
                      onClick={() => setAngle(item.a)}
                      className={cn(
                        "w-full flex items-center p-4 rounded-xl border-2 transition-all text-left group",
                        angle === item.a
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:border-primary/30"
                      )}
                    >
                      <div className={cn("p-2 rounded-full shrink-0 mr-4", angle === item.a ? "bg-primary/10" : "bg-secondary")}>
                        <RotateCw
                          className={cn("h-5 w-5 transition-transform duration-500", angle === item.a ? "text-primary" : "text-muted-foreground")}
                          style={{ transform: `rotate(${item.a}deg)` }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Rotate all pages</p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2",
                        angle === item.a ? "border-primary" : "border-muted-foreground/30"
                      )}>
                        {angle === item.a && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Live Visual Preview in Sidebar */}
                {previewUrl && (
                  <div className="mt-8 pt-8 border-t border-border flex flex-col items-center">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 self-start">Live Preview</Label>
                    <div className="relative h-48 w-40 rounded-xl border-2 border-dashed border-primary/20 bg-secondary/20 flex items-center justify-center overflow-hidden transition-all duration-300 shadow-inner">
                      <motion.div
                        animate={{ rotate: angle }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-full flex justify-center scale-[0.5] origin-center"
                      >
                        <Document file={previewUrl} loading={<Loader2 className="animate-spin text-primary" />}>
                          <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} width={200} />
                        </Document>
                      </motion.div>
                      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-muted-foreground border border-border">
                        Page 1
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION PANEL */}
              <div className="bg-card border-2 border-primary/20 shadow-sm rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/30"></div>

                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Ready to Process</h3>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    {angle}° Rotation
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Selected Files:</span>
                    <span className="font-bold text-foreground">{files.length}</span>
                  </div>
                  <div className="flex justify-between items-center bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg">
                    <span className="text-sm font-bold text-foreground">Status:</span>
                    <span className="font-black text-sm text-primary uppercase">Ready</span>
                  </div>
                </div>

                <Button
                  onClick={rotate}
                  size="lg"
                  className="w-full mt-6 h-12 text-base font-bold shadow-elevated hover:shadow-card-hover transition-all"
                >
                  Rotate PDF{files.length > 1 ? "s" : ""} <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default RotatePdf;

