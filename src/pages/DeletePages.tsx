import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Trash2, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { parseRange } from "@/lib/parseRange";

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
      metaTitle="Delete PDF Pages — Remove Pages Online Free" metaDescription="Delete specific pages from PDF files. Free online tool." toolId="delete-pages" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Trash2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Delete PDF Pages</h1>
            <p className="text-sm text-muted-foreground">Remove specific pages from your PDF document</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with multi-page documents, reports, and contracts. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} label="Select a PDF" />
      </div>
      {totalPages > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Pages to delete</label>
            <Input placeholder="e.g. 2, 4-6, 8" value={pageRange} onChange={e => setPageRange(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">Enter page numbers or ranges to remove</p>
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={deletePages} disabled={processing || !pageRange} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : "Delete Pages"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default DeletePages;
