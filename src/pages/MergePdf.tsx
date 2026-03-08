import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Merge, Loader2 } from "lucide-react";
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
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Merge className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Merge PDF</h1>
            <p className="text-sm text-muted-foreground">Combine multiple PDF files into a single document</p>
            <p className="mt-1 text-xs text-muted-foreground/70">◗ Works great with contracts, reports, invoices, and any PDF files. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" multiple files={files} onFilesChange={setFiles} label="Select PDF files to merge" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length >= 2 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={merge} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Merging…</> : `Merge ${files.length} files`}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-10 seconds</p>}
        </div>
      )}
    </ToolLayout>
  );
};

export default MergePdf;
