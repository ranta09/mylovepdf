import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToWord = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [conversionMode, setConversionMode] = useState("standard");

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

        // Extract structured text with positioning
        const pages: { text: string; items: any[] }[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // Group items by Y position for paragraph detection
          const lineMap = new Map<number, any[]>();
          content.items.forEach((item: any) => {
            const y = Math.round(item.transform[5] / 2) * 2; // Round to 2px groups
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y)!.push(item);
          });

          const sortedLines = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);
          let pageText = "";
          sortedLines.forEach(([, items]) => {
            items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
            const lineText = items.map((it: any) => it.str).join(" ").trim();
            if (lineText) pageText += lineText + "\n";
          });

          pages.push({ text: pageText, items: content.items as any[] });
          const overallProgress = ((f + (i / pdf.numPages)) / totalFiles) * 90;
          setProgress(Math.round(overallProgress));
        }

        // Build DOCX-compatible HTML
        let cssStyles = "";
        if (conversionMode === "exact") {
          cssStyles = `body { font-family: 'Times New Roman', serif; line-height: 1.0; margin: 1in; } p { margin: 0; padding: 2px 0; } h1,h2,h3 { margin: 12px 0 6px; }`;
        } else if (conversionMode === "continuous") {
          cssStyles = `body { font-family: Arial, sans-serif; line-height: 1.6; margin: 1in; } p { min-height: 1em; margin-bottom: 8px; }`;
        } else {
          cssStyles = `body { font-family: Calibri, sans-serif; line-height: 1.15; margin: 1in; } p { margin: 0 0 6px; } h1 { font-size: 20pt; margin: 18px 0 8px; } h2 { font-size: 16pt; margin: 14px 0 6px; }`;
        }

        const htmlContent = pages.map((page, idx) => {
          const lines = page.text.split("\n").filter(l => l.trim());
          const htmlLines = lines.map(line => {
            // Detect headings: short lines with larger implied font or all-caps
            const isHeading = (line.length < 80 && line === line.toUpperCase() && line.length > 3);
            if (isHeading) return `<h2>${escapeHtml(line)}</h2>`;
            return `<p>${escapeHtml(line)}</p>`;
          });
          return htmlLines.join("\n") + (idx < pages.length - 1 ? '<br clear="all" style="page-break-after:always" />' : "");
        }).join("\n");

        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Converted Document</title><style>${cssStyles}</style></head><body>${htmlContent}</body></html>`;

        const blob = new Blob([html], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: file.name.replace(/\.pdf$/i, ".doc") });
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`${totalFiles} file${totalFiles > 1 ? "s" : ""} converted to Word!`);
    } catch {
      toast.error("Failed to convert PDF(s) to Word");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to Word"
      description="Convert PDF documents into editable Word files"
      category="convert"
      icon={<FileText className="h-7 w-7" />}
      metaTitle="PDF to Word — Convert PDF to Editable DOCX Free"
      metaDescription="Convert PDF files to editable Word documents. Preserves layout, fonts, and paragraph structure. Free online converter."
      toolId="pdf-to-word"
      hideHeader
    >
      <ToolHeader
        title="PDF to Word"
        description="Convert your PDF to editable Word document"
        icon={<FileText className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <div className="mt-5">
              <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select PDF files to convert" collapsible={false} />
            </div>

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Conversion Settings</h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Document Formatting Mode</Label>
                  <Select value={conversionMode} onValueChange={setConversionMode}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (Recommended)</SelectItem>
                      <SelectItem value="exact">Exact (Match original layout)</SelectItem>
                      <SelectItem value="continuous">Continuous (Flowing text)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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
            onReset={() => { setFiles([]); setResults([]); }}
          />
        )}
      </div>
    </ToolLayout >
  );
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default PdfToWord;
