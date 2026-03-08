import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Layers, Loader2, Info } from "lucide-react";
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
      const form = doc.getForm();
      const fields = form.getFields();
      fields.forEach(field => {
        try { form.removeField(field); } catch { /* skip non-removable */ }
      });
      setProgress(70);
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
      metaTitle="Flatten PDF — Remove Form Fields Online Free" metaDescription="Flatten PDF form fields and annotations. Free online tool." toolId="flatten-pdf" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-edit/20 bg-tool-edit/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-edit">
              <Layers className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Flatten PDF</h1>
              <p className="text-sm text-muted-foreground">Flatten form fields and annotations</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Converts form fields and annotations into static content that can no longer be edited. Great for finalizing documents.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to flatten" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "We flatten all fields" },
            { step: "3", text: "Download flattened PDF" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-edit text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            {processing && <Progress value={progress} className="h-2" />}
            <Button size="lg" onClick={flatten} disabled={processing} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Flattening…</> : <><Layers className="mr-2 h-5 w-5" />Flatten PDF</>}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default FlattenPdf;
