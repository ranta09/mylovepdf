import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Copy, Download, FileText, CheckCircle2, Info } from "lucide-react";
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
      title="Summarize PDF"
      description="Turn any PDF into concise notes, bullet points, or key highlights using AI."
      category="ai"
      icon={<Sparkles className="h-7 w-7" />}
      metaTitle="Summarize PDF Online — AI Notes Generator | My Love PDF"
      metaDescription="Upload any PDF and instantly get AI-powered summaries, bullet points, and key highlights. Free and fast."
      hideHeader
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="rounded-2xl border border-tool-ai/20 bg-tool-ai/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-ai">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Summarize PDF with AI</h1>
              <p className="text-sm text-muted-foreground">Get instant notes from any document</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { step: "1", text: "Upload your PDF file" },
              { step: "2", text: "Choose summary format" },
              { step: "3", text: "Download or copy your notes" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-ai text-xs font-bold text-primary-foreground">{s.step}</span>
                <span className="text-sm text-foreground">{s.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Works great with research papers, textbooks, reports, articles, and any text-based PDF. Max file size: 100MB. Your files are private and automatically deleted after processing.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" multiple={false} onFilesChange={setFiles} files={files} label="Upload your PDF" />

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
              {processing ? "Summarizing…" : "Summarize Now"}
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
                Summarize Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfSummarizer;
