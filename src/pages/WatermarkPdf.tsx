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
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-edit/20 bg-tool-edit/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-edit">
              <Droplets className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Add Watermark</h1>
              <p className="text-sm text-muted-foreground">Stamp text on every page of your PDF</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Add custom watermark text with adjustable opacity and font size. Perfect for marking documents as confidential, draft, or sample.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "Customize watermark text" },
            { step: "3", text: "Download watermarked PDF" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-edit text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {files.length > 0 && (
          <div className="space-y-5">
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
            {processing && <Progress value={progress} className="h-2" />}
            <Button size="lg" onClick={apply} disabled={processing} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Applying…</> : <><Droplets className="mr-2 h-5 w-5" />Add Watermark</>}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default WatermarkPdf;
