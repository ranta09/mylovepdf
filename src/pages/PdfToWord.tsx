import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, Loader2, Info, ShieldCheck } from "lucide-react";
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
  const [conversionMode, setConversionMode] = useState("standard"); // standard, exact, continuous

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

        // Adjust CSS based on conversion mode
        let cssIncludes = "";
        if (conversionMode === "exact") {
          cssIncludes = "<style>body { font-family: 'Times New Roman', serif; line-height: 1.0; } p { margin: 0; padding: 2px 0; }</style>";
        } else if (conversionMode === "continuous") {
          cssIncludes = "<style>body { font-family: Arial, sans-serif; line-height: 1.5; } p { min-height: 1em; margin-bottom: 8px; }</style>";
        } else {
          cssIncludes = "<style>body { font-family: Calibri, sans-serif; line-height: 1.15; }</style>";
        }

        // Create a .doc file (plain text in HTML format for Word compatibility)
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Converted Document</title>${cssIncludes}</head><body>${fullText.split("\n").map(line => `<p>${line}</p>`).join("")}</body></html>`;
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
      <ToolHeader
        title="PDF to Word"
        description="Convert your PDF to editable Word document"
        icon={<FileText className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} multiple label="Select PDFs to convert" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Conversion Settings</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Document Formatting Mode</Label>
                    <Select value={conversionMode} onValueChange={setConversionMode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select formatting mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (Recommended - Balances layout and editability)</SelectItem>
                        <SelectItem value="exact">Exact (Attempts to match layout precisely, harder to edit)</SelectItem>
                        <SelectItem value="continuous">Continuous (Optimized for flowing text, ignores layout)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
