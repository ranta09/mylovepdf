import { useState, useRef, useCallback, useEffect } from "react";
import { Crop as CropIcon, Loader2, Info, Download } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const CropImage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [cropX, setCropX] = useState("0");
  const [cropY, setCropY] = useState("0");
  const [cropW, setCropW] = useState("");
  const [cropH, setCropH] = useState("");
  const [done, setDone] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setDone(false);
    setResultUrl(null);
    if (newFiles.length > 0) {
      const url = URL.createObjectURL(newFiles[0]);
      setImageUrl(url);
      const img = new Image();
      img.onload = () => {
        setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
        setCropX("0");
        setCropY("0");
        setCropW(String(img.naturalWidth));
        setCropH(String(img.naturalHeight));
      };
      img.src = url;
    } else {
      setImageUrl(null);
      setImgDims(null);
    }
  };

  const crop = async () => {
    if (!imageUrl || !imgDims) return;

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      const x = Math.max(0, Number(cropX));
      const y = Math.max(0, Number(cropY));
      const w = Math.min(Number(cropW), imgDims.w - x);
      const h = Math.min(Number(cropH), imgDims.h - y);

      if (w <= 0 || h <= 0) {
        toast.error("Invalid crop dimensions");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

      const file = files[0];
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), outputType, 0.95);
      });

      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setDone(true);
      toast.success("Image cropped!");
    } catch {
      toast.error("Failed to crop image");
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const ext = files[0]?.type === "image/png" ? "png" : "jpg";
    a.download = `cropped.${ext}`;
    a.click();
  };

  return (
    <ToolLayout
      title="Crop Image"
      description="Crop images with custom dimensions"
      category="image"
      icon={<CropIcon className="h-7 w-7" />}
      metaTitle="Crop Image — Crop Images Online Free"
      metaDescription="Crop images to exact dimensions. Free online image cropper."
      toolId="crop-image"
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tool-image">
            <CropIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Crop Image</h1>
            <p className="text-sm text-muted-foreground">Crop images with custom dimensions</p>
            <div className="mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" />
              <span className="text-xs text-muted-foreground/70">
                Supports JPG, PNG, WebP. Processed entirely in your browser. Max file size: 50MB.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <FileUpload
          accept=".jpg,.jpeg,.png,.webp"
          multiple={false}
          maxSize={50}
          files={files}
          onFilesChange={handleFilesChange}
          label="Select an image to crop"
        />
      </div>

      {imageUrl && imgDims && !done && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 overflow-hidden">
            <p className="text-sm text-muted-foreground mb-3">
              Image: {imgDims.w} × {imgDims.h} px
            </p>
            <img src={imageUrl} alt="Preview" className="mx-auto max-h-64 rounded-lg object-contain mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">X Offset</label>
                <Input type="number" value={cropX} onChange={(e) => setCropX(e.target.value)} className="mt-1 rounded-lg" min={0} max={imgDims.w} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Y Offset</label>
                <Input type="number" value={cropY} onChange={(e) => setCropY(e.target.value)} className="mt-1 rounded-lg" min={0} max={imgDims.h} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Width</label>
                <Input type="number" value={cropW} onChange={(e) => setCropW(e.target.value)} className="mt-1 rounded-lg" min={1} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Height</label>
                <Input type="number" value={cropH} onChange={(e) => setCropH(e.target.value)} className="mt-1 rounded-lg" min={1} />
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="lg" onClick={crop} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              Crop Image
            </Button>
          </div>
        </div>
      )}

      {done && resultUrl && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
            <p className="font-display text-lg font-bold text-foreground mb-3">Cropped Result</p>
            <img src={resultUrl} alt="Cropped" className="mx-auto max-h-64 rounded-lg object-contain" />
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={downloadResult} className="rounded-xl gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button variant="ghost" onClick={() => { setFiles([]); setDone(false); setResultUrl(null); setImageUrl(null); setImgDims(null); }} className="rounded-xl">
              Crop Another Image
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default CropImage;
