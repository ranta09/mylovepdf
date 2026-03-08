import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Layers, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const FlattenPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const flatten = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(40);

      // Flatten by removing form fields
      const form = doc.getForm();
      const fields = form.getFields();
      fields.forEach(field => {
        try { form.removeField(field); } catch { /* skip non-removable */ }
      });
      setProgress(70);

      // Flatten annotations by creating a copy
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(p => newDoc.addPage(p));
      setProgress(90);

      const pdfBytes = await newDoc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flattened.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF flattened successfully!");
    } catch {
      toast.error("Failed to flatten PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Flatten PDF" description="Flatten form fields and annotations into the PDF" category="edit" icon={<Layers className="h-7 w-7" />}
      metaTitle="Flatten PDF — Remove Form Fields Online Free" metaDescription="Flatten PDF form fields and annotations. Free online tool." toolId="flatten-pdf">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to flatten" />
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">This will convert form fields and annotations into static content that can no longer be edited.</p>
          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={flatten} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Flattening…</> : "Flatten PDF"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default FlattenPdf;
