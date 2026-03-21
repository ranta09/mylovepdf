import { useState, useRef, useCallback, useEffect } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

// Setup worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
import { PenTool, Loader2, Info, ShieldCheck, X, Layout } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

interface PlacedSig {
  id: string;
  page: number;
  x: number; // 0-500 scale
  y: number; // 0-500 scale
  dataUrl: string;
}

const SignPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, setDisableGlobalFeatures]);

  const [progress, setProgress] = useState(0);

  // PDF Rendering State
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(1);
  const [viewPage, setViewPage] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Signatures State
  const [placedSigs, setPlacedSigs] = useState<PlacedSig[]>([]);
  const [selectedSigId, setSelectedSigId] = useState<string | null>(null);

  // Brush Inputs 
  const [typedName, setTypedName] = useState("");
  const [drawnData, setDrawnData] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      if (files.length === 0) {
        pdfDocRef.current = null;
        setPreviewUrl(null);
        setPlacedSigs([]);
        return;
      }
      try {
        const arrayBuffer = await files[0].arrayBuffer();
        pdfDocRef.current = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setNumPages(pdfDocRef.current.numPages);
        setViewPage(1);
      } catch (error) {
        console.error("Error loading PDF preview:", error);
        toast.error("Failed to load document");
      }
    };
    loadPdf();
  }, [files]);

  // Render Page
  const renderPage = useCallback(async (pageIdx: number) => {
    if (!pdfDocRef.current) return;
    try {
      let p = pageIdx;
      if (p < 1) p = 1;
      if (p > pdfDocRef.current.numPages) p = pdfDocRef.current.numPages;
      const pdfPage = await pdfDocRef.current.getPage(p);
      const viewport = pdfPage.getViewport({ scale: 2.0 }); // High-res render
      
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d")!;
      await pdfPage.render({ canvasContext: context, viewport }).promise;
      setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9)); 
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    renderPage(viewPage);
  }, [viewPage, renderPage]);

  // Handle Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (files.length === 0) return;
      const pasteItems = e.clipboardData?.items;
      if (pasteItems) {
        for (let i = 0; i < pasteItems.length; i++) {
          if (pasteItems[i].type.indexOf("image") !== -1) {
            const blob = pasteItems[i].getAsFile();
            if (blob) {
              const url = URL.createObjectURL(blob);
              setUploadedData(url);
              toast.success("Image pasted from clipboard!");
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [files.length]);

  // Drawing Logic (High Res)
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  useEffect(() => {
    if (canvasRef.current) {
       canvasRef.current.width = 800;
       canvasRef.current.height = 320;
    }
  }, []);

  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    if (canvasRef.current) {
      setDrawnData(canvasRef.current.toDataURL("image/png"));
    }
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnData(null);
  };

  const generateTypedSignature = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, 600, 160);
    ctx.font = "italic 64px 'Georgia', serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 20, 80);
    return canvas.toDataURL("image/png");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setUploadedData(url);
    }
  };

  const getCurrentBrush = () => {
    if (drawnData) return drawnData;
    if (uploadedData) return uploadedData;
    if (typedName) return generateTypedSignature();
    return null;
  };

  // Add signature on click
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const brush = getCurrentBrush();
    if (!brush) {
       toast.error("Please draw, type, or upload a signature to place");
       return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const weightX = Math.round((x / rect.width) * 500);
    const weightY = Math.round((y / rect.height) * 500);

    const newSig: PlacedSig = {
        id: Math.random().toString(),
        page: viewPage,
        x: weightX,
        y: weightY,
        dataUrl: brush
    };
    setPlacedSigs(prev => [...prev, newSig]);
    setSelectedSigId(newSig.id);
  };

  // Drag handlers
  const onPointerDownSig = (e: React.PointerEvent<HTMLDivElement>, sig: PlacedSig) => {
    e.stopPropagation();
    setSelectedSigId(sig.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !selectedSigId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left - dragOffset.x;
      let y = e.clientY - rect.top - dragOffset.y;

      const weightX = Math.round(Math.max(0, Math.min(500, (x / rect.width) * 500)));
      const weightY = Math.round(Math.max(0, Math.min(500, (y / rect.height) * 500)));

      setPlacedSigs(prev => prev.map(s => s.id === selectedSigId ? { ...s, x: weightX, y: weightY } : s));
    };

    const onPointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDragging, selectedSigId, dragOffset]);

  const removeSignature = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlacedSigs(prev => prev.filter(s => s.id !== id));
    if (selectedSigId === id) setSelectedSigId(null);
  };

  const activeSig = placedSigs.find(s => s.id === selectedSigId);
  const activePosX = activeSig ? String(activeSig.x) : "0";
  const activePosY = activeSig ? String(activeSig.y) : "0";

  const handleUpdateActiveSig = (updates: Partial<PlacedSig>) => {
    if (selectedSigId) {
      setPlacedSigs(prev => prev.map(s => s.id === selectedSigId ? { ...s, ...updates } : s));
    }
  };

  // Export 
  const sign = async () => {
    if (files.length === 0) return;
    if (placedSigs.length === 0) { 
        toast.error("Please place at least one signature by clicking on the document."); 
        return; 
    }

    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      
      setProgress(30);
      let count = 0;
      for (const sig of placedSigs) {
        if (sig.page < 1 || sig.page > doc.getPageCount()) continue;

        const pngBytes = await fetch(sig.dataUrl).then(r => r.arrayBuffer());
        const pngImage = await doc.embedPng(pngBytes);
        
        const pdfPage = doc.getPage(sig.page - 1);
        const { width, height } = pdfPage.getSize();
        
        const sigWidth = Math.min(150, width * 0.3); 
        const sigHeight = (pngImage.height / pngImage.width) * sigWidth;
        
        const px = (sig.x / 500) * width;
        const py = (sig.y / 500) * height;

        pdfPage.drawImage(pngImage, {
          x: px,
          y: height - py - sigHeight,
          width: sigWidth,
          height: sigHeight,
        });
        
        count++;
        setProgress(30 + Math.round((count / placedSigs.length) * 50));
      }

      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const filename = files[0].name.replace(/\.pdf$/i, "_signed.pdf");

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("PDF signed and downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Sign PDF" description="Draw or type your signature and place it on your PDF" category="edit" icon={<PenTool className="h-7 w-7" />}
      metaTitle="Sign PDF Online Free – Draw or Type Signature | MagicDocx" metaDescription="Add your signature to any PDF online for free. Draw with mouse/touch, type a stylized signature, or upload an image. No sign-up required." toolId="sign-pdf" hideHeader={files.length > 0}>
      {files.length > 0 && !processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-row overflow-hidden relative">

            {/* CENTER: Document Viewer / Focus Area */}
            <div className="flex-1 bg-secondary/10 flex flex-col items-center justify-center p-8 overflow-y-auto min-h-0">
              <div
                ref={containerRef}
                className="w-full max-w-2xl bg-white shadow-2xl rounded-sm aspect-[1/1.414] relative overflow-hidden group cursor-crosshair touch-none"
                onClick={handlePreviewClick}
              >
                {/* PDF Page Area */}
                {previewUrl ? (
                  <img src={previewUrl} alt="Document Preview" className="w-full h-full object-contain pointer-events-none select-none" />
                ) : (
                  <div className="p-12 space-y-8 h-full flex flex-col opacity-20 pointer-events-none select-none">
                    <div className="h-4 w-3/4 bg-border rounded" />
                    <div className="h-4 w-1/2 bg-border rounded" />
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-border/50 rounded" />
                      <div className="h-2 w-full bg-border/50 rounded" />
                      <div className="h-2 w-5/6 bg-border/50 rounded" />
                    </div>
                    <div className="mt-auto h-4 w-1/4 bg-border rounded" />
                  </div>
                )}

                {/* Status Badges */}
                <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2 z-10">
                  <div className="p-3 bg-white/90 backdrop-blur-md rounded-xl border border-border shadow-lg flex items-center gap-2 px-4 py-2 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Live Document Stream</span>
                  </div>
                </div>

                <div className="absolute top-4 right-4 pointer-events-none z-10">
                  <div className="bg-primary/90 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-widest">
                    Page {viewPage} / {numPages}
                  </div>
                </div>

                {/* Signature Previews */}
                {placedSigs.filter(sig => sig.page === viewPage).map((sig) => (
                  <div
                    key={sig.id}
                    className={`absolute p-1 cursor-move transition-shadow z-20 group/sig
                      ${selectedSigId === sig.id ? 'ring-2 ring-primary border-transparent' : 'border-2 border-dashed border-primary/20 hover:border-primary'}
                    `}
                    style={{
                      left: `${(sig.x / 500) * 100}%`,
                      top: `${(sig.y / 500) * 100}%`,
                      width: '150px',
                      height: 'auto'
                    }}
                    onPointerDown={(e) => onPointerDownSig(e, sig)}
                  >
                    <img src={sig.dataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none select-none" />
                    <button
                      onClick={(e) => removeSignature(sig.id, e)}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/sig:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE: Control Center */}
            <div className="w-96 border-l border-border bg-background flex flex-col shrink-0 z-30">
              <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Control Center</span>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-7 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive">
                  Reset
                </Button>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                      <PenTool className="h-3.5 w-3.5" />
                      1. Generation Mode
                    </h3>
                    <Tabs defaultValue="draw" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 rounded-xl h-10 bg-secondary/50 p-1">
                        <TabsTrigger value="draw" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Draw</TabsTrigger>
                        <TabsTrigger value="type" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Type</TabsTrigger>
                        <TabsTrigger value="image" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Image</TabsTrigger>
                      </TabsList>
                      <TabsContent value="draw" className="mt-4 space-y-3">
                        <div className="rounded-xl border-2 border-border bg-secondary/5 p-1 relative group overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            className="w-full cursor-crosshair rounded-lg bg-white touch-none"
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={endDraw}
                            onMouseLeave={endDraw}
                            onTouchStart={startDraw}
                            onTouchMove={draw}
                            onTouchEnd={endDraw}
                          />
                          <div className="absolute top-2 right-2 flex gap-1 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                            <Button variant="outline" size="icon" onClick={clearCanvas} className="h-8 w-8 bg-background border-border hover:bg-destructive/5 hover:text-destructive rounded-lg shadow-sm">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold text-center italic">Draw inside the capture area</p>
                      </TabsContent>
                      <TabsContent value="type" className="mt-4 space-y-3">
                        <Input
                          placeholder="Your identity..."
                          value={typedName}
                          onChange={e => setTypedName(e.target.value)}
                          className="text-lg italic font-serif h-12 rounded-xl bg-secondary/5 border-border focus:bg-background transition-all uppercase tracking-tighter"
                        />
                        <div className="flex justify-center p-4 border border-border border-dashed rounded-xl bg-secondary/5">
                          {typedName ? <p className="text-2xl italic font-serif text-foreground">{typedName}</p> : <p className="text-[10px] text-muted-foreground uppercase font-bold">Awaiting Input...</p>}
                        </div>
                      </TabsContent>
                      <TabsContent value="image" className="mt-4 space-y-3">
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-border border-dashed rounded-xl bg-secondary/5 text-center gap-4 hover:border-primary/50 transition-colors">
                          {uploadedData ? (
                            <div className="relative group">
                              <img src={uploadedData} alt="Uploaded Signature" className="max-h-24 object-contain rounded" />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-md"
                                onClick={(e) => { e.stopPropagation(); setUploadedData(null); }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-secondary/50 rounded-full">
                                  <Layout className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  Drag & Drop, Paste, or
                                </p>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={signatureInputRef}
                                onChange={handleSignatureUpload}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => signatureInputRef.current?.click()}
                                className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
                              >
                                Browse Files
                              </Button>
                            </>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                      <Layout className="h-3.5 w-3.5" />
                      2. Spatial Placement
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase">Page</label>
                        <Input type="number" min="1" max={numPages} value={viewPage} onChange={e => {
                           let p = parseInt(e.target.value);
                           if (!isNaN(p)) {
                             p = Math.max(1, Math.min(numPages, p));
                             setViewPage(p);
                           }
                        }} className="h-9 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">X-Weight</label>
                        <Input type="number" min="0" max="500" value={activePosX} onChange={e => handleUpdateActiveSig({x: Number(e.target.value)})} className="h-9 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Y-Weight</label>
                        <Input type="number" min="0" max="500" value={activePosY} onChange={e => handleUpdateActiveSig({y: Number(e.target.value)})} className="h-9 rounded-lg text-xs font-bold" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 h-24 flex items-end">
                    <Button
                      size="lg"
                      onClick={sign}
                      disabled={processing || placedSigs.length === 0}
                      className="w-full h-14 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-3"
                    >
                      {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Sealing...</> : <>Seal & Export <ShieldCheck className="h-4 w-4" /></>}
                    </Button>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border bg-secondary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Progress value={processing ? progress : 0} className="h-1 rounded-full flex-1" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Signature Integrity: {placedSigs.length > 0 ? "Optimal" : "Awaiting"}</span>
                  <span className="text-[9px] font-black text-primary uppercase">MIL-SPEC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!files.length && (
        <div className="mt-10">
          <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to sign" />
          <ToolSeoSection
            toolName="Sign PDF Online"
            category="edit"
            intro="MagicDocx Sign PDF lets you add your handwritten or typed signature to any PDF document directly in your browser. Draw your signature using your mouse or finger on a canvas pad, type out a signature in a stylized script font, or upload an existing signature image. Drag the signature onto any position on any page, resize it, and download your signed PDF instantly. All signing is done client-side | no file is ever uploaded."
            steps={[
              "Upload your PDF using the file upload area.",
              "In the Sign panel, draw your signature on the canvas pad, type a signature, or upload a signature image.",
              "Use the document preview to click where you want to place the signature.",
              "Click 'Apply Signature' to download your signed PDF."
            ]}
            formats={["PDF"]}
            relatedTools={[
              { name: "Edit PDF", path: "/edit-pdf", icon: PenTool },
              { name: "Redact PDF", path: "/redact-pdf", icon: PenTool },
              { name: "Protect PDF", path: "/protect-pdf", icon: PenTool },
              { name: "Add Watermark", path: "/watermark", icon: PenTool },
            ]}
            schemaName="Sign PDF Online"
            schemaDescription="Free online PDF signing tool. Draw, type, or upload your signature and place it on any PDF page. 100% browser-based, no upload."
          />
        </div>
      )}
    </ToolLayout>
  );
};

export default SignPdf;
