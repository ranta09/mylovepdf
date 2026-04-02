import { useState, useEffect } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { flattenPdfDocument, analyzePdfFlattenState, FlattenAnalysis, FlattenMode } from "@/lib/flattenPdfEngine";
import { Layers, Loader2, ShieldCheck, FileText, CheckCircle2, FileBox, AlertTriangle, Download, Settings, MousePointerClick, Zap } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { pdfjs, Document, Page } from "react-pdf";
import { cn } from "@/lib/utils";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Setup PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const FlattenPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  
  // UI State
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  
  // Flatten State
  const [analysis, setAnalysis] = useState<FlattenAnalysis | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<FlattenMode>("full");

  // Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0 || analyzing);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, analyzing, setDisableGlobalFeatures]);

  // Analyze file and set up preview
  useEffect(() => {
    if (files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewLoaded(false);
      
      const analyze = async () => {
        setAnalyzing(true);
        setErrorStatus(null);
        setAnalysis(null);
        try {
          const bytes = await file.arrayBuffer();
          const { status, error } = await analyzePdfFlattenState(bytes);
          if (error) {
            setErrorStatus("error");
            toast.error("Failed to analyze PDF file.");
          } else {
            setAnalysis(status);
            // Default select form flatten natively if it's strictly forms.
            if (status.hasForms && !status.hasAnnotations) {
              setMode("forms_only");
            } else {
              setMode("full");
            }
          }
        } catch (err) {
          setErrorStatus("error");
          toast.error("Error reading file.");
        } finally {
          setAnalyzing(false);
        }
      };
      
      analyze();
      
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setNumPages(null);
      setAnalysis(null);
      setErrorStatus(null);
      setMode("full");
    }
  }, [files]);

  const handleFlatten = async () => {
    if (files.length === 0) return;
    
    // If it's already completely flattened, just download directly
    if (analysis?.isFlattened) {
       setResults([{
         file: files[0],
         url: URL.createObjectURL(files[0]),
         filename: files[0].name.replace(/\.pdf$/i, "_flattened.pdf")
       }]);
       toast.success("PDF is ready for download!");
       return;
    }

    setProcessing(true);
    setProgress(0);
    
    try {
      const file = files[0];
      const bytes = await file.arrayBuffer();
      
      const flattenedBytes = await flattenPdfDocument(bytes, mode, (p) => setProgress(p));
      
      const blob = new Blob([flattenedBytes as any], { type: "application/pdf" });
      const filename = file.name.replace(/\.pdf$/i, "_flattened.pdf");
      const url = URL.createObjectURL(blob);
      
      setResults([{
        file: blob,
        url,
        filename
      }]);
      
      toast.success("PDF flattened successfully!");
    } catch (err: any) {
      console.error("Flatten error:", err);
      toast.error("Failed to flatten PDF. The file may be corrupted.");
    } finally {
      if (progress !== 100) setProgress(0);
      setProcessing(false);
    }
  };

  const resetState = () => {
    setFiles([]);
    setResults([]);
    setAnalysis(null);
    setErrorStatus(null);
  };

  return (
    <ToolLayout
      title="Flatten PDF"
      description="Merge form fields, annotations, and layers into a single static PDF document."
      category="edit"
      icon={<Layers className="h-7 w-7" />}
      metaTitle="Flatten PDF Online Free – Remove Form Fields | MagicDocx"
      metaDescription="Flatten PDF form fields, annotations, and interactive elements online for free. Makes your PDF static and printer-ready. No sign-up."
      toolId="flatten"
      hideHeader={files.length > 0 || results.length > 0 || processing || analyzing}
      className="flatten-pdf-page"
    >
      <style>{`
        .flatten-pdf-page h1, 
        .flatten-pdf-page h2, 
        .flatten-pdf-page h3,
        .flatten-pdf-page span,
        .flatten-pdf-page button,
        .flatten-pdf-page p,
        .flatten-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">
          
          {processing || analyzing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  {analyzing ? <FileBox className="h-10 w-10 text-primary animate-pulse" /> : <Layers className="h-10 w-10 text-primary animate-pulse" />}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tighter">
                    {analyzing ? "Analyzing Structure" : mode === "forms_only" ? "Converting Form Fields" : "Burning Document Layers"}
                  </h3>
                  {!analyzing && (
                    <>
                      <Progress value={progress} className="h-2 rounded-full" />
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{progress}% Flattened</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={resetState} hideShare={true} />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Preview (70%) */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex flex-col">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 truncate">
                        <h4 className="text-sm font-bold uppercase tracking-tight text-foreground truncate">{files[0].name}</h4>
                        <div className="flex gap-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                          <span>{formatSize(files[0].size)}</span>
                          {numPages && <span>{numPages} Pages</span>}
                        </div>
                      </div>
                   </div>
                </div>
                
                <ScrollArea className="flex-1 p-6 relative">
                  <div className="mx-auto w-full max-w-2xl min-h-[400px] flex items-center justify-center">
                     {errorStatus === "error" ? (
                       <div className="w-[400px] h-[550px] bg-background border border-border shadow-2xl rounded-sm flex flex-col items-center justify-center space-y-4 p-8 text-center text-muted-foreground">
                         <div className="h-20 w-20 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                           <AlertTriangle className="h-10 w-10 opacity-50 text-amber-500" />
                         </div>
                         <h3 className="font-bold uppercase tracking-widest text-sm text-foreground">Preview Unavailable</h3>
                         <p className="text-xs max-w-[200px]">The file is corrupted or protected against layout analysis.</p>
                       </div>
                     ) : previewUrl ? (
                       <div className="relative inline-block isolate group shadow-2xl rounded-sm overflow-hidden border border-border">
                          {!previewLoaded && (
                            <div className="absolute inset-0 bg-secondary/30 animate-pulse flex items-center justify-center z-10 w-[400px] h-[550px]">
                              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                            </div>
                          )}
                          <Document 
                             file={previewUrl} 
                             onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
                             className={cn("transition-opacity duration-300", previewLoaded ? "opacity-100" : "opacity-0")}
                             error={null}
                          >
                            <Page 
                              pageNumber={1} 
                              renderTextLayer={true} // Essential for showing selectable text
                              renderAnnotationLayer={true} // Critical for showing the raw form fields before flattening
                              width={400}
                              onLoadSuccess={() => setPreviewLoaded(true)}
                              className="bg-white pointer-events-none" // Disable interaction in preview
                            />
                          </Document>
                       </div>
                     ) : null}
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT SIDE: Settings (30%) */}
              <div className="flex-1 bg-background flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2 shrink-0">
                   <Settings className="h-4 w-4 text-primary" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Flatten Options</span>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                     
                     {analysis?.isFlattened && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                           <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-4">
                              <CheckCircle2 className="h-6 w-6 text-green-500" />
                           </div>
                           <h3 className="text-sm font-black uppercase tracking-wider text-center border-b border-border pb-3">Already Flattened</h3>
                           <p className="text-xs text-muted-foreground font-semibold text-center leading-relaxed">
                             This PDF contains no interactive components. It is already fully flattened!
                           </p>
                        </div>
                     )}

                     {!analysis?.isFlattened && analysis && (
                       <div className="space-y-6">
                         
                         <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detection Results</h3>
                            <div className="grid gap-2">
                              <div className={cn("p-3 rounded-lg border text-xs font-bold uppercase tracking-tight flex items-center justify-between", analysis.hasForms ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-secondary/50 border-transparent text-muted-foreground")}>
                                <span className="flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> Form Fields</span>
                                <span>{analysis.hasForms ? "Detected" : "None"}</span>
                              </div>
                              <div className={cn("p-3 rounded-lg border text-xs font-bold uppercase tracking-tight flex items-center justify-between", analysis.hasAnnotations ? "bg-blue-500/10 border-blue-500/20 text-blue-600" : "bg-secondary/50 border-transparent text-muted-foreground")}>
                                <span className="flex items-center gap-2"><FileBox className="h-4 w-4" /> Annotations</span>
                                <span>{analysis.hasAnnotations ? "Detected" : "None"}</span>
                              </div>
                            </div>
                         </div>

                         <div className="space-y-4">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-t border-border pt-6">Select Mode</h3>
                           
                           <RadioGroup value={mode} onValueChange={(v) => setMode(v as FlattenMode)} className="space-y-3">
                              <Label 
                                htmlFor="forms_only"
                                className={cn(
                                  "flex flex-col gap-2 p-4 border rounded-xl cursor-pointer transition-all hover:bg-secondary/10",
                                  mode === "forms_only" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border",
                                  (!analysis.hasForms) && "opacity-50 grayscale"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="forms_only" id="forms_only" disabled={!analysis.hasForms} />
                                    <span className="text-sm font-bold uppercase">Flatten Forms Only</span>
                                  </div>
                                  <Zap className="h-4 w-4 text-amber-500" />
                                </div>
                                <p className="text-[10px] text-muted-foreground ml-6 leading-relaxed">
                                  Natively converts forms to pure vectors. Extremely fast and 100% preserves text selection and crisp quality. Ignores annotations.
                                </p>
                              </Label>

                              <Label 
                                htmlFor="full"
                                className={cn(
                                  "flex flex-col gap-2 p-4 border rounded-xl cursor-pointer transition-all hover:bg-secondary/10",
                                  mode === "full" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="full" id="full" />
                                    <span className="text-sm font-bold uppercase">Full Flatten (Rasterize)</span>
                                  </div>
                                  <ShieldCheck className="h-4 w-4 text-green-600" />
                                </div>
                                <p className="text-[10px] text-muted-foreground ml-6 leading-relaxed">
                                  Maximum security. Burns all forms, annotations, signatures, and layers into a completely un-editable static image layer.
                                </p>
                              </Label>
                           </RadioGroup>
                         </div>

                       </div>
                     )}
                     
                  </div>
                </ScrollArea>
                
                {/* Fixed Footer */}
                {errorStatus !== "error" && analysis && (
                  <div className="p-4 border-t border-border bg-card shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <Button 
                      size="lg" 
                      onClick={handleFlatten} 
                      disabled={processing} 
                      className={cn(
                        "w-full h-14 rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl transition-all gap-2",
                        analysis.isFlattened ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : ""
                      )}
                    >
                      {analysis.isFlattened ? (
                         <><Download className="h-4 w-4" /> Download Original</>
                      ) : (
                         <><Layers className="h-4 w-4" /> Flatten PDF</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {files.length === 0 && !processing && results.length === 0 && !analyzing && (
        <ToolUploadScreen
          title="Flatten PDF"
          description="Merge form fields and annotations into a static PDF"
          buttonLabel="Select PDF to flatten"
          accept=".pdf"
          multiple={false}
          onFilesSelected={(f) => setFiles(f.slice(0, 1))}
        />
      )}

      {!files.length && !processing && results.length === 0 && !analyzing && (
        <ToolSeoSection
          toolName="Flatten PDF Online"
          category="edit"
          intro="MagicDocx Flatten PDF permanently merges all interactive form fields, annotations, and digital signatures into the PDF's static page content. Once flattened, form fields can no longer be edited, and the document appears the same in every PDF viewer. This is essential before archiving, sharing, or printing documents with filled-in forms that must not be modified. All processing is 100% client-side."
          steps={[
            "Upload your PDF form using the seamless drop zone.",
            "Our smart engine automatically detects interactive fields and annotations.",
            "Choose between native fast vector flattening or full maximum-security rasterization.",
            "Click 'Flatten PDF' to instantly merge and download your static file."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Edit PDF", path: "/edit-pdf", icon: Layers },
            { name: "Protect PDF", path: "/protect-pdf", icon: Layers },
            { name: "Sign PDF", path: "/sign-pdf", icon: Layers },
          ]}
          schemaName="Flatten PDF Tool"
          schemaDescription="Instantly flatten complex PDF forms and annotations into locked static documents."
        />
      )}
    </ToolLayout>
  );
};

export default FlattenPdf;
