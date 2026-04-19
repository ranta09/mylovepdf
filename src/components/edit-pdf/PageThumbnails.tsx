import React from "react";
import { ZoomIn, ZoomOut, FileStack } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { EditorState } from "@/lib/pdfEditorUtils";

interface PageThumbnailsProps {
  previews: string[];
  state: EditorState;
  activePage: number;
  zoom: number;
  zoomSteps: number[];
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  scrollToPage: (idx: number) => void;
}

export function PageThumbnails({
  previews,
  state,
  activePage,
  zoom,
  zoomSteps,
  setZoom,
  zoomIn,
  zoomOut,
  scrollToPage,
}: PageThumbnailsProps) {
  return (
    <div className="w-[200px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
      {/* Manage Pages */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
          <FileStack className="h-4 w-4 text-gray-500 dark:text-gray-400" />{" "}
          Manage Pages
        </button>
      </div>

      {/* Page thumbnails */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {state.pageOrder.map((srcIdx, visIdx) => (
          <div
            key={`${srcIdx}-${visIdx}`}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              onClick={() => scrollToPage(visIdx)}
              className={cn(
                "w-full cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                activePage === visIdx
                  ? "border-blue-500 shadow-md"
                  : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <img
                src={previews[srcIdx]}
                alt={`Page ${visIdx + 1}`}
                className="w-full block"
                style={{
                  transform: `rotate(${state.pages[srcIdx].rotation}deg)`,
                  transition: "transform 0.3s",
                }}
              />
            </div>
            <div
              className={cn(
                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                activePage === visIdx
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              )}
            >
              {visIdx + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Zoom slider */}
      <div className="border-t border-gray-100 dark:border-gray-800 p-2 flex items-center gap-1.5">
        <button
          onClick={zoomOut}
          disabled={zoom <= zoomSteps[0]}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <Slider
          value={[zoom]}
          onValueChange={([v]) => setZoom(v)}
          min={zoomSteps[0]}
          max={zoomSteps[zoomSteps.length - 1]}
          step={0.01}
          className="flex-1"
        />
        <button
          onClick={zoomIn}
          disabled={zoom >= zoomSteps[zoomSteps.length - 1]}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 transition-colors"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
