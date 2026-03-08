import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Scissors, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { parseRange } from "@/lib/parseRange";

const SplitPdf = () => {
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

  const split = async () => {
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
      a.download = "split.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF split successfully!");
    } catch {
      toast.error("Failed to split PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Split PDF" description="Extract specific pages from your PDF document" category="split" icon={<Scissors className="h-7 w-7" />}
      metaTitle="Split PDF — Extract Pages Online Free" metaDescription="Split PDF files and extract pages. Free online PDF splitter tool." toolId="split" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-split/20 bg-tool-split/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-split">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Split PDF</h1>
              <p className="text-sm text-muted-foreground">Extract specific pages from your PDF document</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Upload a PDF and specify page ranges to extract into a new file. Supports ranges like "1-3, 5, 7-9". Max file size: 100MB. Your files are private and automatically deleted after processing.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} label="Select a PDF to split" />
        {totalPages > 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Total pages: <span className="font-semibold text-foreground">{totalPages}</span></p>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Page range</label>
              <Input placeholder="e.g. 1-3, 5, 7-9" value={pageRange} onChange={e => setPageRange(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Enter page numbers or ranges separated by commas</p>
            </div>
            {processing && <Progress value={progress} />}
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={split} disabled={processing || !pageRange} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Splitting…</> : "Split PDF"}
              </Button>
              {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default SplitPdf;
