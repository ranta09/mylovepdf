import { useState } from "react";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { Droplets, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const WatermarkPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState([0.3]);
  const [fontSize, setFontSize] = useState([48]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const apply = async () => {
    if (files.length === 0 || !text.trim()) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const pages = doc.getPages();
      setProgress(50);
      pages.forEach(page => {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize[0]);
        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: height / 2,
          size: fontSize[0],
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: opacity[0],
          rotate: degrees(-45),
        });
      });
      setProgress(80);
      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "watermarked.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Watermark added!");
    } catch {
      toast.error("Failed to add watermark");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Add Watermark" description="Stamp text on every page of your PDF" category="edit" icon={<Droplets className="h-7 w-7" />}
      metaTitle="Add Watermark to PDF — Free Online Tool" metaDescription="Add watermark text to your PDF files. Free online watermark tool." toolId="watermark" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Add Watermark</h1>
            <p className="text-sm text-muted-foreground">Stamp text on every page of your PDF</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with confidential documents, drafts, and branded materials. Max file size: 100MB.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF" />
      </div>
      {files.length > 0 && (
        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Watermark text</label>
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Enter watermark text" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Opacity: {Math.round(opacity[0] * 100)}%</label>
            <Slider value={opacity} onValueChange={setOpacity} min={0.05} max={1} step={0.05} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Font size: {fontSize[0]}px</label>
            <Slider value={fontSize} onValueChange={setFontSize} min={12} max={120} step={4} />
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={apply} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Applying…</> : "Add Watermark"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default WatermarkPdf;
