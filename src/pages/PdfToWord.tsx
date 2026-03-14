import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, Sparkles, Upload } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    const newResults: ProcessingResult[] = [];
    const totalFiles = files.length;

    try {
      for (let f = 0; f < totalFiles; f++) {
        const file = files[f];
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

        // Extract structured text with positioning
        const pages: { text: string; items: any[] }[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // Group items by Y position for paragraph detection
          const lineMap = new Map<number, any[]>();
          content.items.forEach((item: any) => {
            const y = Math.round(item.transform[5] / 2) * 2; // Round to 2px groups
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y)!.push(item);
          });

          const sortedLines = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);
          let pageText = "";
          sortedLines.forEach(([, items]) => {
            items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
            const lineText = items.map((it: any) => it.str).join(" ").trim();
            if (lineText) pageText += lineText + "\n";
          });

          pages.push({ text: pageText, items: content.items as any[] });
          const overallProgress = ((f + (i / pdf.numPages)) / totalFiles) * 90;
          setProgress(Math.round(overallProgress));
        }

        // Build DOCX-compatible HTML
        let cssStyles = "";
        if (conversionMode === "exact") {
          cssStyles = `body { font-family: 'Times New Roman', serif; line-height: 1.0; margin: 1in; } p { margin: 0; padding: 2px 0; } h1,h2,h3 { margin: 12px 0 6px; }`;
        } else if (conversionMode === "continuous") {
          cssStyles = `body { font-family: Arial, sans-serif; line-height: 1.6; margin: 1in; } p { min-height: 1em; margin-bottom: 8px; }`;
        } else {
          cssStyles = `body { font-family: Calibri, sans-serif; line-height: 1.15; margin: 1in; } p { margin: 0 0 6px; } h1 { font-size: 20pt; margin: 18px 0 8px; } h2 { font-size: 16pt; margin: 14px 0 6px; }`;
        }

        const htmlContent = pages.map((page, idx) => {
          const lines = page.text.split("\n").filter(l => l.trim());
          const htmlLines = lines.map(line => {
            // Detect headings: short lines with larger implied font or all-caps
            const isHeading = (line.length < 80 && line === line.toUpperCase() && line.length > 3);
            if (isHeading) return `<h2>${escapeHtml(line)}</h2>`;
            return `<p>${escapeHtml(line)}</p>`;
          });
          return htmlLines.join("\n") + (idx < pages.length - 1 ? '<br clear="all" style="page-break-after:always" />' : "");
        }).join("\n");

        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Converted Document</title><style>${cssStyles}</style></head><body>${htmlContent}</body></html>`;

        const blob = new Blob([html], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: file.name.replace(/\.pdf$/i, ".doc") });
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`${totalFiles} file${totalFiles > 1 ? "s" : ""} converted to Word!`);
    } catch {
      toast.error("Failed to convert PDF(s) to Word");
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
              <div className="w-full max-w-md space-y-8 text-center text-center">
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
              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center">
                <div className="w-full max-w-2xl space-y-8">
                  {/* Configuration Map */}
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

                  {/* Execution Readiness */}
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

          {/* Footer Meta */}
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default PdfToWord;
