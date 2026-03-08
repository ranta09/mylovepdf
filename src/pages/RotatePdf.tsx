import { useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { RotateCw } from "lucide-react";
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
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
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
      metaTitle="Rotate PDF — Rotate PDF Pages Online Free" metaDescription="Rotate PDF pages by 90, 180 or 270 degrees. Free online PDF rotation tool.">
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
          <div className="flex justify-center">
            <Button size="lg" onClick={rotate} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? "Rotating…" : "Rotate PDF"}
            </Button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default RotatePdf;
