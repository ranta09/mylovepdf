import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileBox, CheckCircle2, ArrowRight, Download, Share2, Upload, Settings, Layout, Layers } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      hideHeader
    >
      <ToolHeader
        title="Excel to PDF"
        description="Convert XLSX, XLS, and CSV spreadsheets to PDF"
        icon={<FileSpreadsheet className="h-5 w-5 text-primary-foreground" />}
      />

      <div className="mt-5">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload
              accept=".xls,.xlsx"
              files={files}
              onFilesChange={handleFilesChange}
              multiple
              label="Select Excel files to convert"
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
              <FileSpreadsheet className="h-8 w-8 text-primary absolute animate-pulse" />
            </div>

            <h3 className="text-2xl font-bold mb-2">Converting Spreadsheet...</h3>
            <div className="w-full bg-secondary rounded-full h-3 mb-4 overflow-hidden mt-6">
              <div
                className="bg-primary h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">Generating high-quality PDF document</p>
          </div>
        ) : results.length > 0 ? (
          <ResultView
            results={results}
            onReset={() => {
              setFiles([]);
              setResults([]);
              setSheetNames([]);
            }}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 bg-secondary/30 rounded-3xl p-6 lg:p-8 border border-border">
            {/* LEFT PANEL: FILE LIST */}
            <div className="flex-1 space-y-6">
              <div className="bg-card border border-border shadow-sm rounded-2xl p-6 h-full min-h-[500px] flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <FileBox className="h-5 w-5 text-primary" />
                  Files to Convert
                </h2>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-secondary/50 p-3 rounded-xl border border-border group hover:border-primary/30 transition-colors">
                      <div className="w-20 h-24 bg-card shadow-sm rounded-md border border-border/50 overflow-hidden shrink-0 flex items-center justify-center bg-emerald-50">
                        <FileSpreadsheet className="h-8 w-8 text-emerald-600/40" />
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

            {/* RIGHT PANEL: SETTINGS */}
            <div className="w-full lg:w-[420px] shrink-0 space-y-6">
              <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none -z-0"></div>

                <h2 className="text-xl font-bold mb-2 relative z-10">Conversion Settings</h2>
                <p className="text-sm text-muted-foreground mb-6 relative z-10">Customize how your table will appear in the PDF.</p>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Layout className="h-4 w-4 text-primary" /> Page Orientation
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {['landscape', 'portrait'].map((o) => (
                        <button
                          key={o}
                          onClick={() => setOrientation(o)}
                          className={cn(
                            "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold text-sm capitalize",
                            orientation === o
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-background hover:border-primary/30"
                          )}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sheetNames.length > 1 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" /> Select Worksheet
                      </Label>
                      <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                        <SelectTrigger className="h-11 rounded-xl border-2">
                          <SelectValue placeholder="Select worksheet" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sheets</SelectItem>
                          {sheetNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* ESTIMATION PANEL */}
              <div className="bg-card border-2 border-primary/20 shadow-sm rounded-2xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/30"></div>

                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Ready to Convert</h3>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    {orientation}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Spreadsheets:</span>
                    <span className="font-bold text-foreground">{files.length}</span>
                  </div>
                  <div className="flex justify-between items-center bg-secondary/50 -mx-2 px-2 py-1.5 rounded-lg">
                    <span className="text-sm font-bold text-foreground">Target Format:</span>
                    <span className="font-black text-sm text-primary uppercase">PDF Table</span>
                  </div>
                </div>

                <Button
                  onClick={convert}
                  size="lg"
                  className="w-full mt-6 h-12 text-base font-bold shadow-elevated hover:shadow-card-hover transition-all"
                >
                  Convert to PDF <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default ExcelToPdf;

