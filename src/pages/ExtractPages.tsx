import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileOutput } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const ExtractPages = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pageRange, setPageRange] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      const bytes = await newFiles[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setTotalPages(doc.getPageCount());
    } else {
      setTotalPages(0);
    }
  };

  const extract = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = parseRange(pageRange, doc.getPageCount());
      if (pages.length === 0) { toast.error("Invalid page range"); setProcessing(false); return; }

      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, pages.map(p => p - 1));
      copied.forEach(p => newDoc.addPage(p));
      setProgress(80);

      const pdfBytes = await newDoc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extracted-pages.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Extracted ${pages.length} page(s) successfully!`);
    } catch {
      toast.error("Failed to extract pages");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Extract PDF Pages" description="Extract specific pages into a new PDF document" category="edit" icon={<FileOutput className="h-7 w-7" />}
      metaTitle="Extract PDF Pages — Pull Pages Online Free" metaDescription="Extract specific pages from PDF into a new file. Free online tool.">
      <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} label="Select a PDF" />
      {totalPages > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Pages to extract</label>
            <Input placeholder="e.g. 1-3, 5, 7" value={pageRange} onChange={e => setPageRange(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Enter page numbers or ranges to extract</p>
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex justify-center">
            <Button size="lg" onClick={extract} disabled={processing || !pageRange} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Extracting…" : "Extract Pages"}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

function parseRange(input: string, max: number): number[] {
  const pages: number[] = [];
  const parts = input.split(",").map(s => s.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (isNaN(start) || isNaN(end)) continue;
      for (let i = Math.max(1, start); i <= Math.min(max, end); i++) pages.push(i);
    } else {
      const n = Number(part);
      if (!isNaN(n) && n >= 1 && n <= max) pages.push(n);
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}

export default ExtractPages;
