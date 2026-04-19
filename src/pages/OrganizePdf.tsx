import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import DownloadScreen from "@/components/DownloadScreen";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  LayoutGrid,
  Trash2,
  Loader2,
  Info,
  ShieldCheck,
  Download,
  CheckCircle2,
  Settings,
  X,
  Plus,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Copy,
  PlusSquare,
  Undo2,
  Redo2,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  GripVertical,
  CheckSquare,
  Square,
  Zap,
  Minimize2,
  Scissors,
  Lock,
  FileText,
  FilePlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
const PDFJS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

// Strict Mode Droppable workaround for React 18
const StrictDroppable = ({ children, ...props }: any) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

interface PageData {
  id: string;
  originalFileIndex: number; // Index in the 'files' array
  originalPageIndex: number; // 0-indexed page in that file
  thumbnail: string;
  rotation: number;
  isBlank?: boolean;
}

interface HistoryState {
  pages: PageData[];
}

const FILE_COLORS = [
  { solid: "bg-primary", light: "bg-primary/20", hover: "hover:bg-primary/40", border: "border-primary", text: "text-primary" },
  { solid: "bg-rose-600", light: "bg-rose-600/20", hover: "hover:bg-rose-600/40", border: "border-rose-600", text: "text-rose-600" },
  { solid: "bg-emerald-600", light: "bg-emerald-600/20", hover: "hover:bg-emerald-600/40", border: "border-emerald-600", text: "text-emerald-600" },
  { solid: "bg-amber-600", light: "bg-amber-600/20", hover: "hover:bg-amber-600/40", border: "border-amber-600", text: "text-amber-600" },
  { solid: "bg-indigo-600", light: "bg-indigo-600/20", hover: "hover:bg-indigo-600/40", border: "border-indigo-600", text: "text-indigo-600" },
  { solid: "bg-purple-600", light: "bg-purple-600/20", hover: "hover:bg-purple-600/40", border: "border-purple-600", text: "text-purple-600" },
];

interface FileWithMetadata {
  file: File;
  id: string;
  colorIndex: number;
}

