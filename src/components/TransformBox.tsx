import React, { useEffect, useRef, useState } from "react";
import { Maximize, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransformItem {
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
  allItems: TransformItem[];
  containerRef: React.RefObject<HTMLElement>;
  zoom: number;
  onCommit: (updates: { id: string; x: number; y: number; width?: number; height?: number; rotation?: number }[]) => void;
}

export function TransformBox({ selectedIds, allItems, containerRef, zoom, onCommit }: TransformBoxProps) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  
  const boxRef = useRef<HTMLDivElement>(null);
  const draggingState = useRef<{
    mode: "move" | "resize" | "rotate" | null;
    itemsStart: TransformItem[];
    mouseStart: { x: number; y: number };
    boxStart: { x: number; y: number; w: number; h: number };
    handleId?: string;
  }>({ mode: null, itemsStart: [], mouseStart: { x: 0, y: 0 }, boxStart: { x: 0, y: 0, w: 0, h: 0 } });

  // Compute initial bounding box
  useEffect(() => {
    if (selectedIds.size === 0 || !containerRef.current) {
      setBox(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const selectedItems = allItems.filter(i => selectedIds.has(i.id));
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedItems.forEach(it => {
      const px = (it.x / 100) * rect.width;
      const py = (it.y / 100) * rect.height;
      const pw = (it.width / 100) * rect.width;
      const ph = (it.height / 100) * rect.height;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px + pw > maxX) maxX = px + pw;
      if (py + ph > maxY) maxY = py + ph;
    });

    setBox({
      x: (minX / rect.width) * 100,
      y: (minY / rect.height) * 100,
      w: ((maxX - minX) / rect.width) * 100,
      h: ((maxY - minY) / rect.height) * 100,
    });
  }, [selectedIds, allItems, containerRef]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingState.current.mode || !containerRef.current || !box) return;
      const rect = containerRef.current.getBoundingClientRect();
      const state = draggingState.current;
      const dx = ((e.clientX - state.mouseStart.x) / rect.width) * 100;
      const dy = ((e.clientY - state.mouseStart.y) / rect.height) * 100;

      if (state.mode === "move") {
        setBox({
          ...state.boxStart,
          x: state.boxStart.x + dx,
          y: state.boxStart.y + dy,
        });
        
        let snapX: number | undefined;
        let snapY: number | undefined;

        // Apply fast DOM updates
        state.itemsStart.forEach(it => {
          const el = document.getElementById(`item-${it.id}`);
          if (el) {
            const newX = it.x + dx;
            const newY = it.y + dy;
            el.style.left = `${newX}%`;
            el.style.top = `${newY}%`;

            // Simple snapping check against unselected items (only if single selection to avoid lag)
            if (selectedIds.size === 1) {
                allItems.forEach(sib => {
                    if (!selectedIds.has(sib.id)) {
                        if (Math.abs(sib.x - newX) < 1.0) snapX = sib.x;
                        if (Math.abs(sib.y - newY) < 1.0) snapY = sib.y;
                    }
                });
            }
          }
        });
        setGuides({ x: snapX, y: snapY });
      }

      if (state.mode === "resize" && selectedIds.size === 1) {
         // Only support resizing single items for now to maintain proportion logic
         const id = Array.from(selectedIds)[0];
         const it = state.itemsStart[0];
         const el = document.getElementById(`item-${id}`);
         if (el) {
            // Simplified right/bottom scaling
            const newW = Math.max(1, it.width + dx);
            const newH = Math.max(1, it.height + dy);
            el.style.width = `${newW}%`;
            if (!it.isText) el.style.height = `${newH}%`; 
            setBox(prev => prev ? { ...prev, w: newW, h: it.isText ? prev.h : newH } : null);
         }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!draggingState.current.mode || !containerRef.current || !box) return;
      const rect = containerRef.current.getBoundingClientRect();
      const state = draggingState.current;
      const dx = ((e.clientX - state.mouseStart.x) / rect.width) * 100;
      const dy = ((e.clientY - state.mouseStart.y) / rect.height) * 100;

      const updates = state.itemsStart.map(it => {
        if (state.mode === "move") {
           return { id: it.id, x: it.x + dx, y: it.y + dy };
        } else if (state.mode === "resize") {
           return { id: it.id, x: it.x, y: it.y, width: Math.max(1, it.width + dx), height: Math.max(1, it.height + dy) };
        }
        return { id: it.id, x: it.x, y: it.y };
      });

      onCommit(updates);
      setGuides({});
      draggingState.current.mode = null;
    };

    if (draggingState.current.mode) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [box, containerRef, selectedIds, allItems, onCommit]);

  if (!box || selectedIds.size === 0) return null;

  return (
    <>
      {/* Alignment Guides */}
      {guides.x !== undefined && <div className="absolute top-0 bottom-0 border-l border-red-500 z-[100]" style={{ left: `${guides.x}%` }} />}
      {guides.y !== undefined && <div className="absolute left-0 right-0 border-t border-red-500 z-[100]" style={{ top: `${guides.y}%` }} />}

      {/* Main Bounding Box */}
      <div
        ref={boxRef}
        className="absolute border-2 border-blue-500 bg-blue-500/5 cursor-move z-[90] flex items-center justify-center pointer-events-auto"
        style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
        onMouseDown={e => {
          e.stopPropagation();
          draggingState.current = {
            mode: "move",
            itemsStart: allItems.filter(i => selectedIds.has(i.id)).map(i => ({...i})),
            mouseStart: { x: e.clientX, y: e.clientY },
            boxStart: { ...box }
          };
          // Force a state update to bind window listeners
          setGuides({}); 
        }}
      >
         {/* Single Item Resize Handle (Bottom Right) */}
        {selectedIds.size === 1 && (
            <div
                className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-blue-500 cursor-se-resize rounded-full z-[100]"
                onMouseDown={e => {
                    e.stopPropagation();
                    draggingState.current = {
                        mode: "resize",
                        itemsStart: allItems.filter(i => selectedIds.has(i.id)).map(i => ({...i})),
                        mouseStart: { x: e.clientX, y: e.clientY },
                        boxStart: { ...box },
                        handleId: "se"
                    };
                    setGuides({});
                }}
            />
        )}
      </div>
    </>
  );
}
