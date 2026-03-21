import { useState, useRef, useEffect, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { applySignaturesToPdf, PlacedElement, ElementType } from "@/lib/signPdfEngine";
import { PenTool, Loader2, ShieldCheck, X, Type, Calendar, CheckSquare, Image as ImageIcon, Undo, Redo, ZoomIn, ZoomOut, CheckCircle2, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { pdfjs, Document, Page } from "react-pdf";
import { cn } from "@/lib/utils";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

// --- Custom Draggable Component ---
interface DraggableProps {
  el: PlacedElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<PlacedElement>) => void;
  onDelete: (id: string) => void;
  containerWidth: number;
  containerHeight: number;
}

const DraggableItem = ({ el, isSelected, onSelect, onUpdate, onDelete, containerWidth, containerHeight }: DraggableProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [localState, setLocalState] = useState({ x: el.x, y: el.y, w: el.width, h: el.height });
  
  useEffect(() => {
    if (!isDragging && !isResizing) {
      setLocalState({ x: el.x, y: el.y, w: el.width, h: el.height });
    }
  }, [el.x, el.y, el.width, el.height, isDragging, isResizing]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = localState.x;
    const startElY = localState.y;
    
    const containerRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const cWidth = containerRect.width || 1;
    const cHeight = containerRect.height || 1;

    let currentX = startElX;
    let currentY = startElY;

    const onPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      
      currentX = Math.max(0, Math.min(1 - localState.w, startElX + (dx / cWidth)));
      currentY = Math.max(0, Math.min(1 - localState.h, startElY + (dy / cHeight)));
      
      setLocalState(prev => ({ ...prev, x: currentX, y: currentY }));
    };
    
    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      onUpdate(el.id, { x: currentX, y: currentY });
    };
    
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = localState.w;
    const startH = localState.h;
    
    // Resize handle's parentElement is the Draggable container, so its parent is the page container
    const containerRect = (e.currentTarget.parentElement?.parentElement as HTMLElement).getBoundingClientRect();
    const cWidth = containerRect.width || 1;
    const cHeight = containerRect.height || 1;

    let currentW = startW;
    let currentH = startH;

    const onPointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      
      currentW = Math.max(0.02, Math.min(1 - localState.x, startW + (dx / cWidth)));
      currentH = Math.max(0.02, Math.min(1 - localState.y, startH + (dy / cHeight)));
      
      // Keep aspect ratio for standard image signatures
      if (el.type === "image") {
        currentH = currentW * (startH / startW); 
      }
      
      setLocalState(prev => ({ ...prev, w: currentW, h: currentH }));
    };
    
    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      onUpdate(el.id, { width: currentW, height: currentH });
    };
    
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={cn(
        "absolute cursor-move touch-none group hover:ring-2 hover:ring-primary/50",
        isSelected ? "ring-2 ring-primary border border-primary shadow-xl z-50 bg-primary/5" : "border border-transparent z-40 transition-shadow",
        isDragging && "opacity-80 scale-105 duration-75"
      )}
      style={{
        left: `${localState.x * 100}%`,
        top: `${localState.y * 100}%`,
        width: `${localState.w * 100}%`,
        height: `${localState.h * 100}%`,
        transform: `rotate(${el.rotation || 0}deg)`,
        transformOrigin: "center center"
      }}
    >
      {el.type === "image" && (
        <img src={el.data} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
      )}
      {el.type === "text" && (
        <div 
           className={cn("w-full h-full flex items-center shrink-0 leading-none", el.fontFamily === 'serif' ? 'font-serif italic' : 'font-sans font-bold')}
           style={{ color: el.color || "#000000", fontSize: `${containerHeight ? containerHeight * localState.h * 0.8 : 24}px` }}
        >
          {el.data}
        </div>
      )}
      {el.type === "checkbox" && (
        <div className="w-full h-full flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-[80%] h-[80%]" fill={el.color || "#000000"}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </div>
      )}
      
      {isSelected && (
        <>
          <button
            onPointerDown={(e) => { e.stopPropagation(); onDelete(el.id); }}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-110 active:scale-95 transition-all z-50"
          >
            <X className="h-3 w-3" />
          </button>
          
          <div 
            onPointerDown={handleResizeDown}
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-white cursor-nwse-resize hover:scale-125 transition-transform z-50 active:scale-95"
          />
        </>
      )}
    </div>
  );
};

const SignPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  
  // File & Document State
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  
  // Canvas State
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // History & Elements State
  const [elements, setElements] = useState<PlacedElement[]>([]);
  const [history, setHistory] = useState<PlacedElement[][]>([]);
  const [future, setFuture] = useState<PlacedElement[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Tools State
  const [activeTab, setActiveTab] = useState("draw");
  const [typedName, setTypedName] = useState("");
  const [drawnData, setDrawnData] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, processing, results, setDisableGlobalFeatures]);

  useEffect(() => {
    if (files.length === 0) {
      setNumPages(0);
      setElements([]);
      setHistory([]);
      setFuture([]);
    }
  }, [files]);

  // Update container size dynamically for precise drag math
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [zoom, currentPage]);

  const saveToHistory = (newElements: PlacedElement[]) => {
    setHistory(prev => [...prev, elements]);
    setFuture([]);
    setElements(newElements);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [elements, ...f]);
    setHistory(h => h.slice(0, -1));
    setElements(prev);
    setSelectedId(null);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, elements]);
    setFuture(f => f.slice(1));
    setElements(next);
    setSelectedId(null);
  };

  // --- Draw Signature Logic ---
  useEffect(() => {
    if (drawCanvasRef.current) {
       drawCanvasRef.current.width = 600;
       drawCanvasRef.current.height = 240;
    }
  }, [files]); // re-init when files load

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawCanvasRef.current) return;
    isDrawingRef.current = true;
    const ctx = drawCanvasRef.current.getContext("2d")!;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    // Scale tracking
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;
    
    ctx.beginPath();
    ctx.moveTo(x * scaleX, y * scaleY);
  };

  const doDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current || !drawCanvasRef.current) return;
    const ctx = drawCanvasRef.current.getContext("2d")!;
    const rect = drawCanvasRef.current.getBoundingClientRect();
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    const scaleX = drawCanvasRef.current.width / rect.width;
    const scaleY = drawCanvasRef.current.height / rect.height;

    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(x * scaleX, y * scaleY);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    if (drawCanvasRef.current) {
      setDrawnData(drawCanvasRef.current.toDataURL("image/png"));
    }
  };

  const generateTypedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    // Calculate precise bounds
    ctx.font = "italic 80px 'Times New Roman', serif";
    ctx.fillStyle = "#1a1a2e";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 20, 100);
    return canvas.toDataURL("image/png");
  };

  // --- Element Addition ---
  const addElement = (type: ElementType, data: string, baseWidth: number, baseHeight: number, fontFamily?: string) => {
    const newEl: PlacedElement = {
      id: Math.random().toString(),
      type,
      page: currentPage,
      x: 0.1, // drop near top-left
      y: 0.1,
      width: baseWidth, 
      height: baseHeight,
      rotation: 0,
      data,
      fontFamily,
      color: "#000000"
    };
    saveToHistory([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const placeSignature = () => {
    if (activeTab === "draw" && drawnData) addElement("image", drawnData, 0.3, 0.1);
    else if (activeTab === "type" && typedName) addElement("image", generateTypedSignature(), 0.3, 0.1);
    else if (activeTab === "image" && uploadedData) addElement("image", uploadedData, 0.3, 0.1);
    else toast.error(`Please provide a signature in the ${activeTab} tab first!`);
  };

  const handleUpdate = (id: string, updates: Partial<PlacedElement>) => {
    // We don't save to history on EVERY move frame for performance, only on release.
    // Wait, since we are calling it from pointerMove, we should update state directly, and when deleted/added save to history.
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };
  
  // History save trigger for drag releases can be tricky, so we'll just track history on Add/Delete/Property Change to avoid exploding the stack.

  const handleApply = async () => {
    if (files.length === 0 || elements.length === 0) return;
    setProcessing(true);
    setProgress(0);
    
    try {
      const bytes = await files[0].arrayBuffer();
      const signedBytes = await applySignaturesToPdf(bytes, elements, setProgress);
      
      const blob = new Blob([signedBytes as any], { type: "application/pdf" });
      const filename = files[0].name.replace(/\.pdf$/i, "_signed.pdf");
      const url = URL.createObjectURL(blob);
      
      setResults([{ file: blob, url, filename }]);
      toast.success("PDF sealed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to sign PDF");
    } finally {
      if (progress !== 100) setProgress(0);
      setProcessing(false);
    }
  };

  const selectedEl = elements.find(e => e.id === selectedId);

  return (
    <ToolLayout
      title="Sign PDF"
      description="Draw, type, or upload your signature to instantly sign documents."
      category="edit"
      icon={<PenTool className="h-7 w-7" />}
      metaTitle="Sign PDF Online Free"
      metaDescription="Add your signature to any PDF online for free. Draw, type, or upload signatures perfectly. Client-side processing."
      toolId="sign"
      hideHeader={files.length > 0}
      className="sign-pdf-page"
    >
      <style>{`
        .sign-pdf-page * { font-family: 'Inter', sans-serif; }
        .sign-pdf-page .font-serif { font-family: 'Times New Roman', serif !important; }
      `}</style>

      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">
          
          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
               <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <PenTool className="h-10 w-10 text-primary animate-pulse" />
               </div>
               <h3 className="text-xl font-bold uppercase tracking-tighter mb-4">Sealing Document</h3>
               <Progress value={progress} className="h-2 w-64 rounded-full mb-2" />
               <p className="text-[10px] text-muted-foreground uppercase">{progress}% Complete</p>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={() => { setFiles([]); setResults([]); setElements([]); setHistory([]); setFuture([]); }} hideShare={true} />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Interactive Preview (70%) */}
              <div className="w-full lg:w-[70%] border-r border-border bg-secondary/10 flex flex-col h-full overflow-hidden shrink-0 relative">
                 {/* Top Toolbar */}
                 <div className="h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-40 shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" onClick={undo} disabled={history.length === 0} className="h-8 w-8 rounded-lg hover:bg-secondary"><Undo className="h-4 w-4" /></Button>
                       <Button variant="ghost" size="icon" onClick={redo} disabled={future.length === 0} className="h-8 w-8 rounded-lg hover:bg-secondary"><Redo className="h-4 w-4" /></Button>
                       <div className="h-4 w-px bg-border mx-2" />
                       <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="h-8 w-8"><ZoomOut className="h-4 w-4" /></Button>
                       <span className="text-[10px] font-bold uppercase w-12 text-center">{Math.round(zoom * 100)}%</span>
                       <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="h-8 w-8"><ZoomIn className="h-4 w-4" /></Button>
                    </div>
                    {numPages > 0 && (
                      <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1 border border-border">
                         <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="h-7 w-7"><ChevronLeft className="h-4 w-4" /></Button>
                         <span className="text-[10px] font-black uppercase px-2 w-16 text-center">PG {currentPage} / {numPages}</span>
                         <Button variant="ghost" size="icon" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} className="h-7 w-7"><ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    )}
                 </div>

                 <ScrollArea className="flex-1 p-8" onClick={() => setSelectedId(null)}>
                    <div className="min-h-full flex items-center justify-center">
                       {files[0] && (
                         <div 
                           className="relative shadow-2xl bg-white transition-opacity duration-300 isolate"
                           style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                         >
                            <Document 
                               file={files[0]}
                               onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                               loading={<div className="w-[600px] h-[800px] bg-secondary/20 animate-pulse flex items-center justify-center"><Loader2 className="h-10 w-10 text-muted-foreground animate-spin" /></div>}
                               error={<div className="w-[600px] h-[800px] bg-red-500/10 flex items-center justify-center font-bold text-red-500">Failed to load PDF.</div>}
                            >
                               <Page 
                                 pageNumber={currentPage} 
                                 width={800} // High-res base map
                                 renderTextLayer={false} 
                                 renderAnnotationLayer={false}
                                 className="pointer-events-none select-none"
                               />
                            </Document>
                            
                            {/* Interactive Coordinate Overlay layer */}
                            <div className="absolute inset-0 z-10" ref={containerRef}>
                               {elements.filter(e => e.page === currentPage).map(el => (
                                 <DraggableItem
                                    key={el.id}
                                    el={el}
                                    isSelected={selectedId === el.id}
                                    onSelect={() => setSelectedId(el.id)}
                                    onUpdate={handleUpdate}
                                    onDelete={(id) => { 
                                       saveToHistory(elements.filter(e => e.id !== id));
                                       if(selectedId === id) setSelectedId(null); 
                                    }}
                                    containerWidth={containerSize.width}
                                    containerHeight={containerSize.height}
                                 />
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 </ScrollArea>
              </div>

              {/* RIGHT SIDE: Toolbar (30%) */}
              <div className="w-full lg:w-[30%] bg-background flex flex-col h-full overflow-hidden shrink-0 border-l border-border z-30 shadow-2xl">
                 <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2 shrink-0 justify-between">
                   <div className="flex items-center gap-2">
                     <Settings className="h-4 w-4 text-primary" />
                     <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Sign Tools</span>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-7 text-[10px] font-black uppercase text-destructive hover:bg-destructive/10">Discard</Button>
                 </div>
                 
                 <ScrollArea className="flex-1">
                    <div className="p-6 space-y-8">
                       
                       {/* Contextual Properties Editor */}
                       {selectedEl ? (
                          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                             <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center justify-between">
                                  <span>Element Properties</span>
                                  <span className="text-xs bg-background px-2 py-0.5 rounded shadow-sm border">{selectedEl.type}</span>
                                </h3>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                    <span>Scale</span><span>{Math.round(selectedEl.width * 100)}%</span>
                                  </div>
                                  <Slider 
                                    min={0.05} max={selectedEl.type === 'text' || selectedEl.type === 'checkbox' ? 1.0 : 0.8} step={0.01} 
                                    value={[selectedEl.width]} 
                                    onValueChange={(v) => {
                                       const w = v[0];
                                       const h = selectedEl.type === 'text' || selectedEl.type === 'checkbox' 
                                          ? w * 0.2 // keep rect ratio for text bounding box 
                                          : w * (selectedEl.height/selectedEl.width); 
                                       
                                       handleUpdate(selectedEl.id, { width: w, height: h });
                                    }} 
                                  />
                                </div>
                                
                                {selectedEl.type !== 'checkbox' && (
                                   <div className="space-y-2">
                                     <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                                       <span>Rotation</span><span>{selectedEl.rotation}°</span>
                                     </div>
                                     <Slider 
                                       min={-180} max={180} step={1} 
                                       value={[selectedEl.rotation]} 
                                       onValueChange={(v) => handleUpdate(selectedEl.id, { rotation: v[0] })} 
                                     />
                                   </div>
                                )}
                                
                                {(selectedEl.type === 'text' || selectedEl.type === 'checkbox') && (
                                   <div className="space-y-2 pt-2">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Color Hex</label>
                                      <div className="flex items-center gap-2">
                                        <input type="color" value={selectedEl.color || "#000000"} onChange={(e) => handleUpdate(selectedEl.id, { color: e.target.value })} className="h-8 w-8 rounded cursor-pointer p-0 border-0" />
                                        <Input value={selectedEl.color || "#000000"} onChange={(e) => handleUpdate(selectedEl.id, { color: e.target.value })} className="h-8 text-xs font-mono uppercase" />
                                      </div>
                                   </div>
                                )}

                                {selectedEl.type === 'text' && (
                                   <div className="space-y-2 pt-2">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Value</label>
                                      <Input value={selectedEl.data} onChange={(e) => handleUpdate(selectedEl.id, { data: e.target.value })} className="h-9 text-xs" />
                                   </div>
                                )}
                             </div>
                          </div>
                       ) : (
                          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                             {/* Add Signature Block */}
                             <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest border-b pb-2">1. Add Signature</h3>
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                   <TabsList className="grid w-full grid-cols-3 rounded-lg h-10 bg-secondary/50 p-1 mb-4">
                                      <TabsTrigger value="draw" className="rounded-md text-[10px] font-black uppercase"><PenTool className="h-3 w-3 mr-1.5"/> Draw</TabsTrigger>
                                      <TabsTrigger value="type" className="rounded-md text-[10px] font-black uppercase"><Type className="h-3 w-3 mr-1.5"/> Type</TabsTrigger>
                                      <TabsTrigger value="image" className="rounded-md text-[10px] font-black uppercase"><ImageIcon className="h-3 w-3 mr-1.5"/> Upload</TabsTrigger>
                                   </TabsList>
                                   
                                   <TabsContent value="draw" className="space-y-3">
                                      <div className="rounded-xl border-2 border-border bg-white p-1 relative group overflow-hidden touch-none h-40">
                                         <canvas
                                            ref={drawCanvasRef}
                                            className="w-full h-full cursor-crosshair touch-none"
                                            onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
                                            onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={endDraw}
                                         />
                                         <Button variant="outline" size="icon" onClick={() => { if(drawCanvasRef.current){const ctx=drawCanvasRef.current.getContext('2d')!; ctx.clearRect(0,0,600,240);} setDrawnData(null); }} className="absolute top-2 right-2 h-7 w-7 bg-background shadow-md"><X className="h-3 w-3" /></Button>
                                      </div>
                                   </TabsContent>
                                   
                                   <TabsContent value="type" className="space-y-3">
                                      <Input placeholder="Type your name..." value={typedName} onChange={e => setTypedName(e.target.value)} className="h-12 font-serif italic text-lg text-center" />
                                   </TabsContent>

                                   <TabsContent value="image" className="space-y-3">
                                      <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => signatureInputRef.current?.click()}>
                                         {uploadedData ? (
                                            <div className="relative group mx-auto inline-block">
                                               <img src={uploadedData} alt="Uploaded" className="max-h-24 object-contain rounded" />
                                               <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setUploadedData(null); }} className="absolute -top-3 -right-3 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></Button>
                                            </div>
                                         ) : (
                                            <>
                                               <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                               <p className="text-xs font-bold text-muted-foreground uppercase">Click to upload PNG/JPG</p>
                                            </>
                                         )}
                                         <input type="file" accept="image/*" className="hidden" ref={signatureInputRef} onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setUploadedData(URL.createObjectURL(file));
                                         }} />
                                      </div>
                                   </TabsContent>
                                </Tabs>

                                <Button size="sm" onClick={placeSignature} className="w-full h-10 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">
                                  Drop on Document
                                </Button>
                             </div>

                             {/* Auxiliary Tools Block */}
                             <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest border-b pb-2">2. Quick Tools</h3>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline" className="h-12 rounded-xl flex flex-col gap-1 items-center justify-center border-border hover:border-primary/50 hover:bg-primary/5" 
                                     onClick={() => addElement("text", new Date().toLocaleDateString(), 0.15, 0.05, "sans")}>
                                     <Calendar className="h-4 w-4" /><span className="text-[9px] font-black uppercase">Date</span>
                                  </Button>
                                  <Button variant="outline" className="h-12 rounded-xl flex flex-col gap-1 items-center justify-center border-border hover:border-primary/50 hover:bg-primary/5"
                                     onClick={() => addElement("text", "Text Field", 0.25, 0.05, "sans")}>
                                     <Type className="h-4 w-4" /><span className="text-[9px] font-black uppercase">Text</span>
                                  </Button>
                                  <Button variant="outline" className="h-12 rounded-xl flex flex-col gap-1 items-center justify-center border-border hover:border-primary/50 hover:bg-primary/5 col-span-2"
                                     onClick={() => addElement("checkbox", "true", 0.05, 0.04)}>
                                     <CheckSquare className="h-4 w-4" /><span className="text-[9px] font-black uppercase">Checkmark</span>
                                  </Button>
                                </div>
                             </div>
                             
                          </div>
                       )}

                    </div>
                 </ScrollArea>
                 
                 {/* Fixed Export Footer */}
                 <div className="p-4 border-t border-border bg-card shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] text-center space-y-3">
                   {elements.length === 0 && <p className="text-[9px] font-black uppercase text-amber-600">Please add at least one element to apply.</p>}
                   {elements.length > 0 && <p className="text-[9px] font-black uppercase text-green-600">{elements.length} element(s) pending export.</p>}
                   
                   <Button 
                     size="lg" 
                     onClick={handleApply} 
                     disabled={elements.length === 0 || processing} 
                     className="w-full h-14 rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-xl transition-all gap-2 bg-primary hover:bg-primary/90"
                   >
                     {processing ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4" />}
                     Apply Signature
                   </Button>
                 </div>
              </div>

            </>
          )}
        </div>
      )}
      
      {/* ── BEFORE UPLOAD: SEO AND DRAG-DROP AREA ─────────────────────── */}
      {!files.length && !processing && results.length === 0 && (
        <div className="mt-10">
          <FileUpload accept=".pdf" files={files} onFilesChange={(f) => setFiles(f.slice(0, 1))} label="Select PDF to sign" multiple={false} />
          <ToolSeoSection
            toolName="Sign PDF Online"
            category="edit"
            intro="MagicDocx Sign PDF lets you add your handwritten or typed signature to any PDF document directly in your browser. Draw your signature using your mouse or finger on a canvas pad, type out a signature in a stylized script font, or upload an existing signature image. Drag the signature onto any position on any page, resize it, and download your signed PDF instantly. All signing is done client-side | no file is ever uploaded to any server."
            steps={[
              "Upload your PDF using the file upload area.",
              "In the Sign panel, draw your signature on the canvas pad, type a signature, or upload a signature image.",
              "Drop the signature onto the document and drag it to where you want to place it.",
              "Click 'Apply Signature' to burn the signature natively into your PDF securely."
            ]}
            formats={["PDF"]}
            relatedTools={[
              { name: "Edit PDF", path: "/edit-pdf", icon: PenTool },
              { name: "Redact PDF", path: "/redact-pdf", icon: PenTool },
              { name: "Protect PDF", path: "/protect-pdf", icon: ShieldCheck },
              { name: "Flatten PDF", path: "/flatten-pdf", icon: ShieldCheck },
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
