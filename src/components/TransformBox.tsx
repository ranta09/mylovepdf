import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Overlay, TextOverlay, ImageOverlay, AnnotationOverlay, SignatureOverlay } from "@/lib/pdfEditorUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransformItemData {
  id: string;
  x: number; // %
  y: number; // %
  width: number; // %
  height: number; // %
  rotation?: number; // degrees
  isText?: boolean;
}

interface TransformBoxProps {
  selectedIds: Set<string>;
  allItems: TransformItemData[];
  containerRef: React.RefObject<HTMLElement>;
  zoom: number;
  onCommit: (
    updates: {
      id: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      rotation?: number;
    }[]
  ) => void;
}

// ─── Handle definitions ───────────────────────────────────────────────────────

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: { id: HandleId; cursor: string; cx: number; cy: number }[] = [
  { id: "nw", cursor: "nwse-resize", cx: 0, cy: 0 },
  { id: "n", cursor: "ns-resize", cx: 0.5, cy: 0 },
  { id: "ne", cursor: "nesw-resize", cx: 1, cy: 0 },
  { id: "e", cursor: "ew-resize", cx: 1, cy: 0.5 },
  { id: "se", cursor: "nwse-resize", cx: 1, cy: 1 },
  { id: "s", cursor: "ns-resize", cx: 0.5, cy: 1 },
  { id: "sw", cursor: "nesw-resize", cx: 0, cy: 1 },
  { id: "w", cursor: "ew-resize", cx: 0, cy: 0.5 },
];

const SNAP_THRESHOLD = 0.8; // % tolerance for snap guides

// ─── Component ────────────────────────────────────────────────────────────────

