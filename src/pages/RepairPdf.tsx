import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Wrench } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const RepairPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const repair = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      setProgress(40);
      // Attempt to load and re-save — this re-serializes the PDF structure
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setProgress(60);
      // Clean up by re-saving with proper structure
      const pdfBytes = await doc.save({ useObjectStreams: true });
      setProgress(90);
      
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "repaired.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success(`PDF repaired! ${doc.getPageCount()} pages recovered.`);
    } catch {
      toast.error("Unable to repair this PDF. The file may be too corrupted.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Repair PDF" description="Fix corrupted or broken PDF files by re-serializing the structure" category="edit" icon={<Wrench className="h-7 w-7" />}
      metaTitle="Repair PDF — Fix Broken PDF Files Free" metaDescription="Repair corrupted PDF files. Free online PDF repair tool." toolId="repair">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a corrupted PDF" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={repair} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Repairing…" : "Repair PDF"}
          </Button>
        </div>
      )}
    </ToolLayout>
  );
};

export default RepairPdf;
