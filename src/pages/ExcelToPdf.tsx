import { useState, useCallback, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { FileSpreadsheet, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Upload, Trash2, Plus, RefreshCw, Settings, Layout, Layers, Info, Zap, X, RectangleVertical, RectangleHorizontal, Scan, Maximize } from "lucide-react";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import BatchProcessingView, { BatchProcessingResult } from "@/components/BatchProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { convertExcelToPdf, mergeExcelPdfs, getExcelMetadata, ExcelConversionOptions, ExcelMetadata } from "@/lib/excelToPdfEngine";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

interface FileWithMetadata {
  file: File;
  metadata?: ExcelMetadata;
  selectedSheets: string[];
}

const ExcelToPdf = () => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversion Options
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [pageSize, setPageSize] = useState<"A4" | "letter" | "original">("original");
  const [scaling, setScaling] = useState<"fit" | "actual">("fit");
  const [mergeFiles, setMergeFiles] = useState(false);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilesChange = async (newFiles: File[]) => {
    const validFiles: FileWithMetadata[] = [];
    
    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xls' || ext === 'xlsx') {
        const metadata = await getExcelMetadata(file);
        validFiles.push({ 
          file, 
          metadata, 
          selectedSheets: [...metadata.sheetNames] // Default to all sheets
        });
      } else {
        toast.error(`Unsupported file: ${file.name}. This tool supports XLS and XLSX files only.`);
      }
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  const toggleSheet = (fileIdx: number, sheetName: string) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const selected = [...newFiles[fileIdx].selectedSheets];
      if (selected.includes(sheetName)) {
        if (selected.length > 1) {
          newFiles[fileIdx].selectedSheets = selected.filter(s => s !== sheetName);
        } else {
          toast.error("At least one sheet must be selected.");
        }
      } else {
        newFiles[fileIdx].selectedSheets = [...selected, sheetName];
      }
      return newFiles;
    });
  };

  // processItem for BatchProcessingView
  const processItem = useCallback(async (file: File, onProgress: (p: number) => void): Promise<BatchProcessingResult> => {
    const item = files.find(f => f.file === file);
    const options: ExcelConversionOptions = {
      pageOrientation: orientation,
      pageSize,
      scaling,
      selectedSheets: item?.selectedSheets || []
    };
    onProgress(30);
    const pdfBlob = await convertExcelToPdf(file, options);
    onProgress(100);
    return {
      blob: pdfBlob,
      filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf"
    };
  }, [files, orientation, pageSize, scaling]);

  const initiateConvert = () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
  };

  return (
    <ToolLayout
      title="Excel to PDF"
      description="Convert Excel spreadsheets to professional PDF format with layout preservation"
      category="convert"
      icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="Excel to PDF Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert Excel spreadsheets (XLSX, XLS) to high-quality PDF online. Preserve table formatting, colors, and data. Fast, secure, and professional."
      toolId="excel-to-pdf"
      hideHeader={files.length > 0 || results.length > 0 || processing}
      className="excel-to-pdf-page"
    >
      <style>{`
        .excel-to-pdf-page h1, 
        .excel-to-pdf-page h2, 
        .excel-to-pdf-page h3,
        .excel-to-pdf-page span,
        .excel-to-pdf-page button,
        .excel-to-pdf-page p,
        .excel-to-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">

          {processing ? (
            <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
              <BatchProcessingView
                files={files.map(f => f.file)}
                title="Converting Excel Files..."
                hideZip={mergeFiles}
                processItem={processItem}
                onReset={() => { setProcessing(false); setFiles([]); setResults([]); }}
                onComplete={async (batchResults) => {
                  if (mergeFiles && batchResults.length > 1) {
                    toast.info("Merging workbooks...");
                    try {
                      const mergedBlob = await mergeExcelPdfs(batchResults.map(r => r.blob));
                      setProcessing(false);
                      setResults([{
                        file: mergedBlob,
                        url: URL.createObjectURL(mergedBlob),
                        filename: "merged_workbook.pdf"
                      }]);
                    } catch (e) {
                      toast.error("Failed to merge workbooks.");
                    }
                  }
                }}
              />
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Thumbnails Grid (Small Window Preview) */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {files.map((item, idx) => (
                        <div key={idx} className="group flex flex-col gap-3 p-4 bg-background border border-border hover:border-primary/50 rounded-2xl transition-all duration-200 text-left relative shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="h-14 w-12 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-center relative shrink-0">
                              <FileSpreadsheet className="h-7 w-7 text-red-500" />
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-bold px-1 rounded-sm uppercase tracking-tighter">XLSX</div>
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate">{item.file.name}</p>
                              <div className="flex items-center gap-3">
                                <p className="text-[9px] font-bold text-primary uppercase">{formatSize(item.file.size)}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.metadata?.sheetNames.length} Sheets</p>
                              </div>
                            </div>
                            <button onClick={() => removeFile(idx)} className="p-2 bg-secondary/50 rounded-xl hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          
                          <div className="space-y-2 mt-2">
                             <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Select Sheets</Label>
                             <div className="flex flex-wrap gap-2">
                               {item.metadata?.sheetNames.map(sheet => (
                                 <button
                                   key={sheet}
                                   onClick={() => toggleSheet(idx, sheet)}
                                   className={cn(
                                     "px-3 py-1.5 rounded-lg border text-[9px] font-bold transition-all uppercase tracking-tighter",
                                     item.selectedSheets.includes(sheet) 
                                       ? "border-red-500/50 bg-red-500/5 text-red-600 shadow-sm" 
                                       : "border-border bg-secondary/20 text-muted-foreground hover:border-red-500/30"
                                   )}
                                 >
                                   {sheet}
                                 </button>
                               ))}
                             </div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-full min-h-[160px] border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="h-8 w-8" />
                        Add More Workbook
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".xls,.xlsx" onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))} />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT PANEL: Workbench Settings */}
              <div className="flex-1 bg-secondary/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:pt-8 lg:pb-12 lg:px-12">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-2xl">
                          <FileSpreadsheet className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none text-red-600">Excel to PDF</h4>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Orientation */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Orientation</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'portrait', label: 'Portrait', icon: RectangleVertical },
                              { id: 'landscape', label: 'Landscape', icon: RectangleHorizontal }
                            ].map((o) => (
                              <button 
                                key={o.id}
                                onClick={() => setOrientation(o.id as any)}
                                className={cn(
                                  "h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest transition-all",
                                  orientation === o.id ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                <o.icon className="h-4 w-4" /> {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Paper Format */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Paper Format</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {["Original", "A4", "Letter"].map((size) => (
                              <button
                                key={size}
                                onClick={() => setPageSize(size.toLowerCase() as any)}
                                className={cn(
                                  "h-12 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                  pageSize === size.toLowerCase() ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Scaling */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Sheet Scaling</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'fit', label: 'Fit to Page', icon: Maximize },
                              { id: 'actual', label: 'Actual Size', icon: Scan }
                            ].map((s) => (
                              <button
                                key={s.id}
                                onClick={() => setScaling(s.id as any)}
                                className={cn(
                                  "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                  scaling === s.id ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                <s.icon className="h-4 w-4" /> {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Merge Toggle */}
                        {files.length > 1 && (
                          <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-2xl border border-border/50 group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                              <Layers className="h-4 w-4 text-red-500" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Merge Power-Mode</span>
                                <span className="text-[9px] font-medium text-muted-foreground uppercase mt-0.5">Combine all workbooks into one high-res PDF</span>
                              </div>
                            </div>
                            <Switch checked={mergeFiles} onCheckedChange={setMergeFiles} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="mt-auto p-6 lg:px-12 bg-background border-t border-border shrink-0">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full">
                    <Button 
                      size="lg" 
                      onClick={initiateConvert} 
                      className="w-full h-16 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:shadow-red-500/40 bg-red-600 hover:bg-red-700 transition-all gap-4 group"
                    >
                      Initiate Synthesis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && !processing && results.length === 0 && (
          <div className="mt-10 text-center">
            <FileUpload accept=".xls,.xlsx" files={[]} onFilesChange={handleFilesChange} label="Select Excel files to convert" multiple />
          </div>
        )}
      </div>
      <ToolSeoSection
        toolName="Excel to PDF Converter"
        category="convert"
        intro="MagicDocx Excel to PDF converter transforms your complex spreadsheets (XLS, XLSX) into professional, high-fidelity PDF documents. Our precision engine preserves table formatting, colors, and row alignment with pixel-perfect accuracy. Support for multi-sheet selection, scaling options, and document merging makes it the ultimate professional utility for high-resolution financial reports and data synthesis."
        steps={[
          "Upload one or more Excel files (XLS or XLSX) to the secure workspace.",
          "Select specific sheets to convert or export the entire workbook.",
          "Configure page layout including orientation, scaling, and paper format in the workbench.",
          "Toggle the 'Merge' option if you wish to combine multiple workbooks into a single PDF.",
          "Click 'Initiate Synthesis' and download your professional-grade PDF instantly."
        ]}
        formats={["XLS", "XLSX", "PDF"]}
        relatedTools={[
          { name: "PDF to Excel", path: "/pdf-to-excel", icon: FileSpreadsheet },
          { name: "Word to PDF", path: "/word-to-pdf", icon: FileSpreadsheet },
          { name: "Merge PDF", path: "/merge-pdf", icon: FileSpreadsheet },
          { name: "Compress PDF", path: "/compress-pdf", icon: FileSpreadsheet },
        ]}
        schemaName="Excel to PDF Converter Online"
        schemaDescription="Free online Excel to PDF converter. Convert XLS and XLSX spreadsheets to high-fidelity PDF with formatting, tables, and structure preserved."
      />
    </ToolLayout>
  );
};

export default ExcelToPdf;

