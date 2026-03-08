import { useState, useCallback } from "react";
import { Image, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader, { ToolSteps } from "@/components/ToolHeader";
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
        <ToolHeader
          icon={<Image className="h-5 w-5 text-primary-foreground" />}
          title="PDF to JPG"
          subtitle="Convert each page into a high-quality image"
          category="convert"
          infoText="Each page is exported as a high-quality JPG image and downloaded as a ZIP. Great for presentations and social media. Max file size: 100MB. Your files are private and automatically deleted."
        />
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
        <ToolSteps steps={[
          { step: "1", text: "Upload your PDF file" },
          { step: "2", text: "Click convert" },
          { step: "3", text: "Download images as ZIP" },
        ]} category="convert" />
        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && previews.length === 0 && (
          <Button size="lg" onClick={convert} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Converting…</> : "Convert to JPG"}
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
