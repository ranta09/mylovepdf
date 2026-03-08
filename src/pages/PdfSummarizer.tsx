import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Copy, Download, FileText } from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdfTextExtract";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";

type SummaryMode = "short" | "bullets" | "highlights";

const PdfSummarizer = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<SummaryMode>("short");
  const { toast } = useToast();

  const handleSummarize = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setSummary("");

    try {
      const text = await extractTextFromPdf(files[0]);
      setProgress(50);

      if (!text.trim()) {
        toast({ title: "Error", description: "Could not extract text from PDF.", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-summarize", {
        body: { text, mode },
      });

      setProgress(90);

      if (error) throw error;
      setSummary(data.summary);
      setProgress(100);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to summarize.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast({ title: "Copied!", description: "Summary copied to clipboard." });
  };

  const downloadAsTxt = () => {
    const blob = new Blob([summary], { type: "text/plain" });
    saveAs(blob, "summary.txt");
  };

  const downloadAsPdf = async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const maxWidth = 495;

    const lines: string[] = [];
    for (const paragraph of summary.split("\n")) {
      const words = paragraph.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      lines.push("");
    }

    let page = doc.addPage();
    let y = page.getHeight() - margin;
    for (const line of lines) {
      if (y < margin) {
        page = doc.addPage();
        y = page.getHeight() - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
      y -= fontSize + 4;
    }

    const pdfBytes = await doc.save();
    saveAs(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }), "summary.pdf");
  };

  const modes: { value: SummaryMode; label: string }[] = [
    { value: "short", label: "Short Summary" },
    { value: "bullets", label: "Bullet Points" },
    { value: "highlights", label: "Key Highlights" },
  ];

  return (
    <ToolLayout
      title="PDF Notes Summarizer"
      description="Upload a PDF and get AI-generated summarized notes instantly."
      category="ai"
      icon={<Sparkles className="h-7 w-7" />}
      metaTitle="PDF Notes Summarizer — AI Summary Generator | My Love PDF"
      metaDescription="Upload any PDF and instantly get AI-powered summaries, bullet points, and key highlights."
    >
      <div className="space-y-6">
        <FileUpload accept=".pdf" multiple={false} onFilesChange={setFiles} files={files} label="Upload PDF to summarize" />

        {files.length > 0 && !summary && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {modes.map((m) => (
                <Button
                  key={m.value}
                  variant={mode === m.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode(m.value)}
                  className="rounded-xl"
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {processing && <Progress value={progress} className="h-2" />}

            <Button onClick={handleSummarize} disabled={processing} size="lg" className="w-full rounded-xl">
              <Sparkles className="mr-2 h-5 w-5" />
              {processing ? "Summarizing…" : "Generate Summary"}
            </Button>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyToClipboard} className="rounded-xl">
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button variant="outline" onClick={downloadAsTxt} className="rounded-xl">
                <Download className="mr-2 h-4 w-4" /> Download TXT
              </Button>
              <Button variant="outline" onClick={downloadAsPdf} className="rounded-xl">
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="ghost" onClick={() => { setSummary(""); setFiles([]); }} className="rounded-xl">
                Process Another
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Your files are private and automatically deleted after processing.</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfSummarizer;
