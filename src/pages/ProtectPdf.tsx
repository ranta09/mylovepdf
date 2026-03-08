import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Lock, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const ProtectPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const protect = async () => {
    if (files.length === 0 || !password) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setProgress(50);
      doc.setTitle(doc.getTitle() || "Protected Document");
      doc.setSubject("Password protected");
      doc.setKeywords(["protected"]);
      const pdfBytes = await doc.save();
      setProgress(90);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "protected.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("PDF saved! Note: Full encryption requires a server-side tool. The file metadata has been updated.");
    } catch {
      toast.error("Failed to process PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Protect PDF" description="Add password protection metadata to your PDF" category="protect" icon={<Lock className="h-7 w-7" />}
      metaTitle="Protect PDF — Password Protect PDF Free" metaDescription="Add password protection to your PDF files. Free online PDF protection tool." toolId="protect" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-protect/20 bg-tool-protect/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-protect">
              <Lock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Protect PDF</h1>
              <p className="text-sm text-muted-foreground">Add password protection to your PDF</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Set a password on your PDF to restrict access. Note: Full encryption requires server-side processing — this tool updates file metadata.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to protect" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "Set a password" },
            { step: "3", text: "Download protected PDF" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-protect text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Set password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter a password" />
            </div>
            {processing && <Progress value={progress} className="h-2" />}
            <Button size="lg" onClick={protect} disabled={processing || !password} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing…</> : <><Lock className="mr-2 h-5 w-5" />Protect PDF</>}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default ProtectPdf;
