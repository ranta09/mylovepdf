import { useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Droplets } from "lucide-react";
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
          rotate: { type: "degrees" as const, angle: -45 },
        });
      });
      setProgress(80);
      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
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
      metaTitle="Add Watermark to PDF — Free Online Tool" metaDescription="Add watermark text to your PDF files. Free online watermark tool.">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF" />
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
          <div className="flex justify-center">
            <Button size="lg" onClick={apply} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Applying…" : "Add Watermark"}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default WatermarkPdf;
