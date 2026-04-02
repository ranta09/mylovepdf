import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Droplets, Loader2, Info, Layout, ScanLine, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Type, Image as ImageIcon, RotateCw,
  Move, Copy, Layers, FileText, CheckCircle2, Download,
  RefreshCw, Plus, X, Bold, Italic
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import BatchProcessingView from "@/components/BatchProcessingView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type WatermarkMode = "text" | "image";
type Position = "top-left" | "top-center" | "top-right" | "center" | "bottom-left" | "bottom-center" | "bottom-right";
type PageRangeMode = "all" | "first" | "last" | "custom";

interface PagePreview {
  url: string;
  width: number;
  height: number;
  originalPageNumber: number;
}

const WatermarkPdf = () => {
  // Core State
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Watermark Settings State
  const [mode, setMode] = useState<WatermarkMode>("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#4b5563");
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(0.5);

  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<Position>("center");
  const [isTiled, setIsTiled] = useState(false);
  const [spacing, setSpacing] = useState(100);
  const [layer, setLayer] = useState<"above" | "behind">("above");

  const [pageRangeMode, setPageRangeMode] = useState<PageRangeMode>("all");
  const [customRange, setCustomRange] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load PDF previews
  const loadPreviews = async (file: File) => {
    setProcessing(true);
    setProgress(10);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      const newPreviews: PagePreview[] = [];

      for (let i = 1; i <= Math.min(numPages, 1000); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
          newPreviews.push({
            url: canvas.toDataURL("image/jpeg", 0.7),
            width: viewport.width,
            height: viewport.height,
            originalPageNumber: i
          });
        }
        setProgress(10 + Math.round((i / numPages) * 80));
      }
      setPreviews(newPreviews);
      setCurrentPageIndex(0);
    } catch (err) {
      console.error("Preview failed:", err);
      toast.error("Failed to load PDF preview");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    if (files.length > 0 && previews.length === 0) {
      loadPreviews(files[0]);
    }
  }, [files]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const getPositionStyle = (pos: Position) => {
    switch (pos) {
      case "top-left": return { top: "10%", left: "10%" };
      case "top-center": return { top: "10%", left: "50%", transform: "translateX(-50%)" };
      case "top-right": return { top: "10%", right: "10%" };
      case "center": return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
      case "bottom-left": return { bottom: "10%", left: "10%" };
      case "bottom-center": return { bottom: "10%", left: "50%", transform: "translateX(-50%)" };
      case "bottom-right": return { bottom: "10%", right: "10%" };
      default: return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
  };

  const parsePageRange = (pagesCount: number) => {
    if (pageRangeMode === "all") return Array.from({ length: pagesCount }, (_, i) => i);
    if (pageRangeMode === "first") return [0];
    if (pageRangeMode === "last") return [pagesCount - 1];

    const selected: number[] = [];
    const parts = customRange.split(",").map(p => p.trim());
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(pagesCount, end); i++) {
            selected.push(i - 1);
          }
        }
      } else {
        const num = Number(part);
        if (!isNaN(num) && num >= 1 && num <= pagesCount) {
          selected.push(num - 1);
        }
      }
    }
    return [...new Set(selected)].sort((a, b) => a - b);
  };

  const applyWatermark = async () => {
    if (files.length === 0) return;
    setProcessing(true);
  };

  return (
    <ToolLayout title="Add Watermark" description="Professional PDF Watermarking" category="edit" icon={<Droplets className="h-7 w-7" />}
      metaTitle="Add Watermark to PDF Online Free – Text & Image | MagicDocx"
      metaDescription="Add text or image watermarks to your PDF online for free. Customize position, opacity, rotation, and tiling. Apply to all pages or a custom range. No sign-up."
      toolId="watermark" hideHeader={files.length > 0}>

      {!files.length && (
        <ToolUploadScreen
          title="Add Watermark"
          description="Stamp text or image watermarks on your PDF pages"
          buttonLabel="Select PDF files"
          accept=".pdf"
          multiple={true}
          onFilesSelected={setFiles}
        />
      )}

      {files.length > 0 && !processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-30 bg-background flex flex-col lg:flex-row overflow-hidden select-none">

          {/* LEFT PANEL: Thumbnails */}
          <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[20vh] lg:h-full overflow-hidden shrink-0">
            <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Layout className="h-3.5 w-3.5" /> {previews.length} Pages
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {previews.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPageIndex(i)}
                    className={cn(
                      "w-full aspect-[1/1.414] bg-background border rounded-lg overflow-hidden transition-all relative group",
                      currentPageIndex === i ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                    )}
                  >
                    <img src={p.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 bg-background/80 px-1.5 py-0.5 rounded text-[8px] font-black border border-border">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* CENTER: Preview Area */}
          <div className="flex-1 bg-secondary/10 flex flex-col relative overflow-hidden group">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}><ZoomOut className="h-4 w-4" /></Button>
              <span className="text-[10px] font-black w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(2, zoom + 0.1))}><ZoomIn className="h-4 w-4" /></Button>
            </div>

            <div className="flex-1 overflow-auto p-12 flex items-start justify-center cursor-grab active:cursor-grabbing" ref={scrollRef}>
              {previews.length > 0 && (
                <div
                  className="bg-white shadow-2xl relative"
                  style={{
                    width: previews[currentPageIndex].width * zoom,
                    height: previews[currentPageIndex].height * zoom,
                    transition: 'width 0.2s, height 0.2s'
                  }}
                >
                  <img src={previews[currentPageIndex].url} className="w-full h-full pointer-events-none" alt="PDF Page" />

                  {/* WATERMARK PREVIEW OVERLAY */}
                  <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", layer === "behind" ? "z-0" : "z-10")}>
                    {isTiled ? (
                      <div
                        className="w-[200%] h-[200%] -left-1/2 -top-1/2 flex flex-wrap content-start gap-px"
                        style={{ opacity }}
                      >
                        {Array.from({ length: 100 }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              transform: `rotate(${-rotation}deg)`,
                              fontSize: `${fontSize * zoom}px`,
                              color: textColor,
                              margin: `${spacing * zoom / 2}px`
                            }}
                            className={cn("whitespace-nowrap font-black shrink-0", isBold && "font-black", isItalic && "italic")}
                          >
                            {mode === "text" ? (text || "WATERMARK") : (imagePreview && <img src={imagePreview} style={{ width: 100 * zoom * imageScale }} />)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{ ...getPositionStyle(position), opacity, transform: `${getPositionStyle(position).transform || ""} rotate(${-rotation}deg)`, fontSize: `${fontSize * zoom}px`, color: textColor }}
                        className={cn("absolute text-center whitespace-nowrap transition-all duration-300", isBold && "font-black", isItalic && "italic")}
                      >
                        {mode === "text" ? (text || "WATERMARK") : (imagePreview ? <img src={imagePreview} style={{ width: 200 * zoom * imageScale }} /> : "IMAGE PREVIEW")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-12 border-t border-border bg-background/50 flex items-center justify-between px-6 shrink-0">
              <span className="text-[9px] font-black text-muted-foreground uppercase">{files[0]?.name}</span>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-[10px] font-black uppercase">Page {currentPageIndex + 1} of {previews.length}</span>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPageIndex(Math.min(previews.length - 1, currentPageIndex + 1))} disabled={currentPageIndex === previews.length - 1}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Settings */}
          <div className="w-full lg:w-96 border-l border-border bg-background flex flex-col shrink-0 h-full">
            <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Watermark Config</span>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-7 text-[10px] font-black uppercase text-destructive hover:bg-destructive/5">
                Discard
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-8 pb-32">
                <Tabs defaultValue="text" onValueChange={(val) => setMode(val as WatermarkMode)}>
                  <TabsList className="w-full h-12 rounded-xl bg-secondary/10 p-1 mb-6">
                    <TabsTrigger value="text" className="flex-1 rounded-lg gap-2 text-[10px] font-black uppercase"><Type className="h-3.5 w-3.5" /> Text</TabsTrigger>
                    <TabsTrigger value="image" className="flex-1 rounded-lg gap-2 text-[10px] font-black uppercase"><ImageIcon className="h-3.5 w-3.5" /> Image</TabsTrigger>
                  </TabsList>

                  <TabsContent value="text" className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1"><ScanLine className="h-3.5 w-3.5" /> Watermark Text</label>
                      <Input value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" className="h-11 rounded-xl font-bold uppercase" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Font Family</label>
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                          <SelectTrigger className="h-10 rounded-xl text-[11px] font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Helvetica">Helvetica</SelectItem><SelectItem value="Courier">Courier</SelectItem><SelectItem value="Times">Times New Roman</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase px-1">Font Size</label>
                        <Input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="h-10 rounded-xl font-bold" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-secondary/5 rounded-xl border border-border/50">
                      <div className="flex items-center gap-1">
                        <Button variant={isBold ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setIsBold(!isBold)}><Bold className="h-3.5 w-3.5" /></Button>
                        <Button variant={isItalic ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setIsItalic(!isItalic)}><Italic className="h-3.5 w-3.5" /></Button>
                      </div>
                      <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded shrink-0 cursor-pointer overflow-hidden border-none" />
                    </div>
                  </TabsContent>

                  <TabsContent value="image" className="space-y-6">
                    {!imagePreview ? (
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all animate-in zoom-in-95"
                      >
                        <Plus className="h-8 w-8 text-muted-foreground" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase">Upload PNG / JPG</span>
                      </div>
                    ) : (
                      <div className="relative group rounded-2xl border border-border overflow-hidden bg-white aspect-square flex items-center justify-center p-8 shadow-inner">
                        <img src={imagePreview} className="max-w-full max-h-full object-contain" alt="Watermark" />
                        <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase"><span>Image Scale</span> <span className="text-primary">{Math.round(imageScale * 100)}%</span></div>
                      <Slider value={[imageScale]} onValueChange={v => setImageScale(v[0])} min={0.1} max={1} step={0.05} />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-8 pt-8 border-t border-border">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2"><Move className="h-3.5 w-3.5" /> Position</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-muted-foreground uppercase">Tiled</span>
                        <Switch checked={isTiled} onCheckedChange={setIsTiled} />
                      </div>
                    </div>

                    {!isTiled ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          "top-left", "top-center", "top-right",
                          "center", "none", "none2",
                          "bottom-left", "bottom-center", "bottom-right"
                        ].map((pos, i) => (
                          pos.startsWith("none") ? <div key={i} /> :
                            <button
                              key={pos}
                              onClick={() => setPosition(pos as Position)}
                              className={cn(
                                "aspect-video rounded-lg border-2 transition-all relative",
                                position === pos ? "border-primary bg-primary/5" : "border-border hover:border-primary/20 bg-secondary/5"
                              )}
                            >
                              <div
                                style={getPositionStyle(pos as Position)}
                                className={cn("absolute w-1.5 h-1.5 rounded-full transition-all", position === pos ? "bg-primary scale-125 shadow-glow" : "bg-muted-foreground/30")}
                              />
                            </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase"><span>Spacing</span> <span className="text-primary">{spacing}PX</span></div>
                        <Slider value={[spacing]} onValueChange={v => setSpacing(v[0])} min={10} max={300} step={10} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase"><span>Opacity</span> <span className="text-primary">{Math.round(opacity * 100)}%</span></div>
                      <Slider value={[opacity]} onValueChange={v => setOpacity(v[0])} min={0.05} max={1} step={0.05} />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase"><span>Rotation</span> <span className="text-primary">{rotation}°</span></div>
                      <Slider value={[rotation]} onValueChange={v => setRotation(v[0])} min={0} max={360} step={5} />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-border">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Page Range</label>
                      <Select value={pageRangeMode} onValueChange={(val) => setPageRangeMode(val as PageRangeMode)}>
                        <SelectTrigger className="h-10 rounded-xl text-[11px] font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Every Page</SelectItem><SelectItem value="first">First Page Only</SelectItem><SelectItem value="last">Last Page Only</SelectItem><SelectItem value="custom">Custom Range</SelectItem></SelectContent>
                      </Select>
                      {pageRangeMode === "custom" && <Input value={customRange} onChange={e => setCustomRange(e.target.value)} placeholder="e.g. 1,3,5-10" className="h-10 rounded-xl font-bold" />}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary/5 rounded-2xl border border-border/50">
                      <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> Place on Top</span>
                      <Switch checked={layer === "above"} onCheckedChange={(val) => setLayer(val ? "above" : "behind")} />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t border-border bg-background shrink-0 mt-auto">
              <Button size="lg" onClick={applyWatermark} disabled={processing || (mode === "text" && !text)} className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all gap-3 overflow-hidden group">
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Applying...</> : <>Add Watermark <ChevronRight className="h-4 w-4" /></>}
              </Button>
              <p className="mt-4 text-[9px] text-center font-bold text-muted-foreground uppercase tracking-widest opacity-60">Files are handled privately and secure</p>
            </div>
          </div>
        </div>
      )}

      {processing && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background/95 backdrop-blur-md overflow-y-auto p-6">
            <BatchProcessingView
                files={files}
                title="Stamping Documents..."
                onReset={() => {
                   setProcessing(false);
                   setFiles([]);
                   setPreviews([]);
                }}
                processItem={async (file, onProgress) => {
                    const bytes = await file.arrayBuffer();
                    const doc = await PDFDocument.load(bytes);
                    const pages = doc.getPages();
                    const targetPages = parsePageRange(pages.length);

                    let image;
                    if (mode === "image" && imageFile) {
                        const imgBytes = await imageFile.arrayBuffer();
                        image = imageFile.type === "image/png" ? await doc.embedPng(imgBytes) : await doc.embedJpg(imgBytes);
                    }

                    for (let i = 0; i < targetPages.length; i++) {
                        const pageIdx = targetPages[i];
                        const page = pages[pageIdx];
                        const { width, height } = page.getSize();

                        onProgress(Math.round((i / targetPages.length) * 100));

                        const r = parseInt(textColor.slice(1, 3), 16) / 255;
                        const g = parseInt(textColor.slice(3, 5), 16) / 255;
                        const b = parseInt(textColor.slice(5, 7), 16) / 255;

                        const draw = (x: number, y: number) => {
                            if (mode === "text") {
                                page.drawText(text || "WATERMARK", {
                                    x, y, size: fontSize,
                                    color: rgb(r, g, b), opacity,
                                    rotate: degrees(-rotation),
                                });
                            }
                        };

                        if (isTiled) {
                            for (let x = 0; x < width; x += 200) {
                                for (let y = 0; y < height; y += 100) {
                                    draw(x, y);
                                }
                            }
                        } else {
                            const marginW = width * 0.1;
                            const marginH = height * 0.1;
                            let x = width / 2;
                            let y = height / 2;

                            switch (position) {
                                case "top-left": x = marginW; y = height - marginH; break;
                                case "top-center": x = width / 2; y = height - marginH; break;
                                case "top-right": x = width - marginW; y = height - marginH; break;
                                case "center": x = width / 2; y = height / 2; break;
                                case "bottom-left": x = marginW; y = marginH; break;
                                case "bottom-center": x = width / 2; y = marginH; break;
                                case "bottom-right": x = width - marginW; y = marginH; break;
                            }

                            if (mode === "text") {
                                draw(x, y);
                            } else if (image) {
                                const imgWidth = image.width * imageScale;
                                const imgHeight = image.height * imageScale;
                                page.drawImage(image, {
                                    x: x - imgWidth / 2,
                                    y: y - imgHeight / 2,
                                    width: imgWidth,
                                    height: imgHeight,
                                    opacity,
                                    rotate: degrees(-rotation),
                                });
                            }
                        }
                    }

                    const pdfBytes = await doc.save();
                    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
                    
                    return { blob: blob, filename: file.name.replace(/\.pdf$/i, "_watermarked.pdf") };
                }}
            />
          </div>
      )}


      {!files.length && (
        <ToolSeoSection
          toolName="Add Watermark to PDF"
          category="edit"
          intro="MagicDocx Add Watermark tool lets you brand and protect your PDF documents with professional text or image watermarks. Configure the watermark text, font, size, color, opacity, rotation, and position. Use tiling mode to repeat the watermark across the entire page. Apply watermarks to all pages, first page only, last page only, or a custom range | all in your browser without any software."
          steps={[
            "Upload a PDF file using the file upload area.",
            "Choose your watermark type: Text (enter your text, font, size, and color) or Image (upload a PNG/JPG).",
            "Configure position, opacity, rotation, and whether to tile the watermark across the page.",
            "Click 'Add Watermark' to download your watermarked PDF."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Edit PDF", path: "/edit-pdf", icon: Droplets },
            { name: "Rotate PDF", path: "/rotate-pdf", icon: Droplets },
            { name: "Compress PDF", path: "/compress-pdf", icon: Droplets },
            { name: "Merge PDF", path: "/merge-pdf", icon: Droplets },
          ]}
          schemaName="Add Watermark to PDF Online"
          schemaDescription="Free online PDF watermark tool. Add text or image watermarks to PDF pages with custom opacity, position, and rotation."
        />
      )}
    </ToolLayout>
  );
};

export default WatermarkPdf;
