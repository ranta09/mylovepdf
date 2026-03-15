import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileText, Upload } from "lucide-react";
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
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToExcel = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [outputFormat, setOutputFormat] = useState("xlsx"); // xlsx or csv
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const allRows: string[][] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group text items by Y position to form rows
        const rows: Map<number, { x: number; text: string }[]> = new Map();
        content.items.forEach((item: any) => {
          const y = Math.round(item.transform[5]);
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y)!.push({ x: item.transform[4], text: item.str });
        });

        // Sort rows by Y (descending) and items by X
        const sortedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);
        for (const [, items] of sortedRows) {
          items.sort((a, b) => a.x - b.x);
          const rowData = items.map(item => item.text.trim()).filter(t => t.length > 0);
          if (rowData.length > 0) {
            allRows.push(rowData);
          }
        }

        setProgress(10 + Math.round((i / pdf.numPages) * 70));
      }

      setProgress(85);

      const newResults: ProcessingResult[] = [];

      if (outputFormat === "xlsx") {
        // Create real XLSX file
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
        const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([xlsxBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: files[0].name.replace(/\.pdf$/i, ".xlsx") });
      } else {
        // Create CSV
        const csvContent = allRows.map(row =>
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: files[0].name.replace(/\.pdf$/i, ".csv") });
      }

      // Always include both formats
      if (outputFormat === "xlsx") {
        const csvContent = allRows.map(row =>
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const csvUrl = URL.createObjectURL(csvBlob);
        newResults.push({ file: csvBlob, url: csvUrl, filename: files[0].name.replace(/\.pdf$/i, ".csv") });
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`Extracted ${allRows.length} rows from PDF!`);
    } catch {
      toast.error("Failed to extract data from PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to Excel"
      description="Extract tables and data from PDF to Excel spreadsheet"
      category="convert"
      icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="PDF to Excel — Extract PDF Tables to Spreadsheet Free"
      metaDescription="Extract tables and data from PDF files to Excel XLSX or CSV format. Free online tool."
      toolId="pdf-to-excel"
      hideHeader={files.length > 0 || processing || results.length > 0}
    >
      {/* ── EXTRACTION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">PDF Data Scraper</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Mapping Table Structures..." : results.length > 0 ? "Extraction Terminal" : "Awaiting Execution"}
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
                  <ArrowRight className="h-4 w-4" /> Extract to Spreadsheet
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-indigo-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Locating Data Cells</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Scanned</p>
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
                  <FileBox className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-indigo-500/30 transition-all">
                        <div className="h-12 w-10 bg-indigo-50 dark:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-indigo-500" />
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
                        <Settings className="h-4 w-4 text-indigo-500" />
                        Extraction Parameters
                      </h3>
                    </div>
                    <div className="p-10 space-y-8">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Output Matrix</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'xlsx', label: 'Excel Workbook', ext: '.xlsx', icon: <FileSpreadsheet className="h-5 w-5" /> },
                            { id: 'csv', label: 'Comma Separated', ext: '.csv', icon: <FileText className="h-5 w-5" /> }
                          ].map((format) => (
                            <button
                              key={format.id}
                              onClick={() => setOutputFormat(format.id)}
                              className={cn(
                                "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group",
                                outputFormat === format.id ? "border-indigo-500 bg-indigo-500/5" : "border-border bg-card/50 hover:border-indigo-500/30"
                              )}>
                              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", outputFormat === format.id ? "bg-indigo-500 text-white" : "bg-secondary text-muted-foreground")}>
                                {format.icon}
                              </div>
                              <div>
                                <p className={cn("text-xs font-black uppercase tracking-widest", outputFormat === format.id ? "text-indigo-600" : "text-foreground")}>{format.label}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Target Format: {format.ext}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Both XLSX and CSV will be generated automatically.</span>
                      </div>
                    </div>
                  </div>

                  {/* Execution Readiness */}
                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm text-center">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for {files.length} PDF source · Mapping Active</span>
                    </div>

                    <Button size="lg" onClick={convert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                      Initiate Extraction <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Secure Buffer</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Data v4.2.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Extraction accuracy depends on PDF internal text mapping.</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5 text-center">
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to extract data from" />
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfToExcel;
