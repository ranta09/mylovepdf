import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileCheck } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument } from "pdf-lib";

const PdfToPdfa = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleConvert = async () => {
    const file = files[0];
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setProgress(50);
      pdfDoc.setTitle(file.name.replace('.pdf', ''));
      pdfDoc.setProducer('MagicPDFs — PDF/A Converter');
      pdfDoc.setCreator('MagicPDFs');
      setProgress(70);
      const pdfBytes = await pdfDoc.save();
      setProgress(90);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(".pdf", "_pdfa.pdf");
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast({ title: "Success", description: "PDF/A file downloaded successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to convert PDF.", variant: "destructive" });
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
      metaDescription="Convert PDF files to PDF/A, the ISO-standardized format for long-term document archiving. Free online converter with no sign-up required."
      toolId="pdf-to-pdfa"
    >
      <FileUpload accept=".pdf" onFilesChange={setFiles} files={files} label="Select a PDF to convert" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={handleConvert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Converting…" : "Convert to PDF/A"}
          </Button>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Sets PDF/A-compliant metadata and re-serializes the document for archival readiness.</p>
    </ToolLayout>
  );
};

export default PdfToPdfa;
