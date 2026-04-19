import React from "react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Tool, Shape } from "./EditorToolbar";
import { SHAPES, ANNOT_TOOLS } from "./EditorToolbar";
import type { TextBlock } from "@/lib/pdfTextExtractor";

interface SecondaryToolbarProps {
  activeTool: Tool;
  activeShape: Shape;
  // Edit Text state
  selectedBlock: TextBlock | null;
  textFont: string;
  setTextFont: (v: string) => void;
  textSize: number[];
  setTextSize: (v: number[]) => void;
  textColor: string;
  setTextColor: (v: string) => void;
  textBold: boolean;
  setTextBold: (v: boolean) => void;
  textItalic: boolean;
  setTextItalic: (v: boolean) => void;
  textUnderline: boolean;
  setTextUnderline: (v: boolean) => void;
  textAlign: "left" | "center" | "right";
  setTextAlign: (v: "left" | "center" | "right") => void;
  selFontSize: number;
  setSelFontSize: (v: number) => void;
  selColor: string;
  setSelColor: (v: string) => void;
  selBold: boolean;
  setSelBold: (v: boolean) => void;
  selItalic: boolean;
  setSelItalic: (v: boolean) => void;
  selUnderline: boolean;
  setSelUnderline: (v: boolean) => void;
  selAlign: "left" | "center" | "right";
  setSelAlign: (v: "left" | "center" | "right") => void;
  updateTextBlockStyle: (blockId: string, updates: Partial<TextBlock>) => void;
  // Add Text state
  textContent: string;
  setTextContent: (v: string) => void;
  // Annotation state
  annotColor: string;
  setAnnotColor: (v: string) => void;
  commentText: string;
  setCommentText: (v: string) => void;
  // Info
  totalTextBlocks: number;
}

