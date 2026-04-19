import { useState, useRef, useEffect, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolUploadScreen from "@/components/ToolUploadScreen";
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
  ZoomIn, ZoomOut, AlignCenter,
  Hand, Pencil, Shapes, Pilcrow, TextCursor,
  Bold, Italic, Underline, AlignLeft, AlignRight,
  Link, Info, ChevronUp, ChevronDown, Camera,
  Plus, MoveHorizontal, LayoutGrid, List, Bookmark,
  Maximize, Minimize, MousePointer2, Circle, Eraser,
  Minus, ArrowUpRight, Square, Triangle, Spline,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TransformBox, TransformItem } from "@/components/TransformBox";
import {
  renderPdfPages, buildEditedPdf, makeId,
  type Overlay, type TextOverlay, type ImageOverlay,
  type AnnotationOverlay, type SignatureOverlay,
  type PageState, type EditorState
} from "@/lib/pdfEditorUtils";
import { extractTextBlocks, type TextBlock } from "@/lib/pdfTextExtractor";

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = "text" | "image" | "pages" | "annotate" | "sign";
type Tool = "select" | "addText" | "editText" | "sign" | "pencil" | "highlight" | "eraser" | "annotate" | "image" | "shapes";
type Shape = "ellipse" | "line" | "arrow" | "rectangle" | "polygon" | "polyline";
type AnnotationKind = "highlight" | "rectangle" | "ellipse" | "comment" | "freehand" | "line" | "arrow";

const MAX_HISTORY = 20;
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0];
const RENDER_SCALE = 2.0;

function newPageState(): PageState { return { overlays: [], rotation: 0 }; }
function cloneState(s: EditorState): EditorState { return JSON.parse(JSON.stringify(s)); }

function overlayBBox(ov: Overlay): { x: number; y: number; w: number; h: number } | null {
  if (ov.type === "text") {
    const o = ov as TextOverlay;
    return { x: o.x - 8, y: o.y - 3, w: 16, h: 6 };
  }
  if (ov.type === "image") {
    const o = ov as ImageOverlay;
    return { x: o.x, y: o.y, w: o.width, h: o.height };
  }
  if (ov.type === "signature") {
    const o = ov as SignatureOverlay;
    return { x: o.x, y: o.y, w: o.width, h: o.height };
  }
  if (ov.type === "annotation") {
    const o = ov as AnnotationOverlay;
    if (o.kind === "line" || o.kind === "arrow") {
      const dx = o.width ?? 0, dy = o.height ?? 0;
      return { x: Math.min(o.x, o.x + dx), y: Math.min(o.y, o.y + dy), w: Math.abs(dx) || 1, h: Math.abs(dy) || 1 };
    }
    if (o.kind === "freehand" && o.points && o.points.length > 0) {
      const xs = o.points.map(p => p[0]), ys = o.points.map(p => p[1]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) || 1, h: Math.max(...ys) - Math.min(...ys) || 1 };
    }
    return { x: o.x, y: o.y, w: o.width ?? 10, h: o.height ?? 5 };
  }
  return null;
}

