import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Merge } from "lucide-react";
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
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
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
      metaTitle="Merge PDF — Combine PDF Files Online Free" metaDescription="Merge multiple PDF files into one document. Free, fast and secure online PDF merger.">
      <FileUpload accept=".pdf" multiple files={files} onFilesChange={setFiles} label="Select PDF files to merge" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length >= 2 && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={merge} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Merging…" : `Merge ${files.length} files`}
          </Button>
        </div>
      )}
    </ToolLayout>
  );
};

export default MergePdf;
