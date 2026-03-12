import { useState, useRef, useEffect, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader from "@/components/ToolHeader";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3, Type, ImageIcon, FileStack, MessageSquare, PenLine,
  Undo2, Redo2, Download, Save, RotateCw, RotateCcw, Trash2,
  Plus, Highlighter, Square, Circle, Loader2, CheckCircle2,
  ChevronLeft, ChevronRight, X, ShieldCheck
} from "lucide-react";
import {
  renderPdfPages, buildEditedPdf, makeId,
  type Overlay, type TextOverlay, type ImageOverlay,
  type AnnotationOverlay, type SignatureOverlay,
  type PageState, type EditorState
} from "@/lib/pdfEditorUtils";

// ─── Constants ─────────────────────────────────────────────────────────────

type Tab = "text" | "image" | "pages" | "annotate" | "sign";
type AnnotationKind = "highlight" | "rectangle" | "ellipse" | "comment" | "freehand";

const MAX_HISTORY = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newPageState(): PageState {
  return { overlays: [], rotation: 0 };
}

function cloneState(s: EditorState): EditorState {
  return JSON.parse(JSON.stringify(s));
}

// ─── Component ───────────────────────────────────────────────────────────────

const EditPdf = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  const [state, setState] = useState<EditorState>({ pages: [], pageOrder: [] });
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const [versions, setVersions] = useState<{ name: string; data: Uint8Array }[]>([]);

  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [activePage, setActivePage] = useState(0);

  // UI state for enhancements
  const [zoom, setZoom] = useState(100); // percentage
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Text tool state
  const [textContent, setTextContent] = useState("Your text here");
  const [textSize, setTextSize] = useState([16]);
  const [textColor, setTextColor] = useState("#000000");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);

  // Annotation tool state
  const [annotKind, setAnnotKind] = useState<AnnotationKind>("highlight");
  const [annotColor, setAnnotColor] = useState("#ff0000");
  const [commentText, setCommentText] = useState("Comment here");

  // Image drag state
  const [imgDragging, setImgDragging] = useState(false);
  const [imgStart, setImgStart] = useState<{ x: number; y: number } | null>(null);
  const [imgRect, setImgRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Annotation drag state
  const [annotDragging, setAnnotDragging] = useState(false);
  const [annotStart, setAnnotStart] = useState<{ x: number; y: number } | null>(null);
  const [annotRect, setAnnotRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<number[][]>([]);

  // Signature state
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sigDrawing, setSigDrawing] = useState(false);
  const [sigPlaced, setSigPlaced] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // ─── Load PDF ─────────────────────────────────────────────────────────────

  const handleFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) { setFile(null); setPreviews([]); return; }
    setFile(f);
    setLoading(true);
    try {
      const imgs = await renderPdfPages(f, 2.0); // Higher resolution for better zoom
      setPreviews(imgs);
      const pages = imgs.map(() => newPageState());
      const order = imgs.map((_, i) => i);
      const initial = { pages, pageOrder: order };
      setState(initial);
      setHistory([]);
      setFuture([]);
      setActivePage(0);
      setZoom(100);
      toast.success(`Loaded PDF (${imgs.length} pages)`);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  // ─── History / Undo ───────────────────────────────────────────────────────

  const pushState = useCallback((next: EditorState) => {
    setHistory(h => [...h.slice(-MAX_HISTORY + 1), cloneState(state)]);
    setFuture([]);
    setState(next);
  }, [state]);

  const undo = () => {
    if (!history.length) return;
    setFuture(f => [cloneState(state), ...f]);
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setState(prev);
  };

  const redo = () => {
    if (!future.length) return;
    setHistory(h => [...h, cloneState(state)]);
    const next = future[0];
    setFuture(f => f.slice(1));
    setState(next);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "Escape" && isFullScreen) setIsFullScreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, future, state, isFullScreen]);

  // ─── Zoom Controls ─────────────────────────────────────────────────────────

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 20, 20));
  const handleFitToWidth = () => setZoom(100);
  const handleFitToPage = () => setZoom(75);

  // ─── Overlays ─────────────────────────────────────────────────────────────

  const addOverlay = (pageIdx: number, overlay: Overlay) => {
    const next = cloneState(state);
    next.pages[pageIdx].overlays.push(overlay);
    pushState(next);
  };

  const removeOverlay = (pageIdx: number, id: string) => {
    const next = cloneState(state);
    next.pages[pageIdx].overlays = next.pages[pageIdx].overlays.filter(o => o.id !== id);
    pushState(next);
  };

  // ─── Handle page click ────────────────────────────────────────────────────

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePageClick = (e: React.MouseEvent, pageIdx: number) => {
    if (activeTab !== "text") return;
    const { x, y } = getRelativePos(e);
    const overlay: TextOverlay = {
      id: makeId(), type: "text",
      text: textContent, fontSize: textSize[0], color: textColor,
      bold: textBold, italic: textItalic, x, y
    };
    addOverlay(pageIdx, overlay);
  };

  // ─── Image replacement ────────────────────────────────────────────────────

  const handleImgMouseDown = (e: React.MouseEvent, pageIdx: number) => {
    if (activeTab !== "image") return;
    e.preventDefault();
    const { x, y } = getRelativePos(e);
    setImgStart({ x, y });
    setImgRect(null);
    setImgDragging(true);
  };

  const handleImgMouseMove = (e: React.MouseEvent) => {
    if (!imgDragging || !imgStart) return;
    const { x, y } = getRelativePos(e);
    setImgRect({
      x: Math.min(imgStart.x, x),
      y: Math.min(imgStart.y, y),
      width: Math.abs(x - imgStart.x),
      height: Math.abs(y - imgStart.y),
    });
  };

  const handleImgMouseUp = (e: React.MouseEvent, pageIdx: number) => {
    if (!imgDragging || !imgRect || imgRect.width < 2 || imgRect.height < 2) {
      setImgDragging(false); setImgRect(null); return;
    }
    setImgDragging(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = async () => {
      const imgFile = input.files?.[0];
      if (!imgFile) return;
      const reader = new FileReader();
      reader.onload = () => {
        const overlay: ImageOverlay = {
          id: makeId(), type: "image",
          dataUrl: reader.result as string,
          x: imgRect!.x, y: imgRect!.y, width: imgRect!.width, height: imgRect!.height,
        };
        addOverlay(pageIdx, overlay);
        setImgRect(null);
        toast.success("Image placed! It will be embedded in the output PDF.");
      };
      reader.readAsDataURL(imgFile);
    };
    input.click();
  };

  // ─── Annotation drag ──────────────────────────────────────────────────────

  const handleAnnotMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== "annotate") return;
    e.preventDefault();
    const { x, y } = getRelativePos(e);
    setAnnotStart({ x, y });
    setAnnotRect(null);
    setAnnotDragging(true);
    if (annotKind === "freehand") setFreehandPoints([[x, y]]);
  };

  const handleAnnotMouseMove = (e: React.MouseEvent) => {
    if (!annotDragging || !annotStart) return;
    const { x, y } = getRelativePos(e);
    if (annotKind === "freehand") {
      setFreehandPoints(pts => [...pts, [x, y]]);
    } else {
      setAnnotRect({
        x: Math.min(annotStart.x, x), y: Math.min(annotStart.y, y),
        width: Math.abs(x - annotStart.x), height: Math.abs(y - annotStart.y),
      });
    }
  };

  const handleAnnotMouseUp = (e: React.MouseEvent, pageIdx: number) => {
    if (!annotDragging || !annotStart) return;
    setAnnotDragging(false);
    const { x, y } = getRelativePos(e);

    if (annotKind === "comment") {
      const overlay: AnnotationOverlay = {
        id: makeId(), type: "annotation", kind: "comment",
        x: annotStart.x, y: annotStart.y, color: annotColor, text: commentText,
      };
      addOverlay(pageIdx, overlay);
    } else if (annotKind === "freehand") {
      const overlay: AnnotationOverlay = {
        id: makeId(), type: "annotation", kind: "freehand",
        x: annotStart.x, y: annotStart.y, color: annotColor, points: freehandPoints,
      };
      addOverlay(pageIdx, overlay);
      setFreehandPoints([]);
    } else if (annotRect && annotRect.width > 1 && annotRect.height > 1) {
      const overlay: AnnotationOverlay = {
        id: makeId(), type: "annotation", kind: annotKind,
        x: annotRect.x, y: annotRect.y, width: annotRect.width, height: annotRect.height, color: annotColor,
      };
      addOverlay(pageIdx, overlay);
    }
    setAnnotRect(null);
  };

  // ─── Page management ──────────────────────────────────────────────────────

  const deletePage = (visIdx: number) => {
    if (state.pageOrder.length <= 1) { toast.error("Cannot delete the only page."); return; }
    const next = cloneState(state);
    next.pageOrder.splice(visIdx, 1);
    pushState(next);
    setActivePage(Math.min(activePage, next.pageOrder.length - 1));
    toast.success("Page deleted (use Undo to restore)");
  };

  const rotatePage = (visIdx: number, dir: 1 | -1) => {
    const next = cloneState(state);
    const srcIdx = next.pageOrder[visIdx];
    next.pages[srcIdx].rotation = ((next.pages[srcIdx].rotation + dir * 90) + 360) % 360;
    pushState(next);
  };

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= state.pageOrder.length) return;
    const next = cloneState(state);
    const [removed] = next.pageOrder.splice(from, 1);
    next.pageOrder.splice(to, 0, removed);
    pushState(next);
    setActivePage(to);
  };

  // ─── Signature ────────────────────────────────────────────────────────────

  const startSig = (e: React.MouseEvent) => {
    setSigDrawing(true);
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent) => {
    if (!sigDrawing) return;
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endSig = () => setSigDrawing(false);

  const clearSig = () => {
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, 400, 120);
  };

  const placeSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const overlay: SignatureOverlay = {
      id: makeId(), type: "signature", dataUrl,
      x: 10, y: 75, width: 30, height: 10,
    };
    addOverlay(currentPageSrcIdx, overlay);
    setSigPlaced(true);
    toast.success("Signature placed on page!");
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  const download = async () => {
    if (!file) return;
    setSaving(true); setSaveProgress(0);
    try {
      const bytes = await buildEditedPdf(file, state, setSaveProgress);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${file.name.replace(".pdf", "")}-edited.pdf`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`PDF downloaded!`);
    } catch {
      toast.error("Failed to generate PDF.");
    } finally {
      setSaving(false); setSaveProgress(0);
    }
  };

  const saveVersion = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const bytes = await buildEditedPdf(file, state, setSaveProgress);
      const name = `Version ${versions.length + 1} (${new Date().toLocaleTimeString()})`;
      setVersions(v => [...v, { name, data: bytes }]);
      toast.success(`Saved as "${name}"`);
    } catch {
      toast.error("Failed to save version.");
    } finally {
      setSaving(false); setSaveProgress(0);
    }
  };

  const downloadVersion = (v: { name: string; data: Uint8Array }) => {
    const blob = new Blob([v.data.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${v.name}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  const currentPageSrcIdx = state.pageOrder[activePage] ?? activePage;
  const currentOverlays = state.pages[currentPageSrcIdx]?.overlays ?? [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
    { id: "image", label: "Image", icon: <ImageIcon className="h-4 w-4" /> },
    { id: "pages", label: "Pages", icon: <FileStack className="h-4 w-4" /> },
    { id: "annotate", label: "Annotate", icon: <Highlighter className="h-4 w-4" /> },
    { id: "sign", label: "Sign", icon: <PenLine className="h-4 w-4" /> },
  ];

  return (
    <ToolLayout
      title="Edit PDF"
      description="Edit PDF online — add text, replace images, annotate, sign and manage pages."
      category="edit"
      icon={<Edit3 className="h-7 w-7" />}
      metaTitle="Edit PDF Online — Change Text & Images | MagicDocx"
      metaDescription="Edit any PDF online. Add text, replace images, annotate, sign, and manage pages. Free in-browser PDF editor."
      toolId="edit"
      hideHeader
    >
      <div className={`flex flex-col gap-0 transition-all ${isFullScreen ? "fixed inset-0 z-[100] bg-background" : "min-h-[600px] border border-border rounded-3xl overflow-hidden mt-6 bg-card shadow-xl"}`}>

        {/* TOP TOOLBAR */}
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2 shadow-sm z-10 overflow-x-auto">
          <div className="flex items-center gap-4 min-w-max">
            {isFullScreen && (
              <div className="flex items-center gap-2 mr-2 border-r border-border pr-4">
                <Edit3 className="h-5 w-5 text-primary" />
                <span className="font-bold text-sm hidden sm:inline">MagicDocx Editor</span>
              </div>
            )}

            <div className="flex gap-1 rounded-xl bg-secondary p-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${activeTab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon} <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 ml-2">
              <Button variant="ghost" size="sm" onClick={undo} disabled={!history.length} title="Undo" className="h-8 w-8 p-0">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={redo} disabled={!future.length} title="Redo" className="h-8 w-8 p-0">
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 min-w-max">
            <div className="flex items-center gap-1 border-r border-border pr-3">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-8 w-8 p-0" title="Zoom Out"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-[11px] font-bold w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-8 w-8 p-0" title="Zoom In"><ChevronRight className="h-4 w-4" /></Button>
              <div className="h-4 w-[1px] bg-border mx-1" />
              <Button variant="ghost" size="sm" onClick={handleFitToWidth} className="h-8 px-2 text-[10px] font-bold" title="Fit to Width">Fit Width</Button>
              <Button variant="ghost" size="sm" onClick={handleFitToPage} className="h-8 px-2 text-[10px] font-bold" title="Fit to Page">Fit Page</Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setIsFullScreen(!isFullScreen)} className="h-8 px-3 rounded-lg text-xs gap-1.5">
              {isFullScreen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>

            <Button size="sm" onClick={download} disabled={saving} className="h-8 rounded-lg text-xs gap-1.5 bg-primary px-4 shadow-sm hover:translate-y-[-1px] transition-transform">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download
            </Button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-1 overflow-hidden relative">

          {/* LEFT — THUMBNAILS */}
          {sidebarOpen && previews.length > 0 && (
            <div className="w-[200px] border-r border-border bg-card/50 overflow-y-auto hidden md:flex flex-col gap-3 p-3 scrollbar-none">
              <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pages</p>
              {state.pageOrder.map((srcIdx, visIdx) => (
                <div key={visIdx}
                  className={`relative cursor-pointer rounded-lg border-2 transition-all p-1 ${activePage === visIdx ? "border-primary bg-primary/5" : "border-transparent hover:border-border"}`}
                  onClick={() => {
                    setActivePage(visIdx);
                    document.getElementById(`page-view-${visIdx}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}>
                  <img src={previews[srcIdx]} alt={`Thumb ${visIdx + 1}`} className="w-full rounded" style={{ transform: `rotate(${state.pages[srcIdx].rotation}deg)` }} />
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">{visIdx + 1}</span>
                </div>
              ))}
            </div>
          )}

          {/* CENTER — VERTICAL SCROLL VIEWPORT */}
          <div
            ref={viewportRef}
            className="flex-1 bg-secondary/30 overflow-y-auto p-8 scroll-smooth"
            onScroll={(e) => {
              const container = e.currentTarget;
              const pages = container.getElementsByClassName("pdf-page-wrapper");
              for (let i = 0; i < pages.length; i++) {
                const rect = pages[i].getBoundingClientRect();
                if (rect.top >= 0 && rect.top <= container.clientHeight / 2) {
                  setActivePage(i);
                  break;
                }
              }
            }}
          >
            {!file && (
              <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto">
                <FileUpload accept=".pdf" multiple={false} files={file ? [file] : []} onFilesChange={handleFiles} label="Upload a PDF to start full-screen editing" />
                <div className="mt-8 flex items-center gap-6 text-muted-foreground/60 text-xs">
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Secure Editing</div>
                  <div className="flex items-center gap-2"><PenLine className="h-4 w-4" /> Digital Signatures</div>
                  <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Image Replace</div>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <span className="text-sm font-bold tracking-tight">Preparing workspace…</span>
              </div>
            )}

            {file && previews.length > 0 && (
              <div className="flex flex-col items-center gap-12 pb-24 mx-auto" style={{ width: `${zoom}%` }}>
                {state.pageOrder.map((srcIdx, visIdx) => (
                  <div
                    key={visIdx}
                    id={`page-view-${visIdx}`}
                    className={`pdf-page-wrapper relative border-2 transition-all shadow-2xl bg-white ${activePage === visIdx ? "border-primary ring-4 ring-primary/10" : "border-border"}`}
                    style={{ width: "100%", maxWidth: "1200px" }}
                    onClick={(e) => activeTab === "text" && handlePageClick(e, srcIdx)}
                    onMouseDown={(e) => {
                      if (activeTab === "image") handleImgMouseDown(e, srcIdx);
                      if (activeTab === "annotate") handleAnnotMouseDown(e);
                    }}
                    onMouseMove={(e) => {
                      if (activeTab === "image") handleImgMouseMove(e);
                      if (activeTab === "annotate") handleAnnotMouseMove(e);
                    }}
                    onMouseUp={(e) => {
                      if (activeTab === "image") handleImgMouseUp(e, srcIdx);
                      if (activeTab === "annotate") handleAnnotMouseUp(e, srcIdx);
                    }}
                  >
                    <img src={previews[srcIdx]} alt={`Page ${visIdx + 1}`} className="w-full select-none" draggable={false} style={{ transform: `rotate(${state.pages[srcIdx].rotation}deg)` }} />

                    {state.pages[srcIdx].overlays.map((ov) => {
                      if (ov.type === "text") {
                        const o = ov as TextOverlay;
                        return (
                          <div key={o.id} className="absolute group flex items-start"
                            style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%, -50%)", userSelect: "none" }}>
                            <span style={{ fontSize: `${o.fontSize * 0.8}px`, color: o.color, fontWeight: o.bold ? "bold" : "normal", fontStyle: o.italic ? "italic" : "normal", background: "rgba(255,255,255,0.8)", borderRadius: 4, padding: "2px 6px", border: "1px dashed rgba(0,0,0,0.2)" }}>{o.text}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="ml-0.5 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center text-[9px] transition-opacity"><X className="h-3 w-3" /></button>
                          </div>
                        );
                      }
                      if (ov.type === "image") {
                        const o = ov as ImageOverlay;
                        return (
                          <div key={o.id} className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%` }}>
                            <img src={o.dataUrl} className="w-full h-full object-fill" alt="ov" />
                            <button onClick={(e) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center transition-opacity"><X className="h-4 w-4" /></button>
                          </div>
                        );
                      }
                      if (ov.type === "annotation") {
                        const o = ov as AnnotationOverlay;
                        if (o.kind === "highlight" || o.kind === "rectangle") {
                          return (
                            <div key={o.id} className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width ?? 10}%`, height: `${o.height ?? 3}%`, background: o.kind === "highlight" ? "rgba(255,255,0,0.4)" : "transparent", border: o.kind === "rectangle" ? `2px solid ${o.color}` : undefined }}>
                              <button onClick={(e) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center transition-opacity"><X className="h-4 w-4" /></button>
                            </div>
                          );
                        }
                        if (o.kind === "comment" && o.text) {
                          return (
                            <div key={o.id} className="absolute group flex items-start gap-1" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
                              <div className="rounded bg-yellow-200/95 border border-yellow-400 px-3 py-1.5 text-[11px] text-yellow-900 shadow-lg max-w-[150px]"><MessageSquare className="h-3 w-3 inline mr-1 text-yellow-600" />{o.text}</div>
                              <button onClick={(e) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center transition-opacity"><X className="h-4 w-4" /></button>
                            </div>
                          );
                        }
                        if (o.kind === "freehand" && o.points) {
                          const minX = Math.min(...o.points.map(p => p[0])); const minY = Math.min(...o.points.map(p => p[1]));
                          const maxX = Math.max(...o.points.map(p => p[0])); const maxY = Math.max(...o.points.map(p => p[1]));
                          const w = maxX - minX; const h = maxY - minY;
                          const pts = o.points.map(p => `${((p[0] - minX) / (w || 1)) * 100},${((p[1] - minY) / (h || 1)) * 100}`).join(" ");
                          return (
                            <div key={o.id} className="absolute group" style={{ left: `${minX}%`, top: `${minY}%`, width: `${w || 1}%`, height: `${h || 1}%` }}>
                              <svg className="w-full h-full overflow-visible"><polyline points={pts} fill="none" stroke={o.color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
                              <button onClick={(e) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center transition-opacity"><X className="h-4 w-4" /></button>
                            </div>
                          );
                        }
                      }
                      if (ov.type === "signature") {
                        const o = ov as SignatureOverlay;
                        return (
                          <div key={o.id} className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%` }}>
                            <img src={o.dataUrl} className="w-full h-full" style={{ mixBlendMode: "multiply" }} alt="sig" />
                            <button onClick={(e) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center transition-opacity"><X className="h-4 w-4" /></button>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {activePage === visIdx && imgDragging && imgRect && (
                      <div className="absolute border-2 border-green-500 border-dashed bg-green-500/10 pointer-events-none" style={{ left: `${imgRect.x}%`, top: `${imgRect.y}%`, width: `${imgRect.width}%`, height: `${imgRect.height}%` }} />
                    )}
                    {activePage === visIdx && annotDragging && annotRect && annotKind !== "freehand" && annotKind !== "comment" && (
                      <div className="absolute border-2 border-dashed pointer-events-none" style={{ left: `${annotRect.x}%`, top: `${annotRect.y}%`, width: `${annotRect.width}%`, height: `${annotRect.height}%`, borderColor: annotColor, background: annotKind === "highlight" ? `rgba(255,255,0,0.25)` : "transparent", borderRadius: annotKind === "ellipse" ? "50%" : undefined }} />
                    )}
                    {activePage === visIdx && annotDragging && annotKind === "freehand" && freehandPoints.length > 1 && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"><polyline points={freehandPoints.map(p => `${p[0]}%,${p[1]}%`).join(" ")} fill="none" stroke={annotColor} strokeWidth="2px" vectorEffect="non-scaling-stroke" /></svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — TOOL SETTINGS */}
          {file && (
            <div className="w-[300px] border-l border-border bg-card overflow-y-auto hidden xl:flex flex-col gap-6 p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  {tabs.find(t => t.id === activeTab)?.icon}
                  {tabs.find(t => t.id === activeTab)?.label} Settings
                </h3>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-muted-foreground hover:text-foreground">
                  <FileStack className="h-4 w-4" />
                </button>
              </div>

              {activeTab === "text" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Content</label>
                    <Input value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Type here..." className="rounded-xl border-border bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Font Size ({textSize[0]}px)</label>
                    <Slider value={textSize} onValueChange={setTextSize} min={8} max={72} step={1} className="py-2" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {["#000000", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ffffff"].map(c => (
                        <button key={c} onClick={() => setTextColor(c)} className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${textColor === c ? "border-primary scale-110" : "border-transparent shadow-sm"}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant={textBold ? "default" : "outline"} size="sm" onClick={() => setTextBold(!textBold)} className="flex-1 font-bold">B</Button>
                    <Button variant={textItalic ? "default" : "outline"} size="sm" onClick={() => setTextItalic(!textItalic)} className="flex-1 italic">I</Button>
                  </div>
                  {currentOverlays.filter(o => o.type === "text").length > 0 && (
                    <div className="space-y-2 pt-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Placed Text</p>
                      {currentOverlays.filter(o => o.type === "text").map(o => (
                        <div key={o.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-2 text-[10px]">
                          <span className="truncate max-w-[150px]">"{o.type === 'text' ? (o as TextOverlay).text : ''}"</span>
                          <button onClick={() => removeOverlay(currentPageSrcIdx, o.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "image" && (
                <div className="space-y-4">
                  <p className="rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 p-4 text-[11px] leading-relaxed text-green-700 dark:text-green-300">
                    <span className="font-bold block mb-1">How to Replace Image:</span>
                    Drag a box over an existing image on any page. A file selector will appear to pick your new high-quality replacement.
                  </p>
                </div>
              )}

              {activeTab === "annotate" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-2">
                    {(["highlight", "rectangle", "ellipse", "comment", "freehand"] as AnnotationKind[]).map(k => (
                      <Button key={k} variant={annotKind === k ? "default" : "outline"} size="sm" onClick={() => setAnnotKind(k)} className="text-[10px] font-bold capitalize">{k}</Button>
                    ))}
                  </div>
                  {annotKind === "comment" && <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Sticky note text..." className="rounded-xl" />}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Annot Color</label>
                    <div className="flex flex-wrap gap-2">
                      {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"].map(c => (
                        <button key={c} onClick={() => setAnnotColor(c)} className={`h-7 w-7 rounded-full border-2 ${annotColor === c ? "border-primary" : "border-transparent"}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sign" && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-white border-2 border-dashed border-primary/20 p-2 overflow-hidden shadow-sm">
                    <canvas ref={sigCanvasRef} width={250} height={120} className="w-full cursor-crosshair" onMouseDown={startSig} onMouseMove={drawSig} onMouseUp={endSig} onMouseLeave={endSig} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearSig} className="flex-1 text-xs">Clear</Button>
                    <Button size="sm" onClick={placeSig} className="flex-1 text-xs bg-indigo-600">Place Sign</Button>
                  </div>
                </div>
              )}

              {activeTab === "pages" && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase py-2">Organize Document</p>
                  {state.pageOrder.map((srcIdx, visIdx) => (
                    <div key={visIdx} className={`flex items-center justify-between p-2 rounded-xl border ${activePage === visIdx ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-secondary/50"}`}>
                      <span className="text-[11px] font-bold">Page {visIdx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => rotatePage(visIdx, 1)} className="p-1 hover:bg-secondary rounded" title="Rotate"><RotateCw className="h-3.5 w-3.5" /></button>
                        <button onClick={() => movePage(visIdx, visIdx - 1)} disabled={visIdx === 0} className="p-1 hover:bg-secondary rounded disabled:opacity-20"><ChevronLeft className="h-3.5 w-3.5" /></button>
                        <button onClick={() => movePage(visIdx, visIdx + 1)} disabled={visIdx === state.pageOrder.length - 1} className="p-1 hover:bg-secondary rounded disabled:opacity-20"><ChevronRight className="h-3.5 w-3.5" /></button>
                        <button onClick={() => deletePage(visIdx)} className="p-1 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-6 border-t border-border mt-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">History Versions</p>
                    {versions.length === 0 && <p className="text-[10px] text-muted-foreground italic">No historical versions saved.</p>}
                    {versions.map((v, i) => (
                      <button key={i} onClick={() => {
                        const blob = new Blob([v.data.buffer as ArrayBuffer], { type: "application/pdf" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url; a.download = `${v.name}.pdf`; a.click();
                      }} className="flex w-full items-center justify-between rounded-xl bg-secondary/50 p-2 text-[10px] hover:bg-secondary mb-1">
                        <span className="truncate max-w-[160px]">{v.name}</span>
                        <Download className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto border-t border-border pt-6">
                <Button variant="outline" size="sm" onClick={saveVersion} disabled={saving} className="w-full text-xs gap-2 rounded-xl h-10 shadow-sm">
                  <Save className="h-4 w-4" /> Save Snapshot
                </Button>
                <div className="mt-4 flex flex-col items-center gap-2 text-center">
                  <p className="text-[10px] text-muted-foreground leading-snug">Every action is versioned. Your data remains private and local.</p>
                  <CheckCircle2 className="h-4 w-4 text-primary/40" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
};

export default EditPdf;
