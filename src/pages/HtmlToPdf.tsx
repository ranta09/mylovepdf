import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Globe, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const HtmlToPdf = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        toast({ title: "Page Opened", description: "Use your browser's Print → Save as PDF to convert the page." });
      } else {
        toast({ title: "Pop-up Blocked", description: "Please allow pop-ups to convert the webpage.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to open the webpage.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert any webpage to a PDF document. Enter the URL and save the page as PDF."
      category="convert"
      icon={<Globe className="h-7 w-7" />}
      metaTitle="HTML to PDF — Convert Webpages to PDF Online Free"
      metaDescription="Convert any webpage or HTML to PDF online for free. Enter a URL and download the page as a high-quality PDF document instantly."
      toolId="html-to-pdf"
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Globe className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">HTML to PDF</h1>
            <p className="text-sm text-muted-foreground">Convert any webpage to a PDF document</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with articles, blog posts, documentation, and any web content. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">How it works</h2>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li>Enter the full URL of the webpage you want to convert</li>
            <li>Click "Convert to PDF" to open the page</li>
            <li>Use <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs">Ctrl+P</kbd> (or <kbd className="px-1.5 py-0.5 rounded bg-secondary text-xs">⌘+P</kbd> on Mac) to save as PDF</li>
          </ol>
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleConvert()}
            />
            <Button onClick={handleConvert} disabled={loading || !url.trim()} className="rounded-xl shrink-0">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Opening…</> : "Convert to PDF"}
            </Button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default HtmlToPdf;
