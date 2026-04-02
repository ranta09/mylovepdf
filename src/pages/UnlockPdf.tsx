import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { unlockPdfDocument, analyzePdfProtection, PdfProtectionStatus } from "@/lib/unlockPdfEngine";
import { Unlock, Loader2, ShieldCheck, FileText, CheckCircle2, Lock, Eye, EyeOff, ShieldAlert, AlertTriangle, Download } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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

const UnlockPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  
  // UI State
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  
  // Protection Status
  const [status, setStatus] = useState<PdfProtectionStatus | null>(null);
  
  // Password State
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        setStatus(null);
        try {
          const bytes = await file.arrayBuffer();
          const result = await analyzePdfProtection(bytes);
          setStatus(result.status);
          if (result.status === "error") {
            toast.error("Failed to analyze PDF structure.");
          }
        } catch (err) {
          setStatus("error");
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
      setStatus(null);
      setPassword("");
    }
  }, [files]);

  const isValid = status === "needs_password" ? password.length > 0 : true;

  const handleUnlock = async () => {
    if (files.length === 0 || !isValid) return;
    
    // If it's already unlocked, just return it as is or "unlocked" copy
    if (status === "unlocked") {
       setResults([{
         file: files[0],
         url: URL.createObjectURL(files[0]),
         filename: files[0].name.replace(/\.pdf$/i, "_unlocked.pdf")
       }]);
       toast.success("PDF is ready for download!");
       return;
    }

    setProcessing(true);
    setProgress(15);
    
    try {
      const file = files[0];
      const bytes = await file.arrayBuffer();
      setProgress(40);

      const unlockedBytes = await unlockPdfDocument(bytes, password);
      
      setProgress(85);
      
      const blob = new Blob([unlockedBytes as any], { type: "application/pdf" });
      const filename = file.name.replace(/\.pdf$/i, "_unlocked.pdf");
      const url = URL.createObjectURL(blob);
      
      setProgress(100);
      
      setResults([{
        file: blob,
        url,
        filename
      }]);
      
      toast.success("PDF unlocked successfully!");
      setPassword("");
    } catch (err: any) {
      console.error("Unlock error:", err);
      if (err.message === "INCORRECT_PASSWORD") {
        toast.error("Incorrect password. Please try again.");
      } else {
        toast.error("Failed to unlock PDF. The file may use unsupported encryption.");
      }
    } finally {
      if (progress !== 100) setProgress(0);
      setProcessing(false);
    }
  };

  const resetState = () => {
    setFiles([]);
    setResults([]);
    setStatus(null);
    setPassword("");
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove passwords and permissions from your protected PDF files instantly"
      category="protect"
      icon={<Unlock className="h-7 w-7" />}
      metaTitle="Unlock PDF Online Free – Remove Password | MagicDocx"
      metaDescription="Remove the open password or permissions from your PDF online for free. Instantly unlock protected PDFs. No sign-up required."
      toolId="unlock"
      hideHeader={files.length > 0 || results.length > 0 || processing || analyzing}
      className="unlock-pdf-page"
    >
      <style>{`
        .unlock-pdf-page h1, 
        .unlock-pdf-page h2, 
        .unlock-pdf-page h3,
        .unlock-pdf-page span,
        .unlock-pdf-page button,
        .unlock-pdf-page p,
        .unlock-pdf-page div {
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
                  {analyzing ? <ShieldAlert className="h-10 w-10 text-primary animate-pulse" /> : <Unlock className="h-10 w-10 text-primary animate-pulse" />}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tighter">
                    {analyzing ? "Analyzing Protection" : "Removing Security Flags"}
                  </h3>
                  {!analyzing && (
                    <>
                      <Progress value={progress} className="h-2 rounded-full" />
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{progress}% Unlocked</p>
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
                     {status === "needs_password" ? (
                       <div className="w-[400px] h-[550px] bg-background border border-border shadow-2xl rounded-sm flex flex-col items-center justify-center space-y-4 p-8 text-center text-muted-foreground">
                         <div className="h-20 w-20 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                           <Lock className="h-10 w-10 opacity-50" />
                         </div>
                         <h3 className="font-bold uppercase tracking-widest text-sm">Preview Unavailable</h3>
                         <p className="text-xs max-w-[200px]">This document is encrypted with an open password. Preview cannot be rendered until unlocked.</p>
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
                             error={
                              <div className="w-[400px] h-[550px] bg-background border border-border flex flex-col items-center justify-center space-y-4 p-8 text-center">
                                <AlertTriangle className="h-10 w-10 text-amber-500 opacity-50" />
                                <p className="text-xs font-bold uppercase tracking-widest">Error loading preview</p>
                              </div>
                             }
                          >
                            <Page 
                              pageNumber={1} 
                              renderTextLayer={false} 
                              renderAnnotationLayer={false}
                              width={400}
                              onLoadSuccess={() => setPreviewLoaded(true)}
                              className="bg-white"
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
                   <Lock className="h-4 w-4 text-primary" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Security Status</span>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                     
                     {status === "unlocked" && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                           <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20 mb-6">
                              <CheckCircle2 className="h-8 w-8 text-green-500" />
                           </div>
                           <h3 className="text-sm font-black uppercase tracking-wider text-center border-b border-border pb-4">Already Unlocked</h3>
                           <p className="text-xs text-muted-foreground font-semibold text-center leading-relaxed">
                             This PDF is not protected by any passwords or restrictions. You can download it directly.
                           </p>
                        </div>
                     )}

                     {status === "has_restrictions" && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                           <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border-4 border-blue-500/20 mb-6">
                              <Unlock className="h-8 w-8 text-blue-500" />
                           </div>
                           <h3 className="text-sm font-black uppercase tracking-wider text-center border-b border-border pb-4">Restrictions Detected</h3>
                           <p className="text-xs text-muted-foreground font-semibold text-center leading-relaxed">
                             This PDF has restricted permissions (e.g. preventing printing or copying). MagicDocx can unlock this instantly without a password.
                           </p>
                        </div>
                     )}

                     {status === "needs_password" && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                           <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center border-4 border-amber-500/20 mb-6">
                              <Lock className="h-8 w-8 text-amber-500" />
                           </div>
                           <h3 className="text-sm font-black uppercase tracking-wider text-center border-b border-border pb-4 text-amber-600">Password Required</h3>
                           
                           <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Enter Open Password</Label>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    placeholder="Enter file password..." 
                                    className="h-12 bg-secondary/30 pr-10 focus-visible:ring-primary font-black"
                                    autoComplete="off"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </div>
                           </div>

                           <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 space-y-2 mt-4">
                              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Secure Process
                              </p>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                                MagicDocx cannot bypass an unknown open password. You must provide the correct password to unlock this file. Wait times may apply for AES-256.
                              </p>
                           </div>
                        </div>
                     )}
                     
                     {status === "error" && (
                        <div className="space-y-5">
                           <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20 mb-6">
                              <AlertTriangle className="h-8 w-8 text-red-500" />
                           </div>
                           <h3 className="text-sm font-black uppercase tracking-wider text-center border-b border-border pb-4 text-red-600">Analysis Failed</h3>
                           <p className="text-xs text-muted-foreground font-semibold text-center leading-relaxed">
                             This file appears to be corrupted or uses an unsupported format.
                           </p>
                        </div>
                     )}

                  </div>
                </ScrollArea>
                
                {/* Fixed Footer */}
                {status !== "error" && status !== null && (
                  <div className="p-4 border-t border-border bg-card shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <Button 
                      size="lg" 
                      onClick={handleUnlock} 
                      disabled={!isValid || processing} 
                      className={cn(
                        "w-full h-14 rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl transition-all",
                        status === "unlocked" && "bg-green-600 hover:bg-green-700 shadow-green-600/20"
                      )}
                    >
                      {status === "unlocked" ? (
                        <><Download className="h-4 w-4 mr-2" /> Download Anyway</>
                      ) : (
                        <><Unlock className="h-4 w-4 mr-2" /> Unlock & Download</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BEFORE UPLOAD: SEO AND DRAG-DROP AREA ─────────────────────── */}
      {files.length === 0 && !processing && results.length === 0 && !analyzing && (
        <ToolUploadScreen
          title="Unlock PDF"
          description="Remove passwords and permissions from your protected PDF"
          buttonLabel="Select PDF to unlock"
          accept=".pdf"
          multiple={false}
          onFilesSelected={(f) => setFiles(f.slice(0, 1))}
        />
      )}

      {!files.length && !processing && results.length === 0 && !analyzing && (
        <ToolSeoSection
          toolName="Unlock PDF Online"
          category="edit"
          intro="MagicDocx Unlock PDF removes passwords and permissions from your protected PDF documents. If your file only has printing or editing restrictions, we'll unlock it instantly without a password! If it requires an open password, precisely enter it to generate a permanently unlocked version. All decryption is performed completely client-side in your browser."
          steps={[
            "Upload your password-protected PDF utilizing the secure drop zone.",
            "Our smart engine will instantly detect the protection type.",
            "If an open password is required, enter it in the password field.",
            "Click 'Unlock & Download' to generate and save your unrestricted document."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
            { name: "Merge PDF", path: "/merge-pdf", icon: Lock },
            { name: "Compress PDF", path: "/compress-pdf", icon: Lock },
          ]}
          schemaName="Unlock PDF Tool"
          schemaDescription="Instantly remove PDF passwords and restrictions online via smart client-side decryption."
        />
      )}
    </ToolLayout>
  );
};

export default UnlockPdf;