function rectsIntersect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(!!file);
    return () => setDisableGlobalFeatures(false);
  }, [file, setDisableGlobalFeatures]);

  // ── Tool / mode state ─────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeShape, setActiveShape] = useState<Shape>("ellipse");
  const [shapeDropdownOpen, setShapeDropdownOpen] = useState(false);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [textUnderline, setTextUnderline] = useState(false);
  const [activePage, setActivePage] = useState(0);

  // Derived from activeTool
  const annotKind: AnnotationKind = (() => {
    if (activeTool === "highlight") return "highlight";
    if (activeTool === "pencil") return "freehand";
    if (activeTool === "shapes") {
      if (activeShape === "ellipse") return "ellipse";
      if (activeShape === "rectangle") return "rectangle";
      if (activeShape === "line") return "line";
      if (activeShape === "arrow") return "arrow";
      return "freehand"; // polygon/polyline
    }
    return "comment";
  })();

  const activeTab: Tab = (() => {
    if (activeTool === "addText" || activeTool === "editText") return "text";
    if (activeTool === "image") return "image";
    if (activeTool === "sign") return "sign";
    if (["pencil","highlight","annotate","shapes"].includes(activeTool)) return "annotate";
    return "text";
  })();

  // ── Layout state ──────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thumbsOpen, setThumbsOpen] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Text overlay state ────────────────────────────────────────────────────
  const [textContent, setTextContent] = useState("Your text here");
  const [textSize, setTextSize] = useState([16]);
  const [textColor, setTextColor] = useState("#000000");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textFont, setTextFont] = useState("helvetica");

  // ── Real text-block editing state ─────────────────────────────────────────
  const [textBlocksPerPage, setTextBlocksPerPage] = useState<TextBlock[][]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Per-selected-block style overrides (for right panel)
  const [selFontSize, setSelFontSize] = useState(12);
  const [selColor, setSelColor] = useState("#000000");
  const [selBold, setSelBold] = useState(false);
  const [selItalic, setSelItalic] = useState(false);
  const [selUnderline, setSelUnderline] = useState(false);
  const [selAlign, setSelAlign] = useState<"left" | "center" | "right">("left");

  // ── Text-edit undo / redo (separate from overlay history) ────────────────
  const [textHistory, setTextHistory] = useState<TextBlock[][][]>([]);
  const [textFuture,  setTextFuture]  = useState<TextBlock[][][]>([]);

  /** Snapshot current textBlocksPerPage before the user starts editing a block. */
  const pushTextEdit = useCallback(() => {
    setTextHistory(h => [...h.slice(-MAX_HISTORY + 1), JSON.parse(JSON.stringify(textBlocksPerPage))]);
    setTextFuture([]);
  }, [textBlocksPerPage]);

  // ── Drag state ────────────────────────────────────────────────────────────
  const [draggingOverlay, setDraggingOverlay] = useState<{ pageIdx: number; overlayId: string; startX: number; startY: number; mouseStartX: number; mouseStartY: number } | null>(null);
  const wasDraggingMove = useRef(false);

  // ── Annotation state ──────────────────────────────────────────────────────
  const [annotColor, setAnnotColor] = useState("#2563eb");
  const [commentText, setCommentText] = useState("Comment");

  // ── Image drag state ──────────────────────────────────────────────────────
  const [imgDragging, setImgDragging] = useState(false);
  const [imgStart, setImgStart] = useState<{ x: number; y: number } | null>(null);
  const [imgRect, setImgRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── Annotation draw state ─────────────────────────────────────────────────
  const [annotDragging, setAnnotDragging] = useState(false);
  const [annotStart, setAnnotStart] = useState<{ x: number; y: number } | null>(null);
  const [annotRect, setAnnotRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<number[][]>([]);

  // ── Eraser drag state ─────────────────────────────────────────────────────
  const [eraserDragging, setEraserDragging] = useState(false);
  const [eraserStart, setEraserStart] = useState<{ x: number; y: number } | null>(null);
  const [eraserRect, setEraserRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── Marquee drag state ────────────────────────────────────────────────────
  const [marqueeDragging, setMarqueeDragging] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── Signature state ───────────────────────────────────────────────────────
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sigDrawing, setSigDrawing] = useState(false);
  const [sigPlaced, setSigPlaced] = useState(false);

  // ─── Load PDF + extract text blocks ──────────────────────────────────────

  const handleFiles = async (files: File[]) => {
    const f = files[0];
    if (!f) { setFile(null); setPreviews([]); return; }
    setFile(f);
    setLoading(true);
    try {
      const imgs = await renderPdfPages(f, RENDER_SCALE);
      setPreviews(imgs);
      const pages = imgs.map(() => newPageState());
      const order = imgs.map((_, i) => i);
      setState({ pages, pageOrder: order });
      setHistory([]); setFuture([]);
      setTextHistory([]); setTextFuture([]);
      setActivePage(0);

      // Extract text blocks for every page in parallel
      const allBlocks = await Promise.all(
        imgs.map((_, i) => extractTextBlocks(f, i, RENDER_SCALE).catch(() => []))
      );
      setTextBlocksPerPage(allBlocks);

      toast.success(`Loaded PDF (${imgs.length} page${imgs.length !== 1 ? "s" : ""})`);
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setLoading(false);
    }
  };

  // ─── Text block helpers ───────────────────────────────────────────────────

  const updateTextBlock = useCallback((blockId: string, newText: string) => {
    setTextBlocksPerPage(prev => prev.map(pageBlocks =>
      pageBlocks.map(b =>
        b.id === blockId
          ? { ...b, text: newText, isDirty: newText !== b.originalText }
          : b
      )
    ));
  }, []);

  const updateTextBlockStyle = useCallback((blockId: string, updates: Partial<TextBlock>) => {
    setTextBlocksPerPage(prev => prev.map(pageBlocks =>
      pageBlocks.map(b =>
        b.id === blockId
          ? { ...b, ...updates, isDirty: true }
          : b
      )
    ));
  }, []);

  const removeTextBlock = useCallback((blockId: string) => {
    setTextBlocksPerPage(prev => prev.map(pageBlocks =>
      pageBlocks.filter(b => b.id !== blockId)
    ));
    setSelectedBlockId(null);
  }, []);

  const selectBlock = useCallback((block: TextBlock) => {
    setSelectedBlockId(block.id);
    setSelFontSize(Math.max(8, Math.round(block.pdfFontSize)));
    // Prefer user-set custom values; fall back to what was detected from the PDF
    setSelColor(block.customColor ?? "#000000");
    setSelBold(block.customBold  !== undefined ? block.customBold  : (block.isBold   ?? false));
    setSelItalic(block.customItalic !== undefined ? block.customItalic : (block.isItalic ?? false));
    setSelUnderline(block.customUnderline ?? false);
    setSelAlign(block.customAlign ?? "left");
  }, []);

  // ─── Intersection observer ────────────────────────────────────────────────

  useEffect(() => {
    if (!scrollRef.current || previews.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
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

  // ─── Fullscreen ───────────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { editorRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ─── Zoom ─────────────────────────────────────────────────────────────────

  const zoomIn = () => { const n = ZOOM_STEPS.find(z => z > zoom); if (n) setZoom(n); };
  const zoomOut = () => { const n = [...ZOOM_STEPS].reverse().find(z => z < zoom); if (n) setZoom(n); };
  const zoomFitWidth = () => setZoom(1.0);
  const scrollToPage = (idx: number) => {
    pageRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActivePage(idx);
  };

  // ─── History ──────────────────────────────────────────────────────────────

  const pushState = useCallback((next: EditorState) => {
    setHistory(h => [...h.slice(-MAX_HISTORY + 1), cloneState(state)]);
    setFuture([]); setState(next);
  }, [state]);

  // Text history takes priority: undo the most recent text edit first,
  // then fall back to overlay/page-order history.
  const undo = useCallback(() => {
    if (textHistory.length > 0) {
      setTextFuture(f => [JSON.parse(JSON.stringify(textBlocksPerPage)), ...f.slice(0, MAX_HISTORY - 1)]);
      setTextBlocksPerPage(textHistory[textHistory.length - 1]);
      setTextHistory(h => h.slice(0, -1));
      setSelectedBlockId(null);
      return;
    }
    if (!history.length) return;
    setFuture(f => [cloneState(state), ...f]);
    setState(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  }, [textHistory, textBlocksPerPage, history, state]);

  const redo = useCallback(() => {
    if (textFuture.length > 0) {
      setTextHistory(h => [...h, JSON.parse(JSON.stringify(textBlocksPerPage))]);
      setTextBlocksPerPage(textFuture[0]);
      setTextFuture(f => f.slice(1));
      setSelectedBlockId(null);
      return;
    }
    if (!future.length) return;
    setHistory(h => [...h, cloneState(state)]);
    setState(future[0]);
    setFuture(f => f.slice(1));
  }, [textFuture, textBlocksPerPage, future, state]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  useEffect(() => {
    if (!shapeDropdownOpen) return;
    const handler = () => setShapeDropdownOpen(false);
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [shapeDropdownOpen]);

  // ─── Drag overlays ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!draggingOverlay) return;
    const onMove = (e: MouseEvent) => {
      const { pageIdx, startX, startY, mouseStartX, mouseStartY } = draggingOverlay;
      const pageEl = pageRefs.current[pageIdx];
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();
      const dx = ((e.clientX - mouseStartX) / rect.width) * 100;
      const dy = ((e.clientY - mouseStartY) / rect.height) * 100;
      wasDraggingMove.current = true;
      const next = cloneState(state);
      const ov = next.pages[pageIdx].overlays.find(o => o.id === draggingOverlay.overlayId);
      if (ov) { ov.x = Math.max(0, Math.min(100, startX + dx)); ov.y = Math.max(0, Math.min(100, startY + dy)); setState(next); }
    };
    const onUp = () => {
      setDraggingOverlay(null);
      setTimeout(() => { wasDraggingMove.current = false; }, 100);
      setHistory(h => [...h.slice(-MAX_HISTORY + 1), cloneState(state)]);
      setFuture([]);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggingOverlay, state]);

  // ─── Overlay helpers ──────────────────────────────────────────────────────

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
  const getRelativePos = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  };

  const handleTransformCommit = (updates: { id: string; x: number; y: number; width?: number; height?: number }[], srcIdx: number) => {
    let hasOverlayUpdates = false;
    let nextState = state;

    updates.forEach(u => {
      let isTb = false;
      const tb = textBlocksPerPage[srcIdx]?.find(b => b.id === u.id);
      if (tb) {
         updateTextBlockStyle(tb.id, { pdfX: u.x, pdfY: u.y }); // We use these temporarily for mapping Visual X/Y back to PDF layout if needed, though the actual DOM updates them too.
         isTb = true;
      }
      if (isTb) return;

      const ovIdx = state.pages[srcIdx].overlays.findIndex(o => o.id === u.id);
      if (ovIdx >= 0) {
         if (!hasOverlayUpdates) { nextState = cloneState(state); hasOverlayUpdates = true; }
         const nextOv = nextState.pages[srcIdx].overlays[ovIdx];
         nextOv.x = u.x; nextOv.y = u.y;
         if (u.width !== undefined) nextOv.width = u.width;
         if (u.height !== undefined) nextOv.height = u.height;
      }
    });

    if (hasOverlayUpdates) pushState(nextState);
  };

  const getPageItems = useCallback((srcIdx: number): TransformItem[] => {
    const items: TransformItem[] = [];
    textBlocksPerPage[srcIdx]?.forEach(b => {
        items.push({ id: b.id, x: b.x, y: b.y, width: b.width, height: b.height, isText: true });
    });
    state.pages[srcIdx]?.overlays.forEach(o => {
        let h = o.height || 10;
        let w = o.width || Math.max(10, o.text ? o.text.length * 2 : 10);
        items.push({ id: o.id, x: o.x, y: o.y, width: w, height: h, isText: o.type === "text" || o.kind === "comment" });
    });
    return items;
  }, [state, textBlocksPerPage]);

  // ─── Page interactions ────────────────────────────────────────────────────

  const handlePageClick = (e: React.MouseEvent, srcIdx: number) => {
    if (wasDraggingMove.current) return;
    
    // Deselect if clicking outside any text block or item
    const t = e.target as HTMLElement;
    if (!t.closest("[data-textblock]") && !t.closest("[data-overlay]")) {
      if (selectedBlockId) { setSelectedBlockId(null); }
      if (activeTool === "select" && !e.shiftKey) { setSelectedIds(new Set()); }
    }

    if (activeTool === "addText" && !t.closest("[data-textblock]") && !t.closest("[data-overlay]") && !selectedBlockId) {
      // Add new text overlay on blank area ONLY for addText tool
      const { x, y } = getRelativePos(e);
      addOverlay(srcIdx, { id: makeId(), type: "text", text: textContent, fontSize: textSize[0], color: textColor, bold: textBold, italic: textItalic, fontFamily: textFont, x, y } as TextOverlay);
    }
  };

  const handleItemSelectClick = (e: React.MouseEvent, id: string) => {
    if (activeTool !== "select") return;
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey) {
        if (next.has(id)) next.delete(id); else next.add(id);
      } else {
        next.clear(); next.add(id);
      }
      return next;
    });
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
        addOverlay(srcIdx, { id: makeId(), type: "image", dataUrl: reader.result as string, x: imgRect!.x, y: imgRect!.y, width: imgRect!.width, height: imgRect!.height } as ImageOverlay);
        setImgRect(null); toast.success("Image placed!");
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
    else if (annotKind === "line" || annotKind === "arrow") setLineEnd({ x, y });
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
    } else if ((annotKind === "line" || annotKind === "arrow") && lineEnd) {
      const dx = lineEnd.x - annotStart.x, dy = lineEnd.y - annotStart.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        addOverlay(srcIdx, { id: makeId(), type: "annotation", kind: annotKind, x: annotStart.x, y: annotStart.y, width: dx, height: dy, color: annotColor } as AnnotationOverlay);
      }
      setLineEnd(null);
    } else if (annotRect && annotRect.width > 1 && annotRect.height > 1) {
      addOverlay(srcIdx, { id: makeId(), type: "annotation", kind: annotKind, x: annotRect.x, y: annotRect.y, width: annotRect.width, height: annotRect.height, color: annotColor } as AnnotationOverlay);
    }
    setAnnotRect(null);
  };

  // ─── Eraser drag ──────────────────────────────────────────────────────────

  const handleEraserMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "eraser") return;
    e.preventDefault();
    const { x, y } = getRelativePos(e);
    setEraserStart({ x, y }); setEraserRect(null); setEraserDragging(true);
  };
  const handleEraserMouseMove = (e: React.MouseEvent) => {
    if (!eraserDragging || !eraserStart) return;
    const { x, y } = getRelativePos(e);
    setEraserRect({ x: Math.min(eraserStart.x, x), y: Math.min(eraserStart.y, y), width: Math.abs(x - eraserStart.x), height: Math.abs(y - eraserStart.y) });
  };
  const handleEraserMouseUp = (e: React.MouseEvent, srcIdx: number) => {
    if (!eraserDragging || !eraserStart) { setEraserDragging(false); return; }
    setEraserDragging(false);
    const rect = eraserRect;
    setEraserRect(null); setEraserStart(null);
    if (rect && (rect.width > 0.5 || rect.height > 0.5)) {
      const eraseBox = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      const next = cloneState(state);
      const before = next.pages[srcIdx].overlays.length;
      next.pages[srcIdx].overlays = next.pages[srcIdx].overlays.filter(ov => {
        const bbox = overlayBBox(ov);
        return !bbox || !rectsIntersect(bbox, eraseBox);
      });
      const erased = before - next.pages[srcIdx].overlays.length;
      if (erased > 0) { pushState(next); toast.success(`Erased ${erased} object${erased > 1 ? "s" : ""}`); }
    }
  };

  // ─── Page management ──────────────────────────────────────────────────────

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

  // ─── Signature ────────────────────────────────────────────────────────────

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
    addOverlay(activePage, { id: makeId(), type: "signature", dataUrl: canvas.toDataURL("image/png"), x: 10, y: 75, width: 30, height: 10 } as SignatureOverlay);
    setSigPlaced(true); toast.success("Signature placed on page!");
  };

  // ─── Save / Download ──────────────────────────────────────────────────────

  const download = async () => {
    if (!file) return; setSaving(true); setSaveProgress(0);
    try {
      const bytes = await buildEditedPdf(file, state, setSaveProgress, textBlocksPerPage);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${file.name.replace(".pdf", "")}-edited.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch { toast.error("Failed to generate PDF."); }
    finally { setSaving(false); setSaveProgress(0); }
  };

  const saveVersion = async () => {
    if (!file) return; setSaving(true);
    try {
      const bytes = await buildEditedPdf(file, state, setSaveProgress, textBlocksPerPage);
      const name = `Version ${versions.length + 1} | ${new Date().toLocaleTimeString()}`;
      setVersions(v => [...v, { name, data: bytes }]);
      toast.success(`Saved as "${name}"`);
    } catch { toast.error("Failed to save version."); }
    finally { setSaving(false); setSaveProgress(0); }
  };

  const downloadVersion = (v: { name: string; data: Uint8Array }) => {
    const blob = new Blob([v.data.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${v.name}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  // ─── Render overlay ───────────────────────────────────────────────────────

  const renderOverlay = (ov: Overlay, srcIdx: number) => {
    const isEraser = activeTool === "eraser";
    const eraserProps = isEraser ? {
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); removeOverlay(srcIdx, ov.id); },
      style: { cursor: "cell" as const, outline: "2px dashed #ef4444", outlineOffset: 2 },
      title: "Click to erase",
    } : {};

    if (ov.type === "text") {
      const o = ov as TextOverlay;
      const isDragging = draggingOverlay?.overlayId === o.id;
      return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className={cn("absolute group flex items-start", isEraser ? "cursor-cell" : "cursor-move", isDragging && "shadow-2xl z-50")}
          style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)", userSelect: "none", ...(isEraser ? { outline: "2px dashed #ef4444", outlineOffset: 2 } : {}) }}
          onMouseDown={e => { if (!isEraser) { e.stopPropagation(); setDraggingOverlay({ pageIdx: srcIdx, overlayId: o.id, startX: o.x, startY: o.y, mouseStartX: e.clientX, mouseStartY: e.clientY }); } }}
          onClick={(e) => { 
             isEraser ? (e.stopPropagation(), removeOverlay(srcIdx, o.id)) :
             activeTool === "select" ? handleItemSelectClick(e, o.id) : undefined;
          }}>
          <span style={{ fontSize: `${Math.max(8, o.fontSize * 0.7)}px`, color: o.color, fontWeight: o.bold ? "bold" : "normal", fontStyle: o.italic ? "italic" : "normal", fontFamily: o.fontFamily === "times" ? "'Times New Roman',serif" : o.fontFamily === "courier" ? "'Courier New',monospace" : "sans-serif", padding: "2px 6px", border: "1px solid transparent", borderRadius: 4 }} className="group-hover:bg-white/10">
            {o.text}
          </span>
          {!isEraser && <button onClick={e => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="ml-1 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center shadow-lg transition-all">
            <X className="h-3 w-3" />
          </button>}
        </div>
      );
    }
    if (ov.type === "image") {
      const o = ov as ImageOverlay;
      return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group" style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%` }}
          onClick={e => activeTool === "select" && handleItemSelectClick(e, o.id)}>
          <img src={o.dataUrl} className="w-full h-full object-fill" alt="" />
          <button onClick={() => removeOverlay(srcIdx, o.id)} className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>
        </div>
      );
    }
    if (ov.type === "annotation") {
      const o = ov as AnnotationOverlay;
      const delBtn = (
        <button onClick={e => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity z-10"><X className="h-3 w-3" /></button>
      );
      const eraserOverlay = isEraser ? { onClick: (e: React.MouseEvent) => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }, style: { cursor: "cell" as const } } : {};

      if (o.kind === "line" || o.kind === "arrow") {
        const x2 = (o.x + (o.width ?? 0)), y2 = (o.y + (o.height ?? 0));
        // Simple arrowhead: small triangle at end
        const dx = o.width ?? 0, dy = o.height ?? 0;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx/len, uy = dy/len;
        const arrowSize = 1.5;
        const ax = x2 - ux*arrowSize, ay = y2 - uy*arrowSize;
        const perpX = -uy * arrowSize * 0.5, perpY = ux * arrowSize * 0.5;
        return (
          <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group inset-0 pointer-events-none" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", zIndex: 20, ...(isEraser ? { pointerEvents: "auto", cursor: "cell" } : { pointerEvents: activeTool === "select" ? "auto" : "none" }) }}
            onClick={(e) => {
               isEraser ? (e.stopPropagation(), removeOverlay(srcIdx, o.id)) :
               activeTool === "select" ? handleItemSelectClick(e, o.id) : undefined;
            }}>
            <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ pointerEvents: "none" }}>
              <line x1={`${o.x}%`} y1={`${o.y}%`} x2={`${x2}%`} y2={`${y2}%`} stroke={o.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              {o.kind === "arrow" && <polygon points={`${x2}%,${y2}% ${ax + perpX}%,${ay + perpY}% ${ax - perpX}%,${ay - perpY}%`} fill={o.color} />}
            </svg>
          </div>
        );
      }
      if (o.kind === "highlight" || o.kind === "rectangle") return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group" {...eraserOverlay} style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width ?? 10}%`, height: `${o.height ?? 3}%`, background: o.kind === "highlight" ? "rgba(255,255,0,0.4)" : "transparent", border: o.kind === "rectangle" ? `2px solid ${o.color}` : undefined, ...(isEraser ? { cursor: "cell" } : {}) }}
          onClick={e => { eraserOverlay.onClick?.(e); if(activeTool === "select") handleItemSelectClick(e, o.id); }}>
          {!isEraser && delBtn}
        </div>
      );
      if (o.kind === "ellipse") return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group rounded-full" {...eraserOverlay} style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width ?? 10}%`, height: `${o.height ?? 5}%`, border: `2px solid ${o.color}`, ...(isEraser ? { cursor: "cell" } : {}) }}
          onClick={e => { eraserOverlay.onClick?.(e); if(activeTool === "select") handleItemSelectClick(e, o.id); }}>
          {!isEraser && delBtn}
        </div>
      );
      if (o.kind === "comment" && o.text) return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group flex items-start gap-1" {...eraserOverlay} style={{ left: `${o.x}%`, top: `${o.y}%`, ...(isEraser ? { cursor: "cell" } : {}) }}
          onClick={e => { eraserOverlay.onClick?.(e); if(activeTool === "select") handleItemSelectClick(e, o.id); }}>
          <div className="rounded bg-yellow-200/90 border border-yellow-400 px-2 py-1 text-[9px] text-yellow-900 max-w-[120px] shadow-sm">
            <MessageSquare className="h-2.5 w-2.5 inline mr-1 text-yellow-600" />{o.text}
          </div>
          {!isEraser && <button onClick={() => removeOverlay(srcIdx, o.id)} className="opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"><X className="h-3 w-3" /></button>}
        </div>
      );
      if (o.kind === "freehand" && o.points) {
        const minX = Math.min(...o.points.map(p => p[0])), minY = Math.min(...o.points.map(p => p[1]));
        const maxX = Math.max(...o.points.map(p => p[0])), maxY = Math.max(...o.points.map(p => p[1]));
        const w = maxX - minX, h = maxY - minY;
        return (
          <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group" {...eraserOverlay} style={{ left: `${minX}%`, top: `${minY}%`, width: `${w || 1}%`, height: `${h || 1}%`, ...(isEraser ? { cursor: "cell" } : {}) }}
            onClick={e => { eraserOverlay.onClick?.(e); if(activeTool === "select") handleItemSelectClick(e, o.id); }}>
            <svg className="w-full h-full overflow-visible" style={{ pointerEvents: "none" }}>
              <polyline points={o.points.map(p => `${((p[0] - minX) / (w || 1)) * 100},${((p[1] - minY) / (h || 1)) * 100}`).join(" ")} fill="none" stroke={o.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            {!isEraser && delBtn}
          </div>
        );
      }
    }
    if (ov.type === "signature") {
      const o = ov as SignatureOverlay;
      const isDragging = draggingOverlay?.overlayId === o.id;
      return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className={cn("absolute group cursor-move", isDragging && "shadow-2xl z-50 opacity-50")}
          style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.width}%`, height: `${o.height}%` }}
          onMouseDown={e => { if (activeTool !== "select") { e.stopPropagation(); setDraggingOverlay({ pageIdx: srcIdx, overlayId: o.id, startX: o.x, startY: o.y, mouseStartX: e.clientX, mouseStartY: e.clientY }); } }}
          onClick={e => { if (activeTool === "select") handleItemSelectClick(e, o.id); }}>
          <img src={o.dataUrl} className="w-full h-full" style={{ mixBlendMode: "multiply" }} alt="signature" />
          <button onClick={e => { e.stopPropagation(); removeOverlay(srcIdx, o.id); }} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-destructive text-white rounded-full h-5 w-5 flex items-center justify-center shadow-lg transition-all">
            <X className="h-3 w-3" />
          </button>
        </div>
      );
    }
    return null;
  };

  // ─── Render real text blocks (Edit Text mode) ─────────────────────────────

  const HANDLES = [
    { id: "nw", cx: "0%", cy: "0%" }, { id: "n", cx: "50%", cy: "0%" }, { id: "ne", cx: "100%", cy: "0%" },
    { id: "e", cx: "100%", cy: "50%" }, { id: "se", cx: "100%", cy: "100%" },
    { id: "s", cx: "50%", cy: "100%" }, { id: "sw", cx: "0%", cy: "100%" }, { id: "w", cx: "0%", cy: "50%" },
  ];

  const renderTextBlocks = (srcIdx: number) => {
    if (activeTool !== "editText" && activeTool !== "select") return null;
    const blocks = textBlocksPerPage[srcIdx] ?? [];

    return blocks.map(block => {
      const isSel   = selectedBlockId === block.id;
      const isSelTool = activeTool === "select";
      const isMultiSel = selectedIds.has(block.id);

      // Font in px matching the original rendering at current zoom
      const pxFont = (block.renderedFontSize / RENDER_SCALE) * zoom;
      const pxHeight = Math.max(8, pxFont * 1.35);

      // Resolve effective font properties (user overrides > detected from PDF)
      const effectiveFamily = (() => {
        const f = block.customFontFamily || block.cssFamily;
        if (f === "times"  || f === "serif")     return "'Times New Roman', Georgia, serif";
        if (f === "courier"|| f === "monospace")  return "'Courier New', Consolas, monospace";
        return "Arial, Helvetica, sans-serif";
      })();
      const effectiveBold      = block.customBold    !== undefined ? block.customBold    : (block.isBold   ?? false);
      const effectiveItalic    = block.customItalic  !== undefined ? block.customItalic  : (block.isItalic ?? false);
      const effectiveUnderline = block.customUnderline ?? false;
      const effectiveColor     = block.customColor ?? "#000000";
      const effectiveAlign     = block.customAlign ?? "left";

      return (
        <div
          key={block.id}
          id={`item-${block.id}`}
          data-textblock="true"
          style={{
            position: "absolute",
            left: `${block.x}%`,
            top:  `${block.y}%`,
            width: `${block.width}%`,
            minHeight: pxHeight,
            zIndex: isSel ? 60 : 10,
          }}
        >
          <div
            data-textblock="true"
            onClick={e => {
              e.stopPropagation();
              if (isSelTool) handleItemSelectClick(e, block.id);
              else if (!isSel) selectBlock(block);
            }}
            className={cn(
              "relative w-full box-border rounded-sm transition-all duration-100",
              // editText mode styles
              !isSelTool && !isSel && !block.isDirty && "border border-transparent hover:border-blue-400 hover:bg-blue-500/5 cursor-text",
              !isSelTool && block.isDirty && !isSel  && "border border-green-500 bg-green-500/5 cursor-text",
              !isSelTool && isSel                    && "border-2 border-blue-600 bg-white/95 cursor-text",
              // select tool styles
              isSelTool && !isMultiSel && "border border-transparent hover:border-blue-300 hover:border-dashed cursor-default",
              isSelTool && isMultiSel  && "border-2 border-blue-500 bg-blue-500/10 cursor-default",
            )}
            style={{ minHeight: pxHeight }}
          >
            {/* ── Inline editor when this block is selected ── */}
            {isSel && !isSelTool && (
              <input
                autoFocus
                value={block.text}
                onFocus={() => pushTextEdit()}          // snapshot BEFORE first keystroke
                onChange={e => updateTextBlock(block.id, e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") setSelectedBlockId(null); }}
                style={{
                  display:    "block",
                  width:      "100%",
                  fontSize:   `${pxFont}px`,
                  lineHeight: 1.25,
                  padding:    "0 2px",
                  background: "transparent",
                  border:     "none",
                  outline:    "none",
                  color:       effectiveColor,
                  fontFamily:  effectiveFamily,
                  fontWeight:  effectiveBold      ? "bold"      : "normal",
                  fontStyle:   effectiveItalic    ? "italic"    : "normal",
                  textDecoration: effectiveUnderline ? "underline" : "none",
                  textAlign:   effectiveAlign  as any,
                  minWidth:    40,
                  letterSpacing: "inherit",
                }}
              />
            )}

            {/* ── 8 resize handles ── */}
            {isSel && !isSelTool && HANDLES.map(h => (
              <div
                key={h.id}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  position: "absolute", left: h.cx, top: h.cy,
                  width: 8, height: 8,
                  background: "#2563eb", border: "1.5px solid white",
                  borderRadius: "50%", transform: "translate(-50%,-50%)",
                  cursor: "pointer", zIndex: 80,
                  boxShadow: "0 0 0 2px rgba(37,99,235,0.25)",
                }}
              />
            ))}

            {/* ── Mini context toolbar below selected block ── */}
            {isSel && !isSelTool && (
              <div
                data-textblock="true"
                style={{
                  position: "absolute", bottom: -30, right: 0,
                  display: "flex", alignItems: "center", gap: 2,
                  background: "white", border: "1px solid #e5e7eb",
                  borderRadius: 6, padding: "2px 6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 100,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "sans-serif", padding: "0 2px" }}>
                  {block.cssFamily ?? "sans"} · {Math.round(block.pdfFontSize)}pt
                  {(block.isBold || effectiveBold) ? " · Bold" : ""}
                  {(block.isItalic || effectiveItalic) ? " · Italic" : ""}
                </span>
                <div style={{ width: 1, height: 12, background: "#e5e7eb", margin: "0 2px" }} />
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(block.text).catch(() => {}); }}
                  style={{ padding: "1px 5px", fontSize: 11, color: "#374151", cursor: "pointer", border: "none", background: "none", borderRadius: 3 }}
                  className="hover:bg-gray-100"
                >Copy</button>
                <div style={{ width: 1, height: 12, background: "#e5e7eb" }} />
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); removeTextBlock(block.id); }}
                  style={{ padding: "1px 5px", fontSize: 11, color: "#ef4444", cursor: "pointer", border: "none", background: "none", borderRadius: 3 }}
                  className="hover:bg-red-50"
                >Delete</button>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  // ────────────────────────────────────────────────────────────────────────────

  const dirtyCount = textBlocksPerPage.flat().filter(b => b.isDirty).length;
  const selectedBlock = selectedBlockId
    ? textBlocksPerPage.flat().find(b => b.id === selectedBlockId) ?? null
    : null;

  // ─── Tool bar definitions ─────────────────────────────────────────────────
  const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
    { id: "select",   icon: MousePointer2, label: "Select"     },
    { id: "addText",  icon: Type,          label: "Add Text"   },
    { id: "editText", icon: Edit3,         label: "Edit Text"  },
    { id: "sign",     icon: PenLine,       label: "Sign"       },
    { id: "pencil",   icon: Pencil,        label: "Pencil"     },
    { id: "highlight",icon: Highlighter,   label: "Highlight"  },
    { id: "eraser",   icon: Eraser,        label: "Eraser"     },
    { id: "annotate", icon: MessageSquare, label: "Annotate"   },
    { id: "image",    icon: ImageIcon,     label: "Image"      },
    // "shapes" has its own dropdown after TOOLS list
  ];

  const SHAPES: { id: Shape; icon: React.ElementType; label: string }[] = [
    { id: "ellipse",  icon: Circle,        label: "Ellipse"    },
    { id: "line",     icon: Minus,         label: "Line"       },
    { id: "arrow",    icon: ArrowUpRight,  label: "Arrow"      },
    { id: "rectangle",icon: Square,        label: "Rectangle"  },
    { id: "polygon",  icon: Triangle,      label: "Polygon"    },
    { id: "polyline", icon: Spline,        label: "Polyline"   },
  ];

  const currentShape = SHAPES.find(s => s.id === activeShape) ?? SHAPES[0];
  const ANNOT_TOOLS: Tool[] = ["pencil","highlight","annotate","shapes"];

  return (
    <ToolLayout
      title="Edit PDF Online"
      description="Edit PDF online | add text, replace images, annotate, sign and manage pages."
      category="edit"
      icon={<Edit3 className="h-7 w-7" />}
      metaTitle="Edit PDF Online | Change Text & Images | MagicDocx"
      metaDescription="Edit any PDF online. Add text, replace images, annotate, sign, and manage pages. Free in-browser PDF editor."
      toolId="edit"
      hideHeader={!!file}
    >
      <div className="space-y-4">

        {!file && !loading && (
          <ToolUploadScreen
            title="Edit PDF Online"
            description="Drop your PDF here to start editing"
            buttonLabel="Select PDF file"
            accept=".pdf"
            multiple={false}
            onFilesSelected={handleFiles}
          />
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading PDF and extracting text…</p>
          </div>
        )}

        {file && previews.length > 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 flex flex-col bg-white dark:bg-gray-950">
            <div ref={editorRef} className="flex-1 flex flex-col overflow-hidden">

              {/* ── TOP TOOLBAR ────────────────────────────────────────────── */}
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 h-[68px] shrink-0 gap-0.5">

                {/* Undo / Redo */}
                <button onClick={undo} disabled={!history.length && !textHistory.length}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors min-w-[52px]">
                  <Undo2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Undo</span>
                </button>
                <button onClick={redo} disabled={!future.length && !textFuture.length}
                  className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors min-w-[52px]">
                  <Redo2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Redo</span>
                </button>

                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-1.5 shrink-0" />

                {/* Tool buttons */}
                {TOOLS.map((tool) => {
                  const isActive = activeTool === tool.id;
                  const Icon = tool.icon;
                  return (
                    <button key={tool.id} onClick={() => setActiveTool(tool.id)}
                      className={cn(
                        "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[52px]",
                        isActive ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}>
                      <Icon className={cn("h-5 w-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300")} />
                      <span className={cn("text-[10px] font-medium whitespace-nowrap", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}>
                        {tool.label}
                      </span>
                    </button>
                  );
                })}

                {/* Shape picker with dropdown */}
                <div className="relative flex items-end">
                  <button
                    onClick={() => { setActiveTool("shapes"); setShapeDropdownOpen(false); }}
                    className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-l-lg transition-all min-w-[52px]",
                      activeTool === "shapes" ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-100 dark:hover:bg-gray-800")}>
                    <currentShape.icon className={cn("h-5 w-5", activeTool === "shapes" ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300")} />
                    <span className={cn("text-[10px] font-medium whitespace-nowrap", activeTool === "shapes" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}>
                      {currentShape.label}
                    </span>
                  </button>
                  <button
                    onClick={() => setShapeDropdownOpen(o => !o)}
                    className={cn("flex items-center justify-center px-1 self-stretch rounded-r-lg transition-all border-l border-gray-100 dark:border-gray-700",
                      activeTool === "shapes" ? "bg-blue-50 dark:bg-blue-950 text-blue-500" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400")}>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {shapeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl z-[200] py-1 min-w-[150px]">
                      {SHAPES.map(shape => (
                        <button key={shape.id}
                          onClick={() => { setActiveShape(shape.id); setActiveTool("shapes"); setShapeDropdownOpen(false); }}
                          className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                            activeShape === shape.id ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300")}>
                          <shape.icon className="h-4 w-4 shrink-0" />
                          {shape.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  {dirtyCount > 0 && (
                    <span className="text-[10px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5 font-medium">
                      {dirtyCount} edit{dirtyCount > 1 ? "s" : ""}
                    </span>
                  )}
                  <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    {isFullscreen ? <Minimize className="h-4 w-4 text-gray-600 dark:text-gray-400" /> : <Maximize className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                  </button>
                </div>
              </div>

              {saving && <Progress value={saveProgress} className="h-0.5 rounded-none" />}

              {/* ── EDIT TEXT secondary toolbar ──────────────────────────── */}
              {activeTool === "editText" && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5 px-3 h-10 shrink-0">
                  <Select value={selectedBlock ? (selectedBlock.customFontFamily || "helvetica") : textFont} onValueChange={v => { 
                    if (selectedBlock) updateTextBlockStyle(selectedBlock.id, { customFontFamily: v });
                    else setTextFont(v);
                  }}>
                    <SelectTrigger className="h-7 text-xs w-[100px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helvetica">Sans Serif</SelectItem>
                      <SelectItem value="times">Serif</SelectItem>
                      <SelectItem value="courier">Mono</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(selectedBlock ? selFontSize : textSize[0])} onValueChange={v => {
                    const newSize = Number(v);
                    if (selectedBlock) {
                      setSelFontSize(newSize);
                      updateTextBlockStyle(selectedBlock.id, { pdfFontSize: newSize, renderedFontSize: newSize * 2.0 });
                    } else setTextSize([newSize]);
                  }}>
                    <SelectTrigger className="h-7 text-xs w-[52px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                  <button onClick={() => { 
                    if (selectedBlock) { setSelBold(!selBold); updateTextBlockStyle(selectedBlock.id, { customBold: !selBold }); } 
                    else setTextBold(!textBold); 
                  }}
                    className={cn("h-7 w-7 rounded border text-sm font-bold flex items-center justify-center transition-all",
                      (selectedBlock ? selBold : textBold) ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300")}>B</button>
                  <button onClick={() => {
                    if (selectedBlock) { setSelItalic(!selItalic); updateTextBlockStyle(selectedBlock.id, { customItalic: !selItalic }); }
                    else setTextItalic(!textItalic);
                  }}
                    className={cn("h-7 w-7 rounded border italic text-sm flex items-center justify-center transition-all",
                      (selectedBlock ? selItalic : textItalic) ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300")}>I</button>
                  <button onClick={() => {
                    if (selectedBlock) { setSelUnderline(!selUnderline); updateTextBlockStyle(selectedBlock.id, { customUnderline: !selUnderline }); }
                    else setTextUnderline(!textUnderline);
                  }}
                    className={cn("h-7 w-7 rounded border underline text-sm flex items-center justify-center transition-all",
                      (selectedBlock ? selUnderline : textUnderline) ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300")}>U</button>
                  <div className="h-7 w-7 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center cursor-pointer relative overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="color" value={selectedBlock ? selColor : textColor}
                      onChange={e => {
                        if (selectedBlock) { setSelColor(e.target.value); updateTextBlockStyle(selectedBlock.id, { customColor: e.target.value }); }
                        else setTextColor(e.target.value);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="text-sm font-bold underline" style={{ color: selectedBlock ? selColor : textColor }}>A</span>
                  </div>

                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                  {(["left","center","right"] as const).map(a => {
                    const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                    const isAct = (selectedBlock ? selAlign : textAlign) === a;
                    return (
                      <button key={a} onClick={() => {
                        if (selectedBlock) { setSelAlign(a); updateTextBlockStyle(selectedBlock.id, { customAlign: a }); }
                        else setTextAlign(a);
                      }}
                        className={cn("h-7 w-7 rounded border flex items-center justify-center transition-all",
                          isAct ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300")}>
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                  {selectedBlock
                    ? <span className="ml-2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">Editing block — press Escape to deselect</span>
                    : <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
                        {textBlocksPerPage.flat().length > 0
                          ? `${textBlocksPerPage.flat().length} text block${textBlocksPerPage.flat().length !== 1 ? "s" : ""} found — click any blue dashed box to edit`
                          : "No selectable text found in this PDF (may be image-based)"}
                      </span>
                  }
                </div>
              )}

              {/* ── ADD TEXT secondary toolbar ───────────────────────────── */}
              {activeTool === "addText" && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5 px-3 h-10 shrink-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Text:</span>
                  <input value={textContent} onChange={e => setTextContent(e.target.value)}
                    className="h-7 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 w-32 focus:outline-none focus:border-blue-400" />
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
                  <Select value={textFont} onValueChange={setTextFont}>
                    <SelectTrigger className="h-7 text-xs w-[90px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="helvetica">Sans Serif</SelectItem>
                      <SelectItem value="times">Serif</SelectItem>
                      <SelectItem value="courier">Mono</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(textSize[0])} onValueChange={v => setTextSize([Number(v)])}>
                    <SelectTrigger className="h-7 text-xs w-[50px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[8,10,12,14,16,18,20,24,28,32,36,48,72].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="h-7 w-7 rounded border border-gray-200 dark:border-gray-600 relative overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <span className="flex items-center justify-center h-full text-sm font-bold" style={{ color: textColor }}>A</span>
                  </div>
                  <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">Click anywhere on the page to place text</span>
                </div>
              )}

              {/* ── ANNOTATION / SHAPES secondary toolbar ────────────────── */}
              {(ANNOT_TOOLS.includes(activeTool) || activeTool === "eraser") && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 px-3 h-10 shrink-0">
                  {activeTool !== "eraser" && <>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Color:</span>
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer relative overflow-hidden shadow-sm">
                      <input type="color" value={annotColor} onChange={e => setAnnotColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="w-full h-full rounded-full" style={{ background: annotColor }} />
                    </div>
                    {activeTool === "annotate" && (
                      <>
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Comment:</span>
                        <input value={commentText} onChange={e => setCommentText(e.target.value)}
                          className="h-7 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 w-36 focus:outline-none focus:border-blue-400" />
                      </>
                    )}
                  </>}
                  <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
                    {activeTool === "pencil" ? "Draw freehand on the page" :
                     activeTool === "highlight" ? "Drag to highlight an area" :
                     activeTool === "eraser" ? "Drag a rectangle to erase all objects inside it, or click an object to erase it" :
                     activeTool === "shapes" ? `Drag to draw a ${currentShape.label.toLowerCase()}` :
                     "Click to place a comment"}
                  </span>
                </div>
              )}

              {/* ── IMAGE secondary toolbar ──────────────────────────────── */}
              {activeTool === "image" && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 px-3 h-10 shrink-0">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">Drag a rectangle on the page to define the image placement area, then pick your image file.</span>
                </div>
              )}

              {/* ── SIGN secondary toolbar ───────────────────────────────── */}
              {activeTool === "sign" && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 px-3 h-10 shrink-0">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Draw your signature below, then click Place:</span>
                </div>
              )}

              {/* ── MAIN AREA ────────────────────────────────────────────── */}
              <div className="flex flex-1 overflow-hidden">

                {/* Left panel */}
                <div className="w-[200px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
                  {/* Manage Pages */}
                  <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                      <FileStack className="h-4 w-4 text-gray-500 dark:text-gray-400" /> Manage Pages
                    </button>
                  </div>

                  {/* Page thumbnails */}
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                    {state.pageOrder.map((srcIdx, visIdx) => (
                      <div key={`${srcIdx}-${visIdx}`} className="flex flex-col items-center gap-1.5">
                        <div
                          onClick={() => scrollToPage(visIdx)}
                          className={cn(
                            "w-full cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                            activePage === visIdx ? "border-blue-500 shadow-md" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                          )}
                        >
                          <img src={previews[srcIdx]} alt={`Page ${visIdx+1}`} className="w-full block"
                            style={{ transform: `rotate(${state.pages[srcIdx].rotation}deg)`, transition: "transform 0.3s" }} />
                        </div>
                        <div className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                          activePage === visIdx ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400")}>
                          {visIdx + 1}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Zoom slider */}
                  <div className="border-t border-gray-100 dark:border-gray-800 p-2 flex items-center gap-1.5">
                    <button onClick={zoomOut} disabled={zoom <= ZOOM_STEPS[0]} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors">
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={ZOOM_STEPS[0]} max={ZOOM_STEPS[ZOOM_STEPS.length-1]} step={0.01} className="flex-1" />
                    <button onClick={zoomIn} disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length-1]} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors">
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Center canvas */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#e8e8e8] dark:bg-[#1a1a1a] px-8 py-6">
                  <div className="flex flex-col items-center gap-8">
                    {state.pageOrder.map((srcIdx, visIdx) => {
                      const pageState = state.pages[srcIdx];
                      const overlays = pageState?.overlays ?? [];
                      return (
                        <div
                          key={`${srcIdx}-${visIdx}`}
                          ref={el => { pageRefs.current[visIdx] = el; }}
                          data-pageindex={visIdx}
                          className="relative shadow-2xl bg-white"
                          style={{ width: `${zoom * 100}%`, maxWidth: 900 }}
                          onClick={e => handlePageClick(e, srcIdx)}
                          onMouseDown={e => {
                            if (activeTool === "image") handleImgMouseDown(e);
                            if (ANNOT_TOOLS.includes(activeTool)) handleAnnotMouseDown(e);
                            if (activeTool === "eraser") handleEraserMouseDown(e);
                          }}
                          onMouseMove={e => {
                            if (activeTool === "image") handleImgMouseMove(e);
                            if (ANNOT_TOOLS.includes(activeTool)) handleAnnotMouseMove(e);
                            if (activeTool === "eraser") handleEraserMouseMove(e);
                          }}
                          onMouseUp={e => {
                            if (activeTool === "image") handleImgMouseUp(e, srcIdx);
                            if (ANNOT_TOOLS.includes(activeTool)) handleAnnotMouseUp(e, srcIdx);
                            if (activeTool === "eraser") handleEraserMouseUp(e, srcIdx);
                          }}
                        >
                          <img
                            src={previews[srcIdx]}
                            alt={`Page ${visIdx+1}`}
                            className={cn("w-full block select-none",
                              activeTool === "editText" || activeTool === "addText" ? "cursor-text" :
                              activeTool === "image" ? "cursor-cell" :
                              activeTool === "eraser" ? "cursor-crosshair" :
                              ANNOT_TOOLS.includes(activeTool) ? "cursor-crosshair" : "cursor-default"
                            )}
                            style={{ transform: `rotate(${pageState?.rotation ?? 0}deg)`, transition: "transform 0.3s" }}
                            draggable={false}
                          />

                          {activeTool === "select" && (
                            <TransformBox
                                selectedIds={selectedIds}
                                allItems={getPageItems(srcIdx)}
                                containerRef={{ current: pageRefs.current[srcIdx] } as any}
                                zoom={zoom}
                                onCommit={(updates) => handleTransformCommit(updates, srcIdx)}
                            />
                          )}

                          {renderTextBlocks(srcIdx)}
                          {overlays.map(ov => renderOverlay(ov, srcIdx))}

                          {imgDragging && imgRect && activePage === visIdx && (
                            <div className="absolute border-2 border-green-500 border-dashed bg-green-500/10 pointer-events-none"
                              style={{ left:`${imgRect.x}%`, top:`${imgRect.y}%`, width:`${imgRect.width}%`, height:`${imgRect.height}%` }} />
                          )}
                          {annotDragging && annotStart && lineEnd && activePage === visIdx && (annotKind === "line" || annotKind === "arrow") && (
                            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                              <line x1={`${annotStart.x}%`} y1={`${annotStart.y}%`} x2={`${lineEnd.x}%`} y2={`${lineEnd.y}%`}
                                stroke={annotColor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="4 2" />
                            </svg>
                          )}
                          {annotDragging && annotRect && activePage === visIdx && annotKind !== "freehand" && annotKind !== "comment" && annotKind !== "line" && annotKind !== "arrow" && (
                            <div className="absolute border-2 border-dashed pointer-events-none"
                              style={{ left:`${annotRect.x}%`, top:`${annotRect.y}%`, width:`${annotRect.width}%`, height:`${annotRect.height}%`,
                                borderColor: annotColor, background: annotKind === "highlight" ? "rgba(255,255,0,0.25)" : "transparent",
                                borderRadius: annotKind === "ellipse" ? "50%" : undefined }} />
                          )}
                          {annotDragging && annotKind === "freehand" && freehandPoints.length > 1 && activePage === visIdx && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                              <polyline points={freehandPoints.map(p => `${p[0]}%,${p[1]}%`).join(" ")} fill="none" stroke={annotColor} strokeWidth="2px" vectorEffect="non-scaling-stroke" />
                            </svg>
                          )}
                          {eraserDragging && eraserRect && activePage === visIdx && (
                            <div className="absolute border-2 border-red-500 border-dashed bg-red-500/10 pointer-events-none"
                              style={{ left:`${eraserRect.x}%`, top:`${eraserRect.y}%`, width:`${eraserRect.width}%`, height:`${eraserRect.height}%` }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-8 mb-2 text-xs text-gray-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Your file never leaves your device.
                  </div>
                </div>

                {/* Right panel — Signature pad */}
                {activeTool === "sign" && (
                  <div className="w-[220px] bg-white border-l border-gray-200 flex flex-col p-4 gap-3 shrink-0">
                    <h3 className="font-semibold text-sm text-gray-800">Signature Pad</h3>
                    <canvas ref={sigCanvasRef} width={190} height={110} className="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-white cursor-crosshair"
                      onMouseDown={startSig} onMouseMove={drawSig} onMouseUp={() => setSigDrawing(false)} onMouseLeave={() => setSigDrawing(false)} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={clearSig} className="flex-1 text-xs h-8">Clear</Button>
                      <Button size="sm" onClick={placeSig} className="flex-1 text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1 border-0">
                        <CheckCircle2 className="h-3 w-3" /> Place
                      </Button>
                    </div>
                    {sigPlaced && <p className="text-[11px] text-indigo-600 font-medium text-center">✓ Placed on page!</p>}
                    {versions.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Saved Versions</p>
                        {versions.map((v, i) => (
                          <button key={i} onClick={() => downloadVersion(v)} className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[10px] hover:bg-gray-100 transition-all">
                            <span className="font-medium truncate">{v.name}</span>
                            <Download className="h-3 w-3 text-gray-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── BOTTOM BAR ───────────────────────────────────────────── */}
              <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-900 text-white px-4 h-9 shrink-0">
                <button onClick={() => scrollToPage(Math.max(0,activePage-1))} disabled={activePage===0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => scrollToPage(Math.min(state.pageOrder.length-1,activePage+1))} disabled={activePage>=state.pageOrder.length-1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"><ChevronDown className="h-4 w-4" /></button>
                <span className="text-white/60 text-xs">{activePage+1} / {state.pageOrder.length}</span>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button onClick={zoomOut} disabled={zoom<=ZOOM_STEPS[0]} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"><ZoomOut className="h-3.5 w-3.5" /></button>
                <button onClick={zoomFitWidth} className="text-xs text-white/70 hover:text-white px-1 min-w-[38px] text-center">{Math.round(zoom*100)}%</button>
                <button onClick={zoomIn} disabled={zoom>=ZOOM_STEPS[ZOOM_STEPS.length-1]} className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"><ZoomIn className="h-3.5 w-3.5" /></button>
                <button onClick={zoomFitWidth} className="p-1 rounded hover:bg-white/10 transition-colors"><MoveHorizontal className="h-3.5 w-3.5" /></button>
                <button
                  onClick={() => { setFile(null); setPreviews([]); setState({pages:[],pageOrder:[]}); setHistory([]); setFuture([]); setTextHistory([]); setTextFuture([]); setTextBlocksPerPage([]); setSelectedBlockId(null); }}
                  className="text-[10px] text-white/40 hover:text-white/70 transition-colors ml-1">
                  ← New PDF
                </button>
                <button onClick={download} disabled={saving}
                  className="ml-auto flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 h-6 text-xs font-semibold shadow-lg transition-colors disabled:opacity-70">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Save changes →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!file && (
        <ToolSeoSection
          toolName="Edit PDF Online"
          category="edit"
          intro="MagicDocx PDF Editor lets you edit any PDF directly in your browser. Click existing text to edit it inline, add new text, insert images, annotate, sign, and manage pages. All changes are embedded into a downloaded PDF."
          steps={[
            "Upload your PDF — it renders with all text blocks highlighted.",
            "Switch to Edit Text mode and click any blue-bordered text to edit it inline.",
            "Use Insert, Shapes, Annotate, or Forms tabs for other edits.",
            "Click Save changes to download your fully edited PDF."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Rotate PDF", path: "/rotate-pdf", icon: Edit3 },
            { name: "Add Page Numbers", path: "/page-numbers", icon: Edit3 },
            { name: "Organize PDF", path: "/organize-pdf", icon: Edit3 },
          ]}
          schemaName="Edit PDF Online"
          schemaDescription="Free online PDF editor. Click to edit existing text, add new text, images, annotations, and signatures to any PDF document directly in your browser."
        />
      )}
    </ToolLayout>
  );
};

export default EditPdf;
