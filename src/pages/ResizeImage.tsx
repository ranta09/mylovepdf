import { useState } from "react";
import { Move, Loader2, Info, Download, Link2, Unlink2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const ResizeImage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [lockRatio, setLockRatio] = useState(true);
  const [originalDims, setOriginalDims] = useState<{ w: number; h: number } | null>(null);
  const [done, setDone] = useState(false);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setDone(false);
    if (newFiles.length > 0) {
      const img = new Image();
      img.onload = () => {
        setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
        setWidth(String(img.naturalWidth));
        setHeight(String(img.naturalHeight));
      };
      img.src = URL.createObjectURL(newFiles[0]);
    } else {
      setOriginalDims(null);
    }
  };

  const handleWidthChange = (val: string) => {
    setWidth(val);
    if (lockRatio && originalDims && val) {
      const ratio = originalDims.h / originalDims.w;
      setHeight(String(Math.round(Number(val) * ratio)));
    }
  };

  const handleHeightChange = (val: string) => {
    setHeight(val);
    if (lockRatio && originalDims && val) {
      const ratio = originalDims.w / originalDims.h;
      setWidth(String(Math.round(Number(val) * ratio)));
    }
  };

  const resize = async () => {
    if (files.length === 0 || !width || !height) return;
    setProcessing(true);
    setProgress(30);

    try {
      const file = files[0];
      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });

      setProgress(60);

      const canvas = document.createElement("canvas");
      canvas.width = Number(width);
      canvas.height = Number(height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, Number(width), Number(height));

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), outputType, 0.95);
      });

      setProgress(90);

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const ext = outputType === "image/png" ? "png" : "jpg";
      a.download = `resized-${width}x${height}.${ext}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      URL.revokeObjectURL(url);
      setProgress(100);
      setDone(true);
      toast.success("Image resized!");
    } catch {
      toast.error("Failed to resize image");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Resize Image"
      description="Resize images by pixels or percentage"
      category="image"
      icon={<Move className="h-7 w-7" />}
      metaTitle="Resize Image — Resize Images Online Free"
      metaDescription="Resize images to exact dimensions. Free online image resizer."
      toolId="resize-image"
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tool-image">
            <Move className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Resize Image</h1>
            <p className="text-sm text-muted-foreground">Resize images by exact pixel dimensions</p>
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
          label="Select an image to resize"
        />
      </div>

      {files.length > 0 && originalDims && !done && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Original: {originalDims.w} × {originalDims.h} px
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-foreground">Width (px)</label>
                <Input type="number" value={width} onChange={(e) => handleWidthChange(e.target.value)} className="mt-1 rounded-lg" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLockRatio(!lockRatio)}
                className="mt-5 h-8 w-8"
                title={lockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
              >
                {lockRatio ? <Link2 className="h-4 w-4" /> : <Unlink2 className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <label className="text-xs font-medium text-foreground">Height (px)</label>
                <Input type="number" value={height} onChange={(e) => handleHeightChange(e.target.value)} className="mt-1 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      )}

      {processing && <Progress value={progress} className="mt-4" />}

      {files.length > 0 && !done && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={resize} disabled={processing || !width || !height} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Resizing…</> : "Resize Image"}
          </Button>
        </div>
      )}

      {done && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
            <p className="font-display text-xl font-bold text-foreground">Image resized to {width} × {height} px</p>
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => { setFiles([]); setDone(false); setOriginalDims(null); }} className="rounded-xl">
              Resize Another Image
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default ResizeImage;
