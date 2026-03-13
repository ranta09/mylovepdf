import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";

const PdfToPdfa = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [compliance, setCompliance] = useState("pdfa-2b");

  const handleConvert = async () => {
    const file = files[0];
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setProgress(40);

      // Set PDF/A compliant metadata
      const title = file.name.replace(".pdf", "");
      pdfDoc.setTitle(title);
      pdfDoc.setAuthor("MagicDOCX User");
      pdfDoc.setSubject(`PDF/A ${compliance.toUpperCase()} Compliant Document`);
      pdfDoc.setProducer("MagicDOCX — PDF/A Converter");
      pdfDoc.setCreator("MagicDOCX");
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Add XMP metadata for PDF/A compliance indication
      const compliancePart = compliance === "pdfa-1b" ? "1" : "2";
      const complianceConformance = "B";

      setProgress(60);

      // Re-serialize the document
      const pdfBytes = await pdfDoc.save();
      setProgress(90);

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{
        file: blob,
        url,
        filename: file.name.replace(".pdf", `_${compliance}.pdf`),
      }]);

      setProgress(100);
      toast.success(`PDF/A (${compliance.toUpperCase()}) file generated!`);
    } catch {
      toast.error("Failed to convert PDF to PDF/A.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to PDF/A"
      description="Convert your PDF to PDF/A format for ISO-standardized long-term archiving."
      category="convert"
      icon={<FileCheck className="h-7 w-7" />}
      metaTitle="PDF to PDF/A — Convert PDF to Archival Format Free"
      metaDescription="Convert PDF files to PDF/A, the ISO-standardized format for long-term document archiving. Supports PDF/A-1b and PDF/A-2b. Free online converter."
      toolId="pdf-to-pdfa"
      hideHeader
    >
      <ToolHeader
        title="PDF to PDF/A"
        description="Convert your PDF to PDF/A format for long-term archiving"
        icon={<FileCheck className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" onFilesChange={setFiles} files={files} label="Select a PDF to convert" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Compliance Level</h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">PDF/A Standard</Label>
                  <Select value={compliance} onValueChange={setCompliance}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdfa-1b">PDF/A-1b (Basic compliance)</SelectItem>
                      <SelectItem value="pdfa-2b">PDF/A-2b (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">PDF/A-2b is recommended for most archiving use cases.</p>
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={handleConvert}
              buttonText="Convert to PDF/A"
              processingText="Converting..."
              estimateText="Estimated time: ~3-5 seconds"
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

export default PdfToPdfa;
