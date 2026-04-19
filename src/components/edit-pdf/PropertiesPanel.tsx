import React, { useRef, useState, useEffect } from "react";
import { CheckCircle2, Download, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { makeId, type SignatureOverlay } from "@/lib/pdfEditorUtils";
import { toast } from "sonner";

const SIG_STORAGE_KEY = "magicdocx_saved_signatures";

interface SavedSignature {
  id: string;
  dataUrl: string;
  createdAt: number;
}

function loadSavedSignatures(): SavedSignature[] {
  try {
    const raw = localStorage.getItem(SIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSigsToStorage(sigs: SavedSignature[]) {
  try {
    localStorage.setItem(SIG_STORAGE_KEY, JSON.stringify(sigs));
  } catch {
    /* storage full — ignore */
  }
}

interface PropertiesPanelProps {
  activeTool: string;
  activePage: number;
  addOverlay: (pageIdx: number, overlay: any) => void;
  versions: { name: string; data: Uint8Array }[];
  downloadVersion: (v: { name: string; data: Uint8Array }) => void;
}

export function PropertiesPanel({
  activeTool,
  activePage,
  addOverlay,
  versions,
  downloadVersion,
}: PropertiesPanelProps) {
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sigDrawing, setSigDrawing] = useState(false);
  const [sigPlaced, setSigPlaced] = useState(false);
  const [savedSigs, setSavedSigs] = useState<SavedSignature[]>([]);

  // Load saved signatures on mount
  useEffect(() => {
    setSavedSigs(loadSavedSignatures());
  }, []);

  const startSig = (e: React.MouseEvent) => {
    setSigDrawing(true);
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent) => {
    if (!sigDrawing) return;
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const rect = sigCanvasRef.current!.getBoundingClientRect();
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const clearSig = () => {
    const ctx = sigCanvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, 400, 120);
    setSigPlaced(false);
  };

  const placeSigFromDataUrl = (dataUrl: string) => {
    addOverlay(activePage, {
      id: makeId(),
      type: "signature",
      dataUrl,
      x: 10,
      y: 75,
      width: 30,
      height: 10,
    } as SignatureOverlay);
    setSigPlaced(true);
    toast.success("Signature placed on page!");
  };

  const placeSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    placeSigFromDataUrl(dataUrl);
  };

  const saveCurrentSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    // Check if canvas is blank
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasContent = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) { hasContent = true; break; }
    }
    if (!hasContent) {
      toast.error("Draw a signature first");
      return;
    }

    const newSig: SavedSignature = {
      id: makeId(),
      dataUrl,
      createdAt: Date.now(),
    };
    const updated = [...savedSigs, newSig];
    setSavedSigs(updated);
    saveSigsToStorage(updated);
    toast.success("Signature saved for reuse!");
  };

  const deleteSavedSig = (id: string) => {
    const updated = savedSigs.filter((s) => s.id !== id);
    setSavedSigs(updated);
    saveSigsToStorage(updated);
  };

  if (activeTool !== "sign") return null;

  return (
    <div className="w-[220px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col p-4 gap-3 shrink-0 overflow-y-auto">
      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
        Signature Pad
      </h3>
      <canvas
        ref={sigCanvasRef}
        width={190}
        height={110}
        className="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-white cursor-crosshair"
        onMouseDown={startSig}
        onMouseMove={drawSig}
        onMouseUp={() => setSigDrawing(false)}
        onMouseLeave={() => setSigDrawing(false)}
      />
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={clearSig}
          className="flex-1 text-xs h-7"
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={placeSig}
          className="flex-1 text-xs h-7 bg-indigo-600 hover:bg-indigo-700 text-white gap-1 border-0"
        >
          <CheckCircle2 className="h-3 w-3" /> Place
        </Button>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={saveCurrentSig}
        className="text-xs h-7 w-full"
      >
        💾 Save for reuse
      </Button>
      {sigPlaced && (
        <p className="text-[11px] text-indigo-600 font-medium text-center">
          ✓ Placed on page!
        </p>
      )}

      {/* ── Saved Signatures Gallery ── */}
      {savedSigs.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Saved Signatures ({savedSigs.length})
          </p>
          <div className="flex flex-col gap-2">
            {savedSigs.map((sig) => (
              <div
                key={sig.id}
                className="relative group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 cursor-pointer hover:border-indigo-400 hover:shadow-sm transition-all"
                onClick={() => placeSigFromDataUrl(sig.dataUrl)}
                title="Click to place this signature"
              >
                <img
                  src={sig.dataUrl}
                  alt="Saved signature"
                  className="w-full h-12 object-contain"
                  style={{ mixBlendMode: "multiply" }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSavedSig(sig.id);
                  }}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center transition-opacity"
                  title="Delete saved signature"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Version History ── */}
      {versions.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Saved Versions
          </p>
          {versions.map((v, i) => (
            <button
              key={i}
              onClick={() => downloadVersion(v)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-[10px] hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <span className="font-medium truncate">{v.name}</span>
              <Download className="h-3 w-3 text-gray-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
