import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Merge, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const MergePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const merge = async () => {
    if (files.length < 2) { toast.error("Please add at least 2 PDF files"); return; }
    setProcessing(true);
    setProgress(10);
    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(10 + ((i + 1) / files.length) * 80);
      }
      const pdfBytes = await merged.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF merged successfully!");
    } catch {
      toast.error("Failed to merge PDFs");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Merge PDF" description="Combine multiple PDF files into a single document" category="merge" icon={<Merge className="h-7 w-7" />}
      metaTitle="Merge PDF — Combine PDF Files Online Free" metaDescription="Merge multiple PDF files into one document. Free, fast and secure online PDF merger." toolId="merge" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-merge/20 bg-tool-merge/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-merge">
              <Merge className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Merge PDF</h1>
              <p className="text-sm text-muted-foreground">Combine multiple PDF files into one document</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Upload two or more PDF files and merge them into a single document. Files are processed locally in your browser — nothing is uploaded to a server.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" multiple files={files} onFilesChange={setFiles} label="Select PDF files to merge" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload two or more PDFs" },
            { step: "2", text: "Arrange the file order" },
            { step: "3", text: "Download merged document" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-merge text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {processing && <Progress value={progress} className="h-2" />}
        {files.length >= 2 && (
          <Button size="lg" onClick={merge} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Merging…</> : <><Merge className="mr-2 h-5 w-5" />{`Merge ${files.length} files`}</>}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-10 seconds</p>}
      </div>
    </ToolLayout>
  );
};

export default MergePdf;
