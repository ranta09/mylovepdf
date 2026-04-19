import { useState, useCallback, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { FileText, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Upload, Trash2, Plus, RefreshCw, Settings, Layout, Layers, Info, Zap, X, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ProcessingView from "@/components/ProcessingView";
import BatchProcessingView from "@/components/BatchProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { convertWordToPdf, mergePdfBlobs, WordConversionOptions, getDocxMetadata, ConversionMetadata } from "@/lib/wordToPdfEngine";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

interface FileWithMetadata {
  file: File;
  metadata?: ConversionMetadata;
}

const WordToPdf = () => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversion Options
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"A4" | "letter" | "original">("A4");
  const [mergeFiles, setMergeFiles] = useState(false);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    const validFiles: FileWithMetadata[] = [];
    
    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'doc' || ext === 'docx') {
        const metadata = await getDocxMetadata(file);
        validFiles.push({ file, metadata });
      } else {
        toast.error(`Unsupported file: ${file.name}. This tool supports DOC and DOCX files only.`);
      }
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const initiateConversion = () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
  };

  return (
    <ToolLayout
      title="Word to PDF"
      description="Convert Word documents to professional PDF format with layout preservation"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="Word to PDF Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert Word documents (DOC, DOCX) to high-quality PDF online. Preserve formatting, tables, and images. Fast, secure, and professional."
      toolId="word-to-pdf"
      hideHeader={files.length > 0 || results.length > 0 || processing}
      className="word-to-pdf-page"
    >
      <style>{`
        .word-to-pdf-page h1, 
        .word-to-pdf-page h2, 
        .word-to-pdf-page h3,
        .word-to-pdf-page span,
        .word-to-pdf-page button,
        .word-to-pdf-page p,
        .word-to-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">

          {processing ? (
             <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur-md overflow-y-auto p-6">
                <BatchProcessingView
                    files={files.map(f => f.file)}
                    title="Converting Documents..."
                    hideZip={mergeFiles}
                    onReset={() => {
                        setProcessing(false);
                        setFiles([]);
                        setResults([]);
                    }}
                    processItem={async (file, onProgress) => {
                        const options: WordConversionOptions = {
                            pageOrientation: orientation,
                            pageSize,
                            mergeFiles
                        };
                        onProgress(50);
                        const pdfBlob = await convertWordToPdf(file, options);
                        return { blob: pdfBlob, filename: file.name.replace(/\.[^/.]+$/, ".pdf") };
                    }}
                    onComplete={async (resultsData) => {
                        if (mergeFiles && resultsData.length > 1) {
                            toast.info("Merging documents...");
                            try {
                               const mergedBlob = await mergePdfBlobs(resultsData.map(r => r.blob));
                               setProcessing(false);
                               setResults([{
                                   file: mergedBlob,
                                   url: URL.createObjectURL(mergedBlob),
                                   filename: "merged_documents.pdf"
                               }]);
                            } catch (e) {
                               toast.error("Failed to merge documents.");
                            }
                        } else if (mergeFiles) {
                           setProcessing(false);
                           setResults([{
                                   file: resultsData[0].blob,
                                   url: URL.createObjectURL(resultsData[0].blob),
                                   filename: resultsData[0].filename
                           }]);
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
              {/* LEFT SIDE: Thumbnails Grid (Small Window Preview) - Aligned with Compress PDF */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {files.map((item, idx) => (
                        <div key={idx} className="group flex flex-col gap-2 p-2 bg-background border border-border hover:border-primary/50 rounded-xl transition-all duration-200 text-left relative">
                          <div className="aspect-[3/4] w-full bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-border/10">
                            <div className="h-16 w-12 bg-blue-500/10 rounded-md border border-blue-500/20 flex items-center justify-center relative">
                              <FileText className="h-8 w-8 text-blue-500" />
                              <div className="absolute top-1 left-1 bg-blue-500 text-white text-[6px] font-bold px-1 rounded-sm uppercase">DOCX</div>
                            </div>
                            
                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={() => removeFile(idx)} className="p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:text-destructive transition-colors shadow-sm border border-border/50"><X className="h-3 w-3" /></button>
                            </div>
                            <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase text-muted-foreground">
                              {idx + 1}
                            </div>
                          </div>
                          
                          <div className="px-1 min-w-0 space-y-0.5">
                            <p className="text-[9px] font-bold text-foreground uppercase tracking-tight truncate">{item.file.name}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] font-bold text-primary uppercase">{formatSize(item.file.size)}</p>
                              {item.metadata?.pageCount && (
                                <p className="text-[8px] font-bold text-muted-foreground uppercase">{item.metadata.pageCount}P</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[3/4] border-2 border-dashed border-border hover:border-primary/50 rounded-xl flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="h-5 w-5" />
                        Add More
                      </button>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT PANEL: Workbench Settings - Aligned with Compress PDF */}
              <div className="flex-1 bg-secondary/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:pt-8 lg:pb-12 lg:px-12">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none">Word to PDF</h4>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Orientation */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Orientation</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setOrientation("portrait")}
                              className={cn(
                                "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                orientation === "portrait" ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-border bg-background text-muted-foreground hover:border-primary/20"
                              )}
                            >
                              <RectangleVertical className="h-4 w-4" /> Portrait
                            </button>
                            <button 
                              onClick={() => setOrientation("landscape")}
                              className={cn(
                                "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                orientation === "landscape" ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-border bg-background text-muted-foreground hover:border-primary/20"
                              )}
                            >
                              <RectangleHorizontal className="h-4 w-4" /> Landscape
                            </button>
                          </div>
                        </div>


                        {/* Merge Toggle */}
                        {files.length > 1 && (
                          <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-2xl border border-border/50 group hover:border-primary/30 transition-all">
                            <div className="flex items-center gap-3">
                              <Layers className="h-4 w-4 text-primary" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Merge Power-Mode</span>
                                <span className="text-[9px] font-medium text-muted-foreground uppercase mt-0.5">Combine all files into one high-res PDF</span>
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
                      onClick={initiateConversion} 
                      className="w-full h-16 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all gap-4 group"
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

      {files.length === 0 && !processing && results.length === 0 && (
        <ToolUploadScreen
          title="Word to PDF"
          description="Convert Word documents to professional PDF format"
          buttonLabel="Select Word files"
          accept=".doc,.docx"
          multiple={true}
          onFilesSelected={handleFilesChange}
        />
      )}
      {files.length === 0 && results.length === 0 && !processing && (
        <ToolSeoSection
          toolName="Word to PDF Converter"
          category="convert"
          intro="MagicDocx Word to PDF converter turns your Microsoft Word documents (DOC and DOCX) into professional, high-fidelity PDF files. Our premium engine ensures that your original formatting, images, tables, and typography are preserved with pixel-perfect accuracy. Support for multi-file processing and document merging makes it the ultimate professional utility for high-resolution, print-ready PDF generation."
          steps={[
            "Upload one or more Word files (DOC or DOCX) to the secure workspace.",
            "Configure your preferences including page size and orientation in the workbench.",
            "Toggle the 'Merge' option if you wish to combine multiple documents into a single PDF.",
            "Click 'Initiate Conversion' and download your professional-grade PDF instantly."
          ]}
          formats={["DOC", "DOCX", "PDF"]}
          relatedTools={[
            { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
            { name: "Excel to PDF", path: "/excel-to-pdf", icon: FileText },
            { name: "Merge PDF", path: "/merge-pdf", icon: FileText },
            { name: "Compress PDF", path: "/compress-pdf", icon: FileText },
          ]}
          schemaName="Word to PDF Converter Online"
          schemaDescription="Free online Word to PDF converter. Convert DOC and DOCX files to high-fidelity PDF with formatting, fonts, and structure preserved."
        />
      )}
    </ToolLayout>
  );
};

export default WordToPdf;
