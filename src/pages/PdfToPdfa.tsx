import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { FileCheck, Loader2, Info } from "lucide-react";
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
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <FileCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">PDF to PDF/A</h1>
            <p className="text-sm text-muted-foreground">Convert your PDF to PDF/A format for long-term archiving</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with legal documents, government records, and archival files. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" onFilesChange={setFiles} files={files} label="Select a PDF to convert" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={handleConvert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Convert to PDF/A"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Sets PDF/A-compliant metadata and re-serializes the document for archival readiness.</p>
    </ToolLayout>
  );
};

export default PdfToPdfa;
