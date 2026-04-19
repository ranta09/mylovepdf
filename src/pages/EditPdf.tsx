import { useState, useRef, useEffect, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import ToolLayout from "@/components/ToolLayout";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Edit3, MessageSquare, X, ShieldCheck, Loader2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TransformBox, TransformItem, TransformItemData } from "@/components/TransformBox";
import {
  renderPdfPages, buildEditedPdf, makeId,
  type Overlay, type TextOverlay, type ImageOverlay,
  type AnnotationOverlay, type SignatureOverlay,
  type PageState, type EditorState
} from "@/lib/pdfEditorUtils";
import { extractTextBlocks, type TextBlock } from "@/lib/pdfTextExtractor";
import { useEditorHistory } from "@/hooks/useEditorHistory";
import {
  EditorToolbar, SecondaryToolbar, PageThumbnails,
  PropertiesPanel,
  ANNOT_TOOLS,
  type Tool, type Shape,
} from "@/components/edit-pdf";

// ─── Constants ────────────────────────────────────────────────────────────────

type AnnotationKind = "highlight" | "rectangle" | "ellipse" | "comment" | "freehand" | "line" | "arrow";

const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0];
const RENDER_SCALE = 2.0;

function newPageState(): PageState { return { overlays: [], rotation: 0 }; }
function cloneState(s: EditorState): EditorState { return JSON.parse(JSON.stringify(s)); }

