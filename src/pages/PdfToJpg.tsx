import { useState, useCallback } from "react";
import { Image, Loader2, Info } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToJpg = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);

  const convert = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setPreviews([]);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const totalPages = pdf.numPages;
      const images: string[] = [];
      const zip = new JSZip();

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        images.push(dataUrl);
        const base64 = dataUrl.split(",")[1];
        zip.file(`page-${i}.jpg`, base64, { base64: true });
        setProgress(Math.round((i / totalPages) * 90));
      }

      setPreviews(images);
      setProgress(95);
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, "pdf-images.zip");
      setProgress(100);
      toast.success(`Converted ${totalPages} pages to JPG!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [files]);

  return (
    <ToolLayout title="PDF to JPG" description="Convert each PDF page into a high-quality JPG image" category="convert" icon={<Image className="h-7 w-7" />}
      metaTitle="PDF to JPG — Convert PDF Pages to Images Free" metaDescription="Convert PDF pages to JPG images. Free online PDF to image converter." toolId="pdf-to-jpg" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-convert/20 bg-tool-convert/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-convert">
              <Image className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">PDF to JPG</h1>
              <p className="text-sm text-muted-foreground">Convert each page into a high-quality image</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Each page is converted to a high-resolution JPG image. All images are bundled into a ZIP file for easy download.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "We render each page" },
            { step: "3", text: "Download images as ZIP" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-convert text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && previews.length === 0 && (
          <Button size="lg" onClick={convert} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Converting…</> : <><Image className="mr-2 h-5 w-5" />Convert to JPG</>}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~5-20 seconds</p>}

        {previews.length > 0 && (
          <div className="space-y-4">
            <p className="text-center text-sm font-medium text-foreground">{previews.length} images extracted — ZIP downloaded automatically</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {previews.slice(0, 9).map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} className="rounded-lg border border-border shadow-card" />
              ))}
            </div>
            {previews.length > 9 && <p className="text-center text-xs text-muted-foreground">+{previews.length - 9} more pages</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfToJpg;
