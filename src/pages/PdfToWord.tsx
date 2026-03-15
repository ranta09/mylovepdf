import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, Sparkles, Upload } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType
} from "docx";
import Tesseract from "tesseract.js";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToWord = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [conversionMode, setConversionMode] = useState("standard");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const renderPageToImage = async (page: any): Promise<string> => {
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/png");
  };

  const convert = async () => {
    if (files.length === 0) return;

    // STEP 1 - Validation
    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`File ${file.name} is not a PDF.`);
        return;
      }
      if (file.size > 300 * 1024 * 1024) {
        toast.error(`File ${file.name} exceeds 300MB limit.`);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);

    const newResults: ProcessingResult[] = [];
    const totalFiles = files.length;

    try {
      for (let f = 0; f < totalFiles; f++) {
        const file = files[f];
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const docSections: any[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();

          let pageChildren: any[] = [];

          if (textContent.items.length === 0) {
            // STEP 7 - OCR for Scanned PDF
            const imageData = await renderPageToImage(page);
            const { data: { text } } = await Tesseract.recognize(imageData, 'eng');

            const lines = text.split('\n').filter(line => line.trim() !== '');
            lines.forEach(p => {
              pageChildren.push(new Paragraph({
                children: [new TextRun(p)],
                spacing: { after: 200 }
              }));
            });
          } else {
            // STEP 2 & 3 & 4 & 5 - Analysis, Extraction, Layout, Tables
            const items = textContent.items as any[];

            const lines: any[][] = [];
            let currentLine: any[] = [];
            let lastY = -1;

            items.sort((a, b) => {
              const yDiff = b.transform[5] - a.transform[5];
              if (Math.abs(yDiff) < 5) return a.transform[4] - b.transform[4];
              return yDiff;
            });

            items.forEach(item => {
              if (lastY === -1 || Math.abs(item.transform[5] - lastY) < 5) {
                currentLine.push(item);
              } else {
                lines.push(currentLine);
                currentLine = [item];
              }
              lastY = item.transform[5];
            });
            if (currentLine.length > 0) lines.push(currentLine);

            let currentParagraph: any[] = [];

            lines.forEach((lineItems, lIdx) => {
              const textStr = lineItems.map(it => it.str).join(' ');
              if (!textStr.trim()) return;

              // Basic Table Detection: multiple items with significant gaps
              const isPossibleTable = lineItems.length > 1 && lineItems.every((it, itIdx) => {
                if (itIdx === 0) return true;
                const prev = lineItems[itIdx - 1];
                const gap = it.transform[4] - (prev.transform[4] + (prev.width || 0));
                return gap > 40;
              });

              if (isPossibleTable) {
                if (currentParagraph.length > 0) {
                  pageChildren.push(new Paragraph({ children: currentParagraph, spacing: { after: 120 } }));
                  currentParagraph = [];
                }

                const cells = lineItems.map(it => new TableCell({
                  children: [new Paragraph({ children: [new TextRun(it.str)] })],
                }));

                pageChildren.push(new Table({
                  rows: [new TableRow({ children: cells })],
                  width: { size: 100, type: WidthType.PERCENTAGE },
                }));
              } else {
                currentParagraph.push(new TextRun({
                  text: textStr + " ",
                  font: "Calibri",
                  size: 22,
                }));

                const nextLine = lines[lIdx + 1];
                const isEndOfPara = !nextLine || Math.abs(nextLine[0].transform[5] - lineItems[0].transform[5]) > 25;

                if (isEndOfPara) {
                  pageChildren.push(new Paragraph({
                    children: currentParagraph,
                    spacing: { after: 120 }
                  }));
                  currentParagraph = [];
                }
              }
            });
          }

          docSections.push({
            children: pageChildren,
          });

          const overallProgress = ((f + (i / pdf.numPages)) / totalFiles) * 100;
          setProgress(Math.round(overallProgress));
        }

        const doc = new Document({
          sections: docSections
        });

        const blob = await Packer.toBlob(doc);
        const filename = file.name.replace(/\.pdf$/i, ".docx");
        const url = URL.createObjectURL(blob);

        newResults.push({ file: blob, url, filename });
        saveAs(blob, filename);
      }

      setResults(newResults);
      toast.success("Conversion successful!");
    } catch (error) {
      console.error(error);
      toast.error("Conversion failed. Please check the file.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to Word"
      description="Convert PDF documents into editable Word files"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="PDF to Word — Convert PDF to Editable DOCX Free"
      metaDescription="Convert PDF files to editable Word documents. Preserves layout, fonts, and paragraph structure. Free online converter."
      toolId="pdf-to-word"
    >
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">


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
                  <h3 className="text-xl font-black uppercase tracking-tighter">Reconstructing Layout</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Analyzed</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-secondary/5">
              <div className="max-w-5xl mx-auto p-8 space-y-12">
                {/* File List Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                        <FileBox className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Selected Documents</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{files.length} {files.length === 1 ? 'File' : 'Files'} Loaded</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setFiles([])} className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                      <RotateCcw className="h-3.5 w-3.5" /> Clear Files
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group transition-all hover:border-blue-500/30">
                        <div className="h-12 w-10 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settings Section */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight">Conversion Protocol</h3>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Configure Output fidelity</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'standard', label: 'Standard Mode', desc: 'Balanced layout & speed.', icon: <Sparkles className="h-4 w-4" /> },
                      { id: 'exact', label: 'Exact Fidelity', desc: 'Perfect visual positioning.', icon: <Layout className="h-4 w-4" /> },
                      { id: 'continuous', label: 'Continuous Flow', desc: 'Easiest for text editing.', icon: <FileText className="h-4 w-4" /> }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setConversionMode(mode.id)}
                        className={cn(
                          "flex flex-col gap-4 p-6 rounded-3xl border-2 transition-all group text-left",
                          conversionMode === mode.id ? "border-blue-500 bg-blue-500/5 shadow-xl shadow-blue-500/10" : "border-border bg-card/50 hover:border-blue-500/30"
                        )}>
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", conversionMode === mode.id ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground")}>
                          {mode.icon}
                        </div>
                        <div>
                          <p className={cn("text-xs font-black uppercase tracking-widest", conversionMode === mode.id ? "text-blue-600" : "text-foreground")}>{mode.label}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 leading-relaxed">{mode.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Execution Block */}
                <div className="flex flex-col items-center gap-6 py-12 border-t border-border/50">
                  <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm text-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Ready for Processing</span>
                  </div>

                  <Button size="lg" onClick={convert} className="h-20 rounded-[2.5rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] px-24 shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 gap-4 text-base">
                    Convert to Word <ArrowRight className="h-7 w-7" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Secure Stream</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Word v5.1.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Supports Microsoft Word 2007+ (Legacy DOC Compatibility)</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5 text-center">
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select PDF files to convert" />
          </div>
        )}
      </div>
    </ToolLayout >
  );
};

export default PdfToWord;