export function TransformBox({
  selectedIds,
  allItems,
  containerRef,
  zoom,
  onCommit,
}: TransformBoxProps) {
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [guides, setGuides] = useState<{
    x?: number;
    y?: number;
  }>({});
  const [rotation, setRotation] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const draggingState = useRef<{
    mode: "move" | "resize" | "rotate" | null;
    itemsStart: TransformItemData[];
    mouseStart: { x: number; y: number };
    boxStart: { x: number; y: number; w: number; h: number };
    handleId?: HandleId;
    rotationStart?: number;
  }>({
    mode: null,
    itemsStart: [],
    mouseStart: { x: 0, y: 0 },
    boxStart: { x: 0, y: 0, w: 0, h: 0 },
  });

  // ── Compute bounding box from selection ─────────────────────────────────

  useEffect(() => {
    if (selectedIds.size === 0 || !containerRef.current) {
      setBox(null);
      return;
    }

    const selectedItems = allItems.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) {
      setBox(null);
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    selectedItems.forEach((it) => {
      if (it.x < minX) minX = it.x;
      if (it.y < minY) minY = it.y;
      if (it.x + it.width > maxX) maxX = it.x + it.width;
      if (it.y + it.height > maxY) maxY = it.y + it.height;
    });

    setBox({
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    });
  }, [selectedIds, allItems, containerRef]);

  // ── Snap guide computation ──────────────────────────────────────────────

  const computeSnap = useCallback(
    (
      newX: number,
      newY: number,
      w: number,
      h: number
    ): { snapX?: number; snapY?: number; adjX: number; adjY: number } => {
      if (selectedIds.size !== 1) return { adjX: newX, adjY: newY };

      let snapX: number | undefined;
      let snapY: number | undefined;
      let adjX = newX;
      let adjY = newY;

      const cx = newX + w / 2;
      const cy = newY + h / 2;
      const right = newX + w;
      const bottom = newY + h;

      for (const sib of allItems) {
        if (selectedIds.has(sib.id)) continue;

        const sibCx = sib.x + sib.width / 2;
        const sibCy = sib.y + sib.height / 2;
        const sibRight = sib.x + sib.width;
        const sibBottom = sib.y + sib.height;

        // Left edge → left edge
        if (Math.abs(sib.x - newX) < SNAP_THRESHOLD) {
          snapX = sib.x;
          adjX = sib.x;
        }
        // Right edge → right edge
        if (Math.abs(sibRight - right) < SNAP_THRESHOLD) {
          snapX = sibRight;
          adjX = sibRight - w;
        }
        // Center → center
        if (Math.abs(sibCx - cx) < SNAP_THRESHOLD) {
          snapX = sibCx;
          adjX = sibCx - w / 2;
        }
        // Left → right
        if (Math.abs(sibRight - newX) < SNAP_THRESHOLD) {
          snapX = sibRight;
          adjX = sibRight;
        }
        // Right → left
        if (Math.abs(sib.x - right) < SNAP_THRESHOLD) {
          snapX = sib.x;
          adjX = sib.x - w;
        }

        // Top edge → top edge
        if (Math.abs(sib.y - newY) < SNAP_THRESHOLD) {
          snapY = sib.y;
          adjY = sib.y;
        }
        // Bottom edge → bottom edge
        if (Math.abs(sibBottom - bottom) < SNAP_THRESHOLD) {
          snapY = sibBottom;
          adjY = sibBottom - h;
        }
        // Center → center
        if (Math.abs(sibCy - cy) < SNAP_THRESHOLD) {
          snapY = sibCy;
          adjY = sibCy - h / 2;
        }
        // Top → bottom
        if (Math.abs(sibBottom - newY) < SNAP_THRESHOLD) {
          snapY = sibBottom;
          adjY = sibBottom;
        }
        // Bottom → top
        if (Math.abs(sib.y - bottom) < SNAP_THRESHOLD) {
          snapY = sib.y;
          adjY = sib.y - h;
        }
      }

      // Canvas center guides (50%)
      if (Math.abs(cx - 50) < SNAP_THRESHOLD) {
        snapX = 50;
        adjX = 50 - w / 2;
      }
      if (Math.abs(cy - 50) < SNAP_THRESHOLD) {
        snapY = 50;
        adjY = 50 - h / 2;
      }

      return { snapX, snapY, adjX, adjY };
    },
    [allItems, selectedIds]
  );

  // ── Resize logic ────────────────────────────────────────────────────────

  const computeResize = useCallback(
    (
      dx: number,
      dy: number,
      handleId: HandleId,
      boxStart: { x: number; y: number; w: number; h: number },
      isText: boolean
    ) => {
      let { x, y, w, h } = boxStart;

      switch (handleId) {
        case "se":
          w = Math.max(1, w + dx);
          if (!isText) h = Math.max(1, h + dy);
          break;
        case "s":
          if (!isText) h = Math.max(1, h + dy);
          break;
        case "e":
          w = Math.max(1, w + dx);
          break;
        case "ne":
          w = Math.max(1, w + dx);
          if (!isText) {
            const newH = Math.max(1, h - dy);
            y = y + (h - newH);
            h = newH;
          }
          break;
        case "nw":
          {
            const newW = Math.max(1, w - dx);
            x = x + (w - newW);
            w = newW;
            if (!isText) {
              const newH = Math.max(1, h - dy);
              y = y + (h - newH);
              h = newH;
            }
          }
          break;
        case "n":
          if (!isText) {
            const newH = Math.max(1, h - dy);
            y = y + (h - newH);
            h = newH;
          }
          break;
        case "sw":
          {
            const newW = Math.max(1, w - dx);
            x = x + (w - newW);
            w = newW;
            if (!isText) h = Math.max(1, h + dy);
          }
          break;
        case "w":
          {
            const newW = Math.max(1, w - dx);
            x = x + (w - newW);
            w = newW;
          }
          break;
      }

      return { x, y, w, h };
    },
    []
  );

  // ── Mouse event handlers (rAF-batched) ──────────────────────────────────

  useEffect(() => {
    const state = draggingState.current;
    if (!state.mode || !containerRef.current || !box) return;

    const onMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const rect = containerRef.current!.getBoundingClientRect();
        const dx = ((e.clientX - state.mouseStart.x) / rect.width) * 100;
        const dy = ((e.clientY - state.mouseStart.y) / rect.height) * 100;

        if (state.mode === "move") {
          const rawX = state.boxStart.x + dx;
          const rawY = state.boxStart.y + dy;
          const { snapX, snapY, adjX, adjY } = computeSnap(
            rawX,
            rawY,
            state.boxStart.w,
            state.boxStart.h
          );

          setBox({
            ...state.boxStart,
            x: adjX,
            y: adjY,
          });
          setGuides({ x: snapX, y: snapY });

          // Fast DOM updates for selected items
          const offsetX = adjX - state.boxStart.x;
          const offsetY = adjY - state.boxStart.y;
          state.itemsStart.forEach((it) => {
            const el = document.getElementById(`item-${it.id}`);
            if (el) {
              el.style.left = `${it.x + offsetX}%`;
              el.style.top = `${it.y + offsetY}%`;
            }
          });
        }

        if (state.mode === "resize" && state.handleId) {
          const isText =
            selectedIds.size === 1 && (state.itemsStart[0]?.isText ?? false);
          const result = computeResize(
            dx,
            dy,
            state.handleId,
            state.boxStart,
            isText
          );

          setBox(result);
          setGuides({});

          // DOM updates for single selection resize
          if (selectedIds.size === 1) {
            const it = state.itemsStart[0];
            const el = document.getElementById(`item-${it.id}`);
            if (el) {
              el.style.left = `${result.x}%`;
              el.style.top = `${result.y}%`;
              el.style.width = `${result.w}%`;
              if (!isText) el.style.height = `${result.h}%`;
            }
          }
        }

        if (state.mode === "rotate") {
          const rect = containerRef.current!.getBoundingClientRect();
          const centerX = rect.left + ((state.boxStart.x + state.boxStart.w / 2) / 100) * rect.width;
          const centerY = rect.top + ((state.boxStart.y + state.boxStart.h / 2) / 100) * rect.height;
          const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
          const snappedAngle = Math.abs(angle % 45) < 5
            ? Math.round(angle / 45) * 45
            : Math.round(angle);
          setRotation(snappedAngle);
        }
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const rect = containerRef.current!.getBoundingClientRect();
      const dx = ((e.clientX - state.mouseStart.x) / rect.width) * 100;
      const dy = ((e.clientY - state.mouseStart.y) / rect.height) * 100;

      const updates = state.itemsStart.map((it) => {
        if (state.mode === "move") {
          const rawX = state.boxStart.x + dx;
          const rawY = state.boxStart.y + dy;
          const { adjX, adjY } = computeSnap(
            rawX,
            rawY,
            state.boxStart.w,
            state.boxStart.h
          );
          const offsetX = adjX - state.boxStart.x;
          const offsetY = adjY - state.boxStart.y;
          return { id: it.id, x: it.x + offsetX, y: it.y + offsetY };
        }
        if (state.mode === "resize" && state.handleId) {
          const isText = it.isText ?? false;
          const result = computeResize(
            dx,
            dy,
            state.handleId,
            state.boxStart,
            isText
          );
          // For single item, apply the box result directly
          if (selectedIds.size === 1) {
            return {
              id: it.id,
              x: result.x,
              y: result.y,
              width: result.w,
              height: result.h,
            };
          }
          return { id: it.id, x: it.x, y: it.y };
        }
        if (state.mode === "rotate") {
          return {
            id: it.id,
            x: it.x,
            y: it.y,
            rotation: rotation,
          };
        }
        return { id: it.id, x: it.x, y: it.y };
      });

      onCommit(updates);
      setGuides({});
      draggingState.current.mode = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [box, containerRef, selectedIds, allItems, onCommit, computeSnap, computeResize, rotation]);

  // ── Start drag helpers ──────────────────────────────────────────────────

  const startMove = useCallback(
    (e: React.MouseEvent) => {
      if (!box) return;
      e.stopPropagation();
      draggingState.current = {
        mode: "move",
        itemsStart: allItems
          .filter((i) => selectedIds.has(i.id))
          .map((i) => ({ ...i })),
        mouseStart: { x: e.clientX, y: e.clientY },
        boxStart: { ...box },
      };
      setGuides({}); // force re-render to bind listeners
    },
    [box, allItems, selectedIds]
  );

  const startResize = useCallback(
    (e: React.MouseEvent, handleId: HandleId) => {
      if (!box) return;
      e.stopPropagation();
      draggingState.current = {
        mode: "resize",
        itemsStart: allItems
          .filter((i) => selectedIds.has(i.id))
          .map((i) => ({ ...i })),
        mouseStart: { x: e.clientX, y: e.clientY },
        boxStart: { ...box },
        handleId,
      };
      setGuides({});
    },
    [box, allItems, selectedIds]
  );

  const startRotate = useCallback(
    (e: React.MouseEvent) => {
      if (!box) return;
      e.stopPropagation();
      draggingState.current = {
        mode: "rotate",
        itemsStart: allItems
          .filter((i) => selectedIds.has(i.id))
          .map((i) => ({ ...i })),
        mouseStart: { x: e.clientX, y: e.clientY },
        boxStart: { ...box },
        rotationStart: rotation,
      };
      setGuides({});
    },
    [box, allItems, selectedIds, rotation]
  );

  if (!box || selectedIds.size === 0) return null;

  return (
    <>
      {/* ── Snap Alignment Guides ── */}
      {guides.x !== undefined && (
        <div
          className="absolute top-0 bottom-0 z-[100] pointer-events-none"
          style={{
            left: `${guides.x}%`,
            width: 1,
            background: "linear-gradient(to bottom, transparent 0%, #ef4444 20%, #ef4444 80%, transparent 100%)",
          }}
        />
      )}
      {guides.y !== undefined && (
        <div
          className="absolute left-0 right-0 z-[100] pointer-events-none"
          style={{
            top: `${guides.y}%`,
            height: 1,
            background: "linear-gradient(to right, transparent 0%, #ef4444 20%, #ef4444 80%, transparent 100%)",
          }}
        />
      )}

      {/* ── Rotation Anchor (above top-center) ── */}
      {selectedIds.size === 1 && (
        <>
          {/* Stem line from top-center to rotation handle */}
          <div
            className="absolute z-[95] pointer-events-none"
            style={{
              left: `${box.x + box.w / 2}%`,
              top: `${box.y}%`,
              width: 1,
              height: 24,
              background: "#3b82f6",
              transform: "translate(-50%, -100%)",
            }}
          />
          {/* Rotation circle */}
          <div
            className="absolute z-[100] cursor-grab active:cursor-grabbing"
            style={{
              left: `${box.x + box.w / 2}%`,
              top: `${box.y}%`,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "white",
              border: "2px solid #3b82f6",
              transform: "translate(-50%, calc(-100% - 20px))",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
            onMouseDown={startRotate}
            title="Rotate"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-full h-full p-0.5 text-blue-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 4a6 6 0 1 0 1.5 4" />
              <polyline points="12,1 12,4 9,4" />
            </svg>
          </div>
        </>
      )}

      {/* ── Main Bounding Box ── */}
      <div
        ref={boxRef}
        className="absolute border-2 border-blue-500 bg-blue-500/5 cursor-move z-[90] pointer-events-auto"
        style={{
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.w}%`,
          height: `${box.h}%`,
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: "center center",
        }}
        onMouseDown={startMove}
      >
        {/* ── 8 Resize Handles ── */}
        {HANDLES.map((handle) => (
          <div
            key={handle.id}
            className="absolute z-[100]"
            style={{
              left: `${handle.cx * 100}%`,
              top: `${handle.cy * 100}%`,
              width: 10,
              height: 10,
              transform: "translate(-50%, -50%)",
              cursor: handle.cursor,
              background: "white",
              border: "2px solid #3b82f6",
              borderRadius: handle.id === "n" || handle.id === "s" || handle.id === "e" || handle.id === "w"
                ? 2
                : "50%",
              boxShadow: "0 0 0 1px rgba(59,130,246,0.2), 0 1px 3px rgba(0,0,0,0.1)",
            }}
            onMouseDown={(e) => startResize(e, handle.id)}
          />
        ))}

        {/* ── Selection info badge ── */}
        {selectedIds.size > 1 && (
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm pointer-events-none"
          >
            {selectedIds.size} items selected
          </div>
        )}

        {/* ── Dimension labels ── */}
        {selectedIds.size === 1 && draggingState.current.mode === "resize" && (
          <div
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm pointer-events-none"
          >
            {box.w.toFixed(1)}% × {box.h.toFixed(1)}%
          </div>
        )}
      </div>
    </>
  );
}

// ─── TransformItem — visual renderer for a single overlay ────────────────────

interface TransformItemProps {
  overlay: Overlay;
  zoom: number;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
}

export function TransformItem({ overlay: ov, isSelected, onSelect }: TransformItemProps) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: `${ov.x}%`,
    top: `${ov.y}%`,
    cursor: "move",
    pointerEvents: "auto",
    outline: isSelected ? "2px solid #3b82f6" : "none",
    outlineOffset: "1px",
    boxSizing: "border-box",
  };

  if (ov.type === "text") {
    const t = ov as TextOverlay;
    return (
      <div
        id={`item-${ov.id}`}
        style={{
          ...base,
          fontSize: `${t.fontSize}px`,
          color: t.color,
          fontWeight: t.bold ? "bold" : "normal",
          fontStyle: t.italic ? "italic" : "normal",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
        onMouseDown={onSelect}
      >
        {t.text}
      </div>
    );
  }

  if (ov.type === "image" || ov.type === "signature") {
    const img = ov as ImageOverlay | SignatureOverlay;
    return (
      <div
        id={`item-${ov.id}`}
        style={{ ...base, width: `${img.width}%`, height: `${img.height}%` }}
        onMouseDown={onSelect}
      >
        <img src={img.dataUrl} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} alt="" draggable={false} />
      </div>
    );
  }

  if (ov.type === "annotation") {
    const a = ov as AnnotationOverlay;
    if ((a.kind === "freehand" || a.kind === "line" || a.kind === "arrow") && a.points && a.points.length > 1) {
      return (
        <svg
          id={`item-${ov.id}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
        >
          <polyline
            points={a.points.map(p => `${p[0]},${p[1]}`).join(" ")}
            fill="none"
            stroke={a.color}
            strokeWidth={2}
          />
        </svg>
      );
    }
    return (
      <div
        id={`item-${ov.id}`}
        style={{
          ...base,
          width: `${a.width ?? 8}%`,
          height: `${a.height ?? 2}%`,
          background: a.kind === "highlight" ? "rgba(255,255,0,0.35)" : "transparent",
          border: a.kind !== "highlight" ? `2px solid ${a.color}` : undefined,
          borderRadius: a.kind === "ellipse" ? "50%" : undefined,
        }}
        onMouseDown={onSelect}
      />
    );
  }

  return null;
}