/** Convert an array of [x,y] points to a smooth SVG path using Catmull-Rom → cubic bezier. */
function catmullRomToSvgPath(points: number[][], closed = false): string {
  if (points.length < 2) return "";
  if (points.length === 2) return `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`;

  const tension = 0.5;
  let d = `M${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / (6 / tension);
    const cp1y = p1[1] + (p2[1] - p0[1]) / (6 / tension);
    const cp2x = p2[0] - (p3[0] - p1[0]) / (6 / tension);
    const cp2y = p2[1] - (p3[1] - p1[1]) / (6 / tension);

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }

  return d;
}

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
  const [versions, setVersions] = useState<{ name: string; data: Uint8Array }[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  // ── History hook ──────────────────────────────────────────────────────────
  const {
    state, setState, pushState, undo, redo, canUndo, canRedo,
    textBlocksPerPage, setTextBlocksPerPage, pushTextEdit, resetHistory,
  } = useEditorHistory();

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const annotKind: AnnotationKind = (() => {
    if (activeTool === "highlight") return "highlight";
    if (activeTool === "pencil") return "freehand";
    if (activeTool === "shapes") {
      if (activeShape === "ellipse") return "ellipse";
      if (activeShape === "rectangle") return "rectangle";
      if (activeShape === "line") return "line";
      if (activeShape === "arrow") return "arrow";
      return "freehand";
    }
    return "comment";
  })();

  const activeTab = (() => {
    if (activeTool === "addText" || activeTool === "editText") return "text";
    if (activeTool === "image") return "image";
    if (activeTool === "sign") return "sign";
    if (ANNOT_TOOLS.includes(activeTool)) return "annotate";
    return "text";
  })();

  // ── Layout state ──────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("magicdocx_left_sidebar_width");
    return saved ? parseInt(saved, 10) : 200;
  });
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("magicdocx_right_sidebar_width");
    return saved ? parseInt(saved, 10) : 220;
  });

  const resizingLeft = useRef(false);
  const resizingRight = useRef(false);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizingLeft.current) {
        setLeftSidebarWidth((prev) => {
          const newWidth = Math.min(Math.max(150, e.clientX), 450);
          localStorage.setItem("magicdocx_left_sidebar_width", String(newWidth));
          return newWidth;
        });
      }
      if (resizingRight.current) {
        setRightSidebarWidth((prev) => {
          const newWidth = Math.min(Math.max(150, window.innerWidth - e.clientX), 450);
          localStorage.setItem("magicdocx_right_sidebar_width", String(newWidth));
          return newWidth;
        });
      }
    };
    const onMouseUp = () => {
      resizingLeft.current = false;
      resizingRight.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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

  // ── Text-block editing state ──────────────────────────────────────────────
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selFontSize, setSelFontSize] = useState(12);
  const [selColor, setSelColor] = useState("#000000");
  const [selBold, setSelBold] = useState(false);
  const [selItalic, setSelItalic] = useState(false);
  const [selUnderline, setSelUnderline] = useState(false);
  const [selAlign, setSelAlign] = useState<"left" | "center" | "right">("left");

  // ── Drag state ────────────────────────────────────────────────────────────
  const [draggingOverlay, setDraggingOverlay] = useState<{ pageIdx: number; overlayId: string; startX: number; startY: number; mouseStartX: number; mouseStartY: number } | null>(null);
  const wasDraggingMove = useRef(false);

  // ── Annotation state ──────────────────────────────────────────────────────
  const [annotColor, setAnnotColor] = useState("#2563eb");
  const [commentText, setCommentText] = useState("Comment");
  const [imgDragging, setImgDragging] = useState(false);
  const [imgStart, setImgStart] = useState<{ x: number; y: number } | null>(null);
  const [imgRect, setImgRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [annotDragging, setAnnotDragging] = useState(false);
  const [annotStart, setAnnotStart] = useState<{ x: number; y: number } | null>(null);
  const [annotRect, setAnnotRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<number[][]>([]);
  const [eraserDragging, setEraserDragging] = useState(false);
  const [eraserStart, setEraserStart] = useState<{ x: number; y: number } | null>(null);
  const [eraserRect, setEraserRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

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
      resetHistory();
      setActivePage(0);

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
        b.id === blockId ? { ...b, text: newText, isDirty: newText !== b.originalText } : b
      )
    ));
  }, [setTextBlocksPerPage]);

  const updateTextBlockStyle = useCallback((blockId: string, updates: Partial<TextBlock>) => {
    setTextBlocksPerPage(prev => prev.map(pageBlocks =>
      pageBlocks.map(b => b.id === blockId ? { ...b, ...updates, isDirty: true } : b)
    ));
  }, [setTextBlocksPerPage]);

  const removeTextBlock = useCallback((blockId: string) => {
    setTextBlocksPerPage(prev => prev.map(pageBlocks => pageBlocks.filter(b => b.id !== blockId)));
    setSelectedBlockId(null);
  }, [setTextBlocksPerPage]);

  const selectBlock = useCallback((block: TextBlock) => {
    setSelectedBlockId(block.id);
    setSelFontSize(Math.max(8, Math.round(block.pdfFontSize)));
    setSelColor(block.customColor ?? "#000000");
    setSelBold(block.customBold !== undefined ? block.customBold : (block.isBold ?? false));
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
    const el = pageRefs.current[idx];
    if (el && scrollRef.current) {
      const top = el.offsetTop - 12; // Small padding offset
      scrollRef.current.scrollTo({ top, behavior: "smooth" });
    } else if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActivePage(idx);
  };

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
      pushState(cloneState(state));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggingOverlay, state, setState, pushState]);

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
      const tb = textBlocksPerPage[srcIdx]?.find(b => b.id === u.id);
      if (tb) { updateTextBlockStyle(tb.id, { pdfX: u.x, pdfY: u.y }); return; }
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

  const getPageItems = useCallback((srcIdx: number): TransformItemData[] => {
    const items: TransformItemData[] = [];
    textBlocksPerPage[srcIdx]?.forEach(b => {
      items.push({ id: b.id, x: b.x, y: b.y, width: b.width, height: b.height, isText: true });
    });
    state.pages[srcIdx]?.overlays.forEach(o => {
      const bbox = overlayBBox(o);
      const isTextLike = o.type === "text" || (o.type === "annotation" && (o as AnnotationOverlay).kind === "comment");
      items.push({ id: o.id, x: o.x, y: o.y, width: bbox?.w ?? 10, height: bbox?.h ?? 10, isText: isTextLike });
    });
    return items;
  }, [state, textBlocksPerPage]);

  // ─── Canvas interactions ──────────────────────────────────────────────────

  const handlePageClick = (e: React.MouseEvent, srcIdx: number) => {
    if (wasDraggingMove.current) return;
    const t = e.target as HTMLElement;
    if (!t.closest("[data-textblock]") && !t.closest("[data-overlay]")) {
      if (selectedBlockId) setSelectedBlockId(null);
      if (activeTool === "select" && !e.shiftKey) setSelectedIds(new Set());
    }
    if (activeTool === "addText" && !t.closest("[data-textblock]") && !t.closest("[data-overlay]") && !selectedBlockId) {
      const { x, y } = getRelativePos(e);
      addOverlay(srcIdx, { id: makeId(), type: "text", text: textContent, fontSize: textSize[0], color: textColor, bold: textBold, italic: textItalic, fontFamily: textFont, x, y } as TextOverlay);
    }
  };

  const handleItemSelectClick = (e: React.MouseEvent, id: string) => {
    if (activeTool !== "select") return;
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (e.shiftKey) { if (next.has(id)) next.delete(id); else next.add(id); }
      else { next.clear(); next.add(id); }
      return next;
    });
  };

  const handleImgMouseDown = (e: React.MouseEvent) => { if (activeTab !== "image") return; e.preventDefault(); const { x, y } = getRelativePos(e); setImgStart({ x, y }); setImgRect(null); setImgDragging(true); };
  const handleImgMouseMove = (e: React.MouseEvent) => { if (!imgDragging || !imgStart) return; const { x, y } = getRelativePos(e); setImgRect({ x: Math.min(imgStart.x, x), y: Math.min(imgStart.y, y), width: Math.abs(x - imgStart.x), height: Math.abs(y - imgStart.y) }); };
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

  const handleAnnotMouseDown = (e: React.MouseEvent) => { if (activeTab !== "annotate") return; e.preventDefault(); const { x, y } = getRelativePos(e); setAnnotStart({ x, y }); setAnnotRect(null); setAnnotDragging(true); if (annotKind === "freehand") setFreehandPoints([[x, y]]); };
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

  const handleEraserMouseDown = (e: React.MouseEvent) => { if (activeTool !== "eraser") return; e.preventDefault(); const { x, y } = getRelativePos(e); setEraserStart({ x, y }); setEraserRect(null); setEraserDragging(true); };
  const handleEraserMouseMove = (e: React.MouseEvent) => { if (!eraserDragging || !eraserStart) return; const { x, y } = getRelativePos(e); setEraserRect({ x: Math.min(eraserStart.x, x), y: Math.min(eraserStart.y, y), width: Math.abs(x - eraserStart.x), height: Math.abs(y - eraserStart.y) }); };
  const handleEraserMouseUp = (e: React.MouseEvent, srcIdx: number) => {
    if (!eraserDragging || !eraserStart) { setEraserDragging(false); return; }
    setEraserDragging(false);
    const rect = eraserRect; setEraserRect(null); setEraserStart(null);
    if (rect && (rect.width > 0.5 || rect.height > 0.5)) {
      const eraseBox = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      const next = cloneState(state);
      const before = next.pages[srcIdx].overlays.length;
      next.pages[srcIdx].overlays = next.pages[srcIdx].overlays.filter(ov => {
        const bbox = overlayBBox(ov); return !bbox || !rectsIntersect(bbox, eraseBox);
      });
      const erased = before - next.pages[srcIdx].overlays.length;
      if (erased > 0) { pushState(next); }
    }
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

  const downloadVersion = (v: { name: string; data: Uint8Array }) => {
    const blob = new Blob([v.data.buffer as ArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${v.name}.pdf`; a.click(); URL.revokeObjectURL(url);
  };

  const handleNewPdf = () => {
    setFile(null); setPreviews([]); setState({ pages: [], pageOrder: [] });
    resetHistory(); setTextBlocksPerPage([]); setSelectedBlockId(null);
  };

  // ─── Render overlay ───────────────────────────────────────────────────────

  const renderOverlay = (ov: Overlay, srcIdx: number) => {
    const isEraser = activeTool === "eraser";

    if (ov.type === "text") {
      const o = ov as TextOverlay;
      const isDragging = draggingOverlay?.overlayId === o.id;
      return (
        <div key={o.id} id={`item-${o.id}`} data-overlay="true" className={cn("absolute group flex items-start", isEraser ? "cursor-cell" : "cursor-move", isDragging && "shadow-2xl z-50")}
          style={{ left: `${o.x}%`, top: `${o.y}%`, transform: "translate(-50%,-50%)", userSelect: "none", ...(isEraser ? { outline: "2px dashed #ef4444", outlineOffset: 2 } : {}) }}
          onMouseDown={e => { if (!isEraser) { e.stopPropagation(); setDraggingOverlay({ pageIdx: srcIdx, overlayId: o.id, startX: o.x, startY: o.y, mouseStartX: e.clientX, mouseStartY: e.clientY }); } }}
          onClick={(e) => { isEraser ? (e.stopPropagation(), removeOverlay(srcIdx, o.id)) : activeTool === "select" ? handleItemSelectClick(e, o.id) : undefined; }}>
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
        const dx = o.width ?? 0, dy = o.height ?? 0;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const ux = dx/len, uy = dy/len;
        const arrowSize = 1.5;
        const ax = x2 - ux*arrowSize, ay = y2 - uy*arrowSize;
        const perpX = -uy * arrowSize * 0.5, perpY = ux * arrowSize * 0.5;
        return (
          <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group inset-0 pointer-events-none" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", zIndex: 20, ...(isEraser ? { pointerEvents: "auto", cursor: "cell" } : { pointerEvents: activeTool === "select" ? "auto" : "none" }) }}
            onClick={(e) => { isEraser ? (e.stopPropagation(), removeOverlay(srcIdx, o.id)) : activeTool === "select" ? handleItemSelectClick(e, o.id) : undefined; }}>
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
        // Normalize points to local SVG viewBox coordinates
        const normalized = o.points.map(p => [
          ((p[0] - minX) / (w || 1)) * 100,
          ((p[1] - minY) / (h || 1)) * 100,
        ]);
        const smoothPath = catmullRomToSvgPath(normalized);
        return (
          <div key={o.id} id={`item-${o.id}`} data-overlay="true" className="absolute group" {...eraserOverlay} style={{ left: `${minX}%`, top: `${minY}%`, width: `${w || 1}%`, height: `${h || 1}%`, ...(isEraser ? { cursor: "cell" } : {}) }}
            onClick={e => { eraserOverlay.onClick?.(e); if(activeTool === "select") handleItemSelectClick(e, o.id); }}>
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
              <path d={smoothPath} fill="none" stroke={o.color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
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

  // ─── Render text blocks ───────────────────────────────────────────────────

  const HANDLES = [
    { id: "nw", cx: "0%", cy: "0%" }, { id: "n", cx: "50%", cy: "0%" }, { id: "ne", cx: "100%", cy: "0%" },
    { id: "e", cx: "100%", cy: "50%" }, { id: "se", cx: "100%", cy: "100%" },
    { id: "s", cx: "50%", cy: "100%" }, { id: "sw", cx: "0%", cy: "100%" }, { id: "w", cx: "0%", cy: "50%" },
  ];

  const renderTextBlocks = (srcIdx: number) => {
    if (activeTool !== "editText" && activeTool !== "select") return null;
    const blocks = textBlocksPerPage[srcIdx] ?? [];
    return blocks.map(block => {
      const isSel = selectedBlockId === block.id;
      const isSelTool = activeTool === "select";
      const isMultiSel = selectedIds.has(block.id);
      const pxFont = (block.renderedFontSize / RENDER_SCALE) * zoom;
      const pxHeight = Math.max(8, pxFont * 1.35);
      const effectiveFamily = (() => {
        const f = block.customFontFamily || block.cssFamily;
        if (f === "times" || f === "serif") return "'Times New Roman', Georgia, serif";
        if (f === "courier" || f === "monospace") return "'Courier New', Consolas, monospace";
        return "Arial, Helvetica, sans-serif";
      })();
      const effectiveBold = block.customBold !== undefined ? block.customBold : (block.isBold ?? false);
      const effectiveItalic = block.customItalic !== undefined ? block.customItalic : (block.isItalic ?? false);
      const effectiveUnderline = block.customUnderline ?? false;
      const effectiveColor = block.customColor ?? "#000000";
      const effectiveAlign = block.customAlign ?? "left";

      return (
        <div key={block.id} id={`item-${block.id}`} data-textblock="true"
          style={{ position: "absolute", left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%`, minHeight: pxHeight, zIndex: isSel ? 60 : 10 }}>
          <div data-textblock="true"
            onClick={e => { e.stopPropagation(); if (isSelTool) handleItemSelectClick(e, block.id); else if (!isSel) selectBlock(block); }}
            className={cn(
              "relative w-full box-border rounded-sm transition-all duration-100",
              !isSelTool && !isSel && !block.isDirty && "border border-transparent hover:border-blue-400 hover:bg-blue-500/5 cursor-text",
              !isSelTool && block.isDirty && !isSel && "border border-green-500 bg-green-500/5 cursor-text",
              !isSelTool && isSel && "border-2 border-blue-600 bg-white/95 cursor-text",
              isSelTool && !isMultiSel && "border border-transparent hover:border-blue-300 hover:border-dashed cursor-default",
              isSelTool && isMultiSel && "border-2 border-blue-500 bg-blue-500/10 cursor-default",
            )}
            style={{ minHeight: pxHeight }}>
            {isSel && !isSelTool && (
              <input autoFocus value={block.text}
                onFocus={() => pushTextEdit()}
                onChange={e => updateTextBlock(block.id, e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") setSelectedBlockId(null); }}
                style={{
                  display: "block", width: "100%", fontSize: `${pxFont}px`, lineHeight: 1.25,
                  padding: "0 2px", background: "transparent", border: "none", outline: "none",
                  color: effectiveColor, fontFamily: effectiveFamily,
                  fontWeight: effectiveBold ? "bold" : "normal", fontStyle: effectiveItalic ? "italic" : "normal",
                  textDecoration: effectiveUnderline ? "underline" : "none", textAlign: effectiveAlign as any,
                  minWidth: 40, letterSpacing: "inherit",
                }}
              />
            )}
            {isSel && !isSelTool && HANDLES.map(h => (
              <div key={h.id} onMouseDown={e => e.stopPropagation()}
                style={{
                  position: "absolute", left: h.cx, top: h.cy,
                  width: 8, height: 8, background: "#2563eb", border: "1.5px solid white",
                  borderRadius: "50%", transform: "translate(-50%,-50%)",
                  cursor: "pointer", zIndex: 80, boxShadow: "0 0 0 2px rgba(37,99,235,0.25)",
                }}
              />
            ))}
            {isSel && !isSelTool && (
              <div data-textblock="true"
                style={{
                  position: "absolute", bottom: -30, right: 0,
                  display: "flex", alignItems: "center", gap: 2,
                  background: "white", border: "1px solid #e5e7eb",
                  borderRadius: 6, padding: "2px 6px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)", zIndex: 100, whiteSpace: "nowrap",
                }}>
                <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: "sans-serif", padding: "0 2px" }}>
                  {block.cssFamily ?? "sans"} · {Math.round(block.pdfFontSize)}pt
                  {(block.isBold || effectiveBold) ? " · Bold" : ""}
                  {(block.isItalic || effectiveItalic) ? " · Italic" : ""}
                </span>
                <div style={{ width: 1, height: 12, background: "#e5e7eb", margin: "0 2px" }} />
                <button onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(block.text).catch(() => {}); }}
                  style={{ padding: "1px 5px", fontSize: 11, color: "#374151", cursor: "pointer", border: "none", background: "none", borderRadius: 3 }}
                  className="hover:bg-gray-100">Copy</button>
                <div style={{ width: 1, height: 12, background: "#e5e7eb" }} />
                <button onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); removeTextBlock(block.id); }}
                  style={{ padding: "1px 5px", fontSize: 11, color: "#ef4444", cursor: "pointer", border: "none", background: "none", borderRadius: 3 }}
                  className="hover:bg-red-50">Delete</button>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  const dirtyCount = textBlocksPerPage.flat().filter(b => b.isDirty).length;
  const selectedBlock = selectedBlockId
    ? textBlocksPerPage.flat().find(b => b.id === selectedBlockId) ?? null
    : null;

  return (
    <ToolLayout
      title="Edit PDF Online"
      description="Edit existing text, add signatures, images, and annotations to your PDF documents."
      toolName="Edit PDF Online"
    >
      <div className="space-y-4">
        {!file && (
          <div className="max-w-4xl mx-auto py-12 px-4">
            <ToolUploadScreen
              title="Edit PDF Online"
              description="Click existing text to edit it, or add new text, images, and annotations."
              accept={{ "application/pdf": [".pdf"] }}
              onFilesSelected={handleFiles}
              loading={loading}
              isBatch={false}
            />
          </div>
        )}

        {file && previews.length > 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 flex flex-col bg-white dark:bg-gray-950">
            <div ref={editorRef} className="flex-1 flex flex-col overflow-hidden">
              <EditorToolbar
                activeTool={activeTool} setActiveTool={setActiveTool}
                activeShape={activeShape} setActiveShape={setActiveShape}
                shapeDropdownOpen={shapeDropdownOpen} setShapeDropdownOpen={setShapeDropdownOpen}
                undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo}
                dirtyCount={dirtyCount} isFullscreen={isFullscreen} toggleFullscreen={toggleFullscreen}
                onSave={download} saving={saving}
              />

              <SecondaryToolbar
                activeTool={activeTool} activeShape={activeShape}
                selectedBlock={selectedBlock}
                textFont={textFont} setTextFont={setTextFont}
                textSize={textSize} setTextSize={setTextSize}
                textColor={textColor} setTextColor={setTextColor}
                textBold={textBold} setTextBold={setTextBold}
                textItalic={textItalic} setTextItalic={setTextItalic}
                textUnderline={textUnderline} setTextUnderline={setTextUnderline}
                textAlign={textAlign} setTextAlign={setTextAlign}
                selFontSize={selFontSize} setSelFontSize={setSelFontSize}
                selColor={selColor} setSelColor={setSelColor}
                selBold={selBold} setSelBold={setSelBold}
                selItalic={selItalic} setSelItalic={setSelItalic}
                selUnderline={selUnderline} setSelUnderline={setSelUnderline}
                selAlign={selAlign} setSelAlign={setSelAlign}
                updateTextBlockStyle={updateTextBlockStyle}
                textContent={textContent} setTextContent={setTextContent}
                annotColor={annotColor} setAnnotColor={setAnnotColor}
                commentText={commentText} setCommentText={setCommentText}
                totalTextBlocks={textBlocksPerPage.flat().length}
              />

              <div className="flex flex-1 overflow-hidden">
                <PageThumbnails
                  previews={previews} state={state} activePage={activePage}
                  zoom={zoom} zoomSteps={ZOOM_STEPS} setZoom={setZoom}
                  zoomIn={zoomIn} zoomOut={zoomOut} scrollToPage={scrollToPage}
                  width={leftSidebarWidth}
                />

                <div 
                  className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400/20 active:bg-blue-500/40 cursor-col-resize transition-all z-50 flex items-center justify-center group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    resizingLeft.current = true;
                    document.body.style.cursor = "col-resize";
                  }}
                >
                  <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-700 rounded-full group-hover:bg-blue-400 transition-colors" />
                </div>

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

                          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {overlays.map((ov) => (
                              <TransformItem
                                key={ov.id}
                                overlay={ov}
                                zoom={zoom}
                                isSelected={selectedIds.has(ov.id)}
                                onSelect={(e) => {
                                  e.stopPropagation();
                                  if (e.shiftKey) {
                                    const next = new Set(selectedIds);
                                    if (next.has(ov.id)) next.delete(ov.id);
                                    else next.add(ov.id);
                                    setSelectedIds(next);
                                  } else {
                                    setSelectedIds(new Set([ov.id]));
                                  }
                                }}
                              />
                            ))}

                            {imgDragging && imgRect && activePage === visIdx && (
                              <div className="absolute border-2 border-blue-500 border-dashed bg-blue-500/10 pointer-events-none"
                                style={{ left:`${imgRect.x}%`, top:`${imgRect.y}%`, width:`${imgRect.width}%`, height:`${imgRect.height}%` }} />
                            )}
                            {annotDragging && annotRect && activePage === visIdx && annotKind !== "freehand" && annotKind !== "line" && annotKind !== "arrow" && (
                              <div className="absolute border-2 border-dashed pointer-events-none"
                                style={{ left:`${annotRect.x}%`, top:`${annotRect.y}%`, width:`${annotRect.width}%`, height:`${annotRect.height}%`,
                                  borderColor: annotColor, background: annotKind === "highlight" ? "rgba(255,255,0,0.25)" : "transparent",
                                  borderRadius: annotKind === "ellipse" ? "50%" : undefined }} />
                            )}
                            {annotDragging && annotKind === "freehand" && freehandPoints.length > 1 && activePage === visIdx && (
                              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                                <path d={catmullRomToSvgPath(freehandPoints.map(p => [p[0], p[1]]))} fill="none" stroke={annotColor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {eraserDragging && eraserRect && activePage === visIdx && (
                              <div className="absolute border-2 border-red-500 border-dashed bg-red-500/10 pointer-events-none"
                                style={{ left:`${eraserRect.x}%`, top:`${eraserRect.y}%`, width:`${eraserRect.width}%`, height:`${eraserRect.height}%` }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-8 mb-2 text-xs text-gray-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Your file never leaves your device.
                  </div>
                </div>

                <div 
                  className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400/20 active:bg-blue-500/40 cursor-col-resize transition-all z-50 flex items-center justify-center group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    resizingRight.current = true;
                    document.body.style.cursor = "col-resize";
                  }}
                >
                  <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-700 rounded-full group-hover:bg-blue-400 transition-colors" />
                </div>

                {/* Right panel */}
                <PropertiesPanel
                  activeTool={activeTool} activePage={activePage}
                  addOverlay={addOverlay} versions={versions}
                  downloadVersion={downloadVersion}
                  width={rightSidebarWidth}
                />
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
