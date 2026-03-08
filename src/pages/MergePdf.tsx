import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Merge, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader, { ToolSteps } from "@/components/ToolHeader";
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
        <ToolHeader
          icon={<Merge className="h-5 w-5 text-primary-foreground" />}
          title="Merge PDF"
          subtitle="Combine multiple PDFs into one document"
          category="merge"
          infoText="Upload two or more PDF files and merge them into a single document. Drag to reorder files before merging. Max file size: 100MB. Your files are private and automatically deleted after processing."
        />
        <FileUpload accept=".pdf" multiple files={files} onFilesChange={setFiles} label="Select PDF files to merge" />
        <ToolSteps steps={[
          { step: "1", text: "Upload your PDF files" },
          { step: "2", text: "Arrange file order" },
          { step: "3", text: "Download merged PDF" },
        ]} category="merge" />
        {processing && <Progress value={progress} className="h-2" />}
        {files.length >= 2 && (
          <Button size="lg" onClick={merge} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Merging…</> : `Merge ${files.length} files`}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-10 seconds</p>}
      </div>
    </ToolLayout>
  );
};

export default MergePdf;
