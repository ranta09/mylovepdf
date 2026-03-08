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
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-edit/20 bg-tool-edit/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-edit">
              <Hash className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Page Numbers</h1>
              <p className="text-sm text-muted-foreground">Add page numbers to every page of your PDF</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Automatically number all pages in your PDF. Choose top or bottom placement.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "Choose number position" },
            { step: "3", text: "Download numbered PDF" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-edit text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Button variant={position === "bottom" ? "default" : "outline"} onClick={() => setPosition("bottom")} className="rounded-xl">
                Bottom
              </Button>
              <Button variant={position === "top" ? "default" : "outline"} onClick={() => setPosition("top")} className="rounded-xl">
                Top
              </Button>
            </div>
            {processing && <Progress value={progress} className="h-2" />}
            <Button size="lg" onClick={addNumbers} disabled={processing} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Adding…</> : <><Hash className="mr-2 h-5 w-5" />Add Page Numbers</>}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default PageNumbers;
