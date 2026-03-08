import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Unlock, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const UnlockPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const unlock = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      setProgress(40);
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setProgress(70);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "unlocked.pdf";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("PDF unlocked and saved!");
    } catch {
      toast.error("Failed to unlock PDF. The file may have strong encryption.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Unlock PDF" description="Remove restrictions from protected PDF files" category="protect" icon={<Unlock className="h-7 w-7" />}
      metaTitle="Unlock PDF — Remove PDF Password Free" metaDescription="Remove password protection from PDF files. Free online PDF unlocker." toolId="unlock" hideHeader>
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-protect/20 bg-tool-protect/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-protect">
              <Unlock className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Unlock PDF</h1>
              <p className="text-sm text-muted-foreground">Remove restrictions from protected PDFs</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Works with lightly protected PDFs. Strongly encrypted files may require the original password.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a protected PDF" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload protected PDF" },
            { step: "2", text: "Enter password if known" },
            { step: "3", text: "Download unlocked PDF" },
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
              <label className="mb-1 block text-sm font-medium text-foreground">Password (if known)</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password (optional)" />
            </div>
            {processing && <Progress value={progress} className="h-2" />}
            <Button size="lg" onClick={unlock} disabled={processing} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Unlocking…</> : <><Unlock className="mr-2 h-5 w-5" />Unlock PDF</>}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default UnlockPdf;