const OrganizePdf = () => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [baselinePages, setBaselinePages] = useState<PageData[]>([]);
  const [results, setResults] = useState<{
    url: string;
    name: string;
    pageCount: number;
    size: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"configure" | "options">("configure");
  const [organizeTargetTab, setOrganizeTargetTab] = useState<"actions" | "selection">("actions");
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const pushToHistory = (newPages: PageData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ pages: [...newPages] });
    // Limit history to 50 steps
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPages(newPages);
  };

  const handleFilesChange = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      if (files.length === 0) resetAll();
      return;
    }

    setLoadingThumbnails(true);
    const startIdxCount = files.length;
    
    // Assign stable IDs and color indices to the new files
    const newFilesWithMetadata: FileWithMetadata[] = newFiles.map((file, i) => ({
      file,
      id: generateId(),
      colorIndex: (startIdxCount + i) % FILE_COLORS.length
    }));

    const updatedFiles = [...files, ...newFilesWithMetadata];
    setFiles(updatedFiles);

    try {
      const allNewPages: PageData[] = [];
      for (let fIdx = 0; fIdx < newFilesWithMetadata.length; fIdx++) {
        const fileData = newFilesWithMetadata[fIdx];
        const arrayBuffer = await fileData.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;

          allNewPages.push({
            id: generateId(),
            originalFileIndex: startIdxCount + fIdx,
            originalPageIndex: i - 1,
            thumbnail: canvas.toDataURL('image/jpeg', 0.8),
            rotation: 0,
          });
        }
      }

      const combinedPages = [...pages, ...allNewPages];
      setBaselinePages(prev => [...prev, ...allNewPages]);
      pushToHistory(combinedPages);
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error("Failed to load PDF. It might be protected.");
    } finally {
      setLoadingThumbnails(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    pushToHistory(items);
  };

  const togglePageSelection = (e: React.MouseEvent, pageId: string) => {
    const newSelection = new Set(selectedPageIds);
    const currentIndex = pages.findIndex(p => p.id === pageId);

    if (e.shiftKey && lastSelectedId) {
      const lastIndex = pages.findIndex(p => p.id === lastSelectedId);
      if (lastIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        for (let i = start; i <= end; i++) {
          newSelection.add(pages[i].id);
        }
      }
    } else if (e.metaKey || e.ctrlKey) {
      if (newSelection.has(pageId)) newSelection.delete(pageId);
      else newSelection.add(pageId);
    } else {
      if (newSelection.has(pageId)) newSelection.delete(pageId);
      else newSelection.add(pageId);
    }

    setSelectedPageIds(newSelection);
    setLastSelectedId(pageId);
  };

  const selectAll = () => {
    if (selectedPageIds.size === pages.length) setSelectedPageIds(new Set());
    else setSelectedPageIds(new Set(pages.map(p => p.id)));
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setPages(history[prevIndex].pages);
      setHistoryIndex(prevIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setPages(history[nextIndex].pages);
      setHistoryIndex(nextIndex);
    }
  };

  const rotateSelected = (deg: number) => {
    if (selectedPageIds.size === 0) {
      toast.error("Please select pages to rotate");
      return;
    }
    const newPages = pages.map(p =>
      selectedPageIds.has(p.id) ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    );
    pushToHistory(newPages);
  };

  const rotateSingle = (e: React.MouseEvent, pageId: string, deg: number) => {
    e.stopPropagation(); // Prevent togglePageSelection from firing
    const newPages = pages.map(p =>
      p.id === pageId ? { ...p, rotation: (p.rotation + deg + 360) % 360 } : p
    );
    pushToHistory(newPages);
  };

  const deleteSingle = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    const newPages = pages.filter(p => p.id !== pageId);
    pushToHistory(newPages);
  };

  const insertBlankAfter = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    const newPages = [...pages];
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 560;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 400, 560);

    const blankPage: PageData = {
      id: generateId(),
      originalFileIndex: -1,
      originalPageIndex: -1,
      thumbnail: canvas.toDataURL('image/jpeg', 0.1),
      rotation: 0,
      isBlank: true
    };
    const idx = pages.findIndex(p => p.id === pageId);
    newPages.splice(idx + 1, 0, blankPage);
    pushToHistory(newPages);
  };

  const reverseOrder = () => {
    if (pages.length < 2) return;
    const newPages = [...pages].reverse();
    pushToHistory(newPages);
  };

  const removeFile = (fIdx: number) => {
    const fileToRemove = files[fIdx];
    if (!fileToRemove) return;

    // Filter out pages belonging to this file
    const filteredPages = pages.filter(p => p.originalFileIndex !== fIdx);
    
    // Also remove from baseline so Reset All doesn't bring back the removed file
    setBaselinePages(prev => {
      const filtered = prev.filter(p => p.originalFileIndex !== fIdx);
      return filtered.map(p => {
        if (p.originalFileIndex > fIdx) return { ...p, originalFileIndex: p.originalFileIndex - 1 };
        return p;
      });
    });

    // Update indices for remaining pages
    const adjustedPages = filteredPages.map(p => {
      if (p.originalFileIndex > fIdx) {
        return { ...p, originalFileIndex: p.originalFileIndex - 1 };
      }
      return p;
    });

    setFiles(prev => prev.filter((_, i) => i !== fIdx));
    pushToHistory(adjustedPages);
  };

  const moveFile = (fIdx: number, direction: 'up' | 'down') => {
    const targetIdx = fIdx + (direction === 'up' ? -1 : 1);
    if (targetIdx < 0 || targetIdx >= files.length) return;

    // 1. Swap in files array
    const newFiles = [...files];
    [newFiles[fIdx], newFiles[targetIdx]] = [newFiles[targetIdx], newFiles[fIdx]];
    setFiles(newFiles);

    // 2. Update page metadata (indices)
    const updatedMetadataPages = pages.map(p => {
      if (p.originalFileIndex === fIdx) return { ...p, originalFileIndex: targetIdx };
      if (p.originalFileIndex === targetIdx) return { ...p, originalFileIndex: fIdx };
      return p;
    });

    // 3. Physically reorder pages: bring all pages of the moved file to the target position
    // We'll group them CONTIGUOUSLY based on the new file order to make it predictable.
    const reorderedPages: PageData[] = [];
    newFiles.forEach((_, fileIndex) => {
      const filePages = updatedMetadataPages.filter(p => p.originalFileIndex === fileIndex);
      reorderedPages.push(...filePages);
    });
    
    // Also include any 'orphaned' pages (like blank pages with originalFileIndex: -1)
    const blankPages = updatedMetadataPages.filter(p => p.originalFileIndex === -1);
    reorderedPages.push(...blankPages);
    
    pushToHistory(reorderedPages);
  };

  const movePage = (e: React.MouseEvent, pageId: string, direction: 'forward' | 'backward') => {
    e.stopPropagation();
    const idx = pages.findIndex(p => p.id === pageId);
    if (idx === -1) return;

    const targetIdx = direction === 'forward' ? idx + 1 : idx - 1;
    if (targetIdx < 0 || targetIdx >= pages.length) return;

    const newPages = [...pages];
    [newPages[idx], newPages[targetIdx]] = [newPages[targetIdx], newPages[idx]];
    pushToHistory(newPages);
  };

  const deleteSelected = () => {
    if (selectedPageIds.size === 0) {
      toast.error("Please select pages to delete");
      return;
    }
    if (selectedPageIds.size >= pages.length) {
      toast.error("Cannot delete all pages");
      return;
    }
    const newPages = pages.filter(p => !selectedPageIds.has(p.id));
    setSelectedPageIds(new Set());
    pushToHistory(newPages);
  };

  const duplicateSelected = () => {
    if (selectedPageIds.size === 0) {
      toast.error("Please select pages to duplicate");
      return;
    }
    const newPages = [...pages];
    pages.forEach((p, idx) => {
      if (selectedPageIds.has(p.id)) {
        const pos = newPages.findIndex(item => item.id === p.id);
        newPages.splice(pos + 1, 0, { ...p, id: generateId() });
      }
    });
    pushToHistory(newPages);
    toast.success("Pages duplicated");
  };

  const insertBlankPage = () => {
    const newPages = [...pages];
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 560;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 400, 560);

    const blankPage: PageData = {
      id: generateId(),
      originalFileIndex: -1,
      originalPageIndex: -1,
      thumbnail: canvas.toDataURL('image/jpeg', 0.1),
      rotation: 0,
      isBlank: true
    };

    if (lastSelectedId) {
      const idx = pages.findIndex(p => p.id === lastSelectedId);
      newPages.splice(idx + 1, 0, blankPage);
    } else {
      newPages.push(blankPage);
    }
    pushToHistory(newPages);
    toast.success("Blank page inserted");
  };

  const applyChanges = async () => {
    if (pages.length === 0) return;
    setProcessing(true);
    setProgress(0);

    try {
      const outDoc = await PDFDocument.create();
      const sourcePdfDocs = await Promise.all(
        files.map(async f => PDFDocument.load(await f.file.arrayBuffer()))
      );

      for (let i = 0; i < pages.length; i++) {
        const pData = pages[i];
        let pToInsert;

        if (pData.isBlank) {
          pToInsert = outDoc.addPage([595.28, 841.89]); // A4
        } else {
          const srcDoc = sourcePdfDocs[pData.originalFileIndex];
          const [copiedPage] = await outDoc.copyPages(srcDoc, [pData.originalPageIndex]);
          pToInsert = outDoc.addPage(copiedPage);
        }

        if (pData.rotation !== 0) {
          const currentRot = pToInsert.getRotation().angle;
          pToInsert.setRotation(degrees(currentRot + pData.rotation));
        }

        setProgress(Math.round(((i + 1) / pages.length) * 100));
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const name = files[0].file.name.replace(/\.pdf$/i, "_organized.pdf");

      setResults({
        url,
        name,
        pageCount: pages.length,
        size: (blob.size / (1024 * 1024)).toFixed(2) + " MB"
      });
      toast.success("PDF organized successfully!");
    } catch (err) {
      console.error("Organize failed", err);
      toast.error("Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    if (baselinePages.length > 0) {
      pushToHistory([...baselinePages]);
      setSelectedPageIds(new Set());
    } else {
      // If already at baseline or no files, actually clear everything
      setFiles([]);
      setPages([]);
      setBaselinePages([]);
      setHistory([]);
      setHistoryIndex(-1);
      setActiveTab("configure");
    }
    setOrganizeTargetTab("actions");
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  return (
    <ToolLayout
      title="Organize PDF"
      description="Modern workspace for reordering, rotating, and managing your PDF pages"
      category="edit"
      icon={<LayoutGrid className="h-7 w-7" />}
      metaTitle="Organize PDF Online Free – Reorder, Delete & Rotate Pages | MagicDocx"
      metaDescription="Organize PDF pages online for free. Reorder with drag-and-drop, rotate, delete, duplicate, or insert blank pages. Multi-file support with undo/redo. No sign-up."
      toolId="organize"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <ToolUploadScreen
            title="Organize PDF"
            description="Reorder, rotate, delete and manage your PDF pages"
            buttonLabel="Select PDF file"
            accept=".pdf"
            multiple={true}
            onFilesSelected={handleFilesChange}
          />
        ) : processing ? (
          <div className="mt-4 mx-auto max-w-2xl w-full rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-6 relative flex justify-center items-center h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <RefreshCw className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-1 uppercase tracking-tight">Organizing your PDF...</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">Applying layout changes and reordering</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span>Progress</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
                <motion.div
                  className="h-full bg-primary rounded-full shadow-glow"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : results ? (
          <DownloadScreen
            title="PDF organized successfully!"
            downloadLabel="DOWNLOAD ORGANIZED PDF"
            resultUrl={results.url}
            resultName={results.name}
            onReset={resetAll}
            recommendedTools={[
              { name: "Merge PDF", path: "/merge-pdf", icon: LayoutGrid },
              { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
              { name: "Split PDF", path: "/split-pdf", icon: Scissors },
              { name: "Delete Pages", path: "/delete-pages", icon: Trash2 },
              { name: "Protect PDF", path: "/protect-pdf", icon: Lock },
              { name: "Add Page Numbers", path: "/page-numbers", icon: FileText },
            ]}
          />
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
              {/* MOBILE TAB CONTROL */}
              <div className="lg:hidden dark:bg-[#16191E] bg-white border-b dark:border-white/5 border-border p-2 flex gap-1 shadow-sm shrink-0">
                <button
                  onClick={() => setActiveTab("configure")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "dark:text-white/40 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-inherit">Organize</span>
                </button>
                <button
                  onClick={() => setActiveTab("options")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300",
                    activeTab === "options" ? "bg-primary text-white shadow-elevated" : "dark:text-white/40 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-inherit">Controls</span>
                </button>
              </div>

              {/* SHARED CONTENT AREA */}
              <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
                
                <div className={cn(
                  "flex-1 flex flex-col min-h-0 overflow-hidden dark:bg-[#0B0D11] bg-slate-50/50 relative border-r dark:border-white/5 border-border",
                  activeTab !== "configure" && "hidden lg:flex"
                )}>
                  {/* Background Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
                  
                  
                  {/* Zoom Toolbar */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[40] hidden sm:flex items-center gap-1 p-1.5 dark:bg-black/60 bg-white/80 backdrop-blur-xl border dark:border-white/10 border-border shadow-2xl rounded-2xl">
                    <button 
                      onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
                      className="h-8 w-8 rounded-xl dark:hover:bg-white/10 hover:bg-black/5 flex items-center justify-center dark:text-white/70 text-muted-foreground hover:text-primary dark:hover:text-white transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <div className="h-4 w-px dark:bg-white/10 bg-border mx-1" />
                    <button 
                      onClick={() => setZoom(0.7)}
                      className="px-3 h-8 rounded-xl dark:hover:bg-white/10 hover:bg-black/5 flex items-center justify-center text-[10px] font-black uppercase tracking-widest dark:text-white/70 text-muted-foreground hover:text-primary dark:hover:text-white transition-colors"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <div className="h-4 w-px dark:bg-white/10 bg-border mx-1" />
                    <button 
                      onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                      className="h-8 w-8 rounded-xl dark:hover:bg-white/10 hover:bg-black/5 flex items-center justify-center dark:text-white/70 text-muted-foreground hover:text-primary dark:hover:text-white transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-12 sm:pt-20 custom-scrollbar relative z-10">
                    {loadingThumbnails && pages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest dark:text-white/40 text-muted-foreground animate-pulse">Initializing Workspace...</p>
                      </div>
                    ) : (
                      <DragDropContext onDragEnd={onDragEnd}>
                        <StrictDroppable droppableId="pages" direction="horizontal">
                          {(provided: any) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="grid grid-cols-[repeat(auto-fill,minmax(theme(spacing.44),1fr))] gap-x-8 gap-y-12 items-start max-w-[100rem] mx-auto pb-20 px-4 sm:px-10"
                              style={{ 
                                gridTemplateColumns: `repeat(auto-fill, minmax(${220 * zoom}px, 1fr))` 
                              }}
                            >
                              {pages.map((page, index) => {
                                const isSelected = selectedPageIds.has(page.id);
                                const fileColor = FILE_COLORS[files[page.originalFileIndex]?.colorIndex] || FILE_COLORS[0];

                                return (
                                  <Draggable key={page.id} draggableId={page.id} index={index}>
                                    {(provided: any, snapshot: any) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                          "relative flex flex-col items-center",
                                          snapshot.isDragging ? "z-[100]" : "transition-all duration-300"
                                        )}
                                        style={{
                                          ...provided.draggableProps.style,
                                          width: '100%', maxWidth: `${220 * zoom}px`,
                                        }}
                                      >
                                        <div
                                           className={cn("relative aspect-[3/4.2] w-[95%] sm:w-full p-2.5 rounded-xl transition-all duration-500 overflow-visible cursor-pointer group flex flex-col",
                                            isSelected ? fileColor.solid : "dark:bg-[#16191E] bg-white border border-border hover:border-primary/30 shadow-sm",
                                            snapshot.isDragging ? `shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-4 ring-primary/60 scale-110 z-[101]` : `${fileColor.light}`
                                          )}
                                          onClick={(e) => togglePageSelection(e, page.id)}
                                        >
                                          {/* Selection Indicator inside the card */}
                                          {isSelected && (
                                            <div className="absolute top-4 left-4 z-20">
                                              <div className={cn("bg-white rounded-md p-1 shadow-sm", fileColor.text)}>
                                                <CheckCircle2 className="h-3 w-3" />
                                              </div>
                                            </div>
                                          )}

                                          <div className="w-full flex-1 bg-black/5 dark:bg-black/20 rounded-lg flex flex-col overflow-hidden shadow-sm hover:shadow relative">
                                            <div {...provided.dragHandleProps} className="flex-1 cursor-grab active:cursor-grabbing flex-1 p-2 flex items-center justify-center relative overflow-hidden bg-black/5 dark:bg-black/20">
                                              {page.thumbnail ? (
                                                <img 
                                                  src={page.thumbnail} 
                                                  alt={`P${index + 1}`} 
                                                  className="max-w-[95%] max-h-[95%] object-contain rounded drop-shadow transition-transform duration-500" 
                                                  style={{ transform: `rotate(${page.rotation}deg)` }}
                                                  loading="lazy" 
                                                />
                                              ) : (
                                                <div className="flex flex-col items-center gap-1 opacity-20">
                                                  <FileText className="h-8 w-8 dark:text-white text-black" />
                                                </div>
                                              )}
                                               {isSelected && <div className={cn("absolute inset-0 pointer-events-none", fileColor.solid, "opacity-5")} />}
                                             </div>
                                             <div className="h-7 sm:h-8 flex items-center justify-between dark:bg-black/40 bg-black/5 border-t dark:border-white/5 border-border shrink-0 px-2 overflow-hidden relative z-[40]">
                                               {index > 0 ? (
                                                 <button 
                                                   onClick={(e) => movePage(e, page.id, "backward")}
                                                   className="h-5 w-5 rounded-md dark:hover:bg-white/10 hover:bg-black/5 flex items-center justify-center text-primary transition-colors cursor-pointer"
                                                   title="Move Backward"
                                                 >
                                                   <ChevronLeft className="h-4 w-4" />
                                                 </button>
                                               ) : <div className="w-5" />}

                                               <span className="text-[10px] font-black dark:text-white/70 text-muted-foreground">{index + 1}</span>

                                               {index < pages.length - 1 ? (
                                                 <button 
                                                   onClick={(e) => movePage(e, page.id, "forward")}
                                                   className="h-5 w-5 rounded-md dark:hover:bg-white/10 hover:bg-black/5 flex items-center justify-center text-primary transition-colors cursor-pointer"
                                                   title="Move Forward"
                                                 >
                                                   <ChevronRight className="h-4 w-4" />
                                                 </button>
                                               ) : <div className="w-5" />}
                                             </div>
                                           </div>
                                          
                                          {/* Top Right Hover Actions */}
                                          <div className="absolute -top-2.5 -right-2.5 z-[50] flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={(e) => rotateSingle(e, page.id, 90)} 
                                              className={cn("h-6 w-6 rounded-full bg-white shadow-md border flex items-center justify-center hover:scale-110 transition-transform", fileColor.text)}
                                              title="Rotate Right"
                                            >
                                              <RotateCw className="h-3 w-3" />
                                            </button>
                                            <button 
                                              onClick={(e) => deleteSingle(e, page.id)} 
                                              className="h-6 w-6 rounded-full bg-white shadow-md border flex items-center justify-center text-muted-foreground hover:text-destructive hover:scale-110 transition-transform"
                                              title="Delete Page"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>

                                          {/* Insert Between Pages Action */}
                                          <div className="absolute top-1/2 -right-4 -translate-y-1/2 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={(e) => insertBlankAfter(e, page.id)} 
                                              className={cn("h-7 w-7 rounded-full bg-white shadow-md border border-border/50 flex flex-col items-center justify-center text-muted-foreground hover:scale-110 transition-all relative overflow-hidden", `hover:${fileColor.text}`)}
                                              title="Insert blank page here"
                                            >
                                              <FilePlus className="h-4 w-4" />
                                              <div className={cn("absolute bottom-1 right-1 text-white text-[5px] font-bold rounded-tl-sm px-0.5 leading-none", fileColor.solid)}>
                                                +
                                              </div>
                                            </button>
                                          </div>

                                          {/* Drag Handle trigger */}
                                          <div
                                            {...provided.dragHandleProps}
                                            className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing opacity-0"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}

                              {/* Upload Another Card (Match Rotate PDF) */}
                              <motion.button 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={() => fileInputRef.current?.click()} 
                                className="aspect-[3/4.2] border-2 border-dashed dark:border-white/10 border-border dark:bg-[#16191E] bg-white shadow-lg dark:hover:border-primary/50 hover:border-primary/30 rounded-2xl flex flex-col items-center justify-center gap-4 dark:text-white/40 text-muted-foreground hover:text-primary transition-all group flex-shrink-0"
                                style={{ width: '100%', maxWidth: `${220 * zoom}px` }}
                              >
                                <div className="w-10 h-10 rounded-full dark:bg-white/5 bg-black/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm text-inherit">
                                  <Plus className="h-5 w-5" />
                                </div>
                                <div className="text-center px-2">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-inherit">Upload</p>
                                  <p className="text-[8px] font-bold uppercase opacity-30 text-inherit">Another PDF</p>
                                </div>
                              </motion.button>
                            </div>
                          )}
                        </StrictDroppable>
                      </DragDropContext>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "w-full lg:w-[320px] xl:w-[350px] shrink-0 flex flex-col min-h-0 dark:bg-[#0B0D11] bg-white overflow-hidden border-l dark:border-white/5 border-border",
                  activeTab !== "options" && "hidden lg:flex"
                )}>
                  <div className="flex-1 flex flex-col min-h-0 p-6 relative">
                    <div className="mb-6 shrink-0">
                      <h2 className="text-xl sm:text-2xl font-black dark:text-white text-foreground text-center border-b dark:border-white/10 border-border pb-4 tracking-tighter capitalize transition-all">Organize PDF</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 touch-pan-y">
                      <div className="space-y-4 pb-24">
                        <div className="flex items-center justify-between pb-2 border-b dark:border-white/10 border-border">
                           <span className="font-bold text-sm dark:text-white/70 text-muted-foreground">Source Files:</span>
                           <button onClick={resetAll} className="text-sm font-bold text-rose-500 hover:text-rose-400">Reset Workspace</button>
                        </div>
                         {files.map((fileData, fIdx) => {
                           const fileColor = FILE_COLORS[fileData.colorIndex] || FILE_COLORS[0];
                           return (
                             <div key={fileData.id} className={cn("flex items-center gap-2 p-3 text-white rounded-lg shadow-sm transition-all animate-in slide-in-from-right-4 duration-300", fileColor.solid)}>
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                  <span className="text-[10px] font-black truncate uppercase tracking-tight">{fileData.file.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    disabled={fIdx === 0}
                                    onClick={() => moveFile(fIdx, 'up')}
                                    className="h-6 w-6 rounded bg-black/10 hover:bg-black/20 flex items-center justify-center disabled:opacity-20 transition-colors"
                                    title="Move Up"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button 
                                    disabled={fIdx === files.length - 1}
                                    onClick={() => moveFile(fIdx, 'down')}
                                    className="h-6 w-6 rounded bg-black/10 hover:bg-black/20 flex items-center justify-center disabled:opacity-20 transition-colors"
                                    title="Move Down"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button 
                                    onClick={() => removeFile(fIdx)}
                                    className="h-6 w-6 rounded bg-black/10 hover:bg-rose-500/80 flex items-center justify-center transition-colors"
                                    title="Remove File"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                             </div>
                           );
                         })}
                      </div>
                    </div>

                    {/* Desktop Execution Button */}
                    <div className="hidden lg:block shrink-0 pt-6 border-t dark:border-white/10 border-border dark:bg-[#0B0D11] bg-white">
                      <Button
                        size="lg"
                        className="w-full h-14 sm:h-16 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={applyChanges}
                        disabled={pages.length === 0}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        Organize PDF
                        <div className="bg-white/20 h-6 w-6 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <ArrowRight className="h-3.5 w-3.5 text-white" />
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE ACTION FOOTER */}
              <div className="lg:hidden shrink-0 pt-4 pb-6 px-4 bg-background border-t border-border">
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                  onClick={applyChanges}
                  disabled={pages.length === 0}
                >
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  Organize PDF
                  <div className="bg-white/20 h-6 w-6 rounded-full flex items-center justify-center">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" multiple={true} accept=".pdf" onChange={(e) => {
        if (e.target.files?.length) handleFilesChange(Array.from(e.target.files));
      }} />
      {files.length === 0 && !results && !processing && (
        <ToolSeoSection
          toolName="Organize PDF Online"
          category="edit"
          intro="MagicDocx Organize PDF is a professional drag-and-drop workspace for rearranging, rotating, deleting, and duplicating the pages of any PDF document. Upload multiple PDFs to combine them, drag pages into the perfect order, insert blank pages, and download your reorganized document instantly. Undo/redo history lets you experiment freely, and every action happens locally in your browser | your files are never uploaded to any server."
          steps={[
            "Upload one or more PDF files using the drag-and-drop area.",
            "Drag page thumbnails into your desired order, or select multiple pages for bulk actions.",
            "Rotate, delete, or duplicate selected pages using the toolbar.",
            "Click 'Apply Changes' to download your perfectly organized PDF."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Merge PDF", path: "/merge-pdf", icon: LayoutGrid },
            { name: "Split PDF", path: "/split-pdf", icon: LayoutGrid },
            { name: "Delete Pages", path: "/delete-pages", icon: LayoutGrid },
            { name: "Rotate PDF", path: "/rotate-pdf", icon: LayoutGrid },
          ]}
          schemaName="Organize PDF Online"
          schemaDescription="Free online PDF organizer. Drag and drop to reorder, rotate, delete, and duplicate PDF pages with multi-file and undo/redo support."
        />
      )}
    </ToolLayout>
  );
};

export default OrganizePdf;
