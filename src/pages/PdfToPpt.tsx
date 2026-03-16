import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import * as pdfjsLib from "pdfjs-dist";
import pptxgen from "pptxgenjs";
import { Presentation, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileText, Sparkles, Upload, Plus } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import Tesseract from "tesseract.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToPpt = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileDataList, setFileDataList] = useState<FileData[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Analyzing structure...");
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [conversionMode, setConversionMode] = useState<"standard" | "ocr">("standard");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  useEffect(() => {
    if (files.length > 0 && !processing) {
      loadFilePreviews(files);
      
      // Auto-start conversion ONLY on the very first upload
      if (results.length === 0 && fileDataList.length === 0) {
        handleInitialUpload(files[0]);
      }
    } else if (files.length === 0) {
      setFileDataList([]);
    }
  }, [files]);

  const resetAll = () => {
    setFiles([]);
    setFileDataList([]);
    setResults([]);
    setProcessing(false);
    setProgress(0);
    setStatusText("Analyzing structure...");
  };

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
      setResults([]); // Reset results so we show the workspace again
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileDataList(prev => prev.filter((_, i) => i !== index));
  };

  const handleInitialUpload = async (file: File) => {
    const isScanned = await detectScanned(file);
    if (isScanned) {
      setShowOcrModal(true);
    } else {
      convert(false);
    }
  };

  const detectScanned = async (file: File): Promise<boolean> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const checkPages = Math.min(pdf.numPages, 3);
      let hasText = false;
      for (let i = 1; i <= checkPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        if (textContent.items.length > 0) {
          hasText = true;
          break;
        }
      }
      return !hasText;
    } catch (e) {
      return false;
    }
  };

  const convert = async (applyOcr: boolean = false, skipScannedCheck: boolean = false) => {
    if (files.length === 0) return;

    if (!applyOcr && !skipScannedCheck) {
      // Check the first file for scanned status as a sample
      const isScanned = await detectScanned(files[0]);
      if (isScanned) {
        setShowOcrModal(true);
        return;
      }
    }

    setProcessing(true);
    setProgress(0);
    setStatusText(applyOcr ? "Running OCR..." : "Analyzing layout...");

    try {
      const pptx = new pptxgen();
      pptx.author = "MagicDOCX";
      pptx.layout = "LAYOUT_16x9";

      let processedPages = 0;
      let totalPages = 0;

      // First pass: count total pages for progress
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        totalPages += pdf.numPages;
      }

      // Second pass: convert
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (files.length === 1) {
          pptx.title = file.name.replace(/\.pdf$/i, "");
        } else {
          pptx.title = "Combined Presentation";
        }

        for (let i = 1; i <= pdf.numPages; i++) {
          processedPages++;
          setStatusText(applyOcr ? `Processing page ${processedPages}/${totalPages} (OCR)...` : `Processing page ${processedPages}/${totalPages}...`);
          
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const slide = pptx.addSlide();

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;

          if (applyOcr) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const imageData = canvas.toDataURL("image/png");
            const result = (await Tesseract.recognize(imageData)) as any;
            const lines = result.data.lines || [];

            lines.forEach((line: any) => {
              const bbox = line.bbox;
              slide.addText(line.text, {
                x: (bbox.x0 / viewport.width) * 10,
                y: (bbox.y0 / viewport.height) * 5.625,
                w: ((bbox.x1 - bbox.x0) / viewport.width) * 10,
                h: ((bbox.y1 - bbox.y0) / viewport.height) * 5.625,
                fontSize: 10,
                color: "000000",
              });
            });
          } else {
            const content = await page.getTextContent();
            const items = content.items as any[];

            const lines: any[] = [];
            items.forEach(item => {
              if (!item.str.trim()) return;
              const y = Math.round(item.transform[5]);
              let line = lines.find(l => Math.abs(l.y - y) < 5);
              if (!line) {
                line = { y, items: [] };
                lines.push(line);
              }
              line.items.push(item);
            });

            lines.sort((a, b) => b.y - a.y);

            const blocks: any[] = [];
            lines.forEach(line => {
              line.items.sort((a, b) => a.transform[4] - b.transform[4]);
              const lastBlock = blocks[blocks.length - 1];
              const lineText = line.items.map((it: any) => it.str).join(" ");
              const avgY = line.y;
              const avgFontSize = Math.abs(line.items[0].transform[0]);

              if (lastBlock && Math.abs(lastBlock.y - avgY) < avgFontSize * 2 && Math.abs(lastBlock.fontSize - avgFontSize) < 2) {
                lastBlock.text += "\n" + lineText;
                lastBlock.h += avgFontSize;
              } else {
                blocks.push({
                  text: lineText,
                  x: line.items[0].transform[4],
                  y: avgY,
                  w: viewport.width - line.items[0].transform[4] * 2,
                  h: avgFontSize,
                  fontSize: avgFontSize,
                  bold: avgFontSize > 14
                });
              }
            });

            blocks.forEach(block => {
              const isBullet = block.text.trim().startsWith("•") || block.text.trim().startsWith("-");
              const cleanText = isBullet ? block.text.trim().substring(1).trim() : block.text;

              slide.addText(cleanText, {
                x: (block.x / viewport.width) * 10,
                y: ((viewport.height - block.y - block.fontSize) / viewport.height) * 5.625,
                w: (block.w / viewport.width) * 10,
                fontSize: Math.max(8, block.fontSize * 0.7),
                color: "000000",
                bold: block.bold,
                bullet: isBullet,
                align: (block.fontSize > 18) ? "center" : "left"
              });
            });

            const operatorList = await page.getOperatorList();
            const hasImages = operatorList.fnArray.some(fn =>
              fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject
            );

            if (hasImages) {
              await page.render({ canvasContext: ctx, viewport }).promise;
              slide.addImage({
                data: canvas.toDataURL("image/png"),
                x: 0, y: 0, w: "100%", h: "100%",
              });
            }
          }

          setProgress(Math.round((processedPages / totalPages) * 100));
        }
      }

      setProgress(95);
      const blobContent = await pptx.write({ outputType: "blob" }) as Blob;
      const url = URL.createObjectURL(blobContent);
      const filename = files.length === 1 
        ? files[0].name.replace(/\.pdf$/i, "") + "_converted.pptx"
        : "MagicDOCX_Combined_Presentation.pptx";

      setResults([{
        file: blobContent,
        url,
        filename,
      }]);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      setProgress(100);
      toast.success(`Converted ${totalPages} pages to PowerPoint!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to PowerPoint");
    } finally {
      setProcessing(false);
      setProgress(0);
      setShowOcrModal(false);
    }
  };

  return (
    <ToolLayout
      title="PDF to PowerPoint"
      description="Convert PDF pages into editable PowerPoint slides"
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="PDF to PowerPoint Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert PDF pages to editable PowerPoint slides online for free. Each PDF page becomes a PPTX slide. Fast, secure, and no software needed."
      toolId="pdf-to-ppt"
      hideHeader={files.length > 0 || processing || results.length > 0}
    >
      {files.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-display">
          {/* Left Panel: Preview Area (Thumbnail Grid) - 70% Width */}
          <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="h-8 w-8 p-0 rounded-full hover:bg-secondary/20 font-black italic"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                <div className="flex items-center gap-2 text-left">
                  <Presentation className="h-3.5 w-3.5 text-red-600" />
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
                          <Presentation className="h-8 w-8 text-muted-foreground/30" />
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
              <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground font-heading italic">PDF to PowerPoint</h2>
                </div>

                {results.length > 0 ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 rounded-3xl bg-green-500/5 border border-green-500/10 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Processing Complete!</h4>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">Your PowerPoint presentation is ready for download.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = results[0].url;
                          a.download = results[0].filename;
                          a.click();
                        }}
                        className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Download PPT
                        <Upload className="h-6 w-6 rotate-180" />
                      </Button>

                      <Button
                        variant="outline"
                        onClick={resetAll}
                        className="w-full h-14 rounded-2xl border-2 font-black uppercase tracking-widest text-xs gap-3 hover:bg-secondary/5"
                      >
                        Start Over
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : processing ? (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="p-8 rounded-3xl bg-background border border-border shadow-xl space-y-6 text-center">
                      <div className="relative flex justify-center mx-auto">
                        <div className="w-20 h-20 rounded-full border-4 border-red-500/10 border-t-red-600 animate-spin" />
                        <Presentation className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-red-600" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-foreground leading-none">{statusText}</h3>
                        <Progress value={progress} className="h-2 rounded-full bg-secondary" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">{progress}% Complete</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/50 border border-border text-center space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pro Tip</p>
                      <p className="text-[9px] font-bold text-muted-foreground/70 uppercase">High-fidelity conversion preserves layout and text editability.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 px-1">
                    <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-4">
                      <div className="h-12 w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Smart Deck Generation</h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed">Our engine automatically maps PDF pages to 16:9 slide layouts, preserving text editability and image fidelity.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl border border-border bg-card/50 flex items-start gap-4">
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Vector Preservation</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Maintains text copy-paste functionality across all slides.</p>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl border border-border bg-card/50 flex items-start gap-4">
                        <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Master Layouts</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Automatically optimizes aspect ratios for PowerPoint.</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => convert(conversionMode === "ocr")} // Use conversionMode to decide OCR
                      disabled={processing}
                      className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Convert to PPT
                      <ArrowRight className="h-6 w-6" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 text-center">
          <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
        </div>
      )}

      <AlertDialog open={showOcrModal} onOpenChange={setShowOcrModal}>
        <AlertDialogContent className="max-w-md rounded-3xl p-8">
          <AlertDialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Sparkles className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter text-center">
              You are trying to convert a scanned PDF
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-4 space-y-4">
              <p className="text-sm font-bold text-foreground">
                To extract content from scanned documents, OCR is required.
                Premium users can convert scanned PDFs to editable PowerPoint slides using OCR.
              </p>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider italic">
                Otherwise, the pages will be converted as images inside PowerPoint slides.
              </p>
              <p className="text-sm font-black uppercase tracking-widest pt-4">
                Do you want to apply OCR?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-3 mt-8">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2"
              onClick={() => {
                setShowOcrModal(false);
                convert(false, true); // Continue without OCR
              }}
            >
              Continue without OCR
            </Button>
            <AlertDialogAction asChild>
              <Button
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                onClick={() => {
                  setConversionMode("ocr");
                  setShowOcrModal(false);
                  convert(true, true); // Apply OCR
                }}
              >
                Apply OCR
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ToolSeoSection
        toolName="PDF to PowerPoint Converter"
        category="convert"
        intro="MagicDocx PDF to PowerPoint converter transforms your PDF pages into fully editable PPTX slides. Each PDF page is intelligently reconstructed as a 16:9 slide with text blocks, images, and layout preserved. Ideal for re-purposing reports, academic papers, or any document into a presentation — no Acrobat required, no software to install."
        steps={[
          "Upload a PDF file by dragging and dropping or clicking the upload area.",
          "Wait for auto-detection — our engine checks whether the PDF is text-based or scanned.",
          "For scanned PDFs, choose whether to apply OCR or convert pages as images.",
          "Download your PPTX file with each PDF page as a fully editable slide."
        ]}
        formats={["PDF", "PPTX"]}
        relatedTools={[
          { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          { name: "PDF to Excel", path: "/pdf-to-excel", icon: FileText },
          { name: "Compress PDF", path: "/compress-pdf", icon: FileText },
          { name: "Merge PDF", path: "/merge-pdf", icon: Presentation },
        ]}
        schemaName="PDF to PowerPoint Converter Online"
        schemaDescription="Free online PDF to PowerPoint converter. Transform PDF pages into editable PPTX slides with text and image preservation."
      />
    </ToolLayout>
  );
};

export default PdfToPpt;
