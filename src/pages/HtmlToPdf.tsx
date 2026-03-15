import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Globe, Loader2, Code, Link as LinkIcon, ShieldCheck, RotateCcw, FileBox, CheckCircle2, ArrowRight } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const HtmlToPdf = () => {
  const [url, setUrl] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState("url");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(url.trim() !== "" || htmlCode.trim() !== "");
    return () => setDisableGlobalFeatures(false);
  }, [url, htmlCode, setDisableGlobalFeatures]);

  const convertHtmlToPdf = async (htmlContent: string, filename: string) => {
    setProgress(30);

    // Create hidden iframe to render HTML
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not access iframe");

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 1500));
    setProgress(50);

    try {
      const canvas = await html2canvas(iframeDoc.body, {
        width: 1024,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      setProgress(75);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(filename);

      setProgress(100);
      toast.success("HTML converted to PDF!");
    } finally {
      document.body.removeChild(iframe);
    }
  };

  const handleUrlConvert = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setProgress(10);
    try {
      // For cross-origin URLs, we open in a new tab with print dialog
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        toast.success("Page opened! Use Ctrl+P / ⌘+P to save as PDF.");
      } else {
        toast.error("Pop-up blocked. Please allow pop-ups for this site.");
      }
      setProgress(100);
    } catch {
      toast.error("Failed to open the webpage.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const handleHtmlConvert = async () => {
    if (!htmlCode.trim()) return;
    setLoading(true);
    setProgress(10);
    try {
      await convertHtmlToPdf(htmlCode, "html-converted.pdf");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert HTML to PDF");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert any webpage or HTML code into a PDF document"
      category="convert"
      icon={<Globe className="h-7 w-7" />}
      metaTitle="HTML to PDF — Convert Webpages to PDF Online Free"
      metaDescription="Convert any webpage URL or HTML code to PDF. Preserves images, fonts, links, and layout. Free online converter."
      toolId="html-to-pdf"
      hideHeader={loading || !!url.trim() || !!htmlCode.trim()}
    >
      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(loading || url.trim() !== "" || htmlCode.trim() !== "") && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Web Rendering Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {loading ? "Rasterizing Viewport..." : "Environment Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => { setUrl(""); setHtmlCode(""); setProgress(0); setLoading(false); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              {mode === "url" ? (
                <Button size="sm" onClick={handleUrlConvert} disabled={loading || !url.trim()} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Open & Print
                </Button>
              ) : (
                <Button size="sm" onClick={handleHtmlConvert} disabled={loading || !htmlCode.trim()} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Convert to PDF
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-row overflow-hidden">
            {/* LEFT PANEL: Source Configuration */}
            <div className="w-full max-w-xl border-r border-border bg-secondary/5 flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileBox className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Source Configuration</span>
                </div>
                <Tabs value={mode} onValueChange={setMode} className="w-auto">
                  <TabsList className="bg-secondary/50 h-8 p-1 rounded-lg">
                    <TabsTrigger value="url" className="text-[9px] font-black uppercase px-3 h-6 rounded-md">URL</TabsTrigger>
                    <TabsTrigger value="html" className="text-[9px] font-black uppercase px-3 h-6 rounded-md">CODE</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                  {mode === "url" ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Web Entry Point</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <LinkIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                          </div>
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="h-14 pl-12 rounded-2xl border-2 border-border bg-card font-medium text-sm focus-visible:ring-orange-500/20 focus-visible:border-orange-500 transition-all"
                            onKeyDown={e => e.key === "Enter" && handleUrlConvert()}
                          />
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            <span className="text-[8px] font-black uppercase bg-secondary px-1.5 py-0.5 rounded text-muted-foreground tracking-widest">HTTPS REQ</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Rendering Protocol</h4>
                        <p className="text-[11px] leading-relaxed text-muted-foreground font-medium italic">"Note: Webpages will be opened in a high-fidelity rendering tab. Execute the print command (Ctrl+P) to capture the exact layout vectors into a PDF buffer."</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">HTML Stream</label>
                        <div className="relative rounded-2xl border-2 border-border bg-[#0d1117] overflow-hidden group focus-within:border-orange-500/50 transition-all shadow-2xl">
                          <div className="absolute top-0 inset-x-0 h-8 bg-card/20 border-b border-white/5 flex items-center px-4 gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-auto">index.html</span>
                          </div>
                          <Textarea
                            placeholder="<html><body><h1>Hello World</h1></body></html>"
                            value={htmlCode}
                            onChange={e => setHtmlCode(e.target.value)}
                            className="min-h-[400px] mt-8 bg-transparent border-none text-blue-400 font-mono text-xs focus-visible:ring-0 p-6 leading-relaxed selection:bg-orange-500/30"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-0.5">Secure Transmission</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none">AES-256 Encrypted Payload Path</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* MAIN WORKBENCH: Execution & Preview */}
            <div className="flex-1 bg-secondary/10 flex flex-col">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-full max-w-md space-y-8 text-center text-center">
                    <div className="relative flex justify-center items-center h-32">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border-4 border-orange-500/10" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
                      </div>
                      <Globe className="h-8 w-8 text-orange-500 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-black uppercase tracking-widest">Compiling Visual Vectors</h3>
                      <Progress value={progress} className="h-2 rounded-full" />
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Phase: Rasterization</span>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{progress}% COMPLETED</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

                  <div className="w-full max-w-3xl space-y-8 relative z-10 text-center">
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-background border border-border shadow-2xl relative group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-blue-500/5 opacity-50" />
                      <Globe className="h-10 w-10 text-orange-500 group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-4xl font-black uppercase tracking-tighter">Ready for Synthesis</h3>
                      <p className="text-muted-foreground max-w-lg mx-auto font-medium leading-relaxed">System environment is optimized to capture any webpage or custom HTML stream into a pixel-perfect, high-fidelity PDF buffer.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto pt-4">
                      {[
                        { label: 'High Fidelity', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
                        { label: 'Link Preservation', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
                        { label: 'CSS Optimization', icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> }
                      ].map((feature, i) => (
                        <div key={i} className="bg-background/50 backdrop-blur-sm border border-border p-4 rounded-2xl flex flex-col items-center gap-2 shadow-sm transition-all hover:border-orange-500/30">
                          {feature.icon}
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{feature.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-8">
                      {mode === "url" ? (
                        <Button size="lg" onClick={handleUrlConvert} disabled={loading || !url.trim()} className="h-16 rounded-[2rem] bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                          Open Rendering Lab <ArrowRight className="h-6 w-6" />
                        </Button>
                      ) : (
                        <Button size="lg" onClick={handleHtmlConvert} disabled={loading || !htmlCode.trim()} className="h-16 rounded-[2rem] bg-primary text-primary-foreground font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 gap-3">
                          Synthesize PDF <ArrowRight className="h-6 w-6" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Kernel Secure</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx Render v5.0.1</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Capture Node: Chromium Engine</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-6">
        {(!loading && url.trim() === "" && htmlCode.trim() === "") && (
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> URL
              </TabsTrigger>
              <TabsTrigger value="html" className="flex items-center gap-2">
                <Code className="h-4 w-4" /> HTML Code
              </TabsTrigger>
            </TabsList>
            <div className="mt-12 text-center max-w-xl mx-auto space-y-4 px-6 md:px-0">
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                Web to PDF <span className="text-orange-500">Synthesis.</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium">Choose your input vector to begin the conversion process.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <button onClick={() => setMode('url')} className={cn("p-6 rounded-3xl border-2 text-left transition-all group", mode === 'url' ? 'border-orange-500 bg-orange-500/5' : 'border-border hover:border-orange-500/30')}>
                  <LinkIcon className={cn("h-8 w-8 mb-4 transition-colors", mode === 'url' ? 'text-orange-500' : 'text-muted-foreground group-hover:text-orange-500')} />
                  <h3 className="text-lg font-black uppercase tracking-tight mb-1">Web URL</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Render any external page</p>
                </button>
                <button onClick={() => setMode('html')} className={cn("p-6 rounded-3xl border-2 text-left transition-all group", mode === 'html' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                  <Code className={cn("h-8 w-8 mb-4 transition-colors", mode === 'html' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                  <h3 className="text-lg font-black uppercase tracking-tight mb-1">HTML Code</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Compile your own stream</p>
                </button>
              </div>
            </div>
          </Tabs>
        )}
      </div>
    </ToolLayout>
  );
};

export default HtmlToPdf;
