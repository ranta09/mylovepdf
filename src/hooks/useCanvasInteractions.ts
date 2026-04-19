import { useState, useRef, useCallback } from "react";
import {
  makeId,
  type Overlay,
  type TextOverlay,
  type ImageOverlay,
  type AnnotationOverlay,
  type SignatureOverlay,
  type EditorState,
} from "@/lib/pdfEditorUtils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnotationKind =
  | "highlight"
  | "rectangle"
  | "ellipse"
  | "comment"
  | "freehand"
  | "line"
  | "arrow";

export interface CanvasInteractionsConfig {
  activeTool: string;
  annotKind: AnnotationKind;
  activeTab: string;
  activePage: number;
  annotColor: string;
  commentText: string;
  textContent: string;
  textSize: number[];
  textColor: string;
  textBold: boolean;
  textItalic: boolean;
  textFont: string;
  state: EditorState;
  pushState: (next: EditorState) => void;
  addOverlay: (pageIdx: number, overlay: Overlay) => void;
  removeOverlay: (pageIdx: number, id: string) => void;
  selectedBlockId: string | null;
}

function cloneState(s: EditorState): EditorState {
  return JSON.parse(JSON.stringify(s));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCanvasInteractions(config: CanvasInteractionsConfig) {
  const {
    activeTool,
    annotKind,
    activeTab,
    activePage,
    annotColor,
    commentText,
    textContent,
    textSize,
    textColor,
    textBold,
    textItalic,
    textFont,
    state,
    pushState,
    addOverlay,
    removeOverlay,
    selectedBlockId,
  } = config;

  // ── Drag overlay state ──────────────────────────────────────────────────
  const [draggingOverlay, setDraggingOverlay] = useState<{
    pageIdx: number;
    overlayId: string;
    startX: number;
    startY: number;
    mouseStartX: number;
    mouseStartY: number;
  } | null>(null);
  const wasDraggingMove = useRef(false);

  // ── Image drag state ────────────────────────────────────────────────────
  const [imgDragging, setImgDragging] = useState(false);
  const [imgStart, setImgStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [imgRect, setImgRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // ── Annotation draw state ───────────────────────────────────────────────
  const [annotDragging, setAnnotDragging] = useState(false);
  const [annotStart, setAnnotStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [annotRect, setAnnotRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(
    null
  );
  const [freehandPoints, setFreehandPoints] = useState<number[][]>([]);

  // ── Eraser drag state ───────────────────────────────────────────────────
  const [eraserDragging, setEraserDragging] = useState(false);
  const [eraserStart, setEraserStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [eraserRect, setEraserRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // ── Marquee drag state ──────────────────────────────────────────────────
  const [marqueeDragging, setMarqueeDragging] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getRelativePos = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  // ── Image handlers ──────────────────────────────────────────────────────

  const handleImgMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTab !== "image") return;
      e.preventDefault();
      const { x, y } = getRelativePos(e);
      setImgStart({ x, y });
      setImgRect(null);
      setImgDragging(true);
    },
    [activeTab, getRelativePos]
  );

  const handleImgMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!imgDragging || !imgStart) return;
      const { x, y } = getRelativePos(e);
      setImgRect({
        x: Math.min(imgStart.x, x),
        y: Math.min(imgStart.y, y),
        width: Math.abs(x - imgStart.x),
        height: Math.abs(y - imgStart.y),
      });
    },
    [imgDragging, imgStart, getRelativePos]
  );

  const handleImgMouseUp = useCallback(
    (e: React.MouseEvent, srcIdx: number) => {
      if (
        !imgDragging ||
        !imgRect ||
        imgRect.width < 2 ||
        imgRect.height < 2
      ) {
        setImgDragging(false);
        setImgRect(null);
        return;
      }
      setImgDragging(false);
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const imgFile = input.files?.[0];
        if (!imgFile) return;
        const reader = new FileReader();
        reader.onload = () => {
          addOverlay(srcIdx, {
            id: makeId(),
            type: "image",
            dataUrl: reader.result as string,
            x: imgRect!.x,
            y: imgRect!.y,
            width: imgRect!.width,
            height: imgRect!.height,
          } as ImageOverlay);
          setImgRect(null);
          toast.success("Image placed!");
        };
        reader.readAsDataURL(imgFile);
      };
      input.click();
    },
    [imgDragging, imgRect, addOverlay]
  );

  // ── Annotation handlers ─────────────────────────────────────────────────

  const handleAnnotMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTab !== "annotate") return;
      e.preventDefault();
      const { x, y } = getRelativePos(e);
      setAnnotStart({ x, y });
      setAnnotRect(null);
      setAnnotDragging(true);
      if (annotKind === "freehand") setFreehandPoints([[x, y]]);
    },
    [activeTab, annotKind, getRelativePos]
  );

  const handleAnnotMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!annotDragging || !annotStart) return;
      const { x, y } = getRelativePos(e);
      if (annotKind === "freehand")
        setFreehandPoints((pts) => [...pts, [x, y]]);
      else if (annotKind === "line" || annotKind === "arrow")
        setLineEnd({ x, y });
      else
        setAnnotRect({
          x: Math.min(annotStart.x, x),
          y: Math.min(annotStart.y, y),
          width: Math.abs(x - annotStart.x),
          height: Math.abs(y - annotStart.y),
        });
    },
    [annotDragging, annotStart, annotKind, getRelativePos]
  );

  const handleAnnotMouseUp = useCallback(
    (e: React.MouseEvent, srcIdx: number) => {
      if (!annotDragging || !annotStart) return;
      setAnnotDragging(false);
      if (annotKind === "comment") {
        addOverlay(srcIdx, {
          id: makeId(),
          type: "annotation",
          kind: "comment",
          x: annotStart.x,
          y: annotStart.y,
          color: annotColor,
          text: commentText,
        } as AnnotationOverlay);
      } else if (annotKind === "freehand") {
        addOverlay(srcIdx, {
          id: makeId(),
          type: "annotation",
          kind: "freehand",
          x: annotStart.x,
          y: annotStart.y,
          color: annotColor,
          points: freehandPoints,
        } as AnnotationOverlay);
        setFreehandPoints([]);
      } else if (
        (annotKind === "line" || annotKind === "arrow") &&
        lineEnd
      ) {
        const dx = lineEnd.x - annotStart.x,
          dy = lineEnd.y - annotStart.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          addOverlay(srcIdx, {
            id: makeId(),
            type: "annotation",
            kind: annotKind,
            x: annotStart.x,
            y: annotStart.y,
            width: dx,
            height: dy,
            color: annotColor,
          } as AnnotationOverlay);
        }
        setLineEnd(null);
      } else if (
        annotRect &&
        annotRect.width > 1 &&
        annotRect.height > 1
      ) {
        addOverlay(srcIdx, {
          id: makeId(),
          type: "annotation",
          kind: annotKind,
          x: annotRect.x,
          y: annotRect.y,
          width: annotRect.width,
          height: annotRect.height,
          color: annotColor,
        } as AnnotationOverlay);
      }
      setAnnotRect(null);
    },
    [
      annotDragging,
      annotStart,
      annotKind,
      annotColor,
      commentText,
      freehandPoints,
      lineEnd,
      annotRect,
      addOverlay,
    ]
  );

  // ── Eraser handlers ─────────────────────────────────────────────────────

  const handleEraserMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "eraser") return;
      e.preventDefault();
      const { x, y } = getRelativePos(e);
      setEraserStart({ x, y });
      setEraserRect(null);
      setEraserDragging(true);
    },
    [activeTool, getRelativePos]
  );

  const handleEraserMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!eraserDragging || !eraserStart) return;
      const { x, y } = getRelativePos(e);
      setEraserRect({
        x: Math.min(eraserStart.x, x),
        y: Math.min(eraserStart.y, y),
        width: Math.abs(x - eraserStart.x),
        height: Math.abs(y - eraserStart.y),
      });
    },
    [eraserDragging, eraserStart, getRelativePos]
  );

  const handleEraserMouseUp = useCallback(
    (e: React.MouseEvent, srcIdx: number) => {
      if (!eraserDragging || !eraserStart) {
        setEraserDragging(false);
        return;
      }
      setEraserDragging(false);
      const rect = eraserRect;
      setEraserRect(null);
      setEraserStart(null);
      if (rect && (rect.width > 0.5 || rect.height > 0.5)) {
        const eraseBox = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
        const next = cloneState(state);
        const before = next.pages[srcIdx].overlays.length;
        next.pages[srcIdx].overlays = next.pages[srcIdx].overlays.filter(
          (ov) => {
            const bbox = overlayBBox(ov);
            return !bbox || !rectsIntersect(bbox, eraseBox);
          }
        );
        const erased = before - next.pages[srcIdx].overlays.length;
        if (erased > 0) {
          pushState(next);
          toast.success(
            `Erased ${erased} object${erased > 1 ? "s" : ""}`
          );
        }
      }
    },
    [eraserDragging, eraserStart, eraserRect, state, pushState]
  );

  // ── Page click handler ──────────────────────────────────────────────────

  const handlePageClick = useCallback(
    (
      e: React.MouseEvent,
      srcIdx: number,
      setSelectedBlockId: (id: string | null) => void,
      setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
    ) => {
      if (wasDraggingMove.current) return;

      const t = e.target as HTMLElement;
      if (!t.closest("[data-textblock]") && !t.closest("[data-overlay]")) {
        if (selectedBlockId) setSelectedBlockId(null);
        if (activeTool === "select" && !e.shiftKey) setSelectedIds(new Set());
      }

      if (
        activeTool === "addText" &&
        !t.closest("[data-textblock]") &&
        !t.closest("[data-overlay]") &&
        !selectedBlockId
      ) {
        const { x, y } = getRelativePos(e);
        addOverlay(srcIdx, {
          id: makeId(),
          type: "text",
          text: textContent,
          fontSize: textSize[0],
          color: textColor,
          bold: textBold,
          italic: textItalic,
          fontFamily: textFont,
          x,
          y,
        } as TextOverlay);
      }
    },
    [
      activeTool,
      selectedBlockId,
      textContent,
      textSize,
      textColor,
      textBold,
      textItalic,
      textFont,
      addOverlay,
      getRelativePos,
    ]
  );

  return {
    // Overlay drag
    draggingOverlay,
    setDraggingOverlay,
    wasDraggingMove,
    // Image
    imgDragging,
    imgRect,
    handleImgMouseDown,
    handleImgMouseMove,
    handleImgMouseUp,
    // Annotation
    annotDragging,
    annotStart,
    annotRect,
    lineEnd,
    freehandPoints,
    handleAnnotMouseDown,
    handleAnnotMouseMove,
    handleAnnotMouseUp,
    // Eraser
    eraserDragging,
    eraserRect,
    handleEraserMouseDown,
    handleEraserMouseMove,
    handleEraserMouseUp,
    // Marquee
    marqueeDragging,
    marqueeStart,
    marqueeRect,
    setMarqueeDragging,
    setMarqueeStart,
    setMarqueeRect,
    // Page click
    handlePageClick,
    // Helpers
    getRelativePos,
  };
}

// ── Geometry helpers (used by eraser) ─────────────────────────────────────────

function overlayBBox(
  ov: Overlay
): { x: number; y: number; w: number; h: number } | null {
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
      const dx = o.width ?? 0,
        dy = o.height ?? 0;
      return {
        x: Math.min(o.x, o.x + dx),
        y: Math.min(o.y, o.y + dy),
        w: Math.abs(dx) || 1,
        h: Math.abs(dy) || 1,
      };
    }
    if (o.kind === "freehand" && o.points && o.points.length > 0) {
      const xs = o.points.map((p) => p[0]),
        ys = o.points.map((p) => p[1]);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs) || 1,
        h: Math.max(...ys) - Math.min(...ys) || 1,
      };
    }
    return { x: o.x, y: o.y, w: o.width ?? 10, h: o.height ?? 5 };
  }
  return null;
}

function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
