import { useState, useRef } from "react";
import { ImageDown, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const CompressImage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState([80]);
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
  };

  const compress = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);

    try {
      const file = files[0];
      const original = file.size;
      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });

      setProgress(50);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const qualityValue = quality[0] / 100;

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), outputType, qualityValue);
      });

      setProgress(90);
      const compressed = blob.size;
      setResult({ original, compressed });
      setProgress(100);

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const ext = outputType === "image/png" ? "png" : "jpg";
      a.download = `compressed.${ext}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      URL.revokeObjectURL(url);
      toast.success("Image compressed!");
    } catch {
      toast.error("Failed to compress image");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const formatSize = (b: number) => {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(2) + " MB";
  };

  const reduction = result ? Math.max(0, Math.round((1 - result.compressed / result.original) * 100)) : 0;

  return (
    <ToolLayout
      title="Compress Image"
      description="Reduce image file size without losing quality"
      category="image"
      icon={<ImageDown className="h-7 w-7" />}
      metaTitle="Compress Image — Reduce Image Size Online Free"
      metaDescription="Compress JPG, PNG images to reduce file size. Free online image compressor."
      toolId="compress-image"
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tool-image">
            <ImageDown className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Compress Image</h1>
            <p className="text-sm text-muted-foreground">Reduce image file size without losing quality</p>
            <div className="mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" />
              <span className="text-xs text-muted-foreground/70">
                Works with JPG, PNG, and WebP images. Processed entirely in your browser. Max file size: 50MB. Your files are private.
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
          label="Select an image to compress"
        />
      </div>

      {files.length > 0 && !result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-sm font-medium text-foreground">Quality: {quality[0]}%</label>
            <Slider
              value={quality}
              onValueChange={setQuality}
              min={10}
              max={100}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Smaller file</span>
              <span>Higher quality</span>
            </div>
          </div>
        </div>
      )}

      {processing && <Progress value={progress} className="mt-4" />}

      {files.length > 0 && !result && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={compress} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Compressing…</> : "Compress Image"}
          </Button>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
            <p className="font-display text-2xl font-bold text-foreground">{reduction}% smaller</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatSize(result.original)} → {formatSize(result.compressed)}
            </p>
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => { setFiles([]); setResult(null); }} className="rounded-xl">
              Compress Another Image
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default CompressImage;
