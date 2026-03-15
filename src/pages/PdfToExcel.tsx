import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import { FileSpreadsheet, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileText, Upload, Plus } from "lucide-react";
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
import { useEffect, useRef } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles } from "lucide-react";
import Tesseract from "tesseract.js";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface FileData {
  file: File;
  previewUrl: string;
  pageCount: number;
}

const PdfToExcel = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileDataList, setFileDataList] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [outputFormat, setOutputFormat] = useState("xlsx"); // xlsx or csv
  const [statusText, setStatusText] = useState("Analyzing structure...");
  const [showOcrModal, setShowOcrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  useEffect(() => {
    if (files.length > 0 && results.length === 0 && !processing) {
      loadFilePreviews(files);
      // Removed automatic conversion as per user request
    } else if (files.length === 0) {
      setFileDataList([]);
    }
  }, [files]);

  const resetAll = () => {
    setFiles([]);
    setFileDataList([]);
    setResults([]);
    setProcessing(false);
    setProgress(0);
    setStatusText("Analyzing structure...");
  };

  const loadFilePreviews = async (newFiles: File[]) => {
    const newData: FileData[] = [];
    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          const previewUrl = canvas.toDataURL("image/jpeg", 0.8);
          newData.push({ file, previewUrl, pageCount: pdf.numPages });
        }
      } catch (err) {
        console.error("Error generating preview:", err);
        newData.push({ file, previewUrl: "", pageCount: 0 });
      }
    }
    setFileDataList(newData);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileDataList(prev => prev.filter((_, i) => i !== index));
  };

  const detectScanned = async (file: File): Promise<boolean> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const checkPages = Math.min(pdf.numPages, 3);
      let hasText = false;
      for (let i = 1; i <= checkPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.length > 0) {
          hasText = true;
          break;
        }
      }
      return !hasText;
    } catch (e) {
      return false;
    }
  };

  const cleanCellValue = (val: string) => {
    let clean = val.trim();
    if (!clean) return "";

    // Remove random line breaks within cell
    clean = clean.replace(/\n+/g, " ");

    // Remove duplicated spaces
    clean = clean.replace(/\s+/g, " ");

    // Numeric detection
    // Remove common currency symbols and commas for testing numeric state
    const numericTest = clean.replace(/[$,€,£]/g, "").replace(/,/g, "");
    if (numericTest && !isNaN(Number(numericTest))) {
      return Number(numericTest);
    }

    // Date detection (basic)
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(clean)) {
      const date = new Date(clean);
      if (!isNaN(date.getTime())) return date;
    }

    return clean;
  };

  const convert = async (applyOcr = false, skipOcr = false) => {
    if (files.length === 0) return;

    // Detection phase
    if (!applyOcr && !skipOcr) {
      const isScanned = await detectScanned(files[0]);
      if (isScanned) {
        setShowOcrModal(true);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);
    setStatusText(applyOcr ? "Running OCR..." : "Extracting tables...");

    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const wb = XLSX.utils.book_new();
      let totalRows = 0;

      for (let i = 1; i <= pdf.numPages; i++) {
        setStatusText(applyOcr ? `Processing page ${i} (OCR)...` : `Processing page ${i}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        let pageData: any[][] = [];

        if (applyOcr) {
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport }).promise;

          const result = (await Tesseract.recognize(canvas.toDataURL("image/png"))) as any;
          const lines = result.data.lines || [];
          pageData = lines.map((line: any) => {
            // Split line into words and group by horizontal proximity
            const words = line.words || [];
            const cells: string[] = [];
            if (words.length > 0) {
              let currentCell = words[0].text;
              for (let k = 1; k < words.length; k++) {
                const gap = words[k].bbox.x0 - words[k - 1].bbox.x1;
                if (gap > 20) {
                  cells.push(currentCell);
                  currentCell = words[k].text;
                } else {
                  currentCell += " " + words[k].text;
                }
              }
              cells.push(currentCell);
            }
            return cells.map(c => cleanCellValue(c));
          });
        } else {
          const content = await page.getTextContent();
          const items = content.items as any[];

          // Improved Spatial Grouping for Tables
          // 1. Group by Y (Rows)
          const rowsMap: Map<number, any[]> = new Map();
          items.forEach(item => {
            const y = Math.round(item.transform[5]);
            // Use a small tolerance for Y coordinates (line height heuristic)
            let foundY = Array.from(rowsMap.keys()).find(ry => Math.abs(ry - y) < 5);
            if (foundY === undefined) {
              rowsMap.set(y, [item]);
            } else {
              rowsMap.get(foundY)!.push(item);
            }
          });

          // 2. Sort Rows by Y descending
          const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);

          // 3. Extract columns from all rows to build a grid
          const allX: number[] = [];
          items.forEach(it => allX.push(it.transform[4]));
          allX.sort((a, b) => a - b);

          // Cluster X coordinates to find column boundaries
          const columnBoundaries: number[] = [];
          if (allX.length > 0) {
            columnBoundaries.push(allX[0]);
            for (let k = 1; k < allX.length; k++) {
              if (allX[k] - allX[k - 1] > 20) { // Column gap threshold
                columnBoundaries.push(allX[k]);
              }
            }
          }

          pageData = sortedY.map(y => {
            const rowItems = rowsMap.get(y)!.sort((a, b) => a.transform[4] - b.transform[4]);
            const row: any[] = new Array(columnBoundaries.length).fill("");

            rowItems.forEach(item => {
              const x = item.transform[4];
              // Find the closest column index
              let colIdx = columnBoundaries.findIndex((cb, idx) => {
                const nextCb = columnBoundaries[idx + 1] || Infinity;
                return x >= cb - 5 && x < nextCb - 5;
              });
              if (colIdx === -1) colIdx = 0;

              row[colIdx] = (String(row[colIdx]) + " " + item.str).trim();
            });
            return row.map(cell => cleanCellValue(String(cell)));
          }).filter(r => r.some(cell => cell.toString().length > 0));
        }

        if (pageData.length > 0) {
          const ws = XLSX.utils.aoa_to_sheet(pageData);
          // Set column widths based on max content
          const maxWidths = pageData[0].map((_, colIdx) => ({
            wch: Math.max(...pageData.map(row => (row[colIdx] || "").length)) + 5
          }));
          ws['!cols'] = maxWidths;

          XLSX.utils.book_append_sheet(wb, ws, `Page ${i}`);
          totalRows += pageData.length;
        }

        setProgress(Math.round((i / pdf.numPages) * 100));
      }

      let blob: Blob;
      let extension = outputFormat === "csv" ? ".csv" : ".xlsx";

      if (outputFormat === "csv") {
        // Combine all sheets into one CSV content
        let csvContent = "";
        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          csvContent += XLSX.utils.sheet_to_csv(ws) + "\n\n";
        });
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      } else {
        const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        blob = new Blob([xlsxBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      }

      const url = URL.createObjectURL(blob);
      const filename = files[0].name.replace(/\.pdf$/i, "") + "_converted" + extension;

      setResults([{ file: blob, url, filename }]);

      // Auto-download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      toast.success(`Successfully converted ${pdf.numPages} pages!`);
    } catch (error) {
      console.error(error);
      toast.error("Conversion failed");
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
      {results.length > 0 ? (
        <ResultView
          results={results}
          hideShare={true}
          hideIndividualDownload={true}
          onReset={resetAll}
        />
      ) : processing ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-secondary/5 min-h-[60vh]">
          <div className="w-full max-w-lg space-y-8 text-center">
            <div className="relative flex justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-red-500/20 border-t-red-600 animate-spin" />
              <FileSpreadsheet className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground">{statusText}</h3>
              <Progress value={progress} className="h-3 rounded-full bg-secondary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tabular-nums">{progress}% Complete</p>
            </div>
          </div>
        </div>
      ) : files.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-display">
          {/* Left Panel: Preview Area (Thumbnail Grid) - 70% Width */}
          <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="h-8 w-8 p-0 rounded-full hover:bg-secondary/20 font-black italic"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                <div className="flex items-center gap-2 text-left">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{files.length} Files</span>
                </div>
              </div>

              <input type="file" ref={fileInputRef} onChange={handleAddFiles} accept=".pdf" multiple className="hidden" />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {fileDataList.map((fd, idx) => (
                    <div key={idx} className="group flex flex-col gap-2 p-2 bg-background border border-border hover:border-red-500/50 rounded-xl transition-all duration-200 text-left relative">
                      <div className="aspect-[3/4] w-full bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-border/10">
                        {fd.previewUrl ? (
                          <img src={fd.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        ) : (
                          <FileSpreadsheet className="h-8 w-8 text-muted-foreground/30" />
                        )}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button onClick={() => removeFile(idx)} className="p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:text-destructive transition-colors shadow-sm border border-border/50">
                            <Plus className="h-3 w-3 rotate-45" />
                          </button>
                        </div>
                        <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase text-muted-foreground">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="px-1 min-w-0">
                        <p className="text-[9px] font-black text-foreground uppercase tracking-tight truncate">{fd.file.name}</p>
                        <p className="text-[8px] font-black text-red-600 uppercase">{formatSize(fd.file.size)}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] border-2 border-dashed border-border hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 hover:bg-red-500/5 transition-all outline-none focus:ring-2 focus:ring-red-500/20"
                  >
                    <Plus className="h-5 w-5" />
                    Add More
                  </button>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Settings Sidebar - 30% Width */}
          <div className="flex-1 lg:w-[30%] bg-secondary/10 flex flex-col overflow-hidden relative">
            <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground font-heading">PDF to Excel</h2>
                </div>

                <div className="space-y-8 px-1">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Output Format</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'xlsx', label: 'Standard Excel', desc: 'Preserves layout and formatting.', ext: '.xlsx', icon: <FileSpreadsheet className="h-4 w-4" /> },
                        { id: 'csv', label: 'CSV Format', desc: 'Raw data for any application.', ext: '.csv', icon: <FileText className="h-4 w-4" /> }
                      ].map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setOutputFormat(format.id)}
                          className={cn(
                            "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group",
                            outputFormat === format.id ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30"
                          )}
                        >
                          <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", outputFormat === format.id ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                            {format.icon}
                          </div>
                          <div className="flex-1">
                            <p className={cn("text-xs font-black uppercase tracking-widest", outputFormat === format.id ? "text-red-600" : "text-foreground")}>{format.label}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 leading-tight">{format.desc}</p>
                          </div>
                          {outputFormat === format.id && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 text-center">XLSX and CSV generated automatically.</span>
                  </div>

                  <Button
                    onClick={() => convert()}
                    disabled={processing}
                    className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {processing ? statusText : "Convert to EXCEL"}
                    <ArrowRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 text-center">
          <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to extract data from" />
        </div>
      )}

      <AlertDialog open={showOcrModal} onOpenChange={setShowOcrModal}>
        <AlertDialogContent className="max-w-md rounded-3xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-center">
              You are trying to convert a scanned PDF
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-4 space-y-4">
              <p className="text-sm font-bold text-foreground">
                To extract data from scanned documents, OCR is required.
                Premium users can convert scanned PDFs to editable Excel files using OCR.
              </p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider italic">
                Otherwise, the content extraction may be inaccurate or empty.
              </p>
              <p className="text-sm font-black uppercase tracking-widest pt-4">
                Do you want to apply OCR?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
              onClick={() => {
                setShowOcrModal(false);
                convert(false, true); // Continue without OCR
              }}
            >
              Continue without OCR
            </Button>
            <AlertDialogAction asChild>
              <Button
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                onClick={() => {
                  setShowOcrModal(false);
                  convert(true, false); // Apply OCR
                }}
              >
                Apply OCR
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ToolLayout>
  );
};

export default PdfToExcel;
