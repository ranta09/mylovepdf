import React from "react";
import {
  Edit3, Type, ImageIcon, MessageSquare, PenLine,
  Undo2, Redo2,
  Highlighter,
  Pencil, MousePointer2, Eraser,
  Minus, ArrowUpRight, Square, Circle, Triangle, Spline,
  Maximize, Minimize,
  ChevronDown,
  Printer, Search,
  Download, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tool = "select" | "addText" | "editText" | "sign" | "pencil" | "highlight" | "eraser" | "annotate" | "image" | "shapes";
export type Shape = "ellipse" | "line" | "arrow" | "rectangle" | "polygon" | "polyline";

const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: "select",    icon: MousePointer2, label: "Select"    },
  { id: "addText",   icon: Type,          label: "Add Text"  },
  { id: "editText",  icon: Edit3,         label: "Edit Text" },
  { id: "sign",      icon: PenLine,       label: "Sign"      },
  { id: "pencil",    icon: Pencil,        label: "Pencil"    },
  { id: "highlight", icon: Highlighter,   label: "Highlight" },
  { id: "eraser",    icon: Eraser,        label: "Eraser"    },
  { id: "annotate",  icon: MessageSquare, label: "Annotate"  },
  { id: "image",     icon: ImageIcon,     label: "Image"     },
];

export const SHAPES: { id: Shape; icon: React.ElementType; label: string }[] = [
  { id: "ellipse",   icon: Circle,       label: "Ellipse"   },
  { id: "line",      icon: Minus,        label: "Line"      },
  { id: "arrow",     icon: ArrowUpRight, label: "Arrow"     },
  { id: "rectangle", icon: Square,       label: "Rectangle" },
  { id: "polygon",   icon: Triangle,     label: "Polygon"   },
  { id: "polyline",  icon: Spline,       label: "Polyline"  },
];

export const ANNOT_TOOLS: Tool[] = ["pencil", "highlight", "annotate", "shapes"];

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditorToolbarProps {
  activeTool: Tool;
  setActiveTool: (t: Tool) => void;
  activeShape: Shape;
  setActiveShape: (s: Shape) => void;
  shapeDropdownOpen: boolean;
  setShapeDropdownOpen: (o: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  dirtyCount: number;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  onSave: () => void;
  saving: boolean;
  onPrint?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditorToolbar({
  activeTool,
  setActiveTool,
  activeShape,
  setActiveShape,
  shapeDropdownOpen,
  setShapeDropdownOpen,
  undo,
  redo,
  canUndo,
  canRedo,
  dirtyCount,
  isFullscreen,
  toggleFullscreen,
  onSave,
  saving,
  onPrint,
}: EditorToolbarProps) {
  const currentShape = SHAPES.find((s) => s.id === activeShape) ?? SHAPES[0];

  return (
    <div className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-gray-700 flex items-center px-3 h-[68px] shrink-0 gap-0.5">
      {/* Undo / Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors min-w-[52px]"
      >
        <Undo2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          Undo
        </span>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors min-w-[52px]"
      >
        <Redo2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          Redo
        </span>
      </button>

      <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-1.5 shrink-0" />

      {/* Tool buttons */}
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[52px]",
              isActive
                ? "bg-blue-50 dark:bg-blue-950"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {tool.label}
            </span>
          </button>
        );
      })}

      {/* Shape picker with dropdown */}
      <div className="relative flex items-end">
        <button
          onClick={() => {
            setActiveTool("shapes");
            setShapeDropdownOpen(false);
          }}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-l-lg transition-all min-w-[52px]",
            activeTool === "shapes"
              ? "bg-blue-50 dark:bg-blue-950"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <currentShape.icon
            className={cn(
              "h-5 w-5",
              activeTool === "shapes"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-gray-300"
            )}
          />
          <span
            className={cn(
              "text-[10px] font-medium whitespace-nowrap",
              activeTool === "shapes"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            {currentShape.label}
          </span>
        </button>
        <button
          onClick={() => setShapeDropdownOpen(!shapeDropdownOpen)}
          className={cn(
            "flex items-center justify-center px-1 self-stretch rounded-r-lg transition-all border-l border-gray-100 dark:border-gray-700",
            activeTool === "shapes"
              ? "bg-blue-50 dark:bg-blue-950 text-blue-500"
              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
          )}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
        {shapeDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-xl z-[200] py-1 min-w-[150px]">
            {SHAPES.map((shape) => (
              <button
                key={shape.id}
                onClick={() => {
                  setActiveShape(shape.id);
                  setActiveTool("shapes");
                  setShapeDropdownOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  activeShape === shape.id
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                )}
              >
                <shape.icon className="h-4 w-4 shrink-0" />
                {shape.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onPrint ? onPrint() : window.print()}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[50px] text-gray-700 dark:text-gray-300"
          >
            <Printer className="h-5 w-5" />
            <span className="text-[10px] font-medium">Print</span>
          </button>
          <button
            onClick={() => alert("Please use Ctrl+F (or Cmd+F on Mac) to search the document text.")}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-w-[50px] text-gray-700 dark:text-gray-300"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px] font-medium">Search</span>
          </button>
        </div>

        {dirtyCount > 0 && (
          <span className="text-[10px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5 font-medium">
            {dirtyCount} edit{dirtyCount > 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <Maximize className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className="ml-2 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
