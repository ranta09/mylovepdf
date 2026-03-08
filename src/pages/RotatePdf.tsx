import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { RotateCw, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader, { ToolSteps } from "@/components/ToolHeader";
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
        <ToolHeader
          icon={<RotateCw className="h-5 w-5 text-primary-foreground" />}
          title="Rotate PDF"
          subtitle="Rotate all pages in your document"
          category="edit"
          infoText="Choose the rotation angle and all pages will be rotated. Perfect for fixing scanned documents. Max file size: 100MB. Your files are private and automatically deleted."
        />
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to rotate" />
        <ToolSteps steps={[
          { step: "1", text: "Upload your PDF file" },
          { step: "2", text: "Choose rotation angle" },
          { step: "3", text: "Download rotated PDF" },
        ]} category="edit" />
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              {[90, 180, 270].map(a => (
                <Button key={a} variant={angle === a ? "default" : "outline"} onClick={() => setAngle(a)} className="rounded-xl">
                  {a}°
                </Button>
              ))}
            </div>
            {processing && <Progress value={progress} className="h-2" />}
            <Button size="lg" onClick={rotate} disabled={processing} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Rotating…</> : "Rotate PDF"}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default RotatePdf;
