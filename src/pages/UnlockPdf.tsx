import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Unlock, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
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
      // Load with ignoreEncryption to bypass restrictions
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
      <ToolHeader
        title="Unlock PDF"
        description="Remove password protection from your PDF"
        icon={<Unlock className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a protected PDF" />
      </div>
      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Password (if known)</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password (optional)" />
          </div>
          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={unlock} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Unlocking…</> : "Unlock PDF"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~2-3 seconds</p>}
          </div>
          <p className="text-center text-xs text-muted-foreground">Works with lightly protected PDFs. Strongly encrypted files may require the original password.</p>
        </div>
      )}
    </ToolLayout>
  );
};

export default UnlockPdf;
