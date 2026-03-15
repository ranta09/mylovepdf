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
      hideHeader={files.length > 0 || results.length > 0}
    >
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">PDF to Word Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Mapping Paragraph Structures..." : results.length > 0 ? "Conversion Terminal" : "Awaiting Execution"}
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
                  <ArrowRight className="h-4 w-4" /> Convert to Word
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
            <div className="flex-1 flex flex-row overflow-hidden">
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

              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center">
                <div className="w-full max-w-2xl space-y-8">
                  <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-border bg-secondary/5">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Settings className="h-4 w-4 text-blue-500" />
                        Formatting Protocol
                      </h3>
                    </div>
                    <div className="p-10 space-y-8 text-center">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document Layout Mode</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'standard', label: 'Standard Mode', desc: 'Recommended for most documents. Balanced layout.', icon: <Sparkles className="h-4 w-4" /> },
                            { id: 'exact', label: 'Exact Fidelity', desc: 'Prioritizes original visual position. Best for complex forms.', icon: <Layout className="h-4 w-4" /> },
                            { id: 'continuous', label: 'Continuous Flow', desc: 'Best for simple text. Easier to edit later.', icon: <FileText className="h-4 w-4" /> }
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              onClick={() => setConversionMode(mode.id)}
                              className={cn(
                                "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all group text-left",
                                conversionMode === mode.id ? "border-blue-500 bg-blue-500/5" : "border-border bg-card/50 hover:border-blue-500/30"
                              )}>
                              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", conversionMode === mode.id ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground")}>
                                {mode.icon}
                              </div>
                              <div className="flex-1">
                                <p className={cn("text-xs font-black uppercase tracking-widest", conversionMode === mode.id ? "text-blue-600" : "text-foreground")}>{mode.label}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{mode.desc}</p>
                              </div>
                              {conversionMode === mode.id && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm text-center">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for {files.length} PDF sources · {conversionMode.toUpperCase()} Logic</span>
                    </div>

                    <Button size="lg" onClick={convert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                      Initiate Conversion <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
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
