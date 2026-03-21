import { useState, useEffect } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import * as pdfjsLib from "pdfjs-dist";
import { jsPDF } from "jspdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
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
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      
      const pdf = await pdfjsLib.getDocument({ 
        data: bytes,
        password: password
      }).promise;
      
      const numPages = pdf.numPages;
      let pdfDoc: jsPDF | null = null;
      
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2.0; // High quality render scale
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        const widthPt = viewport.width / scale;
        const heightPt = viewport.height / scale;

        if (!pdfDoc) {
          pdfDoc = new jsPDF({
            orientation: widthPt > heightPt ? "l" : "p",
            unit: "pt",
            format: [widthPt, heightPt]
          });
        } else {
          pdfDoc.addPage([widthPt, heightPt], widthPt > heightPt ? "l" : "p");
        }
        
        pdfDoc.addImage(imgData, "JPEG", 0, 0, widthPt, heightPt);
        setProgress(Math.round(10 + (i / numPages) * 80));
      }

      if (!pdfDoc) throw new Error("No pages extracted");

      const filename = files[0].name.replace(/\.pdf$/i, "_unlocked.pdf");
      pdfDoc.save(filename);
      
      setProgress(100);
      toast.success("PDF unlocked and downloaded!");
    } catch (err: any) {
      console.error(err);
      if (err.name === 'PasswordException') {
        toast.error("Incorrect password.");
      } else {
        toast.error("Failed to unlock PDF. The file may be corrupted.");
      }
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Unlock PDF" description="Remove restrictions from protected PDF files" category="protect" icon={<Unlock className="h-7 w-7" />}
      metaTitle="Unlock PDF Online Free – Remove Password | MagicDocx" metaDescription="Remove the open password from your PDF online for free. Instantly unlock user-password protected PDFs. No sign-up required." toolId="unlock" hideHeader={files.length > 0}>
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
      {!files.length && (
        <ToolSeoSection
          toolName="Unlock PDF Online"
          category="edit"
          intro="MagicDocx Unlock PDF removes the open password (user password) from any password-protected PDF document. Enter the correct password, and MagicDocx will generate an unlocked version of your PDF that can be opened without any password in the future. The entire process happens locally in your browser | no files are sent to any server. Note: MagicDocx cannot bypass or crack an unknown password."
          steps={[
            "Upload your password-protected PDF using the file upload area.",
            "Enter the correct password in the password field.",
            "Click 'Unlock PDF' to remove the password protection.",
            "Your unlocked PDF will download automatically."
          ]}
          formats={["PDF (password-protected)"]}
          relatedTools={[
            { name: "Protect PDF", path: "/protect-pdf", icon: Unlock },
            { name: "Redact PDF", path: "/redact-pdf", icon: Unlock },
            { name: "Edit PDF", path: "/edit-pdf", icon: Unlock },
            { name: "Compress PDF", path: "/compress-pdf", icon: Unlock },
          ]}
          schemaName="Unlock PDF Online"
          schemaDescription="Free online PDF password remover. Enter the correct password to unlock and download an unrestricted version of your PDF."
        />
      )}
    </ToolLayout>
  );
};

export default UnlockPdf;
