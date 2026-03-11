import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToWord = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);

    const newResults: ProcessingResult[] = [];
    const totalFiles = files.length;

    try {
      for (let f = 0; f < totalFiles; f++) {
        const file = files[f];
        const bytes = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str)
            .join(" ");
          fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;

          // Calculate progress across all files and pages
          const currentFileProgress = (i / pdf.numPages);
          const overallProgress = ((f + currentFileProgress) / totalFiles) * 100;
          setProgress(Math.round(overallProgress));
        }

        // Create a .doc file (plain text in HTML format for Word compatibility)
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Converted Document</title></head><body>${fullText.split("\n").map(line => `<p>${line}</p>`).join("")}</body></html>`;
        const blob = new Blob([html], { type: "application/msword" });
        const url = URL.createObjectURL(blob);

        newResults.push({
          file: blob,
          url,
          filename: file.name.replace(/\.pdf$/i, ".doc")
        });
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`${totalFiles} file(s) converted to Word!`);
    } catch {
      toast.error("Failed to convert PDF(s) to Word");
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
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with text-heavy PDFs, articles, reports, and research papers. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} multiple label="Select PDFs to convert" />
            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText="Convert to Word"
              processingText="Converting..."
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => {
              setFiles([]);
              setResults([]);
            }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfToWord;
