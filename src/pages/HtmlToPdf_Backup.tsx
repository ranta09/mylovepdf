import { useState, useEffect, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import { 
  Loader2, 
  Globe, 
  Link as LinkIcon, 
  ShieldCheck, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight,
  X,
  RectangleVertical,
  RectangleHorizontal,
  Maximize,
  Minimize
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Label } from "@/components/ui/label";
import { 
  convertHtmlToPdf, 
  isValidUrl, 
  PageSize,
  Orientation,
  MarginSize
} from "@/lib/htmlToPdfEngine";

const HtmlToPdf = () => {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  // Layout Settings
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [margin, setMargin] = useState<MarginSize>("normal");
  const [scale, setScale] = useState<"fit" | "actual">("fit");

  useEffect(() => {
    setDisableGlobalFeatures(url.trim() !== "" || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [url, processing, results.length, setDisableGlobalFeatures]);

  const resetTool = useCallback(() => {
    setUrl("");
    setResults([]);
    setProgress(0);
    setProcessing(false);
  }, []);

  const handleProcess = async () => {
    if (!isValidUrl(url)) {
      setUrlError("The given URL is invalid. Please check to see if it is written correctly.");
      toast.error("Please provide a valid webpage URL.");
      return;
    }
    setUrlError("");

    setProcessing(true);
    setProgress(0);
    setResults([]);

    const allResults: ProcessingResult[] = [];
    const options = { pageSize, orientation, margin, scale };

    try {
      // Process URL
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
          toast.error("Direct URL conversion failed due to site security.");
        }
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
      description="Convert any public webpage URL into a professional-grade PDF document."
      category="convert"
      icon={<Globe className="h-7 w-7" />}
      metaTitle="HTML to PDF | High Fidelity Web Rendering Online"
      metaDescription="Convert webpage URLs to PDF with pixel-perfect accuracy. Preserves CSS, images, and layouts."
      toolId="html-to-pdf"
      hideHeader={url.trim() !== "" || processing || results.length > 0}
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
      {(url.trim() !== "" || processing || results.length > 0) && (
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
                    {/* URL Input Area */}
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
                          onChange={e => {
                            setUrl(e.target.value);
                            if (urlError) setUrlError("");
                          }}
                          className={cn(
                            "h-16 pl-14 pr-16 rounded-2xl border-2 bg-card font-medium text-base focus-visible:ring-red-500/20 transition-all shadow-xl",
                            urlError ? "border-destructive focus-visible:border-destructive" : "border-border focus-visible:border-red-500"
                          )}
                          onKeyDown={e => e.key === "Enter" && handleProcess()}
                        />
                        {urlError && (
                          <p className="mt-2 text-xs font-bold text-destructive uppercase tracking-widest leading-relaxed flex items-center gap-2 px-2 animate-in fade-in slide-in-from-top-1">
                            <X className="h-3 w-3" /> {urlError}
                          </p>
                        )}
                        <div className="absolute inset-y-0 right-4 h-16 flex items-center pointer-events-none">
                          <kbd className="hidden sm:inline-flex h-8 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100 uppercase">
                            URL Synthesis
                          </kbd>
                        </div>
                      </div>
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
                          <Globe className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none text-red-600">HTML to PDF</h4>
                        </div>
                      </div>

                      <div className="space-y-6">
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

      {/* Landing State */}
      {url.trim() === "" && !processing && results.length === 0 && (
        <div className="w-full max-w-4xl mx-auto mt-12 space-y-12 px-6">
          <div className="mt-12 text-center space-y-4">
            <div className="max-w-2xl mx-auto">
              <div className="p-8 rounded-[2.5rem] border-2 border-red-500 bg-red-500/5 text-left transition-all group relative overflow-hidden shadow-2xl shadow-red-500/10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -translate-y-12 translate-x-12" />
                <LinkIcon className="h-10 w-10 mb-6 text-red-500" />
                <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">Write the website URL</h3>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest leading-relaxed mb-8">Render any public address into a PDF buffer.</p>
                
                <div className="space-y-4">
                  <Input
                    type="url"
                    placeholder="Paste URL (e.g., magicdocx.com)"
                    value={url}
                    onChange={e => {
                      setUrl(e.target.value);
                      if (urlError) setUrlError("");
                    }}
                    className={cn(
                      "h-14 rounded-2xl border-2 bg-background font-bold focus-visible:ring-red-500/20 transition-all",
                      urlError ? "border-destructive focus-visible:border-destructive" : "border-red-500/20 focus-visible:border-red-500"
                    )}
                    onKeyDown={e => e.key === "Enter" && url.trim() && handleProcess()}
                  />
                  {urlError && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest leading-relaxed px-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                      <X className="h-3 w-3" /> {urlError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToolSeoSection
        toolName="HTML to PDF Converter"
        category="convert"
        intro="MagicDocx HTML to PDF converter turns any webpage into a professionally formatted PDF document. Paste a public URL to render the page as-is with pixel-perfect accuracy. Ideal for developers, writers, and professionals who need print-ready PDF output from web content without any software installation."
        steps={[
          "Paste the webpage address into the URL input field.",
          "Enter the Layout Hub to configure your settings.",
          "Configure layout settings including Orientation, Margins, and Scaling.",
          "Click \"Initiate Synthesis\" to render and download your professional PDF."
        ]}
        formats={["URL", "PDF"]}
        relatedTools={[
          { name: "Word to PDF", path: "/word-to-pdf", icon: Globe },
          { name: "JPG to PDF", path: "/jpg-to-pdf", icon: Globe },
          { name: "Merge PDF", path: "/merge-pdf", icon: Globe },
          { name: "Compress PDF", path: "/compress-pdf", icon: Globe },
        ]}
        schemaName="HTML to PDF Converter Online"
        schemaDescription="Free online HTML to PDF converter. Convert any webpage URL to a high-fidelity PDF document."
      />
    </ToolLayout>
  );
};

export default HtmlToPdf;
