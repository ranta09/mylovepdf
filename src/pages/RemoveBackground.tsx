import { useState, useRef } from "react";
import { Eraser, Loader2, Info, Download } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RemoveBackground = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    setResultUrl(null);
    if (newFiles.length > 0) {
      setOriginalUrl(URL.createObjectURL(newFiles[0]));
    } else {
      setOriginalUrl(null);
    }
  };

  const processImage = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);

    try {
      const file = files[0];
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setProgress(30);

      const { data, error } = await supabase.functions.invoke("ai-remove-bg", {
        body: { image: base64, filename: file.name },
      });

      setProgress(80);

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to remove background");

      // The edge function returns base64 PNG
      const resultBase64 = data.image;
      setResultUrl(resultBase64);
      setProgress(100);
      toast.success("Background removed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to remove background");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "no-background.png";
    a.click();
  };

  return (
    <ToolLayout
      title="Remove Background"
      description="AI-powered background removal from any image"
      category="image"
      icon={<Eraser className="h-7 w-7" />}
      metaTitle="Remove Background — AI Background Remover Free"
      metaDescription="Remove background from images instantly with AI. Free online background remover tool."
      toolId="remove-bg"
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tool-image">
            <Eraser className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Remove Background</h1>
            <p className="text-sm text-muted-foreground">AI-powered background removal from any image</p>
            <div className="mt-1 flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" />
              <span className="text-xs text-muted-foreground/70">
                Works great with portraits, product photos, logos, and objects. Supports JPG, PNG, WebP. Max file size: 10MB. Your files are private and automatically deleted after processing.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <FileUpload
          accept=".jpg,.jpeg,.png,.webp"
          multiple={false}
          maxSize={10}
          files={files}
          onFilesChange={handleFilesChange}
          label="Select an image to remove background"
        />
      </div>

      {processing && <Progress value={progress} className="mt-4" />}

      {files.length > 0 && !resultUrl && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button
            size="lg"
            onClick={processImage}
            disabled={processing}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing Background…
              </>
            ) : (
              "Remove Background"
            )}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">AI is processing your image…</p>}
        </div>
      )}

      {resultUrl && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
              <p className="text-sm font-medium text-muted-foreground mb-2">Original</p>
              <img src={originalUrl!} alt="Original" className="mx-auto max-h-64 rounded-lg object-contain" />
            </div>
            <div className="rounded-2xl border border-border p-4 text-center shadow-card" style={{ backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23f0f0f0\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23e0e0e0\"/></svg>')" }}>
              <p className="text-sm font-medium text-muted-foreground mb-2">Result</p>
              <img src={resultUrl} alt="Background removed" className="mx-auto max-h-64 rounded-lg object-contain" />
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={downloadResult} className="rounded-xl gap-2">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button variant="ghost" onClick={() => { setFiles([]); setResultUrl(null); setOriginalUrl(null); }} className="rounded-xl">
              Process Another Image
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default RemoveBackground;
