import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { RotateCw, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const RotatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const rotate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(30);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach(page => page.setRotation(degrees(page.getRotation().angle + angle)));
      setProgress(80);
      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rotated.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF rotated!");
    } catch {
      toast.error("Failed to rotate PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Rotate PDF" description="Rotate all pages in your PDF document" category="edit" icon={<RotateCw className="h-7 w-7" />}
      metaTitle="Rotate PDF — Rotate PDF Pages Online Free" metaDescription="Rotate PDF pages by 90, 180 or 270 degrees. Free online PDF rotation tool." toolId="rotate" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-edit/20 bg-tool-edit/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-edit">
              <RotateCw className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Rotate PDF</h1>
              <p className="text-sm text-muted-foreground">Rotate all pages in your PDF document</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Choose a rotation angle and apply it to every page. Supports 90°, 180°, and 270° rotations. Max file size: 100MB. Your files are private and automatically deleted after processing.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to rotate" />
        {files.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-center gap-3">
              {[90, 180, 270].map(a => (
                <Button key={a} variant={angle === a ? "default" : "outline"} onClick={() => setAngle(a)}
                  className={angle === a ? "bg-primary text-primary-foreground" : ""}>
                  {a}°
                </Button>
              ))}
            </div>
            {processing && <Progress value={progress} />}
            <div className="flex flex-col items-center gap-2">
              <Button size="lg" onClick={rotate} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rotating…</> : "Rotate PDF"}
              </Button>
              {processing && <p className="text-xs text-muted-foreground">Estimated time: ~2-3 seconds</p>}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default RotatePdf;
