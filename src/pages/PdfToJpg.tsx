import { useState, useRef, useCallback } from "react";
import { Image } from "lucide-react";
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
      metaTitle="PDF to JPG — Convert PDF Pages to Images Free" metaDescription="Convert PDF pages to JPG images. Free online PDF to image converter.">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && previews.length === 0 && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Converting…" : "Convert to JPG"}
          </Button>
        </div>
      )}
      {previews.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-center text-sm font-medium text-foreground">{previews.length} images extracted — ZIP downloaded automatically</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.slice(0, 9).map((src, i) => (
              <img key={i} src={src} alt={`Page ${i + 1}`} className="rounded-lg border border-border shadow-card" />
            ))}
          </div>
          {previews.length > 9 && <p className="text-center text-xs text-muted-foreground">+{previews.length - 9} more pages</p>}
        </div>
      )}
    </ToolLayout>
  );
};

export default PdfToJpg;
