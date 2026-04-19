import { useState, useCallback, useRef, useEffect } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { 
  FileImage, 
  FileBox, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  Upload,
  X,
  Plus,
  Settings,
  RectangleVertical,
  RectangleHorizontal,
  Maximize,
  Scan,
  Layers,
  Layout,
  GripVertical,
  MoveHorizontal,
  AlignCenter,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { convertImagesToPdf, ImageToPdfOptions } from "@/lib/jpgToPdfEngine";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const JpgToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversion Options
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");
  const [margin, setMargin] = useState<"none" | "small" | "large">("none");
  const [alignment, setAlignment] = useState<"center" | "full" | "fit">("center");

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleFilesChange = useCallback((newFiles: File[]) => {
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    
    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      } else {
        toast.error(`Unsupported file: ${file.name}. This tool supports image files only.`);
      }
    }
    
    setFiles(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const newFiles = [...files];
    const newPreviews = [...previews];
    
    const [movedFile] = newFiles.splice(from, 1);
    newFiles.splice(to, 0, movedFile);
    
    const [movedPreview] = newPreviews.splice(from, 1);
    newPreviews.splice(to, 0, movedPreview);
    
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const convert = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      const options: ImageToPdfOptions = {
        pageSize,
        orientation,
        margin,
        alignment
      };

      // Progress simulation
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const pdfBlob = await convertImagesToPdf(files, options);
      
      clearInterval(interval);
      setProgress(100);

      const filename = files.length === 1 
        ? files[0].name.replace(/\.[^/.]+$/, "") + ".pdf" 
        : "converted-images.pdf";

      const result: ProcessingResult = {
        file: pdfBlob,
        url: URL.createObjectURL(pdfBlob),
        filename
      };

      setResults([result]);

      // Auto download
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.filename;
      a.click();

      toast.success("Images converted to PDF!");
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error("Conversion failed. Please try different images.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [files, pageSize, orientation, margin, alignment]);

  return (
    <ToolLayout
      title="JPG to PDF"
      description="Convert JPG and JPEG images into a high-quality PDF document"
      category="convert"
      icon={<FileImage className="h-7 w-7" />}
      metaTitle="JPG to PDF Converter Online Free – Fast & Secure | MagicDocx"
      metaDescription="Convert JPG and JPEG images to high-quality PDF online. Preserve resolution, colors, and quality. Fast, secure, and professional."
      toolId="jpg-to-pdf"
      hideHeader={files.length > 0 || results.length > 0 || processing}
      className="jpg-to-pdf-page"
    >
      <style>{`
        .jpg-to-pdf-page h1, 
        .jpg-to-pdf-page h2, 
        .jpg-to-pdf-page h3,
        .jpg-to-pdf-page span,
        .jpg-to-pdf-page button,
        .jpg-to-pdf-page p,
        .jpg-to-pdf-page div {
          font-family: 'Inter', sans-serif !important;
        }
      `}</style>

      {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">

          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <Settings className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold uppercase tracking-tighter text-red-600">Encoding Visual Buffers</h3>
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{progress}% Vectorized</p>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={() => { 
                previews.forEach(p => URL.revokeObjectURL(p));
                setFiles([]); 
                setResults([]); 
                setPreviews([]); 
              }} />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Thumbnails Grid (70%) */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                      {files.map((file, idx) => (
                        <div key={`${file.name}-${idx}`} className="group flex flex-col gap-3 p-3 bg-background border border-border hover:border-primary/50 rounded-2xl transition-all duration-200 text-left relative shadow-sm">
                          <div className="aspect-square bg-secondary/20 rounded-xl overflow-hidden relative border border-border/50">
                            <img src={previews[idx]} alt={file.name} className="w-full h-full object-cover" />
                            <div className="absolute top-2 left-2 h-6 w-6 bg-background/90 backdrop-blur-sm border border-border rounded flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {idx + 1}
                            </div>
                            <button 
                              onClick={() => removeFile(idx)} 
                              className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:text-destructive transition-all shadow-sm opacity-0 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => moveFile(idx, idx - 1)} 
                                disabled={idx === 0}
                                className="p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:text-primary disabled:opacity-30"
                              >
                                <ChevronLeft className="h-3 w-3 rotate-90" />
                              </button>
                              <button 
                                onClick={() => moveFile(idx, idx + 1)} 
                                disabled={idx === files.length - 1}
                                className="p-1.5 bg-background/90 backdrop-blur-sm border border-border rounded hover:text-primary disabled:opacity-30"
                              >
                                <ChevronRight className="h-3 w-3 rotate-90" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="min-w-0 px-1">
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-tight truncate">{file.name}</p>
                            <p className="text-[9px] font-bold text-primary uppercase">{formatSize(file.size)}</p>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="h-8 w-8" />
                        Add Images
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" multiple accept=".jpg,.jpeg" onChange={(e) => e.target.files && handleFilesChange(Array.from(e.target.files))} />
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
                        <div className="p-3 bg-red-500/10 rounded-2xl">
                          <FileImage className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-base font-bold uppercase tracking-tighter leading-none text-red-600">JPG to PDF</h4>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Orientation */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Orientation</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'portrait', label: 'Portrait', icon: RectangleVertical },
                              { id: 'landscape', label: 'Landscape', icon: RectangleHorizontal }
                            ].map((o) => (
                              <button 
                                key={o.id}
                                onClick={() => setOrientation(o.id as any)}
                                className={cn(
                                  "h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest transition-all",
                                  orientation === o.id ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                <o.icon className="h-4 w-4" /> {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Paper Format */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Page Size</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'fit', label: 'Fit Image' },
                                { id: 'a4', label: 'A4' },
                                { id: 'letter', label: 'Letter' }
                            ].map((size) => (
                              <button
                                key={size.id}
                                onClick={() => setPageSize(size.id as any)}
                                className={cn(
                                  "h-12 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                  pageSize === size.id ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                {size.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Margins */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Margins</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'none', label: 'No Margin' },
                                { id: 'small', label: 'Small' },
                                { id: 'large', label: 'Large' }
                            ].map((m) => (
                              <button
                                key={m.id}
                                onClick={() => setMargin(m.id as any)}
                                className={cn(
                                  "h-12 rounded-xl border-2 text-[10px] font-bold uppercase tracking-widest transition-all",
                                  margin === m.id ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Alignment */}
                        <div className="space-y-3">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Image Alignment</Label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'center', label: 'Center', icon: AlignCenter },
                                { id: 'full', label: 'Full Width', icon: MoveHorizontal },
                                { id: 'fit', label: 'Fit Page', icon: Maximize }
                            ].map((a) => (
                              <button
                                key={a.id}
                                onClick={() => setAlignment(a.id as any)}
                                className={cn(
                                  "h-14 rounded-xl border-2 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest transition-all",
                                  alignment === a.id ? "border-red-500 bg-red-500/5 text-red-600 shadow-inner" : "border-border bg-background text-muted-foreground hover:border-red-500/20"
                                )}
                              >
                                <a.icon className="h-4 w-4" /> {a.label}
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
                      onClick={convert} 
                      className="w-full h-16 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 hover:shadow-red-500/40 bg-red-600 hover:bg-red-700 transition-all gap-4 group"
                    >
                      Initiate Synthesis <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {files.length === 0 && !processing && results.length === 0 && (
        <ToolUploadScreen
          title="JPG to PDF"
          description="Convert JPG images into a high-quality PDF document"
          buttonLabel="Select JPG images"
          accept=".jpg,.jpeg"
          multiple={true}
          onFilesSelected={handleFilesChange}
        />
      )}

      {files.length === 0 && results.length === 0 && !processing && (
        <ToolSeoSection
          toolName="JPG to PDF Converter"
          category="convert"
          intro="MagicDocx JPG to PDF converter transforms your images (JPG, JPEG) into professional PDF documents. Our precision engine preserves resolution and color accuracy with pixel-perfect results. Support for multiple images, custom margins, page sizes, and drag-and-drop reordering makes it a professional utility for high-quality document synthesis."
          steps={[
            "Upload your JPG or JPEG images to the secure workspace.",
            "Reorder images by dragging them into your preferred sequence.",
            "Configure page layout including orientation, margins, and paper format in the workbench.",
            "All uploaded images will be automatically combined into a single multi-page PDF.",
            "Click 'Initiate Synthesis' and download your professional-grade PDF instantly."
          ]}
          formats={["JPG", "JPEG", "PDF"]}
          relatedTools={[
            { name: "PNG to PDF", path: "/png-to-pdf", icon: ImageIcon },
            { name: "PDF to JPG", path: "/pdf-to-jpg", icon: FileImage },
            { name: "Merge PDF", path: "/merge-pdf", icon: Layers },
            { name: "Compress PDF", path: "/compress-pdf", icon: Scan },
          ]}
          schemaName="JPG to PDF Converter Online"
          schemaDescription="Free professional online JPG to PDF converter. Combine multiple images into a high-fidelity PDF with custom layout preservation."
        />
      )}
    </ToolLayout>
  );
};

export default JpgToPdf;
