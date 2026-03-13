import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Globe, Loader2, Code, Link as LinkIcon } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const HtmlToPdf = () => {
  const [url, setUrl] = useState("");
  const [htmlCode, setHtmlCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState("url");

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
      hideHeader
    >
      <ToolHeader
        title="HTML to PDF"
        description="Convert webpages and HTML code to PDF documents"
        icon={<Globe className="h-5 w-5 text-primary-foreground" />}
      />

      <div className="mt-5 space-y-6">
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" /> URL
            </TabsTrigger>
            <TabsTrigger value="html" className="flex items-center gap-2">
              <Code className="h-4 w-4" /> HTML Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="mt-6">
            <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-2">Enter Webpage URL</h3>
              <p className="text-xs text-muted-foreground mb-4">The page will open in a new tab. Use your browser's print function to save as PDF.</p>
              <div className="flex gap-3">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="rounded-xl"
                  onKeyDown={e => e.key === "Enter" && handleUrlConvert()}
                />
                <Button onClick={handleUrlConvert} disabled={loading || !url.trim()} className="rounded-xl shrink-0">
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opening…</> : "Open & Print"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="html" className="mt-6">
            <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-bold text-foreground mb-2">Paste HTML Code</h3>
              <p className="text-xs text-muted-foreground mb-4">Paste your HTML content and we'll render it directly to PDF.</p>
              <Textarea
                placeholder="<html><body><h1>Hello World</h1></body></html>"
                value={htmlCode}
                onChange={e => setHtmlCode(e.target.value)}
                className="min-h-[200px] font-mono text-sm rounded-xl"
              />
              <Button
                onClick={handleHtmlConvert}
                disabled={loading || !htmlCode.trim()}
                className="rounded-xl mt-4 w-full"
                size="lg"
              >
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Convert to PDF"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {loading && progress > 0 && (
          <div className="max-w-md mx-auto">
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground text-center mt-2">Processing... {progress}%</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default HtmlToPdf;