export function SecondaryToolbar(props: SecondaryToolbarProps) {
  const {
    activeTool,
    activeShape,
    selectedBlock,
    textFont,
    setTextFont,
    textSize,
    setTextSize,
    textColor,
    setTextColor,
    textBold,
    setTextBold,
    textItalic,
    setTextItalic,
    textUnderline,
    setTextUnderline,
    textAlign,
    setTextAlign,
    selFontSize,
    setSelFontSize,
    selColor,
    setSelColor,
    selBold,
    setSelBold,
    selItalic,
    setSelItalic,
    selUnderline,
    setSelUnderline,
    selAlign,
    setSelAlign,
    updateTextBlockStyle,
    textContent,
    setTextContent,
    annotColor,
    setAnnotColor,
    commentText,
    setCommentText,
    totalTextBlocks,
  } = props;

  const currentShape = SHAPES.find((s) => s.id === activeShape) ?? SHAPES[0];

  // ── EDIT TEXT ───────────────────────────────────────────────────────────
  if (activeTool === "editText") {
    return (
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5 px-3 h-10 shrink-0">
        <Select
          value={
            selectedBlock
              ? selectedBlock.customFontFamily || "helvetica"
              : textFont
          }
          onValueChange={(v) => {
            if (selectedBlock)
              updateTextBlockStyle(selectedBlock.id, {
                customFontFamily: v,
              });
            else setTextFont(v);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-[100px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="helvetica">Sans Serif</SelectItem>
            <SelectItem value="times">Serif</SelectItem>
            <SelectItem value="courier">Mono</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={String(selectedBlock ? selFontSize : textSize[0])}
          onValueChange={(v) => {
            const newSize = Number(v);
            if (selectedBlock) {
              setSelFontSize(newSize);
              updateTextBlockStyle(selectedBlock.id, {
                pdfFontSize: newSize,
                renderedFontSize: newSize * 2.0,
              });
            } else setTextSize([newSize]);
          }}
        >
          <SelectTrigger className="h-7 text-xs w-[52px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map(
              (s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        <button
          onClick={() => {
            if (selectedBlock) {
              setSelBold(!selBold);
              updateTextBlockStyle(selectedBlock.id, {
                customBold: !selBold,
              });
            } else setTextBold(!textBold);
          }}
          className={cn(
            "h-7 w-7 rounded border text-sm font-bold flex items-center justify-center transition-all",
            (selectedBlock ? selBold : textBold)
              ? "bg-blue-50 border-blue-400 text-blue-700"
              : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}
        >
          B
        </button>
        <button
          onClick={() => {
            if (selectedBlock) {
              setSelItalic(!selItalic);
              updateTextBlockStyle(selectedBlock.id, {
                customItalic: !selItalic,
              });
            } else setTextItalic(!textItalic);
          }}
          className={cn(
            "h-7 w-7 rounded border italic text-sm flex items-center justify-center transition-all",
            (selectedBlock ? selItalic : textItalic)
              ? "bg-blue-50 border-blue-400 text-blue-700"
              : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}
        >
          I
        </button>
        <button
          onClick={() => {
            if (selectedBlock) {
              setSelUnderline(!selUnderline);
              updateTextBlockStyle(selectedBlock.id, {
                customUnderline: !selUnderline,
              });
            } else setTextUnderline(!textUnderline);
          }}
          className={cn(
            "h-7 w-7 rounded border underline text-sm flex items-center justify-center transition-all",
            (selectedBlock ? selUnderline : textUnderline)
              ? "bg-blue-50 border-blue-400 text-blue-700"
              : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          )}
        >
          U
        </button>
        <div className="h-7 w-7 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center cursor-pointer relative overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800">
          <input
            type="color"
            value={selectedBlock ? selColor : textColor}
            onChange={(e) => {
              if (selectedBlock) {
                setSelColor(e.target.value);
                updateTextBlockStyle(selectedBlock.id, {
                  customColor: e.target.value,
                });
              } else setTextColor(e.target.value);
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span
            className="text-sm font-bold underline"
            style={{
              color: selectedBlock ? selColor : textColor,
            }}
          >
            A
          </span>
        </div>

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        {(["left", "center", "right"] as const).map((a) => {
          const Icon =
            a === "left"
              ? AlignLeft
              : a === "center"
              ? AlignCenter
              : AlignRight;
          const isAct = (selectedBlock ? selAlign : textAlign) === a;
          return (
            <button
              key={a}
              onClick={() => {
                if (selectedBlock) {
                  setSelAlign(a);
                  updateTextBlockStyle(selectedBlock.id, {
                    customAlign: a,
                  });
                } else setTextAlign(a);
              }}
              className={cn(
                "h-7 w-7 rounded border flex items-center justify-center transition-all",
                isAct
                  ? "bg-blue-50 border-blue-400 text-blue-700"
                  : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
        {selectedBlock ? (
          <span className="ml-2 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5">
            Editing block — press Escape to deselect
          </span>
        ) : (
          <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
            {totalTextBlocks > 0
              ? `${totalTextBlocks} text block${
                  totalTextBlocks !== 1 ? "s" : ""
                } found — click any blue dashed box to edit`
              : "No selectable text found in this PDF (may be image-based)"}
          </span>
        )}
      </div>
    );
  }

  // ── ADD TEXT ─────────────────────────────────────────────────────────────
  if (activeTool === "addText") {
    return (
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5 px-3 h-10 shrink-0">
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
          Text:
        </span>
        <input
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          className="h-7 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 w-32 focus:outline-none focus:border-blue-400"
        />
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />
        <Select value={textFont} onValueChange={setTextFont}>
          <SelectTrigger className="h-7 text-xs w-[90px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="helvetica">Sans Serif</SelectItem>
            <SelectItem value="times">Serif</SelectItem>
            <SelectItem value="courier">Mono</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={String(textSize[0])}
          onValueChange={(v) => setTextSize([Number(v)])}
        >
          <SelectTrigger className="h-7 text-xs w-[50px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="h-7 w-7 rounded border border-gray-200 dark:border-gray-600 relative overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span
            className="flex items-center justify-center h-full text-sm font-bold"
            style={{ color: textColor }}
          >
            A
          </span>
        </div>
        <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">
          Click anywhere on the page to place text
        </span>
      </div>
    );
  }

  // ── ANNOTATIONS / SHAPES / ERASER ───────────────────────────────────────
  if (ANNOT_TOOLS.includes(activeTool) || activeTool === "eraser") {
    return (
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 px-3 h-10 shrink-0">
        {activeTool !== "eraser" && (
          <>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">
              Color:
            </span>
            <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer relative overflow-hidden shadow-sm">
              <input
                type="color"
                value={annotColor}
                onChange={(e) => setAnnotColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div
                className="w-full h-full rounded-full"
                style={{ background: annotColor }}
              />
            </div>
            {activeTool === "annotate" && (
              <>
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  Comment:
                </span>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="h-7 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 w-36 focus:outline-none focus:border-blue-400"
                />
              </>
            )}
          </>
        )}
        <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-500">
          {activeTool === "pencil"
            ? "Draw freehand on the page"
            : activeTool === "highlight"
            ? "Drag to highlight an area"
            : activeTool === "eraser"
            ? "Drag a rectangle to erase all objects inside it, or click an object to erase it"
            : activeTool === "shapes"
            ? `Drag to draw a ${currentShape.label.toLowerCase()}`
            : "Click to place a comment"}
        </span>
      </div>
    );
  }

  // ── IMAGE ───────────────────────────────────────────────────────────────
  if (activeTool === "image") {
    return (
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 px-3 h-10 shrink-0">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          Drag a rectangle on the page to define the image placement area, then
          pick your image file.
        </span>
      </div>
    );
  }

  // ── SIGN ────────────────────────────────────────────────────────────────
  if (activeTool === "sign") {
    return (
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 px-3 h-10 shrink-0">
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          Draw your signature below, then click Place:
        </span>
      </div>
    );
  }

  return null;
}
