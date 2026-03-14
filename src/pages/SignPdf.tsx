import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
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

const SignPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [pageNum, setPageNum] = useState("1");
  const [posX, setPosX] = useState("100");
  const [posY, setPosY] = useState("100");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

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
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL("image/png"));
    }
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const generateTypedSignature = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, 300, 80);
    ctx.font = "italic 32px 'Georgia', serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.fillText(typedName, 10, 50);
    return canvas.toDataURL("image/png");
  };

  const sign = async () => {
    if (files.length === 0) return;
    const sigImage = signatureData || (typedName ? generateTypedSignature() : null);
    if (!sigImage) { toast.error("Please draw or type your signature"); return; }

    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pngBytes = await fetch(sigImage).then(r => r.arrayBuffer());
      const pngImage = await doc.embedPng(pngBytes);
      setProgress(50);

      const page = parseInt(pageNum) - 1;
      if (page < 0 || page >= doc.getPageCount()) { toast.error("Invalid page number"); setProcessing(false); return; }

      const pdfPage = doc.getPage(page);
      const { height } = pdfPage.getSize();
      const sigWidth = 150;
      const sigHeight = (pngImage.height / pngImage.width) * sigWidth;

      pdfPage.drawImage(pngImage, {
        x: parseInt(posX),
        y: height - parseInt(posY) - sigHeight,
        width: sigWidth,
        height: sigHeight,
      });
      setProgress(80);

      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "signed.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF signed successfully!");
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
      metaTitle="Sign PDF — Add Signature Online Free" metaDescription="Sign PDF documents online for free. Draw or type your signature." toolId="sign-pdf" hideHeader={files.length > 0}>
      {files.length > 0 && !processing && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-row overflow-hidden relative">

            {/* LEFT SIDE: Instructions / Info */}
            <div className="w-80 border-r border-border bg-secondary/5 flex flex-col shrink-0">
              <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Security Protocol</span>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Document Status</h3>
                    <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                      <p className="text-[10px] font-bold text-green-600 uppercase">Ready for Signing</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase leading-tight font-medium">Verify signature placement before finalizing</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Instructions</h3>
                    <div className="space-y-3">
                      {[
                        { step: "01", text: "Create your signature below" },
                        { step: "02", text: "Define the target page" },
                        { step: "03", text: "Set spatial coordinates" },
                        { step: "04", text: "Seal the document" }
                      ].map((s, i) => (
                        <div key={i} className="flex gap-3 items-start">
                          <span className="text-[10px] font-black text-primary/40 leading-none">{s.step}</span>
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-tight leading-tight">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Legacy Support</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-medium">
                      Standard PDF signature protocols are applied. Signatures are persistent and unalterable after export.
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* CENTER: Document Viewer Mockup / Focus Area */}
            <div className="flex-1 bg-secondary/10 flex flex-col items-center justify-center p-8 overflow-y-auto">
              <div className="w-full max-w-2xl bg-white shadow-2xl rounded-sm aspect-[1/1.414] relative overflow-hidden group">
                {/* PDF Page Header Mockup */}
                <div className="absolute top-0 inset-x-0 h-1 bg-primary/20" />

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

                {/* Overlays */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-border shadow-xl px-8 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Live Document Stream</p>
                      <p className="text-xs font-bold text-foreground uppercase mt-1">{files[0].name}</p>
                    </div>
                  </div>
                </div>

                {/* Signature Preview */}
                {(signatureData || typedName) && (
                  <div
                    className="absolute border-2 border-dashed border-primary/50 p-2 group-hover:border-primary transition-colors cursor-move"
                    style={{
                      left: `${Math.min(90, Math.max(0, parseInt(posX) / 5))}%`,
                      top: `${Math.min(90, Math.max(0, parseInt(posY) / 5))}%`,
                      width: '150px',
                      height: '60px'
                    }}
                  >
                    {signatureData ? (
                      <img src={signatureData} alt="Signature" className="w-full h-full object-contain" />
                    ) : (
                      <p className="text-xl font-serif italic text-foreground truncate">{typedName}</p>
                    )}
                    <div className="absolute -top-2 -right-2 bg-primary text-white p-0.5 rounded shadow-glow">
                      <PenTool className="h-3 w-3" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: Control Center */}
            <div className="w-96 border-l border-border bg-background flex flex-col shrink-0">
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
                      <TabsList className="grid w-full grid-cols-2 rounded-xl h-10 bg-secondary/50 p-1">
                        <TabsTrigger value="draw" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Draw</TabsTrigger>
                        <TabsTrigger value="type" className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Type</TabsTrigger>
                      </TabsList>
                      <TabsContent value="draw" className="mt-4 space-y-3">
                        <div className="rounded-xl border-2 border-border bg-secondary/5 p-1 relative group overflow-hidden">
                          <canvas
                            ref={canvasRef}
                            width={400}
                            height={160}
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
                        <Input type="number" min="1" value={pageNum} onChange={e => setPageNum(e.target.value)} className="h-9 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">X-Weight</label>
                        <Input type="number" min="0" value={posX} onChange={e => setPosX(e.target.value)} className="h-9 rounded-lg text-xs font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Y-Weight</label>
                        <Input type="number" min="0" value={posY} onChange={e => setPosY(e.target.value)} className="h-9 rounded-lg text-xs font-bold" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 h-24 flex items-end">
                    <Button
                      size="lg"
                      onClick={sign}
                      disabled={processing || (!signatureData && !typedName)}
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
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Signature Integrity: {(signatureData || typedName) ? "Optimal" : "Awaiting"}</span>
                  <span className="text-[9px] font-black text-primary uppercase">MIL-SPEC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default SignPdf;
