import { useState, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { PenTool, Loader2, Info } from "lucide-react";
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
      metaTitle="Sign PDF — Add Signature Online Free" metaDescription="Sign PDF documents online for free. Draw or type your signature." toolId="sign-pdf" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <PenTool className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Sign PDF</h1>
            <p className="text-sm text-muted-foreground">Draw or type your signature and place it on your PDF</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with contracts, agreements, forms, and legal documents. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to sign" />
      </div>
      {files.length > 0 && (
        <div className="mt-6 space-y-6">
          <Tabs defaultValue="draw" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">Draw Signature</TabsTrigger>
              <TabsTrigger value="type">Type Signature</TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-3">
              <div className="rounded-xl border border-border bg-card p-1">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  className="w-full cursor-crosshair rounded-lg bg-white touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
              </div>
              <Button variant="outline" size="sm" onClick={clearCanvas} className="rounded-xl">Clear</Button>
            </TabsContent>
            <TabsContent value="type" className="space-y-3">
              <Input placeholder="Type your name…" value={typedName} onChange={e => setTypedName(e.target.value)} className="text-xl italic font-serif" />
              {typedName && <p className="text-2xl italic font-serif text-foreground pl-2">{typedName}</p>}
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Page</label>
              <Input type="number" min="1" value={pageNum} onChange={e => setPageNum(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">X Position</label>
              <Input type="number" min="0" value={posX} onChange={e => setPosX(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Y Position</label>
              <Input type="number" min="0" value={posY} onChange={e => setPosY(e.target.value)} />
            </div>
          </div>

          {processing && <Progress value={progress} />}
          <div className="flex flex-col items-center gap-2">
            <Button size="lg" onClick={sign} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing…</> : "Sign PDF"}
            </Button>
            {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
          </div>
        </div>
      )}
    </ToolLayout>
  );
};

export default SignPdf;
