import { useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { FileText, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const WordToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const text = await files[0].text();
      setProgress(30);
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const margin = 50;
      const pageWidth = 595;
      const pageHeight = 842;
      const maxWidth = pageWidth - margin * 2;
      const lineHeight = fontSize * 1.5;
      
      const lines: string[] = [];
      const paragraphs = text.split("\n");
      for (const para of paragraphs) {
        if (para.trim() === "") {
          lines.push("");
          continue;
        }
        const words = para.split(" ");
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = font.widthOfTextAtSize(testLine, fontSize);
          if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      setProgress(50);
      const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
      for (let i = 0; i < lines.length; i += linesPerPage) {
        const page = doc.addPage([pageWidth, pageHeight]);
        const pageLines = lines.slice(i, i + linesPerPage);
        pageLines.forEach((line, idx) => {
          page.drawText(line, {
            x: margin,
            y: pageHeight - margin - idx * lineHeight,
            size: fontSize,
            font,
          });
        });
      }

      setProgress(80);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "converted.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("Document converted to PDF!");
    } catch {
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Word to PDF" description="Convert text documents to PDF format" category="convert" icon={<FileText className="h-7 w-7" />}
      metaTitle="Word to PDF — Convert Documents to PDF Free" metaDescription="Convert Word and text documents to PDF. Free online document to PDF converter." toolId="word-to-pdf">
      <FileUpload accept=".txt,.doc,.docx,.rtf" files={files} onFilesChange={setFiles} label="Select a document to convert" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Convert to PDF"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~5 seconds</p>}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Supports .txt files. For complex .docx formatting, some layout may be simplified.</p>
    </ToolLayout>
  );
};

export default WordToPdf;
