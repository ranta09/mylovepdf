import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToWord = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
        setProgress(10 + Math.round((i / pdf.numPages) * 80));
      }
      setProgress(95);
      // Create a .doc file (plain text in HTML format for Word compatibility)
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Converted Document</title></head><body>${fullText.split("\n").map(line => `<p>${line}</p>`).join("")}</body></html>`;
      const blob = new Blob([html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted.doc";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("PDF converted to Word document!");
    } catch {
      toast.error("Failed to convert PDF to Word");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="PDF to Word" description="Extract text from PDF and save as a Word document" category="convert" icon={<FileText className="h-7 w-7" />}
      metaTitle="PDF to Word — Convert PDF to DOC Free" metaDescription="Convert PDF files to editable Word documents. Free online PDF to Word converter." toolId="pdf-to-word" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">PDF to Word</h1>
            <p className="text-sm text-muted-foreground">Extract text from PDF and save as a Word document</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Works great with text-heavy PDFs, articles, reports, and research papers. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Convert to Word"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~5-15 seconds</p>}
        </div>
      )}
    </ToolLayout>
  );
};

export default PdfToWord;
