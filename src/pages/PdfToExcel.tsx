import { useState } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
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
import { saveAs } from "file-saver";

import { convertPdfToExcel } from "@/lib/pdfToExcelEngine";

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
  const [outputFormat, setOutputFormat] = useState<"xlsx" | "csv">("xlsx");
  const [statusText, setStatusText] = useState("Analyzing structure...");
  const [showOcrModal, setShowOcrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  useEffect(() => {
    if (files.length > 0 && results.length === 0 && !processing) {
      loadFilePreviews(files);
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

  const convert = async (applyOcr = false) => {
    if (files.length === 0) return;

    if (!applyOcr) {
      const isScanned = await detectScanned(files[0]);
      if (isScanned) {
        setShowOcrModal(true);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);

    try {
      const blob = await convertPdfToExcel(files[0], {
        outputFormat,
        useOcr: applyOcr,
        ocrLang: "eng"
      }, (p, s) => {
        setProgress(p);
        setStatusText(s);
      });

      const url = URL.createObjectURL(blob);
      const filename = files[0].name.replace(/\.pdf$/i, "") + "_converted" + (outputFormat === "xlsx" ? ".xlsx" : ".csv");

      setResults([{ file: blob, url, filename }]);
      saveAs(blob, filename);

      toast.success(`Successfully converted!`);
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
      metaTitle="PDF to Excel Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Extract tables and data from PDF to Excel or CSV online for free. Accurate PDF to spreadsheet conversion with OCR support. No sign-up required."
      toolId="pdf-to-excel"
      hideHeader={files.length > 0 || processing || results.length > 0}
      className="pdf-to-excel-page"
    >
      <style>{`
        .pdf-to-excel-page h1, 
        .pdf-to-excel-page h2, 
        .pdf-to-excel-page h3,
        .pdf-to-excel-page span,
        .pdf-to-excel-page button,
        .pdf-to-excel-page p,
        .pdf-to-excel-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>
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
                  <h2 className="text-2xl font-bold uppercase tracking-tighter text-foreground font-heading">PDF to Excel</h2>
                </div>

                <div className="space-y-8 px-1">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Output Format</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'xlsx', label: 'Standard Excel', desc: 'Preserves layout and formatting.', ext: '.xlsx', icon: <FileSpreadsheet className="h-4 w-4" /> },
                        { id: 'csv', label: 'CSV Format', desc: 'Raw data for any application.', ext: '.csv', icon: <FileText className="h-4 w-4" /> }
                      ].map((format) => (
                        <button
                          key={format.id}
                          onClick={() => setOutputFormat(format.id as "xlsx" | "csv")}
                          className={cn(
                            "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group",
                            outputFormat === format.id ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30"
                          )}
                        >
                          <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", outputFormat === format.id ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                            {format.icon}
                          </div>
                          <div className="flex-1">
                            <p className={cn("text-xs font-bold uppercase tracking-widest", outputFormat === format.id ? "text-red-600" : "text-foreground")}>{format.label}</p>
                            <p className="text-[9px] font-semibold text-muted-foreground uppercase mt-1 leading-tight">{format.desc}</p>
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
                    className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
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
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-tighter text-center">
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
              <p className="text-sm font-bold uppercase tracking-widest pt-4">
                Do you want to apply OCR?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2"
              onClick={() => {
                setShowOcrModal(false);
                convert(); // Continue without OCR
              }}
            >
              Continue without OCR
            </Button>
            <AlertDialogAction asChild>
              <Button
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-red-500/20"
                onClick={() => {
                  setShowOcrModal(false);
                  convert(true); // Apply OCR
                }}
              >
                Apply OCR
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToolSeoSection
        toolName="PDF to Excel Converter"
        category="convert"
        intro="MagicDocx PDF to Excel converter intelligently extracts tables, data, and numerical content from any PDF file and converts them into structured Excel spreadsheets or CSV files. Whether you're pulling data from financial reports, invoices, or scanned forms, our tool uses smart spatial analysis and optional OCR to deliver clean, accurate results in XLSX or CSV format — instantly and for free."
        steps={[
          "Upload a PDF containing tables or data by dragging and dropping or clicking the upload area.",
          "Choose your output format: Standard Excel (XLSX) or CSV for universal compatibility.",
          "Click \"Convert to EXCEL\" — our engine extracts and structures the data.",
          "Download your spreadsheet immediately."
        ]}
        formats={["PDF", "XLSX", "CSV"]}
        relatedTools={[
          { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          { name: "PDF to PPT", path: "/pdf-to-ppt", icon: FileText },
          { name: "Merge PDF", path: "/merge-pdf", icon: FileText },
          { name: "Compress PDF", path: "/compress-pdf", icon: FileSpreadsheet },
        ]}
        schemaName="PDF to Excel Converter Online"
        schemaDescription="Free online PDF to Excel converter. Extract tables and data from PDF files to XLSX or CSV with OCR support."
      />
    </ToolLayout>
  );
};

export default PdfToExcel;
