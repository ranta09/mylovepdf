import { useState, useEffect, useMemo, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { protectPdf } from "@/lib/protectPdfEngine";
import { Lock, Loader2, ShieldCheck, CheckCircle2, FileText, ChevronDown, AlignLeft, Printer, Copy, Edit2, ShieldAlert } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

const getPasswordStrength = (pass: string) => {
  if (!pass) return { score: 0, label: "None", color: "bg-secondary" };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;
  
  if (score <= 1) return { score: 25, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score: 50, label: "Fair", color: "bg-orange-500" };
  if (score === 3) return { score: 75, label: "Good", color: "bg-blue-500" };
  return { score: 100, label: "Strong", color: "bg-green-500" };
};

const ProtectPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  
  // UI State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  
  // Password State
  const [userPassword, setUserPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  
  // Permissions State
  const [permissions, setPermissions] = useState({
    printing: true,
    copying: true,
    modifying: true,
  });

  // Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  // Generate URL for preview caching
  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreviewUrl(url);
      setPreviewLoaded(false);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
      setNumPages(null);
    }
  }, [files]);

  const strength = useMemo(() => getPasswordStrength(userPassword), [userPassword]);
  const passwordsMatch = userPassword && userPassword === confirmPassword;
  
  const isValid = passwordsMatch && userPassword.length > 0;

  const protect = async () => {
    if (files.length === 0 || !isValid) {
      toast.error("Please provide a valid password and confirm it.");
      return;
    }
    
    setProcessing(true);
    setProgress(10);
    
    try {
      const file = files[0];
      const bytes = await file.arrayBuffer();
      setProgress(30);

      // We do AES-256 via our Engine
      const protectedBytes = await protectPdf(bytes, {
        userPassword,
        ownerPassword: ownerPassword || userPassword, // use userPassword if no owner specified
        permissions: {
          printing: permissions.printing,
          copying: permissions.copying,
          modifying: permissions.modifying,
          annotating: permissions.modifying,
          fillingForms: permissions.modifying,
          documentAssembly: permissions.modifying,
          contentAccessibility: true // usually best to leave true for readers
        }
      });
      
      setProgress(85);
      
      const blob = new Blob([protectedBytes as any], { type: "application/pdf" });
      const filename = file.name.replace(/\.pdf$/i, "_protected.pdf");
      const url = URL.createObjectURL(blob);
      
      setProgress(100);
      
      setResults([{
        file: blob,
        url,
        filename
      }]);
      
      toast.success("PDF protected successfully with AES-256 encryption.");
    } catch (err: any) {
      console.error("Protection error:", err);
      toast.error("Failed to protect PDF. Please try a different file.");
    } finally {
      if (progress !== 100) setProgress(0);
      setProcessing(false);
    }
  };

  const resetState = () => {
    setFiles([]);
    setResults([]);
    setUserPassword("");
    setConfirmPassword("");
    setOwnerPassword("");
    setPermissions({ printing: true, copying: true, modifying: true });
    setAdvancedOpen(false);
  };

  return (
    <ToolLayout
      title="Protect PDF"
      description="Add strong AES-256 password protection and set permissions"
      category="protect"
      icon={<Lock className="h-7 w-7" />}
      metaTitle="Protect PDF Online Free – Add Password | MagicDocx"
      metaDescription="Password-protect your PDF online for free. Set open and permission passwords with strong AES-256 encryption."
      toolId="protect"
      hideHeader={files.length > 0 || results.length > 0 || processing}
      className="protect-pdf-page"
    >
      <style>{`
        .protect-pdf-page h1, 
        .protect-pdf-page h2, 
        .protect-pdf-page h3,
        .protect-pdf-page span,
        .protect-pdf-page button,
        .protect-pdf-page p,
        .protect-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">
          
          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Encrypting Document (AES-256)</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{progress}% Encrypted</p>
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
                     {previewUrl && (
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
                     )}
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT SIDE: Settings (30%) */}
              <div className="flex-1 bg-background flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2 shrink-0">
                   <ShieldAlert className="h-4 w-4 text-primary" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Security Settings</span>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                     
                     {/* Required Password */}
                     <div className="space-y-5">
                       <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Open Password</h3>
                       
                       <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type Password</Label>
                            <Input 
                              type="password" 
                              value={userPassword} 
                              onChange={(e) => setUserPassword(e.target.value)} 
                              placeholder="••••••••" 
                              className="h-12 bg-secondary/30 focus-visible:ring-primary"
                            />
                            {userPassword.length > 0 && (
                               <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                                    <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${strength.score}%` }} />
                                  </div>
                                  <span className={cn("text-[9px] font-bold uppercase", strength.color.replace('bg-', 'text-'))}>{strength.label}</span>
                               </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
                            <div className="relative">
                              <Input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                placeholder="••••••••" 
                                className={cn("h-12 bg-secondary/30 pr-10 focus-visible:ring-primary", 
                                  userPassword && confirmPassword && (passwordsMatch ? "border-green-500/50 focus-visible:ring-green-500" : "border-red-500/50 focus-visible:ring-red-500")
                                )}
                              />
                              {userPassword && confirmPassword && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  {passwordsMatch ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <div className="h-4 w-4 text-red-500 flex items-center justify-center text-xs font-black">X</div>}
                                </div>
                              )}
                            </div>
                            {!passwordsMatch && confirmPassword.length > 0 && (
                              <p className="text-[10px] font-semibold text-red-500 uppercase">Passwords do not match</p>
                            )}
                          </div>
                       </div>
                     </div>

                     {/* Advanced Permissions */}
                     <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="space-y-2">
                       <CollapsibleTrigger asChild>
                         <Button variant="ghost" className="w-full justify-between h-12 bg-secondary/10 hover:bg-secondary/20 font-bold uppercase tracking-widest text-[10px]">
                           Advanced Options (Permissions)
                           <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                         </Button>
                       </CollapsibleTrigger>
                       
                       <CollapsibleContent className="space-y-6 pt-4 px-2">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between">
                              Owner Password (Optional)
                            </Label>
                            <Input 
                              type="password" 
                              value={ownerPassword} 
                              onChange={(e) => setOwnerPassword(e.target.value)} 
                              placeholder="For changing permissions later..." 
                              className="h-10 text-sm bg-secondary/30"
                            />
                            <p className="text-[9px] text-muted-foreground font-semibold">Leave empty to use the standard Open Password as Owner Password.</p>
                          </div>

                          <div className="space-y-4 pt-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Allowed Actions</Label>
                            
                            <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/10 hover:border-primary/30 transition-colors">
                               <div className="flex items-center gap-3">
                                  <Printer className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold">Printing</span>
                                    <span className="text-[9px] text-muted-foreground font-medium">Allow high-res printing</span>
                                  </div>
                               </div>
                               <Switch checked={permissions.printing} onCheckedChange={(c) => setPermissions(p => ({ ...p, printing: c }))} />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/10 hover:border-primary/30 transition-colors">
                               <div className="flex items-center gap-3">
                                  <Copy className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold">Copying</span>
                                    <span className="text-[9px] text-muted-foreground font-medium">Allow text extraction</span>
                                  </div>
                               </div>
                               <Switch checked={permissions.copying} onCheckedChange={(c) => setPermissions(p => ({ ...p, copying: c }))} />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-secondary/10 hover:border-primary/30 transition-colors">
                               <div className="flex items-center gap-3">
                                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold">Modifying</span>
                                    <span className="text-[9px] text-muted-foreground font-medium">Allow filling forms & edits</span>
                                  </div>
                               </div>
                               <Switch checked={permissions.modifying} onCheckedChange={(c) => setPermissions(p => ({ ...p, modifying: c }))} />
                            </div>
                          </div>
                       </CollapsibleContent>
                     </Collapsible>
                  </div>
                </ScrollArea>
                
                {/* Fixed Footer */}
                <div className="p-4 border-t border-border bg-card shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                  <Button 
                    size="lg" 
                    onClick={protect} 
                    disabled={!isValid || processing} 
                    className="w-full h-14 rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl transition-all"
                  >
                     <Lock className="h-4 w-4 mr-2" />
                     Protect PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BEFORE UPLOAD: SEO AND DRAG-DROP AREA ─────────────────────── */}
      {files.length === 0 && !processing && results.length === 0 && (
        <ToolUploadScreen
          title="Protect PDF"
          description="Add strong AES-256 password protection to your PDF"
          buttonLabel="Select PDF to encrypt"
          accept=".pdf"
          multiple={false}
          onFilesSelected={(f) => setFiles(f.slice(0, 1))}
        />
      )}

      {!files.length && !processing && results.length === 0 && (
        <ToolSeoSection
          toolName="Protect PDF Online"
          category="protect"
          intro="Secure your PDF files with military-grade AES-256 encryption. Prevent unauthorized access, copying, editing, and printing with granular permissions. Everything is processed directly in your browser ensuring complete privacy."
          steps={[
            "Upload your PDF document to our secure local workspace.",
            "Type a strong Open Password to restrict who can open the file.",
            "Optionally configure an Owner Password and toggle specific permissions (print, copy, modify).",
            "Click 'Protect PDF' and download your locked document."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Unlock PDF", path: "/unlock-pdf", icon: Lock },
            { name: "Merge PDF", path: "/merge-pdf", icon: Lock },
            { name: "Compress PDF", path: "/compress-pdf", icon: Lock },
          ]}
          schemaName="Protect PDF Tool"
          schemaDescription="Encrypt PDF documents securely via client-side AES-256 encryption. Add passwords and set permissions without uploading files to any server."
        />
      )}
    </ToolLayout>
  );
};

export default ProtectPdf;
