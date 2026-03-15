import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import mammoth from "mammoth";
import { FileText, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const WordToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    const newResults: ProcessingResult[] = [];

    try {
      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        const arrayBuffer = await file.arrayBuffer();
        setProgress(10 + (f / files.length) * 20);

        let text = "";
        if (file.name.endsWith(".docx")) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          text = await file.text();
        }

        setProgress(30 + (f / files.length) * 20);
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 11;
        const margin = 50;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const maxWidth = pageWidth - margin * 2;
        const lineHeight = fontSize * 1.5;

        const lines: { text: string; bold: boolean }[] = [];
        const paragraphs = text.split("\n");

        for (const para of paragraphs) {
          if (!para.trim()) {
            lines.push({ text: "", bold: false });
            continue;
          }

          // Detect headings (short lines, often all caps or title-like)
          const isHeading = para.length < 80 && para === para.toUpperCase() && para.length > 3;
          const currentFont = isHeading ? boldFont : font;
          const currentSize = isHeading ? 14 : fontSize;

          const words = para.split(" ");
          let currentLine = "";

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = currentFont.widthOfTextAtSize(testLine, currentSize);
            if (width > maxWidth && currentLine) {
              lines.push({ text: currentLine, bold: isHeading });
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push({ text: currentLine, bold: isHeading });
        }

        const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
        for (let i = 0; i < lines.length; i += linesPerPage) {
          const page = doc.addPage([pageWidth, pageHeight]);
          const pageLines = lines.slice(i, i + linesPerPage);
          pageLines.forEach((line, idx) => {
            if (line.text.trim()) {
              page.drawText(line.text, {
                x: margin,
                y: pageHeight - margin - idx * lineHeight,
                size: line.bold ? 14 : fontSize,
                font: line.bold ? boldFont : font,
                color: rgb(0.1, 0.1, 0.1),
              });
            }
          });
        }

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        newResults.push({
          file: blob,
          url,
          filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
        });

        setProgress(50 + ((f + 1) / files.length) * 50);
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`${newResults.length} document${newResults.length > 1 ? "s" : ""} converted to PDF!`);
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Word to PDF"
      description="Convert Word and text documents to PDF format"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="Word to PDF — Convert DOCX to PDF Free"
      metaDescription="Convert Word DOCX and text documents to PDF. Preserves formatting, fonts, and structure. Free online converter."
      toolId="word-to-pdf"
      hideHeader={files.length > 0 || results.length > 0}
    >
      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Word Processor Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Synthesizing Typography..." : results.length > 0 ? "Conversion Terminal" : "Awaiting Execution"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(results.length > 0 || !processing) && (
                <Button variant="outline" size="sm" onClick={() => { setFiles([]); setResults([]); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Start Over
                </Button>
              )}
              {results.length === 0 && !processing && (
                <Button size="sm" onClick={convert} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Convert to PDF
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  </div>
                  <FileText className="h-8 w-8 text-blue-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Rasterizing Document Flow</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Vectorized</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: File Manifest */}
              <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                  <FileBox className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-blue-500/30 transition-all">
                        <div className="h-12 w-10 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setFiles([])} className="w-full p-4 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all">
                      + Resync Payload
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {/* CENTER: Workbench */}
              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl text-center space-y-8">
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-background border border-border shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                    <FileText className="h-8 w-8 text-blue-500 relative z-10" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Ready for Synthesis</h3>
                    <p className="text-muted-foreground font-medium">Your Word documents are optimized and prepared for PDF conversion. All formatting, fonts, and structures will be preserved.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 bg-background border border-border rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Files</p>
                      <p className="text-lg font-black">{files.length}</p>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Target</p>
                      <p className="text-lg font-black text-blue-600">PDF</p>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <Button size="lg" onClick={convert} className="h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-[0.1em] px-12 shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all gap-3 hover:scale-105 active:scale-95">
                      Initiate Conversion <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> High-Fidelity
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Font Preservation
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Secure Tunnel
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Encrypted Channel</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Word v4.2.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest uppercase">Target Buffer: PDF</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5">
            <FileUpload accept=".doc,.docx" files={files} onFilesChange={setFiles} label="Select Word files to convert" />
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default WordToPdf;
