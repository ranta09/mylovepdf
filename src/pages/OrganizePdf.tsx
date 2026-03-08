import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { LayoutGrid, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PageItem {
  index: number;
  preview: string;
}

const OrganizePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadPages = async (newFiles: File[]) => {
    setFiles(newFiles);
    setPages([]);
    if (newFiles.length === 0) return;
    setLoading(true);
    try {
      const bytes = await newFiles[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const items: PageItem[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        items.push({ index: i - 1, preview: canvas.toDataURL("image/jpeg", 0.6) });
      }
      setPages(items);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setPages(prev => {
      const arr = [...prev];
      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      return arr;
    });
  };

  const moveDown = (i: number) => {
    if (i === pages.length - 1) return;
    setPages(prev => {
      const arr = [...prev];
      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      return arr;
    });
  };

  const removePage = (i: number) => {
    setPages(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    if (files.length === 0 || pages.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const newDoc = await PDFDocument.create();
      
      for (let i = 0; i < pages.length; i++) {
        const [copied] = await newDoc.copyPages(srcDoc, [pages[i].index]);
        newDoc.addPage(copied);
        setProgress(20 + Math.round(((i + 1) / pages.length) * 70));
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "organized.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("PDF pages organized!");
    } catch {
      toast.error("Failed to save organized PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Organize Pages" description="Rearrange or delete pages in your PDF" category="edit" icon={<LayoutGrid className="h-7 w-7" />}
      metaTitle="Organize PDF Pages — Rearrange Pages Free" metaDescription="Rearrange, reorder and delete PDF pages. Free online PDF organizer." toolId="organize">
      <FileUpload accept=".pdf" files={files} onFilesChange={loadPages} label="Select a PDF to organize" />
      
      {loading && <p className="mt-4 text-center text-sm text-muted-foreground">Loading pages…</p>}
      
      {pages.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page, i) => (
              <div key={`${page.index}-${i}`} className="group relative rounded-lg border border-border bg-card shadow-card overflow-hidden">
                <img src={page.preview} alt={`Page ${i + 1}`} className="w-full" />
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/0 opacity-0 transition-all group-hover:bg-foreground/20 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveUp(i)} disabled={i === 0}>
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveDown(i)} disabled={i === pages.length - 1}>
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removePage(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="absolute bottom-1 right-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] text-background">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex justify-center">
            <Button size="lg" onClick={save} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Saving…" : `Save ${pages.length} pages`}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default OrganizePdf;
