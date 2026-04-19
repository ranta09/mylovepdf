import React from "react";
import {
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
  Loader2,
} from "lucide-react";

interface BottomBarProps {
  activePage: number;
  totalPages: number;
  zoom: number;
  zoomSteps: number[];
  saving: boolean;
  scrollToPage: (idx: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomFitWidth: () => void;
  onNewPdf: () => void;
  onSave: () => void;
}

export function BottomBar({
  activePage,
  totalPages,
  zoom,
  zoomSteps,
  saving,
  scrollToPage,
  zoomIn,
  zoomOut,
  zoomFitWidth,
  onNewPdf,
  onSave,
}: BottomBarProps) {
  return (
    <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-900 text-white px-4 h-9 shrink-0">
      <button
        onClick={() => scrollToPage(Math.max(0, activePage - 1))}
        disabled={activePage === 0}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        onClick={() =>
          scrollToPage(Math.min(totalPages - 1, activePage + 1))
        }
        disabled={activePage >= totalPages - 1}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <span className="text-white/60 text-xs">
        {activePage + 1} / {totalPages}
      </span>
      <div className="w-px h-4 bg-white/20 mx-1" />
      <button
        onClick={zoomOut}
        disabled={zoom <= zoomSteps[0]}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={zoomFitWidth}
        className="text-xs text-white/70 hover:text-white px-1 min-w-[38px] text-center"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={zoomIn}
        disabled={zoom >= zoomSteps[zoomSteps.length - 1]}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={zoomFitWidth}
        className="p-1 rounded hover:bg-white/10 transition-colors"
      >
        <MoveHorizontal className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onNewPdf}
        className="text-[10px] text-white/40 hover:text-white/70 transition-colors ml-1"
      >
        ← New PDF
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="ml-auto flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 h-6 text-xs font-semibold shadow-lg transition-colors disabled:opacity-70"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Save changes →
      </button>
    </div>
  );
}
