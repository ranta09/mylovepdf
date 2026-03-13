import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import mammoth from "mammoth";
import { FileText } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";

const WordToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    const newResults: ProcessingResult[] = [];

    try {
      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        const arrayBuffer = await file.arrayBuffer();
        setProgress(10 + (f / files.length) * 20);

        let text = "";
        if (file.name.endsWith(".docx")) {
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } else {
          text = await file.text();
        }

        setProgress(30 + (f / files.length) * 20);
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const fontSize = 11;
        const margin = 50;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const maxWidth = pageWidth - margin * 2;
        const lineHeight = fontSize * 1.5;

        const lines: { text: string; bold: boolean }[] = [];
        const paragraphs = text.split("\n");

        for (const para of paragraphs) {
          if (!para.trim()) {
            lines.push({ text: "", bold: false });
            continue;
          }

          // Detect headings (short lines, often all caps or title-like)
          const isHeading = para.length < 80 && para === para.toUpperCase() && para.length > 3;
          const currentFont = isHeading ? boldFont : font;
          const currentSize = isHeading ? 14 : fontSize;

          const words = para.split(" ");
          let currentLine = "";

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = currentFont.widthOfTextAtSize(testLine, currentSize);
            if (width > maxWidth && currentLine) {
              lines.push({ text: currentLine, bold: isHeading });
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push({ text: currentLine, bold: isHeading });
        }

        const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
        for (let i = 0; i < lines.length; i += linesPerPage) {
          const page = doc.addPage([pageWidth, pageHeight]);
          const pageLines = lines.slice(i, i + linesPerPage);
          pageLines.forEach((line, idx) => {
            if (line.text.trim()) {
              page.drawText(line.text, {
                x: margin,
                y: pageHeight - margin - idx * lineHeight,
                size: line.bold ? 14 : fontSize,
                font: line.bold ? boldFont : font,
                color: rgb(0.1, 0.1, 0.1),
              });
            }
          });
        }

        const pdfBytes = await doc.save();
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        newResults.push({
          file: blob,
          url,
          filename: file.name.replace(/\.[^/.]+$/, "") + ".pdf",
        });

        setProgress(50 + ((f + 1) / files.length) * 50);
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`${newResults.length} document${newResults.length > 1 ? "s" : ""} converted to PDF!`);
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Word to PDF"
      description="Convert Word and text documents to PDF format"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="Word to PDF — Convert DOCX to PDF Free"
      metaDescription="Convert Word DOCX and text documents to PDF. Preserves formatting, fonts, and structure. Free online converter."
      toolId="word-to-pdf"
      hideHeader
    >
      <ToolHeader
        title="Word to PDF"
        description="Convert DOCX and DOC files to PDF"
        icon={<FileText className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".docx,.doc,.txt" multiple files={files} onFilesChange={setFiles} label="Select documents to convert (DOCX, DOC, TXT)" />
            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText={`Convert ${files.length} file${files.length !== 1 ? "s" : ""} to PDF`}
              processingText="Converting documents..."
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => { setFiles([]); setResults([]); }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default WordToPdf;
