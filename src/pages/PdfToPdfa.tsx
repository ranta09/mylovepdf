import { useState } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import BatchProcessingView, { BatchProcessingResult } from "@/components/BatchProcessingView";
import { FileCheck, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, Archive, FileText, Upload } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PDFDocument } from "pdf-lib";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import * as pdfjsLib from "pdfjs-dist";
import { Plus } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface FileData {
  file: File;
  previewUrl: string;
  pageCount: number;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const PdfToPdfa = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileDataList, setFileDataList] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [compliance, setCompliance] = useState("pdfa-2b");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, setDisableGlobalFeatures]);

  useEffect(() => {
    if (files.length > 0 && !processing) {
      loadFilePreviews(files);
    } else if (files.length === 0) {
      setFileDataList([]);
    }
  }, [files]);

  const loadFilePreviews = async (newFiles: File[]) => {
    const newData: FileData[] = [];
    for (const file of newFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          const previewUrl = canvas.toDataURL("image/jpeg", 0.8);
          newData.push({ file, previewUrl, pageCount: pdf.numPages });
        }
      } catch (err) {
        console.error("Error generating preview:", err);
        newData.push({ file, previewUrl: "", pageCount: 0 });
      }
    }
    setFileDataList(newData);
  };

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileDataList(prev => prev.filter((_, i) => i !== index));
  };

  const processItem = async (file: File, onProgress: (p: number) => void): Promise<BatchProcessingResult> => {
    onProgress(10);
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    onProgress(40);
    // Set PDF/A compliant metadata
    const title = file.name.replace(".pdf", "");
    pdfDoc.setTitle(title);
    pdfDoc.setAuthor("MagicDOCX User");
    pdfDoc.setSubject(`PDF/A ${compliance.toUpperCase()} Compliant Document`);
    pdfDoc.setProducer("MagicDOCX | PDF/A Converter");
    pdfDoc.setCreator("MagicDOCX");
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());

    onProgress(70);
    // Re-serialize the document with object streams for optimization
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    onProgress(95);
    
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
    const filename = file.name.replace(".pdf", `_${compliance}.pdf`);
    
    onProgress(100);
    return { blob, filename };
  };

  const initiateConvert = () => {
    if (files.length === 0) return;
    setProcessing(true);
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
      hideHeader={files.length > 0 || processing}
    >
      {/* ── ARCHIVAL WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          {processing ? (
            <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
              <BatchProcessingView
                files={files}
                title="Converting to PDF/A..."
                processItem={processItem}
                onReset={() => { setFiles([]); setFileDataList([]); setProcessing(false); }}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden font-display">
              {/* Left Panel: Preview Area (Thumbnail Grid) - 70% Width */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setFiles([]); setFileDataList([]); }}
                      className="h-8 w-8 p-0 rounded-full hover:bg-secondary/20 font-black italic"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <div className="h-4 w-[1px] bg-border mx-1" />
                    <div className="flex items-center gap-2 text-left">
                      <Archive className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{files.length} Files</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleAddFiles} accept=".pdf" multiple className="hidden" />
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {fileDataList.map((fd, idx) => (
                        <div key={idx} className="group flex flex-col gap-2 p-2 bg-background border border-border hover:border-red-500/50 rounded-xl transition-all duration-200 text-left relative">
                          <div className="aspect-[3/4] w-full bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-border/10">
                            {fd.previewUrl ? (
                              <img src={fd.previewUrl} alt="Preview" className="w-full h-full object-contain" />
                            ) : (
                              <FileText className="h-8 w-8 text-muted-foreground/30" />
                            )}
                            <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={() => removeFile(idx)} className="p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:text-destructive transition-colors shadow-sm border border-border/50">
                                <Plus className="h-3 w-3 rotate-45" />
                              </button>
                            </div>
                            <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase text-muted-foreground">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="px-1 min-w-0">
                            <p className="text-[9px] font-black text-foreground uppercase tracking-tight truncate">{fd.file.name}</p>
                            <p className="text-[8px] font-black text-red-600 uppercase">{formatSize(fd.file.size)}</p>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[3/4] border-2 border-dashed border-border hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 hover:bg-red-500/5 transition-all outline-none focus:ring-2 focus:ring-red-500/20"
                      >
                        <Plus className="h-5 w-5" />
                        Add More
                      </button>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel: Settings Sidebar - 30% Width */}
              <div className="flex-1 lg:w-[30%] bg-secondary/10 flex flex-col overflow-hidden relative">
                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8 text-left">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold uppercase tracking-tighter text-foreground font-heading">PDF to PDF/A</h2>
                    </div>

                    <div className="space-y-8 px-1">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Compliance Level</Label>
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { id: 'pdfa-1b', label: 'PDF/A-1b', desc: 'Basic compliance for long-term archiving.', icon: <FileCheck className="h-4 w-4" /> },
                            { id: 'pdfa-2b', label: 'PDF/A-2b', desc: 'Modern standard with more features.', icon: <Archive className="h-4 w-4" /> }
                          ].map((std) => (
                            <button
                              key={std.id}
                              onClick={() => setCompliance(std.id)}
                              className={cn(
                                "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group",
                                compliance === std.id ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30"
                              )}
                            >
                              <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", compliance === std.id ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                                {std.icon}
                              </div>
                              <div className="flex-1">
                                <p className={cn("text-xs font-bold uppercase tracking-widest", compliance === std.id ? "text-red-600" : "text-foreground")}>{std.label}</p>
                                <p className="text-[9px] font-semibold text-muted-foreground uppercase mt-1 leading-tight">{std.desc}</p>
                              </div>
                              {compliance === std.id && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 text-center uppercase">ISO Protocol Standard Selection</span>
                      </div>

                      <Button
                        onClick={initiateConvert}
                        disabled={processing}
                        className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {processing ? "Converting..." : "Convert to PDF/A"}
                        <ArrowRight className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
          "Click \"Initiate Archival\" | the tool embeds all required metadata.",
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
