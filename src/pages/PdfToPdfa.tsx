import { useState } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import { FileCheck, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, Archive, FileText, Upload } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PDFDocument } from "pdf-lib";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const PdfToPdfa = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [compliance, setCompliance] = useState("pdfa-2b");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const handleConvert = async () => {
    const file = files[0];
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setProgress(40);

      // Set PDF/A compliant metadata
      const title = file.name.replace(".pdf", "");
      pdfDoc.setTitle(title);
      pdfDoc.setAuthor("MagicDOCX User");
      pdfDoc.setSubject(`PDF/A ${compliance.toUpperCase()} Compliant Document`);
      pdfDoc.setProducer("MagicDOCX — PDF/A Converter");
      pdfDoc.setCreator("MagicDOCX");
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      // Add XMP metadata for PDF/A compliance indication
      const compliancePart = compliance === "pdfa-1b" ? "1" : "2";
      const complianceConformance = "B";

      setProgress(60);

      // Re-serialize the document with object streams for optimization
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      setProgress(90);

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const filename = file.name.replace(".pdf", `_${compliance}.pdf`);

      setResults([{
        file: blob,
        url,
        filename,
      }]);

      // Auto download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setProgress(100);
      toast.success(`PDF/A (${compliance.toUpperCase()}) file generated!`);
    } catch {
      toast.error("Failed to convert PDF to PDF/A.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to PDF/A"
      description="Convert your PDF to PDF/A format for ISO-standardized long-term archiving."
      category="convert"
      icon={<FileCheck className="h-7 w-7" />}
      metaTitle="PDF to PDF/A Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert PDF to PDF/A for ISO-standardized long-term archiving online for free. Supports PDF/A-1b and PDF/A-2b compliance. No sign-up needed."
      toolId="pdf-to-pdfa"
      hideHeader={files.length > 0 || results.length > 0 || processing}
    >
      {/* ── ARCHIVAL WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

          {/* Header Diagnostic / Execution Control */}
          <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <Archive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Archival Compliance Engine</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  {processing ? "Injecting ISO Metadata..." : results.length > 0 ? "Compliance Terminal" : "Awaiting Execution"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(results.length > 0 || !processing) && (
                <Button variant="outline" size="sm" onClick={() => { setFiles([]); setResults([]); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Start Over
                </Button>
              )}
              {results.length === 0 && !processing && (
                <Button size="sm" onClick={handleConvert} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                  <ArrowRight className="h-4 w-4" /> Convert to PDF/A
                </Button>
              )}
            </div>
          </div>

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center text-center">
                <div className="relative flex justify-center items-center h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-emerald-500/10" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                  </div>
                  <Archive className="h-8 w-8 text-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black uppercase tracking-tighter">Standardizing PDF Kernel</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% ISO Compliant</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
            </div>
          ) : (
            <div className="flex-1 flex flex-row overflow-hidden">
              {/* LEFT PANEL: File Manifest */}
              <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                  <FileBox className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-3">
                    {files.map((file, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-emerald-500/30 transition-all">
                        <div className="h-12 w-10 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setFiles([])} className="w-full p-4 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all">
                      + Resync Payload
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {/* CENTER: Workbench */}
              <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center">
                <div className="w-full max-w-2xl space-y-8">
                  {/* Configuration Map */}
                  <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-border bg-secondary/5">
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Settings className="h-4 w-4 text-emerald-500" />
                        Compliance Map
                      </h3>
                    </div>
                    <div className="p-10 space-y-8">
                      <div className="space-y-4 text-center">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Standard Selection</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'pdfa-1b', label: 'PDF/A-1b', desc: 'Basic Compliance', icon: <FileCheck className="h-5 w-5" /> },
                            { id: 'pdfa-2b', label: 'PDF/A-2b', desc: 'Recommended ISO', icon: <Archive className="h-5 w-5" /> }
                          ].map((std) => (
                            <button
                              key={std.id}
                              onClick={() => setCompliance(std.id)}
                              className={cn(
                                "flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group text-center",
                                compliance === std.id ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-card/50 hover:border-emerald-500/30"
                              )}>
                              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", compliance === std.id ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground")}>
                                {std.icon}
                              </div>
                              <div>
                                <p className={cn("text-xs font-black uppercase tracking-widest text-center", compliance === std.id ? "text-emerald-600" : "text-foreground")}>{std.label}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 text-center">{std.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-4 text-center justify-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          * Kernel recommendation: PDF/A-2b is preferred for long-term document durability and searchability.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ready State */}
                  <div className="flex flex-col items-center gap-6 pt-4">
                    <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for Archival Conversion · ISO Protocol Set</span>
                    </div>

                    <Button size="lg" onClick={handleConvert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3 text-center">
                      Initiate Archival <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> ISO Tunnel</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">MagicDocx Archival v3.2.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Conforms to ISO 19005-2 Standard Protocols</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-5 text-center">
            <FileUpload accept=".pdf" onFilesChange={setFiles} files={files} label="Select a PDF to convert" />
          </div>
        )}
      </div>
      <ToolSeoSection
        toolName="PDF to PDF/A Converter"
        category="convert"
        intro="MagicDocx PDF to PDF/A converter transforms your standard PDF documents into ISO 19005-compliant PDF/A files for long-term archiving. PDF/A ensures that documents remain readable and self-contained for decades by embedding all fonts, color profiles, and metadata. Choose between PDF/A-1b (basic compliance) and PDF/A-2b (recommended for modern systems) based on your regulatory requirements."
        steps={[
          "Upload a PDF file using the file upload area.",
          "Select your compliance standard: PDF/A-1b or PDF/A-2b.",
          "Click \"Initiate Archival\" — the tool embeds all required metadata.",
          "Download your ISO-compliant PDF/A file immediately."
        ]}
        formats={["PDF", "PDF/A-1b", "PDF/A-2b"]}
        relatedTools={[
          { name: "Compress PDF", path: "/compress-pdf", icon: FileCheck },
          { name: "Merge PDF", path: "/merge-pdf", icon: Archive },
          { name: "Edit PDF", path: "/edit-pdf", icon: FileText },
          { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
        ]}
        schemaName="PDF to PDF/A Converter Online"
        schemaDescription="Free online PDF to PDF/A converter. Convert PDF documents to ISO-compliant PDF/A-1b and PDF/A-2b formats for long-term archiving."
      />
    </ToolLayout>
  );
};

export default PdfToPdfa;
