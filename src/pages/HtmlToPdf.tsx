import { useState, useEffect, useCallback, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import { 
  Globe, 
  Loader2, 
  Code, 
  Link as LinkIcon, 
  ShieldCheck, 
  RotateCcw, 
  FileBox, 
  CheckCircle2, 
  ArrowRight,
  FileCode,
  Plus,
  X,
  RectangleVertical,
  RectangleHorizontal,
  Settings,
  Layout,
  Maximize,
  Minimize,
  Type
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Label } from "@/components/ui/label";
import { 
  convertHtmlToPdf, 
  isValidUrl, 
  isValidHtmlFile,
  PageSize,
  Orientation,
  MarginSize
} from "@/lib/htmlToPdfEngine";

const HtmlToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [mode, setMode] = useState("url");
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout Settings
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<MarginSize>("normal");
  const [scale, setScale] = useState<"fit" | "actual">("fit");

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || url.trim() !== "" || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, url, processing, results.length, setDisableGlobalFeatures]);

  const handleFilesChange = (newFiles: File[]) => {
    const validFiles = newFiles.filter(isValidHtmlFile);
    if (validFiles.length < newFiles.length) {
      toast.error("Some files were rejected. Please upload .html or .htm files only.");
    }
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setMode("url"); // Back to landing if empty
    }
  };

  const resetTool = useCallback(() => {
    setFiles([]);
    setUrl("");
    setResults([]);
    setProgress(0);
    setProcessing(false);
    setMode("url");
  }, []);

  const handleProcess = async () => {
    if (files.length === 0 && !isValidUrl(url)) {
      toast.error("Please provide a valid HTML file or webpage URL.");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResults([]);

    const allResults: ProcessingResult[] = [];
    const options = { pageSize, orientation, margin, scale };

    try {
      // Process URL if provided
      if (url.trim()) {
        setProgress(10);
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        
        try {
          const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`);
          if (!response.ok) throw new Error("CORS Proxy failed");
          
          const html = await response.text();
          const iframe = document.createElement("iframe");
          iframe.style.position = "fixed";
          iframe.style.visibility = "hidden";
          iframe.style.width = "1200px";
          iframe.style.height = "1600px";
          document.body.appendChild(iframe);
          
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc && doc.body) {
            doc.open();
            doc.write(html);
            doc.close();
            
            await new Promise(r => setTimeout(r, 2000));
            setProgress(30);
            
            const pdfBlob = await convertHtmlToPdf(doc.body, options);
            allResults.push({
              file: pdfBlob,
              url: URL.createObjectURL(pdfBlob),
              filename: url.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20) + ".pdf"
            });
          }
          document.body.removeChild(iframe);
        } catch (err) {
          console.error("URL Conversion failed:", err);
          toast.error("Direct URL conversion failed due to site security. Try downloading the HTML file and uploading it.");
        }
      }

      // Process Files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round(((i + (url ? 1 : 0)) / (files.length + (url ? 1 : 0))) * 100));
        
        const html = await file.text();
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.visibility = "hidden";
        container.style.width = "1200px";
        container.innerHTML = html;
        document.body.appendChild(container);
        
        const pdfBlob = await convertHtmlToPdf(container, options);
        allResults.push({
          file: pdfBlob,
          url: URL.createObjectURL(pdfBlob),
          filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf"
        });
        
        document.body.removeChild(container);
      }

      setResults(allResults);
      if (allResults.length > 0) {
        toast.success(`Successfully synthesized ${allResults.length} PDF(s)!`);
        if (allResults.length === 1) {
          const a = document.createElement("a");
          a.href = allResults[0].url;
          a.download = allResults[0].filename;
          a.click();
        }
      }
    } catch (error) {
      console.error("Synthesis Error:", error);
      toast.error("Conversion failed. Please try another HTML file or webpage.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert webpages or HTML files into professional-grade PDF documents."
      category="convert"
      icon={<Globe className="h-7 w-7" />}
      metaTitle="HTML to PDF — High Fidelity Web Rendering Online"
      metaDescription="Convert HTML files and URLs to PDF with pixel-perfect accuracy. Preserves CSS, images, and layouts."
      toolId="html-to-pdf"
      hideHeader={files.length > 0 || url.trim() !== "" || processing || results.length > 0}
      className="html-to-pdf-page"
    >
      <style>{`
        .html-to-pdf-page h1, 
        .html-to-pdf-page h2, 
        .html-to-pdf-page h3,
        .html-to-pdf-page span,
        .html-to-pdf-page button,
        .html-to-pdf-page p,
        .html-to-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || url.trim() !== "" || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">
          
          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-red-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
                  <Globe className="h-10 w-10 text-red-600 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tighter text-red-600">DOM Rendering Pipeline</h3>
                  <Progress value={progress} className="h-2 rounded-full bg-red-100 [&>div]:bg-red-600" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{progress}% Rendered</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={resetTool} />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Grid / Input (70%) */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* URL Input Area if no files */}
                    {files.length === 0 && (
                      <div className="max-w-2xl mx-auto w-full space-y-4 pt-12">
                        <div className="text-center space-y-2">
                          <h3 className="text-2xl font-bold uppercase tracking-tighter">Webpage Synthesis</h3>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Enter any URL to convert it to a high-fidelity PDF</p>
                        </div>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <LinkIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-red-500 transition-colors" />
                          </div>
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="h-16 pl-14 pr-16 rounded-2xl border-2 border-border bg-card font-medium text-base focus-visible:ring-red-500/20 focus-visible:border-red-500 transition-all shadow-xl"
                            onKeyDown={e => e.key === "Enter" && handleProcess()}
                          />
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <kbd className="hidden sm:inline-flex h-8 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100 uppercase">
                              URL Synthesis
                            </kbd>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Files Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {files.map((file, idx) => (
                        <div key={idx} className="group flex flex-col gap-3 p-4 bg-background border border-border hover:border-red-500/50 rounded-2xl transition-all duration-200 text-left relative shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="h-14 w-12 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-center relative shrink-0">
                              <FileCode className="h-7 w-7 text-red-500" />
                              <div className="absolute top-1 left-1 bg-red-500 text-white text-[7px] font-bold px-1 rounded-sm uppercase tracking-tighter">HTML</div>
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate">{file.name}</p>
                              <div className="flex items-center gap-3">
                                <p className="text-[9px] font-bold text-red-600 uppercase">{(file.size / (1024)).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <button onClick={() => removeFile(idx)} className="p-2 bg-secondary/50 rounded-xl hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          
                          <div className="pt-2 border-t border-border mt-1">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3 text-red-500" />
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Local Asset Parsing</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {files.length > 0 && (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="h-full min-h-[120px] border-2 border-dashed border-border hover:border-red-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 hover:bg-red-500/5 transition-all"
                        >
                          <Plus className="h-6 w-6" />
                          Add More Files
                        </button>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".html,.htm" onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))} />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT PANEL: Settings (30%) */}
              <div className="flex-1 bg-secondary/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:pt-8 lg:pb-12 lg:px-12">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-2xl">
                          <Settings className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none text-red-600">Layout Hub</h4>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Page Size */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Format</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {(["A4", "letter", "legal", "auto"] as PageSize[]).map((size) => (
                              <button
                                key={size}
                                onClick={() => setPageSize(size)}
                                className={cn(
                                  "h-10 rounded-xl border text-[10px] font-bold uppercase transition-all",
                                  pageSize === size ? "border-red-500 bg-red-500/5 text-red-600 shadow-sm" : "border-border bg-background hover:border-red-500/20"
                                )}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Orientation */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Orientation</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setOrientation("portrait")}
                              className={cn(
                                "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all",
                                orientation === "portrait" ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                              )}
                            >
                              <RectangleVertical className="h-4 w-4" /> Portrait
                            </button>
                            <button 
                              onClick={() => setOrientation("landscape")}
                              className={cn(
                                "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all",
                                orientation === "landscape" ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                              )}
                            >
                              <RectangleHorizontal className="h-4 w-4" /> Landscape
                            </button>
                          </div>
                        </div>

                        {/* Margins */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Margins</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {(["none", "small", "normal", "large"] as MarginSize[]).map((m) => (
                              <button
                                key={m}
                                onClick={() => setMargin(m)}
                                className={cn(
                                  "h-10 rounded-xl border text-[10px] font-bold uppercase transition-all",
                                  margin === m ? "border-red-500 bg-red-500/5 text-red-600 shadow-sm" : "border-border bg-background hover:border-red-500/20"
                                )}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Scaling */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Scaling</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setScale("fit")}
                              className={cn(
                                "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all",
                                scale === "fit" ? "border-red-500 bg-red-500/5 text-red-600" : "border-border bg-background text-muted-foreground"
                              )}
                            >
                              <Minimize className="h-4 w-4" /> Fit to Page
                            </button>
                            <button 
                              onClick={() => setScale("actual")}
                              className={cn(
                                "h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all",
                                scale === "actual" ? "border-red-500 bg-red-500/5 text-red-600" : "border-border bg-background text-muted-foreground"
                              )}
                            >
                              <Maximize className="h-4 w-4" /> Actual Size
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-auto p-6 lg:px-12 bg-background border-t border-border shrink-0">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full">
                    <Button 
                      size="lg" 
                      onClick={handleProcess} 
                      disabled={processing}
                      className="w-full h-16 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:shadow-red-500/40 bg-red-600 hover:bg-red-700 transition-all gap-4 group"
                    >
                      {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Initiate Synthesis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Landing State: Modern Tabs Entry Area */}
      {files.length === 0 && url.trim() === "" && !processing && results.length === 0 && (
        <div className="w-full max-w-4xl mx-auto mt-12 space-y-12 px-6">
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="url" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <LinkIcon className="h-4 w-4" /> Webpage URL
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <FileCode className="h-4 w-4" /> HTML File
              </TabsTrigger>
            </TabsList>

            <div className="mt-12 text-center space-y-4">
              <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-tight">
                Web to PDF <span className="text-red-600">Synthesis.</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                Choose your input vector to begin high-fidelity browser rendering.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                <button 
                  onClick={() => setMode('url')} 
                  className={cn(
                    "p-8 rounded-[2.5rem] border-2 text-left transition-all group relative overflow-hidden", 
                    mode === 'url' ? 'border-red-500 bg-red-500/5' : 'border-border bg-card hover:border-red-500/30'
                  )}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
                  <LinkIcon className={cn("h-10 w-10 mb-6 transition-colors", mode === 'url' ? 'text-red-500' : 'text-muted-foreground group-hover:text-red-500')} />
                  <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">Webpage URL</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-relaxed mb-8">Render any public address into a PDF buffer.</p>
                  
                  {mode === 'url' && (
                    <Input
                      type="url"
                      placeholder="Paste URL (e.g., magicdocx.com)"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      className="h-14 rounded-2xl border-2 border-red-500/20 bg-background font-bold focus-visible:ring-red-500/20 focus-visible:border-red-500 transition-all"
                      onKeyDown={e => e.key === "Enter" && url.trim() && setUrl(url)}
                    />
                  )}
                </button>

                <button 
                  onClick={() => {
                    setMode('file');
                    if (mode === 'file') fileInputRef.current?.click();
                  }} 
                  className={cn(
                    "p-8 rounded-[2.5rem] border-2 text-left transition-all group relative overflow-hidden", 
                    mode === 'file' ? 'border-red-500 bg-red-500/5' : 'border-border bg-card hover:border-red-500/30'
                  )}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
                  <FileCode className={cn("h-10 w-10 mb-6 transition-colors", mode === 'file' ? 'text-red-500' : 'text-muted-foreground group-hover:text-red-500')} />
                  <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">HTML Files</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-relaxed mb-auto">Upload .html files for local browser synthesis.</p>
                  
                  <div className="mt-8 flex items-center gap-2 text-red-600 font-bold uppercase tracking-widest text-[10px]">
                    <Plus className="h-4 w-4" /> {mode === 'file' ? "Select Files Now" : "Switch to File Mode"}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" multiple accept=".html,.htm" onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))} />
                </button>
              </div>
            </div>
          </Tabs>
        </div>
      )}

      <ToolSeoSection
        toolName="HTML to PDF Converter"
        category="convert"
        intro="MagicDocx HTML to PDF converter turns any webpage or raw HTML file into a professionally formatted PDF document. Paste a public URL to render the page as-is, or upload your custom HTML files to convert them directly. Ideal for developers, writers, and professionals who need print-ready PDF output from web content without any software installation."
        steps={[
          "Choose your input mode: Webpage URL or HTML File Upload.",
          "For URL mode: paste the address and enter the Layout Hub to configure your settings.",
          "For File mode: upload your .html files to the secure grid-based workbench.",
          "Configure layout settings including Page Size, Orientation, Margins, and Scaling.",
          "Click \"Initiate Synthesis\" to render and download your professional PDF."
        ]}
        formats={["HTML", "URL", "PDF"]}
        relatedTools={[
          { name: "Word to PDF", path: "/word-to-pdf", icon: Globe },
          { name: "JPG to PDF", path: "/jpg-to-pdf", icon: Globe },
          { name: "Merge PDF", path: "/merge-pdf", icon: Globe },
          { name: "Compress PDF", path: "/compress-pdf", icon: Globe },
        ]}
        schemaName="HTML to PDF Converter Online"
        schemaDescription="Free online HTML to PDF converter. Convert any webpage URL or custom HTML file to a high-fidelity PDF document."
      />
    </ToolLayout>
  );
};

export default HtmlToPdf;
