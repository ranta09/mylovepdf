import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, Loader2, Info } from "lucide-react";
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
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
        setProgress(10 + Math.round((i / pdf.numPages) * 80));
      }
      setProgress(95);
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
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-convert/20 bg-tool-convert/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-convert">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">PDF to Word</h1>
              <p className="text-sm text-muted-foreground">Convert PDF to an editable Word document</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Extracts all text from your PDF and creates a Word-compatible document. Processed in your browser.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "We extract all text" },
            { step: "3", text: "Download Word document" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-convert text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && (
          <Button size="lg" onClick={convert} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Converting…</> : <><FileText className="mr-2 h-5 w-5" />Convert to Word</>}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~5-15 seconds</p>}
      </div>
    </ToolLayout>
  );
};

export default PdfToWord;
