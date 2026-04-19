import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import { 
  Globe, 
  Loader2, 
  Link as LinkIcon, 
  FileCode,
  Plus,
  X,
  RectangleVertical,
  RectangleHorizontal,
  Monitor,
  Tablet,
  Smartphone,
  Tv,
  Eye,
  Download,
  RefreshCw,
  FileText,
  CheckCircle2,
  Maximize2
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  convertHtmlToPdf, 
  isValidUrl, 
  PageSize,
  Orientation,
  MarginSize
} from "@/lib/htmlToPdfEngine";

type ScreenSize = "laptop" | "tablet" | "mobile" | "custom";

const HtmlToPdf = () => {
  const [urlInput, setUrlInput] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  // iLovePDF-style settings
  const [screenSize, setScreenSize] = useState<ScreenSize>("laptop");
  const [customWidth, setCustomWidth] = useState("1440");
  const [oneLongPage, setOneLongPage] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const [margin, setMargin] = useState<MarginSize>("none");
  const [showPreview, setShowPreview] = useState(true);
  const [previewUrl, setPreviewUrl] = useState("");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  // iLovePDF-style settings
  const [blockAds, setBlockAds] = useState(false);
  const [removePopups, setRemovePopups] = useState(false);

  const screenSizes = {
    laptop: { width: 1366, icon: Tv, label: "Laptop (1366px)" },
    tablet: { width: 768, icon: Tablet, label: "Tablet (768px)" },
    mobile: { width: 375, icon: Smartphone, label: "Mobile (375px)" },
    custom: { width: parseInt(customWidth) || 1280, icon: Maximize2, label: "Custom Width" }
  };

  useEffect(() => {
    setDisableGlobalFeatures(url.trim() !== "" || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [url, processing, results.length, setDisableGlobalFeatures]);

  const resetTool = useCallback(() => {
    setUrl("");
    setUrlInput("");
    setResults([]);
    setProgress(0);
    setProcessing(false);
    setShowPreview(false);
    setPreviewUrl("");
  }, []);

  const validateUrlFormat = (value: string) => {
    if (!value.trim()) return true; // Let handleAddUrl check for empty
    
    // Auto-prepend https:// if protocol is missing
    let cleanUrl = value.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      const parsed = new URL(cleanUrl);
      // Ensure there's a hostname and it contains at least one dot (basic TLD check)
      return parsed.hostname.includes(".") && parsed.hostname.length > 3;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrlInput(value);
    if (urlError) {
      if (validateUrlFormat(value)) {
        setUrlError("");
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    const cleanedText = pastedText.trim();
    // We don't auto-modify the input field value during paste to avoid confusing the user,
    // but we clear the error if the pasted content is valid.
    if (validateUrlFormat(cleanedText)) {
      setUrlError("");
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError("Please enter a URL first.");
      return;
    }

    let finalUrl = trimmed;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://${finalUrl}`;
    }

    if (validateUrlFormat(finalUrl)) {
      setUrlError("");
      setUrl(finalUrl);
      setPreviewUrl(finalUrl);
      setShowPreview(true);
    } else {
      setUrlError("The URL seems invalid. Please check the format (e.g., https://example.com) and try again.");
    }
  };

  const handlePreview = async () => {
    if (!url.trim()) {
      toast.error("Please provide a URL first.");
      return;
    }

    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    setPreviewUrl(fullUrl);
    setShowPreview(true);
  };

  const handleConvert = async () => {
    if (!isValidUrl(url)) {
      toast.error("Please provide a valid webpage URL.");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setShowPreview(false);

    const allResults: ProcessingResult[] = [];
    const options = { 
      pageSize: oneLongPage ? "auto" : pageSize, 
      orientation, 
      margin, 
      scale: "fit" as const 
    };

    try {
      // Process URL if provided
      if (url.trim()) {
        setProgress(10);
        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        
        try {
          const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fullUrl)}`
          ];
          
          let html = "";
          let proxySuccess = false;
          
          for (const proxyUrl of proxies) {
            try {
              const response = await fetch(proxyUrl, { 
                method: 'GET',
                headers: {
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
              });
              
              if (response.ok) {
                html = await response.text();
                proxySuccess = true;
                break;
              }
            } catch (proxyErr) {
              console.warn(`Proxy ${proxyUrl} failed, trying next...`);
              continue;
            }
          }
          
          if (!proxySuccess || !html) {
            throw new Error("All CORS proxies failed");
          }
          
          const iframe = document.createElement("iframe");
          const viewportWidth = screenSizes[screenSize].width;
          iframe.style.position = "fixed";
          iframe.style.visibility = "hidden";
          iframe.style.width = `${viewportWidth}px`;
          iframe.style.height = oneLongPage ? "10000px" : "2000px";
          iframe.style.border = "none";
          iframe.style.zIndex = "-9999";
          document.body.appendChild(iframe);
          
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
            
            await new Promise(resolve => {
              if (doc.readyState === 'complete') {
                resolve(null);
              } else {
                iframe.onload = () => resolve(null);
              }
            });
            
            await new Promise(r => setTimeout(r, 3000));
            setProgress(30);

            // Inject cleaning script if requested
            if (blockAds || removePopups) {
              const selectors = [];
              if (blockAds) {
                selectors.push('.ads', '.ads-container', '[id*="google_ads"]', 'iframe[src*="ads"]', '.ad-unit', '[class*="ad-"]');
              }
              if (removePopups) {
                selectors.push('[class*="popup"]', '[class*="modal"]', '[class*="overlay"]', '[style*="z-index: 9999"]', '.cookie-banner', '#cookie-banner', '[id*="onetrust"]');
              }
              
              try {
                const selectorsStr = JSON.stringify(selectors);
                const cleaningScript = `
                  (function() {
                    const selectors = ${selectorsStr};
                    selectors.forEach(s => {
                      document.querySelectorAll(s).forEach(el => {
                        el.style.display = 'none';
                        el.remove();
                      });
                    });
                    document.body.style.overflow = 'auto';
                    document.documentElement.style.overflow = 'auto';
                  })();
                `;
                
                const scriptEl = doc.createElement('script');
                scriptEl.textContent = cleaningScript;
                doc.body.appendChild(scriptEl);
                
                // Extra CSS-based removal to be sure
                const styleEl = doc.createElement('style');
                styleEl.textContent = selectors.map(s => `${s} { display: none !important; opacity: 0 !important; pointer-events: none !important; }`).join(' ');
                doc.head.appendChild(styleEl);
                
                await new Promise(r => setTimeout(r, 1500)); // Wait for reflow
              } catch (err) {
                console.warn("HTML cleaning failed:", err);
              }
            }
            
            const bodyElement = doc.body || doc.documentElement;
            const pdfBlob = await convertHtmlToPdf(bodyElement, options);
            
            allResults.push({
              file: pdfBlob,
              url: URL.createObjectURL(pdfBlob),
              filename: url.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) + ".pdf"
            });
          }
          
          document.body.removeChild(iframe);
        } catch (err) {
          console.error("URL Conversion failed:", err);
          toast.error("URL conversion failed. Try downloading the HTML file and uploading it instead.");
        }
      }



      setResults(allResults);
      if (allResults.length > 0) {
        toast.success(`Successfully converted ${allResults.length} file(s) to PDF!`);
        if (allResults.length === 1) {
          const a = document.createElement("a");
          a.href = allResults[0].url;
          a.download = allResults[0].filename;
          a.click();
        }
      }
    } catch (error) {
      console.error("Conversion Error:", error);
      toast.error("Conversion failed. Please try another HTML file or webpage.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert web pages or HTML files into professional PDF documents"
      category="convert"
      icon={<Globe className="h-7 w-7" />}
      metaTitle="HTML to PDF Converter, Convert Webpages to PDF Online"
      metaDescription="Convert HTML files and URLs to PDF with high accuracy. Preserves CSS, images, and layouts. Free online tool."
      toolId="html-to-pdf"
      hideHeader={url.trim() !== "" || processing || results.length > 0}
    >
      {/* Processing State */}
      {processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex items-center justify-center">
          <div className="w-full max-w-md space-y-6 text-center p-8">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Globe className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">Converting to PDF...</h3>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% Complete</p>
            </div>
          </div>
        </div>
      )}

      {/* Results State */}
      {results.length > 0 && !processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background overflow-auto p-6">
          <ResultView results={results} onReset={resetTool} />
        </div>
      )}

      {/* Main Interface */}
      {!processing && results.length === 0 && (
        <>
          {/* Landing State */}
          {url.trim() === "" && (
            <div className="w-full mt-12 space-y-8">
              {/* URL Input */}
              <div className="w-full space-y-4">
                <Label className="text-base font-semibold">Enter Website URL</Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={urlInput}
                      onChange={e => handleUrlChange(e.target.value)}
                      onPaste={handlePaste}
                      className={cn(
                        "h-14 pl-12 text-base rounded-xl transition-all",
                        urlError ? "border-red-500 ring-offset-background focus-visible:ring-red-500" : ""
                      )}
                      onKeyDown={e => e.key === "Enter" && handleAddUrl()}
                    />
                  </div>
                  <Button 
                    onClick={handleAddUrl} 
                    className="h-14 px-8 text-lg font-bold rounded-xl gap-2 shadow-lg hover:shadow-primary/20 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    Add
                  </Button>
                </div>
                {urlError && (
                  <p className="text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                    {urlError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Configuration State */}
          {url.trim() !== "" && (
            <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
              <div className="flex-1 grid lg:grid-cols-[1fr,400px] overflow-hidden">
                  {/* Left: Preview */}
                  <div className="h-full flex flex-col items-center justify-start overflow-auto bg-stone-50/30 border-r border-border/50">
                    {previewUrl ? (
                      <div className={cn(
                        "w-full min-h-full transition-all duration-500 animate-in zoom-in-95",
                        !oneLongPage ? "p-12 space-y-12" : "p-0"
                      )}>
                        {!oneLongPage ? (
                          <>
                            {/* Simulated multi-page view */}
                            {[1, 2, 3].map((pageNum) => (
                              <div 
                                key={pageNum} 
                                className={cn(
                                  "mx-auto bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-border/40 relative",
                                  pageSize === "A4" ? (orientation === "portrait" ? "aspect-[210/297] w-[85%]" : "aspect-[297/210] w-[95%]") :
                                  pageSize === "letter" ? (orientation === "portrait" ? "aspect-[8.5/11] w-[85%]" : "aspect-[11/8.5] w-[95%]") :
                                  (orientation === "portrait" ? "aspect-[8.5/14] w-[85%]" : "aspect-[14/8.5] w-[95%]")
                                )}
                              >
                                {pageNum === 1 ? (
                                  <div className={cn(
                                    "w-full h-full bg-white transition-all duration-300",
                                    margin === "none" ? "p-0" :
                                    margin === "small" ? "p-8" : "p-16"
                                  )}>
                                    <div className="w-full h-full border border-dashed border-border/20 relative overflow-hidden">
                                      <iframe
                                        src={previewUrl}
                                        className="w-full h-full border-none pointer-events-none"
                                        style={{ zoom: 0.9 }}
                                        title="Preview"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full bg-stone-50/30 flex items-center justify-center select-none">
                                    <span className="text-3xl font-black text-stone-200 uppercase tracking-[0.2em]">Page {pageNum}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </>
                        ) : (
                          /* One Long Page */
                          <div className={cn(
                            "w-full bg-white shadow-2xl",
                            margin === "none" ? "p-0" :
                            margin === "small" ? "p-8" : "p-16"
                          )}>
                            <iframe
                              src={previewUrl}
                              className="w-full h-[5000px] border-none pointer-events-none"
                              style={{ zoom: 0.9 }}
                              title="Preview"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center space-y-4 max-w-sm">
                        <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-primary/10">
                          <Globe className="h-10 w-10 text-primary/40" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg">No Preview Available</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Enter a website URL and click Add to generate a visual preview of your document.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Settings */}
                  <div className="flex flex-col h-full bg-background border-l border-border/50 overflow-hidden">
                    <div className="flex-1 flex flex-col min-h-0 p-6 pt-10">
                      <ScrollArea className="flex-1 -mr-2 pr-2">
                        <div className="space-y-8 pr-4 px-1 pb-8">
                        {/* Tool Branding */}
                        <div className="pb-6 border-b border-border/50">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-xl">
                              <Globe className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">HTML to PDF</h2>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">Website URL</Label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  value={urlInput}
                                  onChange={(e) => handleUrlChange(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                                  className="h-9 pl-8 text-xs rounded-lg border-border/40 bg-secondary/20 focus-visible:ring-primary/20 transition-all"
                                  placeholder="https://example.com"
                                />
                              </div>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={handleAddUrl}
                                className="h-9 w-9 bg-secondary/20 hover:bg-primary hover:text-white rounded-lg transition-all"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>



                        {/* One Long Page */}
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Maximize2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                              <Label htmlFor="one-long-page" className="font-semibold cursor-pointer">One long page</Label>
                              <p className="text-xs text-muted-foreground">
                                Convert to single page instead of multiple pages
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="one-long-page"
                            checked={oneLongPage}
                            onCheckedChange={setOneLongPage}
                          />
                        </div>

                        {/* Orientation */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Orientation</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setOrientation("portrait")}
                              className={cn(
                                "h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-sm",
                                orientation === "portrait"
                                  ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <RectangleVertical className="h-6 w-6" />
                              <span className="text-sm font-bold">Portrait</span>
                            </button>
                            <button
                              onClick={() => setOrientation("landscape")}
                              className={cn(
                                "h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-sm",
                                orientation === "landscape"
                                  ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <RectangleHorizontal className="h-6 w-6" />
                              <span className="text-sm font-bold">Landscape</span>
                            </button>
                          </div>
                        </div>

                        {/* Page margin */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Page margin</Label>
                          <RadioGroup value={margin} onValueChange={(v) => setMargin(v as MarginSize)}>
                            {[
                               { id: "none", label: "No margin" },
                               { id: "small", label: "Small" },
                               { id: "normal", label: "Big" }
                            ].map((m) => (
                              <div key={m.id} className="flex items-center space-x-3">
                                <RadioGroupItem value={m.id} id={`margin-${m.id}`} />
                                <Label htmlFor={`margin-${m.id}`} className="cursor-pointer flex-1">
                                  {m.label}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>

                        {/* HTML Settings */}
                        <div className="pt-4 border-t border-border mt-6 space-y-4">
                          <Label className="text-base font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                             HTML Settings
                          </Label>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="block-ads" className="flex items-center gap-2 cursor-pointer font-medium">
                              Try to block ads
                            </Label>
                            <Switch id="block-ads" checked={blockAds} onCheckedChange={setBlockAds} />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="remove-popups" className="flex items-center gap-2 cursor-pointer font-medium">
                              Remove overlay popups
                            </Label>
                            <Switch id="remove-popups" checked={removePopups} onCheckedChange={setRemovePopups} />
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4 border-t">

                      <Button
                        className="w-full h-12"
                        onClick={handleConvert}
                        disabled={processing}
                      >
                        {processing ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <Download className="h-5 w-5 mr-2" />
                            Convert to PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {url.trim() === "" && results.length === 0 && !processing && (
        <ToolSeoSection
          toolName="HTML to PDF Converter"
          category="convert"
          intro="Convert any webpage URL into a professional PDF document. Our tool preserves layouts, styles, images, and formatting with high accuracy. Perfect for archiving web content, creating offline documentation, or sharing web pages as PDFs."
          steps={[
            "Enter a website URL",
            "Select your preferred screen size (Desktop, Laptop, Tablet, or Mobile)",
            "Choose orientation (Portrait or Landscape) and page size",
            "Enable 'One Long Page' option if you want a single continuous page",
            "Click 'Convert to PDF' to generate your document"
          ]}
          formats={["URL", "PDF"]}
          relatedTools={[
            { name: "Word to PDF", path: "/word-to-pdf", icon: Globe },
            { name: "JPG to PDF", path: "/jpg-to-pdf", icon: Globe },
            { name: "Merge PDF", path: "/merge-pdf", icon: Globe },
            { name: "Compress PDF", path: "/compress-pdf", icon: Globe },
          ]}
          schemaName="HTML to PDF Converter Online"
          schemaDescription="Free online HTML to PDF converter. Convert webpages and HTML files to PDF with high accuracy and customizable settings."
        />
      )}
    </ToolLayout>
  );
};

export default HtmlToPdf;
