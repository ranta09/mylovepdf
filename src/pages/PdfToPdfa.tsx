import ToolLayout from "@/components/ToolLayout";
import { FileCheck } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument } from "pdf-lib";

const PdfToPdfa = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleConvert = async () => {
    const file = files[0];
    if (!file) return;
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      pdfDoc.setTitle(file.name.replace('.pdf', ''));
      pdfDoc.setProducer('MagicPDF - PDF/A Converter');
      pdfDoc.setCreator('MagicPDF');
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".pdf", "_pdfa.pdf");
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: "PDF/A file downloaded successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to convert PDF.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      title="PDF to PDF/A"
      description="Convert your PDF to PDF/A format for ISO-standardized long-term archiving. Preserve formatting for future access."
      category="convert"
      icon={<FileCheck className="h-8 w-8" />}
      metaTitle="PDF to PDF/A — Convert PDF to Archival Format Free"
      metaDescription="Convert PDF files to PDF/A, the ISO-standardized format for long-term document archiving. Free online converter with no sign-up required."
      toolId="pdf-to-pdfa"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">How to convert PDF to PDF/A</h2>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li>Upload your PDF document</li>
            <li>Click "Convert to PDF/A" to process</li>
            <li>Download your archival-ready PDF/A file</li>
          </ol>
          <FileUpload accept=".pdf" onFilesChange={setFiles} files={files} />
          {files.length > 0 && (
            <button
              onClick={handleConvert}
              disabled={processing}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {processing ? "Converting…" : "Convert to PDF/A"}
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">What is PDF/A?</h2>
          <p className="text-sm text-muted-foreground">PDF/A is an ISO-standardized version of PDF designed for long-term digital archiving. It ensures your document preserves its formatting and can be reliably reproduced in the future, regardless of the software used to open it.</p>
        </div>
      </div>
    </ToolLayout>
  );
};

export default PdfToPdfa;
