import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Hash, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const PageNumbers = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [position, setPosition] = useState<"bottom" | "top">("bottom");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const addNumbers = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const total = pages.length;

      setProgress(40);
      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const text = `${idx + 1} / ${total}`;
        const textWidth = font.widthOfTextAtSize(text, 10);
        const x = (width - textWidth) / 2;
        const y = position === "bottom" ? 20 : height - 30;
        page.drawText(text, { x, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      });

      setProgress(80);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "numbered.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("Page numbers added!");
    } catch {
      toast.error("Failed to add page numbers");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Page Numbers" description="Add page numbers to every page of your PDF" category="edit" icon={<Hash className="h-7 w-7" />}
      metaTitle="Add Page Numbers to PDF — Free Online Tool" metaDescription="Add page numbers to your PDF documents. Free online page numbering tool." toolId="page-numbers" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Hash className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Page Numbers</h1>
            <p className="text-sm text-muted-foreground">Add page numbers to every page of your PDF</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with manuscripts, dissertations, reports, and booklets. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF" />
      </div>
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Button variant={position === "bottom" ? "default" : "outline"} onClick={() => setPosition("bottom")}
              className={position === "bottom" ? "bg-primary text-primary-foreground" : ""}>
              Bottom
            </Button>
            <Button variant={position === "top" ? "default" : "outline"} onClick={() => setPosition("top")}
              className={position === "top" ? "bg-primary text-primary-foreground" : ""}>
              Top
            </Button>
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={addNumbers} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add Page Numbers"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default PageNumbers;
