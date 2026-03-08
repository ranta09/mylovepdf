import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Trash2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const DeletePages = () => {
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

  const deletePages = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pagesToDelete = parseRange(pageRange, doc.getPageCount());
      if (pagesToDelete.length === 0) { toast.error("Invalid page range"); setProcessing(false); return; }
      if (pagesToDelete.length >= doc.getPageCount()) { toast.error("Cannot delete all pages"); setProcessing(false); return; }

      const pagesToKeep = Array.from({ length: doc.getPageCount() }, (_, i) => i)
        .filter(i => !pagesToDelete.map(p => p - 1).includes(i));

      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, pagesToKeep);
      copied.forEach(p => newDoc.addPage(p));
      setProgress(80);

      const pdfBytes = await newDoc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pages-deleted.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Deleted ${pagesToDelete.length} page(s) successfully!`);
    } catch {
      toast.error("Failed to delete pages");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Delete PDF Pages" description="Remove specific pages from your PDF document" category="edit" icon={<Trash2 className="h-7 w-7" />}
      metaTitle="Delete PDF Pages — Remove Pages Online Free" metaDescription="Delete specific pages from PDF files. Free online tool." toolId="delete-pages">
      <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} label="Select a PDF" />
      {totalPages > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Pages to delete</label>
            <Input placeholder="e.g. 2, 4-6, 8" value={pageRange} onChange={e => setPageRange(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Enter page numbers or ranges to remove</p>
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex justify-center">
            <Button size="lg" onClick={deletePages} disabled={processing || !pageRange} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Deleting…" : "Delete Pages"}
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

export default DeletePages;
