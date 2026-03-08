import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Wrench, Loader2, Info } from "lucide-react";
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
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setProgress(60);
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
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-edit/20 bg-tool-edit/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-edit">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Repair PDF</h1>
              <p className="text-sm text-muted-foreground">Fix corrupted or broken PDF files</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Re-serializes the PDF structure to fix common corruption issues. Works with most damaged files.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a corrupted PDF" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload corrupted PDF" },
            { step: "2", text: "We rebuild the structure" },
            { step: "3", text: "Download repaired PDF" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-edit text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && (
          <Button size="lg" onClick={repair} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Repairing…</> : <><Wrench className="mr-2 h-5 w-5" />Repair PDF</>}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-5 seconds</p>}
      </div>
    </ToolLayout>
  );
};

export default RepairPdf;
