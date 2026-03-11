import { useState } from "react";
import { ScanLine, Copy, Download, Loader2, Info } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
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
    setProgress(5);
    setExtractedText("");

    const worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgress(10 + Math.round(m.progress * 85));
        }
      },
    });

    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const { data: { text } } = await worker.recognize(canvas);

        fullText += `--- Page ${i} ---\n${text}\n\n`;
      }

      if (!fullText.trim()) {
        toast.error("No text could be recognized. Try another document.");
        setProcessing(false);
        return;
      }

      setExtractedText(fullText);
      setProgress(100);
      toast.success(`OCR complete for ${pdf.numPages} page(s)!`);
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("Failed to process PDF with OCR");
    } finally {
      await worker.terminate();
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
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <ScanLine className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">OCR PDF</h1>
            <p className="text-sm text-muted-foreground">Extract text from scanned PDFs using text recognition</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with scanned documents, photographed pages, and image-based PDFs. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={(f) => { setFiles(f); setExtractedText(""); }} label="Select a scanned PDF" />
      </div>

      {processing && <Progress value={progress} className="mt-4" />}

      {files.length > 0 && !extractedText && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={handleProcess} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running OCR…</> : "Apply OCR"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~10-30 seconds per page</p>}
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
