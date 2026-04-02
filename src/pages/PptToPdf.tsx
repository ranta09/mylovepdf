import { useState, useCallback, useRef, useEffect } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { 
  Presentation, 
  FileBox, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  Upload,
  X,
  Plus,
  Settings,
  RectangleVertical,
  RectangleHorizontal,
  Maximize,
  Scan,
  Layers,
  Layout
} from "lucide-react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import BatchProcessingView, { BatchProcessingResult } from "@/components/BatchProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { 
  convertPptToPdf, 
  getPptMetadata, 
  mergePptPdfs, 
  PptMetadata, 
  PptConversionOptions 
} from "@/lib/pptToPdfEngine";

interface FileWithMetadata {
  file: File;
  metadata?: PptMetadata;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const PptToPdf = () => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversion Options
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "original">("original");
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
      if (ext === 'ppt' || ext === 'pptx') {
        const metadata = await getPptMetadata(file);
        validFiles.push({ file, metadata });
      } else {
        toast.error(`Unsupported file: ${file.name}. This tool supports PPT and PPTX files only.`);
      }
    }
    
    setFiles(prev => [...prev, ...validFiles]);
  };

  // processItem for BatchProcessingView
  const processItem = useCallback(async (file: File, onProgress: (p: number) => void): Promise<BatchProcessingResult> => {
    const options: PptConversionOptions = {
      pageOrientation: orientation,
      pageSize,
      scaling
    };
    onProgress(30);
    const pdfBlob = await convertPptToPdf(file, options);
    onProgress(100);
    return {
      blob: pdfBlob,
      filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf"
    };
  }, [orientation, pageSize, scaling]);

  const initiateConvert = () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
  };

  return (
    <ToolLayout
      title="PowerPoint to PDF"
      description="Convert PowerPoint presentations to high-quality PDF format with slide preservation"
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="PowerPoint to PDF Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert PowerPoint presentations (PPT, PPTX) to high-quality PDF online. Preserve slide layouts, images, and formatting. Fast, secure, and professional."
      toolId="ppt-to-pdf"
      hideHeader={files.length > 0 || results.length > 0 || processing}
      className="ppt-to-pdf-page"
    >
      <style>{`
        .ppt-to-pdf-page h1, 
        .ppt-to-pdf-page h2, 
        .ppt-to-pdf-page h3,
        .ppt-to-pdf-page span,
        .ppt-to-pdf-page button,
        .ppt-to-pdf-page p,
        .ppt-to-pdf-page div {
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
                title="Converting Presentations..."
                hideZip={mergeFiles}
                processItem={processItem}
                onReset={() => { setProcessing(false); setFiles([]); setResults([]); }}
                onComplete={async (batchResults) => {
                  if (mergeFiles && batchResults.length > 1) {
                    toast.info("Merging presentations...");
                    try {
                      const mergedBlob = await mergePptPdfs(batchResults.map(r => r.blob));
                      setProcessing(false);
                      setResults([{
                        file: mergedBlob,
                        url: URL.createObjectURL(mergedBlob),
                        filename: "merged_presentation.pdf"
                      }]);
                    } catch (e) {
                      toast.error("Failed to merge presentations.");
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
              {/* LEFT SIDE: Thumbnails Grid (70%) */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {files.map((item, idx) => (
                        <div key={idx} className="group flex flex-col gap-3 p-4 bg-background border border-border hover:border-primary/50 rounded-2xl transition-all duration-200 text-left relative shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="h-14 w-12 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-center relative shrink-0">
                              <Presentation className="h-7 w-7 text-red-500" />
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-bold px-1 rounded-sm uppercase tracking-tighter">PPTX</div>
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate">{item.file.name}</p>
                              <div className="flex items-center gap-3">
                                <p className="text-[9px] font-bold text-primary uppercase">{formatSize(item.file.size)}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.metadata?.slideCount} Slides</p>
                              </div>
                            </div>
                            <button onClick={() => removeFile(idx)} className="p-2 bg-secondary/50 rounded-xl hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          
                          <div className="aspect-video bg-secondary/20 rounded-xl flex items-center justify-center border border-border/50">
                            <Presentation className="h-8 w-8 text-red-500/20" />
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-full min-h-[160px] border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="h-8 w-8" />
                        Add More Presentation
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".ppt,.pptx" onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))} />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT PANEL: Workbench Settings (30%) */}
              <div className="flex-1 bg-secondary/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:pt-8 lg:pb-12 lg:px-12">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-2xl">
                          <Presentation className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none text-red-600">PowerPoint to PDF</h4>
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
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Slide Scaling</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'fit', label: 'Fit Slide to Page', icon: Maximize },
                              { id: 'actual', label: 'Actual Slide Size', icon: Scan }
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
                                <span className="text-[9px] font-medium text-muted-foreground uppercase mt-0.5">Combine all presentations into one high-res PDF</span>
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

      {files.length === 0 && !processing && results.length === 0 && (
        <ToolUploadScreen
          title="Convert PowerPoint to PDF"
          description="Preserve slide layouts, images, and formatting"
          buttonLabel="Select PowerPoint files"
          accept=".ppt,.pptx"
          multiple={true}
          onFilesSelected={handleFilesChange}
        />
      )}

      <ToolSeoSection
        toolName="PowerPoint to PDF Converter"
        category="convert"
        intro="Transform your presentations into high-quality PDF documents with MagicDocx. Our professional engine preserves slide layouts, images, and formatting perfectly."
        steps={[
          "Upload your PPT or PPTX files to the secure workspace.",
          "Configure page size, orientation, and scaling settings.",
          "Optionally merge multiple presentations into a single PDF.",
          "Click 'Initiate Synthesis' to generate and download your PDF."
        ]}
        formats={["PPT", "PPTX", "PDF"]}
        relatedTools={[
          { name: "PDF to PPT", path: "/pdf-to-ppt", icon: Presentation },
          { name: "Word to PDF", path: "/word-to-pdf", icon: Layout },
          { name: "Excel to PDF", path: "/excel-to-pdf", icon: Layout },
        ]}
        schemaName="PowerPoint to PDF Converter"
        schemaDescription="Free professional online PowerPoint to PDF converter. High-fidelity slide preservation."
      />
    </ToolLayout>
  );
};

export default PptToPdf;
