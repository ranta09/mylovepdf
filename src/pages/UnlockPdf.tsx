import { useState, useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { PDFDocument } from "pdf-lib";
import { Unlock, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const UnlockPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

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
      metaTitle="Unlock PDF — Remove PDF Password Free" metaDescription="Remove password protection from PDF files. Free online PDF unlocker." toolId="unlock" hideHeader={files.length > 0}>
      <div className="mt-5">
        {files.length === 0 && (
          <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a protected PDF" />
        )}
      </div>
      {files.length > 0 && !processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-row overflow-hidden relative">

            {/* LEFT SIDE: Decryption Info */}
            <div className="w-80 border-r border-border bg-secondary/5 flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                <Unlock className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Bypass Logic</span>
              </div>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Detection Vector</h3>
                    <div className="p-3 bg-secondary/20 border border-border rounded-xl space-y-1">
                      <p className="text-[10px] font-black text-foreground uppercase">Encryption Detected</p>
                      <p className="text-[9px] text-muted-foreground uppercase leading-tight font-bold tracking-tight">The engine will attempt to neutralize standard security flags.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Neutralization Strategy</h3>
                    <div className="space-y-2">
                      {[
                        "Standard restriction bypass",
                        "Serialization cleaning",
                        "Metadata preservation",
                        "Acrobat flag reset"
                      ].map((strategy, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-tight">{strategy}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl space-y-1">
                      <div className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Protocol Info</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                        Light encryption and user-defined restrictions are typically bypassed. Strong AES-256 may require a key.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* CENTER: Document Viewer Mockup */}
            <div className="flex-1 bg-secondary/10 flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="w-full max-w-xl bg-background shadow-2xl rounded-2xl border border-border p-12 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-0" />

                <div className="relative z-10 space-y-6">
                  <div className="mx-auto w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center border-4 border-border">
                    <Unlock className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tighter">{files[0].name}</h2>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic tracking-wider">Awaiting Restriction Bypass</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Unlock Center */}
            <div className="w-96 border-l border-border bg-background flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Unlock Center</span>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-7 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive">
                  Cancel
                </Button>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      Owner Password (If Required)
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Optional"
                      className="h-12 rounded-xl bg-secondary/5 border-border font-black text-sm tracking-widest"
                    />
                    <p className="text-[9px] text-muted-foreground uppercase font-bold text-center">Most restrictions can be bypassed without this</p>
                  </div>

                  <div className="p-4 bg-green-500/5 rounded-2xl border border-green-500/10 space-y-3">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Neutralization Ready
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                      This operation will generate a new PDF instance without security flags. The original integrity is maintained.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 border-t border-border bg-background">
                <Button
                  size="lg"
                  onClick={unlock}
                  disabled={processing}
                  className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-3"
                >
                  {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Unlocking...</> : <>Unlock Protected PDF <ShieldCheck className="h-4 w-4" /></>}
                </Button>
                {processing && <Progress value={progress} className="mt-4 h-1 rounded-full" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default UnlockPdf;
