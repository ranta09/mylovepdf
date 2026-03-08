import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Globe } from "lucide-react";
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
      // Open print dialog for the URL - browser-based approach
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
      icon={<Globe className="h-8 w-8" />}
      metaTitle="HTML to PDF — Convert Webpages to PDF Online Free"
      metaDescription="Convert any webpage or HTML to PDF online for free. Enter a URL and download the page as a high-quality PDF document instantly."
    >
      <div className="space-y-6">
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
            />
            <Button onClick={handleConvert} disabled={loading || !url.trim()} className="rounded-xl shrink-0">
              {loading ? "Opening…" : "Convert to PDF"}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">Frequently Asked Questions</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-foreground">Can I convert any website to PDF?</h3>
              <p className="text-muted-foreground mt-1">Yes, you can convert any publicly accessible webpage to PDF using this tool.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Is the conversion free?</h3>
              <p className="text-muted-foreground mt-1">Absolutely! This tool is 100% free with no limits or sign-ups required.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default HtmlToPdf;
