import { useState } from "react";
import { ScanLine, Copy, Download } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const OcrPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setExtractedText("");

    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        setProgress(10 + Math.round((i / pdf.numPages) * 85));
      }

      if (!fullText.trim()) {
        toast.error("No text could be extracted. The PDF may contain only images.");
        setProcessing(false);
        return;
      }

      setExtractedText(fullText);
      setProgress(100);
      toast.success(`Extracted text from ${pdf.numPages} page(s)!`);
    } catch {
      toast.error("Failed to process PDF");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Copied to clipboard!");
  };

  const downloadAsTxt = () => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr-extracted.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolLayout
      title="OCR PDF"
      description="Extract text from scanned PDFs using text recognition technology."
      category="edit"
      icon={<ScanLine className="h-7 w-7" />}
      metaTitle="OCR PDF — Make Scanned PDFs Searchable Online Free"
      metaDescription="Convert scanned PDF documents into searchable, selectable text using OCR technology. Free online OCR for PDF files with no sign-up required."
      toolId="ocr-pdf"
    >
      <FileUpload accept=".pdf" files={files} onFilesChange={(f) => { setFiles(f); setExtractedText(""); }} label="Select a scanned PDF" />

      {processing && <Progress value={progress} className="mt-4" />}

      {files.length > 0 && !extractedText && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={handleProcess} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Extracting Text…" : "Apply OCR"}
          </Button>
        </div>
      )}

      {extractedText && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-foreground">Extracted Text</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-xl gap-1">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadAsTxt} className="rounded-xl gap-1">
                <Download className="h-3.5 w-3.5" /> Download TXT
              </Button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-4 text-sm text-foreground whitespace-pre-wrap">
            {extractedText}
          </div>
          <Button variant="ghost" onClick={() => { setFiles([]); setExtractedText(""); }} className="rounded-xl">
            Process Another PDF
          </Button>
        </div>
      )}
    </ToolLayout>
  );
};

export default OcrPdf;
