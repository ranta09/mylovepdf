import { useState, useRef, useEffect, useCallback, useId } from "react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader from "@/components/ToolHeader";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Edit3, Type, ImageIcon, FileStack, MessageSquare, PenLine,
  Undo2, Redo2, Download, Save, RotateCw, RotateCcw, Trash2,
  Highlighter, Loader2, CheckCircle2,
  ChevronLeft, ChevronRight, X, ShieldCheck,
  ZoomIn, ZoomOut, Maximize, Minimize, PanelRight, AlignCenter
} from "lucide-react";
import {
  renderPdfPages, buildEditedPdf, makeId,
  type Overlay, type TextOverlay, type ImageOverlay,
  type AnnotationOverlay, type SignatureOverlay,
  type PageState, type EditorState
} from "@/lib/pdfEditorUtils";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "text" | "image" | "pages" | "annotate" | "sign";
type AnnotationKind = "highlight" | "rectangle" | "ellipse" | "comment" | "freehand";

const MAX_HISTORY = 20;
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newPageState(): PageState {
  return { overlays: [], rotation: 0 };
}

function cloneState(s: EditorState): EditorState {
  return JSON.parse(JSON.stringify(s));
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Layout state
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [thumbsOpen, setThumbsOpen] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // ─── Load PDF ──────────────────────────────────────────────────────────────

  const handleFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) { setFile(null); setPreviews([]); return; }
    setFile(f);
    setLoading(true);
    try {
      // Render at 2.0 scale for sharp output; zoom controls the display size
      const imgs = await renderPdfPages(f, 2.0);
      setPreviews(imgs);
      const pages = imgs.map(() => newPageState());
      const order = imgs.map((_, i) => i);
      const initial = { pages, pageOrder: order };
      setState(initial);
      setHistory([]);
      setFuture([]);
      setActivePage(0);
      toast.success(`Loaded PDF (${imgs.length} page${imgs.length !== 1 ? "s" : ""})`);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  // ─── Intersection observer — detect which page is visible ─────────────────

  useEffect(() => {
    if (!scrollRef.current || previews.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const idx = parseInt((visible[0].target as HTMLElement).dataset.pageindex ?? "0");
          setActivePage(idx);
        }
      },
      { root: scrollRef.current, threshold: [0.3, 0.5, 0.8] }
    );
    pageRefs.current.forEach(ref => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, [previews]);

  // ─── Fullscreen API ────────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      editorRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Zoom helpers ──────────────────────────────────────────────────────────

  const zoomIn = () => {
    const next = ZOOM_STEPS.find(z => z > zoom);
    if (next) setZoom(next);
  };
  const zoomOut = () => {
    const next = [...ZOOM_STEPS].reverse().find(z => z < zoom);
    if (next) setZoom(next);
  };
  const zoomFitWidth = () => setZoom(1.0);

  // Scroll to page
  const scrollToPage = (idx: number) => {
    pageRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActivePage(idx);
  };

  // ─── History / Undo ────────────────────────────────────────────────────────

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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, future, state]);

  // ─── Overlays ──────────────────────────────────────────────────────────────

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

  // ─── Coordinate helpers ────────────────────────────────────────────────────

  const getRelativePos = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  // ─── Page interactions ─────────────────────────────────────────────────────

  const handlePageClick = (e: React.MouseEvent, srcIdx: number) => {
    if (activeTab !== "text") return;
    const { x, y } = getRelativePos(e);
    const overlay: TextOverlay = {
      id: makeId(), type: "text",
      text: textContent, fontSize: textSize[0], color: textColor,
      bold: textBold, italic: textItalic, x, y
    };
    addOverlay(srcIdx, overlay);
  };

  const handleImgMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== "image") return;
    e.preventDefault();
    const { x, y } = getRelativePos(e);
    setImgStart({ x, y }); setImgRect(null); setImgDragging(true);
  };

  const handleImgMouseMove = (e: React.MouseEvent) => {
    if (!imgDragging || !imgStart) return;
    const { x, y } = getRelativePos(e);
    setImgRect({ x: Math.min(imgStart.x, x), y: Math.min(imgStart.y, y), width: Math.abs(x - imgStart.x), height: Math.abs(y - imgStart.y) });
  };

  const handleImgMouseUp = (e: React.MouseEvent, srcIdx: number) => {
    if (!imgDragging || !imgRect || imgRect.width < 2 || imgRect.height < 2) { setImgDragging(false); setImgRect(null); return; }
    setImgDragging(false);
    const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const imgFile = input.files?.[0]; if (!imgFile) return;
      const reader = new FileReader();
      reader.onload = () => {
        const overlay: ImageOverlay = { id: makeId(), type: "image", dataUrl: reader.result as string, x: imgRect!.x, y: imgRect!.y, width: imgRect!.width, height: imgRect!.height };
        addOverlay(srcIdx, overlay); setImgRect(null);
        toast.success("Image placed!");
      };
      reader.readAsDataURL(imgFile);
    };
    input.click();
  };

  const handleAnnotMouseDown = (e: React.MouseEvent) => {
    if (activeTab !== "annotate") return;
    e.preventDefault();
    const { x, y } = getRelativePos(e);
    setAnnotStart({ x, y }); setAnnotRect(null); setAnnotDragging(true);
    if (annotKind === "freehand") setFreehandPoints([[x, y]]);
  };

  const handleAnnotMouseMove = (e: React.MouseEvent) => {
    if (!annotDragging || !annotStart) return;
    const { x, y } = getRelativePos(e);
    if (annotKind === "freehand") setFreehandPoints(pts => [...pts, [x, y]]);
    else setAnnotRect({ x: Math.min(annotStart.x, x), y: Math.min(annotStart.y, y), width: Math.abs(x - annotStart.x), height: Math.abs(y - annotStart.y) });
  };

  const handleAnnotMouseUp = (e: React.MouseEvent, srcIdx: number) => {
    if (!annotDragging || !annotStart) return;
    setAnnotDragging(false);
    if (annotKind === "comment") {
      addOverlay(srcIdx, { id: makeId(), type: "annotation", kind: "comment", x: annotStart.x, y: annotStart.y, color: annotColor, text: commentText } as AnnotationOverlay);
    } else if (annotKind === "freehand") {
      addOverlay(srcIdx, { id: makeId(), type: "annotation", kind: "freehand", x: annotStart.x, y: annotStart.y, color: annotColor, points: freehandPoints } as AnnotationOverlay);
      setFreehandPoints([]);
    } else if (annotRect && annotRect.width > 1 && annotRect.height > 1) {
      addOverlay(srcIdx, { id: makeId(), type: "annotation", kind: annotKind, x: annotRect.x, y: annotRect.y, width: annotRect.width, height: annotRect.height, color: annotColor } as AnnotationOverlay);
    }
    setAnnotRect(null);
  };

  // ─── Page management ───────────────────────────────────────────────────────

  const deletePage = (visIdx: number) => {
    if (state.pageOrder.length <= 1) { toast.error("Cannot delete the only page."); return; }
    const next = cloneState(state); next.pageOrder.splice(visIdx, 1); pushState(next);
    setActivePage(Math.min(activePage, next.pageOrder.length - 1));
    toast.success("Page deleted (Ctrl+Z to restore)");
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
    const [removed] = next.pageOrder.splice(from, 1); next.pageOrder.splice(to, 0, removed);
    pushState(next); setActivePage(to);
  };

  // ─── Signature ─────────────────────────────────────────────────────────────

  const startSig = (e: React.MouseEvent) => {
    setSigDrawing(true);
    const ctx = sigCanvasRef.current?.getContext("2d"); if (!ctx) return;
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent) => {
    if (!sigDrawing) return;
    const ctx = sigCanvasRef.current?.getContext("2d"); if (!ctx) return;
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
  };

  const clearSig = () => { const ctx = sigCanvasRef.current?.getContext("2d"); if (ctx) ctx.clearRect(0, 0, 400, 120); };

  const placeSig = () => {
    const canvas = sigCanvasRef.current; if (!canvas) return;
    const overlay: SignatureOverlay = { id: makeId(), type: "signature", dataUrl: canvas.toDataURL("image/png"), x: 10, y: 75, width: 30, height: 10 };
    addOverlay(activePage, overlay); setSigPlaced(true); toast.success("Signature placed on page!");
  };

  // ─── Download ──────────────────────────────────────────────────────────────

  const download = async () => {
    if (!file) return; setSaving(true); setSaveProgress(0);
    try {
      const bytes = await buildEditedPdf(file, state, setSaveProgress);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url;
      a.download = `${file.name.replace(".pdf", "")}-edited.pdf`; a.click(); URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch { toast.error("Failed to generate PDF."); }
    finally { setSaving(false); setSaveProgress(0); }
  };

  const saveVersion = async () => {
    if (!file) return; setSaving(true);
    try {
      const bytes = await buildEditedPdf(file, state, setSaveProgress);
      const name = `Version ${versions.length + 1} — ${new Date().toLocaleTimeString()}`;
      setVersions(v => [...v, { name, data: bytes }]);
      toast.success(`Saved as "${name}"`);
    } catch { toast.error("Failed to save version."); }
    finally { setSaving(false); setSaveProgress(0); }
  };

  const downloadVersion = (v: { name: string; data: Uint8Array }) => {
    const blob = new Blob([v.data.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${v.name}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  // ─── Render an overlay on top of a page ───────────────────────────────────

  const renderOverlay = (ov: Overlay, srcIdx: number) => {
    if (ov.type === "text") {
      const o = ov as TextOverlay;
      return (
        <div key={o.id} className="absolute group flex items-start"
          style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%, -50%)", userSelect: "none" }}>
          <span style={{ fontSize: `${Math.max(8, o.fontSize * 0.7)}px`, color: o.color, fontWeight: o.bold ? "bold" : "normal", fontStyle: o.italic ? "italic" : "normal", background: "rgba(255,255,255,0.8)", borderRadius: 3, padding: "1px 4px", border: "1px dashed rgba(0,0,0,0.25)" }}>
            {o.text}
          </span>
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="ml-0.5 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity">
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      );
    }
    if (ov.type === "image") {
      const o = ov as ImageOverlay;
      return (
        <div key={o.id} className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%` }}>
          <img src={o.dataUrl} className="w-full h-full object-fill" alt="overlay" />
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      );
    }
    if (ov.type === "annotation") {
      const o = ov as AnnotationOverlay;
      if (o.kind === "highlight" || o.kind === "rectangle") return (
        <div key={o.id} className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width ?? 10}%`, height: `${o.height ?? 3}%`, background: o.kind === "highlight" ? "rgba(255,255,0,0.4)" : "transparent", border: o.kind === "rectangle" ? `2px solid ${o.color}` : undefined }}>
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      );
      if (o.kind === "ellipse") return (
        <div key={o.id} className="absolute group rounded-full" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width ?? 10}%`, height: `${o.height ?? 5}%`, border: `2px solid ${o.color}` }}>
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      );
      if (o.kind === "comment" && o.text) return (
        <div key={o.id} className="absolute group flex items-start gap-1" style={{ left: `${o.x}%`, top: `${o.y}%` }}>
          <div className="rounded bg-yellow-200/90 border border-yellow-400 px-2 py-1 text-[9px] text-yellow-900 max-w-[120px] shadow-sm">
            <MessageSquare className="h-2.5 w-2.5 inline mr-1 text-yellow-600" />{o.text}
          </div>
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      );
      if (o.kind === "freehand" && o.points) {
        const minX = Math.min(...o.points.map(p => p[0])), minY = Math.min(...o.points.map(p => p[1]));
        const maxX = Math.max(...o.points.map(p => p[0])), maxY = Math.max(...o.points.map(p => p[1]));
        const w = maxX - minX, h = maxY - minY;
        const pts = o.points.map(p => `${((p[0] - minX) / (w || 1)) * 100},${((p[1] - minY) / (h || 1)) * 100}`).join(" ");
        return (
          <div key={o.id} className="absolute group" style={{ left: `${minX}%`, top: `${minY}%`, width: `${w || 1}%`, height: `${h || 1}%` }}>
            <svg className="w-full h-full overflow-visible"><polyline points={pts} fill="none" stroke={o.color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
            <button onClick={() => removeOverlay(srcIdx, o.id)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
          </div>
        );
      }
    }
    if (ov.type === "signature") {
      const o = ov as SignatureOverlay;
      return (
        <div key={o.id} className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%` }}>
          <img src={o.dataUrl} className="w-full h-full" style={{ mixBlendMode: "multiply" }} alt="signature" />
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      );
    }
    return null;
  };

  // ────────────────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Text", icon: <Type className="h-3.5 w-3.5" /> },
    { id: "image", label: "Image", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: "pages", label: "Pages", icon: <FileStack className="h-3.5 w-3.5" /> },
    { id: "annotate", label: "Annotate", icon: <Highlighter className="h-3.5 w-3.5" /> },
    { id: "sign", label: "Sign", icon: <PenLine className="h-3.5 w-3.5" /> },
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
      <div className="space-y-4">
        <ToolHeader
          title="Edit PDF Online"
          description="Add text, images, annotations, and signatures"
          icon={<Edit3 className="h-5 w-5 text-primary-foreground" />}
          className="bg-tool-edit/5 border-tool-edit/20"
          iconBgClass="bg-tool-edit"
        />

        {/* Upload state */}
        {!file && !loading && (
          <FileUpload accept=".pdf" multiple={false} files={[]} onFilesChange={handleFiles}
            label="Drop your PDF here to start editing" collapsible={false} />
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading and rendering PDF pages…</p>
          </div>
        )}

        {/* Full editor workspace */}
        {file && previews.length > 0 && (
          <div ref={editorRef} className="flex flex-col gap-0 rounded-2xl border border-border bg-card shadow-card overflow-hidden" style={{ minHeight: "500px", maxHeight: isFullscreen ? "100vh" : "85vh" }}>

            {/* ── Top Toolbar ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 backdrop-blur px-3 py-2 sticky top-0 z-30">

              {/* Tool Tabs */}
              <div className="flex gap-0.5 rounded-xl bg-secondary p-1">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
                    {t.icon} <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Center: Zoom controls */}
              <div className="flex items-center gap-1 rounded-xl bg-secondary px-2 py-1">
                <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoom <= ZOOM_STEPS[0]} className="h-7 w-7 p-0 rounded-lg" title="Zoom Out">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <button onClick={zoomFitWidth} className="text-xs font-bold tabular-nums min-w-[44px] text-center text-foreground hover:text-primary transition-colors" title="Reset to Fit Width">
                  {Math.round(zoom * 100)}%
                </button>
                <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} className="h-7 w-7 p-0 rounded-lg" title="Zoom In">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <div className="mx-1 h-4 w-px bg-border" />
                <Button variant="ghost" size="sm" onClick={zoomFitWidth} className="h-7 px-2 text-[10px] rounded-lg gap-1" title="Fit Width">
                  <AlignCenter className="h-3 w-3" /> Fit
                </Button>
              </div>

              {/* Right: History + Actions */}
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={undo} disabled={!history.length} title="Undo (Ctrl+Z)" className="h-7 w-7 p-0">
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)" className="h-7 w-7 p-0">
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={saveVersion} disabled={saving} className="h-7 rounded-lg text-xs gap-1 hidden md:flex">
                  <Save className="h-3 w-3" /> Save
                </Button>
                <Button size="sm" onClick={download} disabled={saving} className="h-7 rounded-lg text-xs gap-1 bg-primary text-primary-foreground">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Download</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRightPanelOpen(r => !r)} className="h-7 w-7 p-0" title="Toggle panel">
                  <PanelRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-7 w-7 p-0" title="Fullscreen">
                  {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {saving && <Progress value={saveProgress} className="h-1 rounded-none" />}

            {/* ── Main editor body ────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

              {/* Page thumbnails sidebar */}
              <div className={`hidden md:flex flex-col gap-2 border-r border-border bg-secondary/30 p-2 overflow-y-auto transition-all duration-300 ${thumbsOpen ? "w-[120px]" : "w-0 p-0 overflow-hidden"}`}>
                {state.pageOrder.map((srcIdx, visIdx) => (
                  <div key={`${srcIdx}-${visIdx}`}
                    className={`group relative cursor-pointer rounded-xl border-2 overflow-hidden transition-all flex-shrink-0 ${activePage === visIdx ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30"}`}
                    onClick={() => scrollToPage(visIdx)}>
                    <img src={previews[srcIdx]} alt={`Page ${visIdx + 1}`} className="w-full"
                      style={{ transform: `rotate(${state.pages[srcIdx].rotation}deg)`, transition: "transform 0.3s" }} />
                    <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-center text-[9px] font-bold py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {visIdx + 1}
                    </div>
                    {activePage === visIdx && (
                      <div className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none" />
                    )}
                  </div>
                ))}
                <button onClick={() => setThumbsOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors">
                  Hide ←
                </button>
              </div>

              {/* Page canvas area — scrollable, large */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/20 px-4 py-6" style={{ scrollBehavior: "smooth" }}>
                {!thumbsOpen && (
                  <button onClick={() => setThumbsOpen(true)} className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronRight className="h-3 w-3" /> Show pages
                  </button>
                )}

                <div className="flex flex-col items-center gap-8">
                  {state.pageOrder.map((srcIdx, visIdx) => {
                    const pageState = state.pages[srcIdx];
                    const overlays = pageState?.overlays ?? [];

                    return (
                      <div
                        key={`${srcIdx}-${visIdx}`}
                        ref={el => { pageRefs.current[visIdx] = el; }}
                        data-pageindex={visIdx}
                        className="relative shadow-lg bg-white rounded-sm mb-4"
                        style={{ width: `${zoom * 100}%`, maxWidth: "100%", transformOrigin: "top center" }}
                        onClick={(e) => handlePageClick(e, srcIdx)}
                        onMouseDown={(e) => {
                          if (activeTab === "image") handleImgMouseDown(e);
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
                        {/* Page image */}
                        <img
                          src={previews[srcIdx]}
                          alt={`Page ${visIdx + 1}`}
                          className={`w-full block select-none ${activeTab === "text" ? "cursor-crosshair" :
                            activeTab === "image" ? "cursor-cell" :
                              activeTab === "annotate" ? "cursor-crosshair" : "cursor-default"
                            }`}
                          style={{ transform: `rotate(${pageState?.rotation ?? 0}deg)`, transition: "transform 0.3s" }}
                          draggable={false}
                        />

                        {/* Overlays */}
                        {overlays.map(ov => renderOverlay(ov, srcIdx))}

                        {/* Image drag preview */}
                        {imgDragging && imgRect && activePage === visIdx && (
                          <div className="absolute border-2 border-green-500 border-dashed bg-green-500/10 pointer-events-none"
                            style={{ left: `${imgRect.x}%`, top: `${imgRect.y}%`, width: `${imgRect.width}%`, height: `${imgRect.height}%` }} />
                        )}

                        {/* Annotation drag preview */}
                        {annotDragging && annotRect && activePage === visIdx && annotKind !== "freehand" && annotKind !== "comment" && (
                          <div className="absolute border-2 border-dashed pointer-events-none"
                            style={{ left: `${annotRect.x}%`, top: `${annotRect.y}%`, width: `${annotRect.width}%`, height: `${annotRect.height}%`, borderColor: annotColor, background: annotKind === "highlight" ? "rgba(255,255,0,0.25)" : "transparent", borderRadius: annotKind === "ellipse" ? "50%" : undefined }} />
                        )}

                        {/* Freehand in progress */}
                        {annotDragging && annotKind === "freehand" && freehandPoints.length > 1 && activePage === visIdx && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                            <polyline points={freehandPoints.map(p => `${p[0]}%,${p[1]}%`).join(" ")} fill="none" stroke={annotColor} strokeWidth="2px" vectorEffect="non-scaling-stroke" />
                          </svg>
                        )}

                        {/* Page number badge */}
                        <div className="absolute bottom-3 right-3 rounded-md bg-black/50 backdrop-blur px-2 py-0.5 text-xs text-white pointer-events-none font-medium">
                          Page {visIdx + 1} of {state.pageOrder.length}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Privacy note at the bottom */}
                <div className="flex items-center justify-center gap-1.5 mt-8 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Your file never leaves your device.
                </div>
              </div>

              {/* ── Right Tool Panel ───────────────────────────────────────── */}
              <div className={`border-l border-border bg-card flex flex-col gap-0 overflow-y-auto transition-all duration-300 ${rightPanelOpen ? "w-[280px]" : "w-0 overflow-hidden"}`}>
                <div className="p-4 space-y-5">

                  {/* Text Tool */}
                  {activeTab === "text" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm flex items-center gap-2 text-foreground"><Type className="h-4 w-4 text-blue-500" /> Text Tool</h3>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Content</label>
                        <Input value={textContent} onChange={e => setTextContent(e.target.value)} className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Size: {textSize[0]}px</label>
                        <Slider value={textSize} onValueChange={setTextSize} min={8} max={72} step={1} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Color</label>
                        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="h-9 w-full rounded-lg border border-border cursor-pointer" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setTextBold(b => !b)} className={`flex-1 rounded-lg border py-1.5 text-sm font-bold transition-all ${textBold ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>B</button>
                        <button onClick={() => setTextItalic(b => !b)} className={`flex-1 rounded-lg border py-1.5 text-sm italic transition-all ${textItalic ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>I</button>
                      </div>
                      <p className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
                        💡 Click anywhere on the page to place your text.
                      </p>
                    </div>
                  )}

                  {/* Image Tool */}
                  {activeTab === "image" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4 text-green-500" /> Image Replace</h3>
                      <p className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-xs text-green-700 dark:text-green-300">
                        🖼 Drag a rectangle on the page to define the placement area. A file picker will appear to pick your image.
                      </p>
                    </div>
                  )}

                  {/* Pages Tool */}
                  {activeTab === "pages" && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-sm flex items-center gap-2"><FileStack className="h-4 w-4 text-purple-500" /> Page Manager</h3>
                      {state.pageOrder.map((srcIdx, visIdx) => (
                        <div key={`${srcIdx}-${visIdx}`}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm cursor-pointer transition-all ${activePage === visIdx ? "bg-primary/5 border-primary/30" : "border-border hover:bg-secondary"}`}
                          onClick={() => scrollToPage(visIdx)}>
                          <span className="font-medium text-xs">Page {visIdx + 1}</span>
                          <div className="flex items-center gap-0.5">
                            <button onClick={e => { e.stopPropagation(); rotatePage(visIdx, -1); }} className="rounded p-1 hover:bg-secondary/80" title="Rotate CCW"><RotateCcw className="h-3 w-3" /></button>
                            <button onClick={e => { e.stopPropagation(); rotatePage(visIdx, 1); }} className="rounded p-1 hover:bg-secondary/80" title="Rotate CW"><RotateCw className="h-3 w-3" /></button>
                            <button onClick={e => { e.stopPropagation(); movePage(visIdx, visIdx - 1); }} disabled={visIdx === 0} className="rounded p-1 hover:bg-secondary/80 disabled:opacity-30"><ChevronLeft className="h-3 w-3" /></button>
                            <button onClick={e => { e.stopPropagation(); movePage(visIdx, visIdx + 1); }} disabled={visIdx === state.pageOrder.length - 1} className="rounded p-1 hover:bg-secondary/80 disabled:opacity-30"><ChevronRight className="h-3 w-3" /></button>
                            <button onClick={e => { e.stopPropagation(); deletePage(visIdx); }} className="rounded p-1 hover:bg-destructive/10 text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Annotate Tool */}
                  {activeTab === "annotate" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm flex items-center gap-2"><Highlighter className="h-4 w-4 text-yellow-500" /> Annotation Tool</h3>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["highlight", "rectangle", "ellipse", "comment", "freehand"] as AnnotationKind[]).map(k => (
                          <button key={k} onClick={() => setAnnotKind(k)} className={`rounded-lg border py-1.5 text-xs font-medium capitalize transition-all ${annotKind === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{k}</button>
                        ))}
                      </div>
                      {annotKind === "comment" && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Comment text</label>
                          <Input value={commentText} onChange={e => setCommentText(e.target.value)} className="text-sm" />
                        </div>
                      )}
                      {annotKind !== "highlight" && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Color</label>
                          <input type="color" value={annotColor} onChange={e => setAnnotColor(e.target.value)} className="h-9 w-full rounded-lg border border-border cursor-pointer" />
                        </div>
                      )}
                      <p className="rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 text-xs text-yellow-700 dark:text-yellow-300">
                        ✏️ Drag on the page to draw. Click × to remove.
                      </p>
                    </div>
                  )}

                  {/* Sign Tool */}
                  {activeTab === "sign" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm flex items-center gap-2"><PenLine className="h-4 w-4 text-indigo-500" /> Signature Pad</h3>
                      <canvas ref={sigCanvasRef} width={240} height={120} className="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-white cursor-crosshair"
                        onMouseDown={startSig} onMouseMove={drawSig} onMouseUp={() => setSigDrawing(false)} onMouseLeave={() => setSigDrawing(false)} />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearSig} className="flex-1 text-xs rounded-lg">Clear</Button>
                        <Button size="sm" onClick={placeSig} className="flex-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Place
                        </Button>
                      </div>
                      {sigPlaced && <p className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 flex-shrink-0" /> Signature placed on page!</p>}
                    </div>
                  )}

                  {/* Saved Versions */}
                  {versions.length > 0 && (
                    <div className="border-t border-border pt-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saved Versions</p>
                      {versions.map((v, i) => (
                        <button key={i} onClick={() => downloadVersion(v)} className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-xs hover:bg-secondary/80 transition-all">
                          <span className="font-medium truncate max-w-[160px]">{v.name}</span>
                          <Download className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
            {/* End main body */}

            {/* Bottom bar */}
            <div className="flex items-center justify-between border-t border-border bg-background/80 backdrop-blur px-4 py-2">
              <button onClick={() => { setFile(null); setPreviews([]); setState({ pages: [], pageOrder: [] }); setHistory([]); setFuture([]); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                ← Edit a different PDF
              </button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Page {activePage + 1} / {state.pageOrder.length} •
                <span className="font-medium">{file.name}</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default EditPdf;
