import { useState, useRef } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Edit3, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface TextAnnotation {
  text: string;
  x: number;
  y: number;
  page: number;
}

const EditPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [newText, setNewText] = useState("Your text here");
  const [fontSize, setFontSize] = useState([16]);
  const [selectedPage, setSelectedPage] = useState(0);
  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);

  const loadPreview = async (newFiles: File[]) => {
    setFiles(newFiles);
    setAnnotations([]);
    if (newFiles.length === 0) { setPreviews([]); return; }
    try {
      const bytes = await newFiles[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const imgs: string[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        imgs.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      setPreviews(imgs);
    } catch {
      toast.error("Failed to load PDF preview");
    }
  };

  const handlePageClick = (e: React.MouseEvent, pageIdx: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setAnnotations(prev => [...prev, { text: newText, x, y, page: pageIdx }]);
  };

  const removeAnnotation = (idx: number) => {
    setAnnotations(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      
      setProgress(40);
      annotations.forEach(ann => {
        if (ann.page >= pages.length) return;
        const page = pages[ann.page];
        const { width, height } = page.getSize();
        page.drawText(ann.text, {
          x: (ann.x / 100) * width,
          y: height - (ann.y / 100) * height,
          size: fontSize[0],
          font,
          color: rgb(0, 0, 0),
        });
      });

      setProgress(70);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "edited.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("PDF saved with edits!");
    } catch {
      toast.error("Failed to save PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Edit PDF" description="Click on pages to add text annotations" category="edit" icon={<Edit3 className="h-7 w-7" />}
      metaTitle="Edit PDF — Add Text to PDF Online Free" metaDescription="Add text annotations to your PDF files. Free online PDF editor." toolId="edit" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Edit3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Edit PDF</h1>
            <p className="text-sm text-muted-foreground">Click on pages to add text annotations</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Works great with forms, letters, contracts, and any document needing annotations. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={loadPreview} label="Select a PDF to edit" />
      </div>

      {previews.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-foreground">Text to add</label>
              <Input value={newText} onChange={e => setNewText(e.target.value)} />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-sm font-medium text-foreground">Size: {fontSize[0]}</label>
              <Slider value={fontSize} onValueChange={setFontSize} min={8} max={48} step={1} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Click anywhere on the page to place text. Click annotations to remove them.</p>

          <div className="space-y-4">
            {previews.map((src, pageIdx) => (
              <div key={pageIdx} className="relative cursor-crosshair rounded-lg border border-border overflow-hidden shadow-card"
                ref={el => { previewRefs.current[pageIdx] = el; }}
                onClick={(e) => handlePageClick(e, pageIdx)}>
                <img src={src} alt={`Page ${pageIdx + 1}`} className="w-full" draggable={false} />
                {annotations.filter(a => a.page === pageIdx).map((ann, i) => (
                  <div key={i}
                    className="absolute cursor-pointer rounded bg-primary/20 px-1 text-foreground border border-primary/40 text-xs leading-tight hover:bg-destructive/30"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%`, fontSize: `${Math.max(10, fontSize[0] * 0.7)}px`, transform: "translate(-50%, -50%)" }}
                    onClick={(e) => { e.stopPropagation(); removeAnnotation(annotations.indexOf(ann)); }}
                    title="Click to remove">
                    {ann.text}
                  </div>
                ))}
                <div className="absolute bottom-2 right-2 rounded-md bg-foreground/70 px-2 py-0.5 text-xs text-background">
                  Page {pageIdx + 1}
                </div>
              </div>
            ))}
          </div>

          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={save} disabled={processing || annotations.length === 0} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : `Save PDF (${annotations.length} edit${annotations.length !== 1 ? "s" : ""})`}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default EditPdf;
