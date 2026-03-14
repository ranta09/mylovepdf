import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileBox, CheckCircle2, ArrowRight, Download, Share2, Upload, Settings, Layout, Layers, RotateCcw, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const ExcelToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [orientation, setOrientation] = useState("landscape");
  const [selectedSheet, setSelectedSheet] = useState("all");
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      try {
        const ab = await newFiles[0].arrayBuffer();
        const wb = XLSX.read(ab);
        setSheetNames(wb.SheetNames);
        setSelectedSheet("all");
      } catch (err) {
        console.error("Error reading excel sheets:", err);
        setSheetNames([]);
      }
    } else {
      setSheetNames([]);
    }
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const newResults: ProcessingResult[] = [];

      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);

        const sheetsToConvert = selectedSheet === "all"
          ? workbook.SheetNames
          : [selectedSheet];

        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 9;
        const margin = 40;
        const isLandscape = orientation === "landscape";
        const pageWidth = isLandscape ? 841.89 : 595.28;
        const pageHeight = isLandscape ? 595.28 : 841.89;
        const rowHeight = 20;
        const maxRows = Math.floor((pageHeight - margin * 2) / rowHeight) - 1;

        for (const sheetName of sheetsToConvert) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (rows.length === 0) continue;

          const colCount = Math.max(...rows.map(r => r.length));
          const colWidth = (pageWidth - margin * 2) / Math.max(colCount, 1);

          for (let chunk = 0; chunk < rows.length; chunk += maxRows) {
            const page = doc.addPage([pageWidth, pageHeight]);
            const pageRows = rows.slice(chunk, chunk + maxRows);

            if (chunk === 0 && sheetsToConvert.length > 1) {
              page.drawText(`Sheet: ${sheetName}`, {
                x: margin, y: pageHeight - margin + 10,
                size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2),
              });
            }

            pageRows.forEach((row, rowIdx) => {
              const y = pageHeight - margin - (rowIdx + 1) * rowHeight;
              const isHeader = chunk === 0 && rowIdx === 0;
              const usedFont = isHeader ? boldFont : font;

              row.forEach((cell: any, colIdx: number) => {
                const x = margin + colIdx * colWidth + 4;
                const cellValue = cell !== null && cell !== undefined ? String(cell) : "";
                const maxChars = Math.floor(colWidth / (fontSize * 0.5));
                const truncated = cellValue.length > maxChars ? cellValue.substring(0, maxChars - 1) + "…" : cellValue;
                page.drawText(truncated, { x, y: y + 5, size: fontSize, font: usedFont, color: rgb(0.1, 0.1, 0.1) });
              });

              page.drawLine({
                start: { x: margin, y },
                end: { x: pageWidth - margin, y },
                thickness: 0.5, opacity: 0.15, color: rgb(0, 0, 0),
              });

              if (isHeader) {
                page.drawRectangle({
                  x: margin, y: y, width: pageWidth - margin * 2, height: rowHeight,
                  color: rgb(0.94, 0.95, 0.97), opacity: 0.5,
                });
              }
            });
          }
        }

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf" });

        setProgress(Math.round(((newResults.length) / files.length) * 100));
      }

      setResults(newResults);
      toast.success("Excel converted to PDF successfully!");
    } catch (error) {
      console.error("Excel conversion error:", error);
      toast.error("Failed to convert Excel to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Excel to PDF"
      description="Convert spreadsheets into professional PDF tables"
      category="convert"
      icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="Excel to PDF — Convert Spreadsheets to PDF Free"
      metaDescription="Convert Excel XLSX, XLS, and CSV spreadsheets to PDF tables. Free online converter."
      toolId="excel-to-pdf"
      hideHeader={files.length > 0 || processing || results.length > 0}
    >

      <div className="mt-5">
        {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
        {(files.length > 0 || processing || results.length > 0) && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

            {/* Header Diagnostic / Execution Control */}
            <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tighter">Spreadsheet Engine</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                    {processing ? "Extrapolating Cells..." : results.length > 0 ? "Conversion Terminal" : "Awaiting Execution"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {(results.length > 0 || !processing) && (
                  <Button variant="outline" size="sm" onClick={() => { setFiles([]); setResults([]); setSheetNames([]); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
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
                      <div className="w-24 h-24 rounded-full border-4 border-emerald-500/10" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                    <FileSpreadsheet className="h-8 w-8 text-emerald-500 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Extrapolating Data Vectors</h3>
                    <Progress value={progress} className="h-2 rounded-full" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Vectorized</p>
                  </div>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="flex-1 overflow-hidden">
                <ResultView results={results} onReset={() => { setFiles([]); setResults([]); setSheetNames([]); }} />
              </div>
            ) : (
              <div className="flex-1 flex flex-row overflow-hidden">
                {/* LEFT PANEL: File Manifest */}
                <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                  <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                    <FileBox className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-6 space-y-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-emerald-500/30 transition-all">
                          <div className="h-12 w-10 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
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
                  <div className="w-full max-w-4xl space-y-8">
                    {/* Configuration Map */}
                    <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
                      <div className="p-6 border-b border-border bg-secondary/5">
                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                          <Settings className="h-4 w-4 text-emerald-500" />
                          Engine Parameters
                        </h3>
                      </div>
                      <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Orientation Profile */}
                        <div className="space-y-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Layout Matrix</label>
                            <h4 className="text-lg font-black uppercase tracking-tighter">Page Orientation</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {['landscape', 'portrait'].map((o) => (
                              <button key={o} onClick={() => setOrientation(o)}
                                className={cn(
                                  "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group",
                                  orientation === o ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-card/50 hover:border-emerald-500/30"
                                )}>
                                <Layout className={cn("h-8 w-8 transition-transform group-hover:scale-110", orientation === o ? "text-emerald-500" : "text-muted-foreground")} style={{ transform: o === 'landscape' ? 'rotate(90deg)' : 'none' }} />
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", orientation === o ? "text-emerald-500" : "text-muted-foreground")}>{o}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sheet Selection */}
                        <div className="space-y-6">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Source Select</label>
                            <h4 className="text-lg font-black uppercase tracking-tighter">Workbook Sheets</h4>
                          </div>
                          {sheetNames.length > 1 ? (
                            <div className="space-y-4">
                              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                                <SelectTrigger className="h-14 rounded-2xl border-2 border-border bg-card font-black uppercase tracking-widest text-xs">
                                  <SelectValue placeholder="Unified Stream" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="all" className="text-xs font-bold uppercase">All Sheets Unified</SelectItem>
                                  {sheetNames.map(name => (
                                    <SelectItem key={name} value={name} className="text-xs font-bold uppercase">{name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase leading-relaxed text-center">
                                Multi-sheet detected. Selecting 'Unified' will merge all sheets into a single document flow.
                              </div>
                            </div>
                          ) : (
                            <div className="h-14 flex items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Single Stream Detected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ready State */}
                    <div className="flex justify-center">
                      <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for {files.length} documents · {orientation} layout</span>
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
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Convert v4.0.0</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest uppercase">Target Buffer: PDF</span>
              </div>
            </div>
          </div>
        )}

        {files.length === 0 && (
          <div className="mt-5">
            <FileUpload
              accept=".xls,.xlsx"
              files={files}
              onFilesChange={handleFilesChange}
              multiple
              label="Select Excel files to convert"

            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default ExcelToPdf;

