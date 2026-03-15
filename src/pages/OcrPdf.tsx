import { useState, useEffect } from "react";
import { ScanLine, Copy, Download, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createWorker } from "tesseract.js";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const OcrPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setExtractedText("");
    setResults([]);

    const worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(10 + Math.round(m.progress * 60));
        }
      },
    });

    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = "";

      // Also create a searchable PDF with text overlay
      const outDoc = await PDFDocument.create();
      const font = await outDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const origViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;

        // OCR the page
        const { data: { text } } = await worker.recognize(canvas);
        fullText += `--- Page ${i} ---\n${text}\n\n`;

        // Embed page as image in output PDF
        const jpegBlob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
        );
        const jpegData = new Uint8Array(await jpegBlob.arrayBuffer());
        const jpegImage = await outDoc.embedJpg(jpegData);

        const pdfPage = outDoc.addPage([origViewport.width, origViewport.height]);
        pdfPage.drawImage(jpegImage, {
          x: 0, y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });

        // Add invisible text layer for searchability
        const lines = text.split("\n").filter((l: string) => l.trim());
        const fontSize = 8;
        const lineHeight = fontSize * 1.4;
        let yPos = origViewport.height - 20;

        for (const line of lines) {
          if (yPos < 20) break;
          try {
            pdfPage.drawText(line, {
              x: 10,
              y: yPos,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
              opacity: 0.01, // Nearly invisible but searchable/selectable
            });
          } catch {
            // Skip lines with unsupported characters
          }
          yPos -= lineHeight;
        }

        setProgress(70 + Math.round((i / pdf.numPages) * 20));
      }

      if (!fullText.trim()) {
        toast.error("No text could be recognized. Try another document.");
        setProcessing(false);
        return;
      }

      setExtractedText(fullText);

      // Save searchable PDF
      const pdfBytes = await outDoc.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const filename = files[0].name.replace(/\.pdf$/i, "_searchable.pdf");

      setResults([{ file: blob, url, filename }]);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setProgress(100);
      toast.success(`OCR complete for ${pdf.numPages} page(s)! Searchable PDF downloaded.`);
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to process PDF with OCR");
    } finally {
      await worker.terminate();
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Copied to clipboard!");
  };

  const downloadAsTxt = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-extracted.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolLayout
      title="OCR PDF"
      description="Extract text from scanned PDFs using text recognition technology."
      category="edit"
      icon={<ScanLine className="h-7 w-7" />}
      metaTitle="OCR PDF — Make Scanned PDFs Searchable Online Free"
      metaDescription="Convert scanned PDF documents into searchable, selectable text using OCR technology. Free online OCR for PDF files with no sign-up required."
      toolId="ocr-pdf"
      hideHeader={files.length > 0 || !!extractedText || processing}
    >
      {(files.length > 0 || extractedText) && !processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-row overflow-hidden relative">

            {/* LEFT SIDE: OCR Settings / Stats */}
            <div className="w-80 border-r border-border bg-secondary/5 flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Analysis Engine</span>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Recognition Protocol</h3>
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl space-y-1">
                      <p className="text-[10px] font-black text-primary uppercase">Tesseract OCR v5</p>
                      <p className="text-[9px] text-muted-foreground uppercase leading-tight font-bold tracking-tight">Neural network based text extraction with multi-channel support.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Detection Status</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Language</span>
                        <span className="text-[10px] font-black text-foreground uppercase">English (Standard)</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Resolution</span>
                        <span className="text-[10px] font-black text-foreground uppercase">288 DPI (Upscaled)</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-3">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" />
                        Accuracy Tip
                      </p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                        High-contrast documents provide the best results. Complex layouts may requires manual correction.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* CENTER: Main Preview / Results */}
            <div className="flex-1 bg-secondary/10 flex flex-col items-center justify-center p-8 overflow-y-auto">
              {extractedText ? (
                <div className="w-full h-full max-w-4xl bg-background shadow-2xl rounded-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
                  <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Copy className="h-4 w-4 text-primary" />
                      </div>
                      <h2 className="text-xs font-black uppercase tracking-widest">Extracted Metadata</h2>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyToClipboard} className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" onClick={downloadAsTxt} className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2">
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-8 bg-secondary/5">
                    <div className="max-w-3xl mx-auto prose prose-sm prose-slate">
                      <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap bg-transparent border-none p-0">
                        {extractedText}
                      </pre>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="w-full max-w-xl bg-background shadow-2xl rounded-2xl border border-border p-12 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0" />
                  <div className="relative z-10 space-y-6">
                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary/20">
                      <ScanLine className="h-10 w-10 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-xl font-black uppercase tracking-tighter">{files[0]?.name || "Document Stream"}</h2>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic tracking-wider">Awaiting OCR Sequence</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDE: Action Center */}
            <div className="w-96 border-l border-border bg-background flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Execution Hub</span>
                <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setExtractedText(""); }} className="h-7 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive">
                  Reset
                </Button>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Analysis Vector</h3>
                    <div className="p-4 bg-secondary/30 rounded-2xl border border-border space-y-2">
                      <p className="text-[10px] font-black text-foreground uppercase">Precision Scan</p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase">Optimal for scanned PDFs with high-quality imagery.</p>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Privacy Protocol
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                      OCR is processed entirely within your secure local environment. No document data is transmitted to external servers.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t border-border bg-background">
                {extractedText ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => { setFiles([]); setExtractedText(""); }}
                    className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-[0.2em] border-primary/30 text-primary hover:bg-primary/5 transition-all"
                  >
                    Process Another PDF
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleProcess}
                    disabled={processing}
                    className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-3"
                  >
                    {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <>Run Neural OCR <ScanLine className="h-4 w-4" /></>}
                  </Button>
                )}
                {processing && <Progress value={progress} className="mt-4 h-1 rounded-full" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default OcrPdf;
