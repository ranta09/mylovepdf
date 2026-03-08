import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Wrench, Loader2 } from "lucide-react";
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
      metaTitle="Repair PDF — Fix Broken PDF Files Free" metaDescription="Repair corrupted PDF files. Free online PDF repair tool." toolId="repair" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Repair PDF</h1>
            <p className="text-sm text-muted-foreground">Fix corrupted or broken PDF files by re-serializing the structure</p>
            <p className="mt-1 text-xs text-muted-foreground/70">◗ Works great with damaged downloads, broken attachments, and corrupted files. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a corrupted PDF" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={repair} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Repairing…</> : "Repair PDF"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
        </div>
      )}
    </ToolLayout>
  );
};

export default RepairPdf;
