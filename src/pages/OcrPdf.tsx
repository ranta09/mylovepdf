import { useState, useEffect, useCallback, useRef } from "react";
import BatchProcessingView, { BatchProcessingResult } from "@/components/BatchProcessingView";
import ToolSeoSection from "@/components/ToolSeoSection";
import { 
  ScanLine, 
  Copy, 
  Download, 
  Loader2, 
  Info, 
  ShieldCheck, 
  Settings, 
  FileText, 
  FileBox, 
  RotateCcw, 
  CheckCircle2, 
  ArrowRight, 
  FileCode, 
  Languages, 
  ChevronRight,
  Plus,
  X,
  Languages as LanguageIcon,
  Layout,
  AlertTriangle
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun } from "docx";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { runOcrOnCanvas, analyzePdfDocument, preprocessCanvas } from "@/lib/ocrEngine";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const LANGUAGES = [
  { id: 'eng', name: 'English' },
  { id: 'spa', name: 'Spanish' },
  { id: 'fra', name: 'French' },
  { id: 'deu', name: 'German' },
  { id: 'ita', name: 'Italian' },
  { id: 'por', name: 'Portuguese' },
  { id: 'nld', name: 'Dutch' },
];

const OcrPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "docx" | "txt">("pdf");

  const resetTool = useCallback(() => {
    setFiles([]);
    setProcessing(false);
  }, []);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, setDisableGlobalFeatures]);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // processItem for BatchProcessingView, captures the current language/outputFormat
  const processItem = useCallback(async (file: File, onProgress: (p: number) => void): Promise<BatchProcessingResult> => {
    const bytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    
    const outDoc = await PDFDocument.create();
    const font = await outDoc.embedFont(StandardFonts.Helvetica);
    const paragraphs: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const origViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 2 }); 

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      preprocessCanvas(canvas);

      const result = await runOcrOnCanvas(canvas, selectedLanguage);
      const outPage = outDoc.addPage([origViewport.width, origViewport.height]);

      const pngBytes = await canvas.toDataURL("image/png");
      const pngImg = await outDoc.embedPng(pngBytes);
      outPage.drawImage(pngImg, {
        x: 0,
        y: 0,
        width: origViewport.width,
        height: origViewport.height,
      });

      paragraphs.push(result.paragraphs.map(p => p.text).join('\n'));

      let yPos = origViewport.height - 20;
      for (const p of result.paragraphs) {
        const scaleX = origViewport.width / viewport.width;
        const scaleY = origViewport.height / viewport.height;

        const text = p.text.trim();
        if (text) {
          outPage.drawText(text, {
            x: p.bbox.x0 * scaleX,
            y: origViewport.height - (p.bbox.y1 * scaleY),
            size: 10,
            font: font,
            color: rgb(0, 0, 0),
            opacity: 0,
          });
          yPos -= 12;
        }
      }
      
      onProgress(Math.round((i / pdf.numPages) * 100));
    }

    let resultBlob: Blob;
    let extension: string;

    if (outputFormat === "pdf") {
      const pdfBytes = await outDoc.save();
      resultBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
      extension = "-ocr.pdf";
    } else if (outputFormat === "docx") {
      const doc = new Document({
        sections: [{
          children: paragraphs.flatMap(p => 
            p.split('\n').filter(l => l.trim()).map(line => 
              new Paragraph({ children: [new TextRun(line)] })
            )
          )
        }]
      });
      const docxBlob = await Packer.toBlob(doc);
      resultBlob = docxBlob;
      extension = "-ocr.docx";
    } else {
      const combinedText = paragraphs.join('\n\n');
      resultBlob = new Blob([combinedText], { type: "text/plain" });
      extension = "-ocr.txt";
    }

    return {
      blob: resultBlob,
      filename: file.name.replace(/\.[^/.]+$/, "") + extension
    };
  }, [selectedLanguage, outputFormat]);

  const handleProcess = () => {
    if (files.length === 0) return;
    setProcessing(true);
  };

  return (
    <ToolLayout
      title="OCR PDF"
      description="Extract text from scanned PDFs using high-accuracy text recognition technology."
      category="edit"
      icon={<ScanLine className="h-7 w-7" />}
      metaTitle="OCR PDF | Make Scanned PDFs Searchable Online Free"
      metaDescription="Convert scanned PDF documents into searchable, selectable text using AI-powered OCR technology. Support for multi-language and professional DOCX/PDF export."
      toolId="ocr-pdf"
      hideHeader={files.length > 0 || processing}
      className="ocr-pdf-page"
    >
      <style>{`
        .ocr-pdf-page h1, 
        .ocr-pdf-page h2, 
        .ocr-pdf-page h3,
        .ocr-pdf-page span,
        .ocr-pdf-page button,
        .ocr-pdf-page p,
        .ocr-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">
          
          {processing ? (
            <div className="flex-1 overflow-y-auto p-6 flex items-start justify-center">
              <BatchProcessingView
                files={files}
                title="Running OCR Analysis..."
                processItem={processItem}
                onReset={() => {
                  setProcessing(false);
                  setFiles([]);
                }}
              />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Thumbnails Grid (70%) */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {files.map((file, idx) => (
                        <div key={idx} className="group flex flex-col gap-3 p-4 bg-background border border-border hover:border-green-500/50 rounded-2xl transition-all duration-200 text-left relative shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="h-14 w-12 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center justify-center relative shrink-0">
                              <FileText className="h-7 w-7 text-green-500" />
                              <div className="absolute top-1 left-1 bg-green-500 text-white text-[7px] font-bold px-1 rounded-sm uppercase tracking-tighter">PDF</div>
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate">{file.name}</p>
                              <div className="flex items-center gap-3">
                                <p className="text-[9px] font-bold text-green-600 uppercase">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button onClick={() => removeFile(idx)} className="p-2 bg-secondary/50 rounded-xl hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                          </div>
                          
                          <div className="pt-2 border-t border-border mt-1">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-3 w-3 text-green-500" />
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Privacy Secured Locally</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-full min-h-[120px] border-2 border-dashed border-border hover:border-green-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-green-600 hover:bg-green-500/5 transition-all"
                      >
                        <Plus className="h-6 w-6" />
                        Add More PDF
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf" onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))} />
                    </div>

                  </div>
                </ScrollArea>
              </div>

              {/* RIGHT PANEL: Workbench Settings (30%) */}
              <div className="flex-1 bg-secondary/10 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:pt-8 lg:pb-12 lg:px-12">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-2xl">
                          <ScanLine className="h-6 w-6 text-green-500" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none text-green-600">OCR Hub</h4>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Language Selection */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Document Language</Label>
                          <select 
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="w-full h-14 rounded-xl border-2 border-border bg-background px-4 text-xs font-bold uppercase tracking-widest focus:border-green-500 outline-none transition-all"
                          >
                            <option value="eng">Auto Detect (English)</option>
                            {LANGUAGES.map(lang => (
                              <option key={lang.id} value={lang.id}>{lang.name}</option>
                            ))}
                          </select>
                        </div>
                        {/* Output Format */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Output Format</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'pdf', label: 'Searchable PDF', sub: 'Original layout with text layer', icon: FileBox },
                                { id: 'docx', label: 'Editable Word', sub: 'Structured DOCX paragraphs', icon: FileCode },
                                { id: 'txt', label: 'Plain Text', sub: 'Raw character extraction', icon: FileText }
                            ].map((f) => (
                              <button
                                key={f.id}
                                onClick={() => setOutputFormat(f.id as "pdf" | "docx" | "txt")}
                                className={cn(
                                  "p-4 rounded-xl border-2 flex items-center gap-4 transition-all text-left group",
                                  outputFormat === f.id ? "border-green-500 bg-green-500/5 shadow-inner" : "border-border bg-background hover:border-green-500/20"
                                )}
                              >
                                <div className={cn("p-2 rounded-lg transition-colors", outputFormat === f.id ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground group-hover:text-green-500")}>
                                  <f.icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className={cn("text-xs font-bold uppercase tracking-widest", outputFormat === f.id ? "text-green-600" : "text-foreground")}>{f.label}</p>
                                  <p className="text-[9px] font-medium text-muted-foreground uppercase">{f.sub}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="mt-auto p-6 lg:px-12 bg-background border-t border-border shrink-0">
                  <div className="max-w-xl mx-auto lg:mx-0 w-full">
                    <Button 
                      size="lg" 
                      onClick={handleProcess} 
                      disabled={processing}
                      className="w-full h-16 rounded-none text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-green-500/20 hover:shadow-green-500/40 bg-green-600 hover:bg-green-700 transition-all gap-4 group"
                    >
                      {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Initiate Synthesis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Landing State: Upload Area */}
      {files.length === 0 && !processing && (
        <ToolUploadScreen
          title="OCR PDF"
          description="Extract text from scanned PDFs using high-accuracy text recognition"
          buttonLabel="Select PDF file"
          accept=".pdf"
          multiple={true}
          onFilesSelected={handleFilesChange}
        />
      )}

      {files.length === 0 && !processing && (
        <ToolSeoSection
          toolName="OCR PDF Online"
          category="edit"
          intro="MagicDocx OCR PDF transforms scanned documents and images into editable, searchable PDF, Word, and Text files. Using advanced neural-network-based character recognition (OCR), our engine processes each page at high resolution to ensure pixel-perfect text extraction. Features include multi-language support, automatic document analysis, and 100% secure in-browser processing."
          steps={[
            "Upload your scanned or image-based PDF to the secure workbench.",
            "Our system automatically analyzes the document for text layers and scanned segments.",
            "Select the document language and your preferred output format (PDF, Word, or TXT).",
            "Click 'Initiate Synthesis' to run the high-accuracy OCR engine.",
            "Instantly download your searchable PDF or editable document."
          ]}
          formats={["PDF (scanned)", "PDF (searchable)", "DOCX", "TXT"]}
          relatedTools={[
            { name: "PDF to Word", path: "/pdf-to-word", icon: FileCode },
            { name: "Merge PDF", path: "/merge-pdf", icon: FileBox },
            { name: "Compress PDF", path: "/compress-pdf", icon: Layout },
            { name: "Edit PDF", path: "/edit-pdf", icon: FileText },
          ]}
          schemaName="OCR PDF Converter Online"
          schemaDescription="Professional online OCR tool to convert scanned PDFs into searchable text. Support for multi-language recognition and local private processing."
        />
      )}
    </ToolLayout>
  );
};

export default OcrPdf;
