import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ZoomIn,
  ZoomOut,
  GripVertical,
  CheckSquare,
  Square,
  Zap
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
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

const OrganizePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [results, setResults] = useState<{
    url: string;
    name: string;
    pageCount: number;
    size: string;
  } | null>(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
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
    const startIndex = files.length;
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);

    try {
      const allNewPages: PageData[] = [];
      for (let fIdx = 0; fIdx < newFiles.length; fIdx++) {
        const file = newFiles[fIdx];
        const arrayBuffer = await file.arrayBuffer();
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
            originalFileIndex: startIndex + fIdx,
            originalPageIndex: i - 1,
            thumbnail: canvas.toDataURL('image/jpeg', 0.8),
            rotation: 0,
          });
        }
      }

      const combinedPages = [...pages, ...allNewPages];
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
      toast.info("Action undone");
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setPages(history[nextIndex].pages);
      setHistoryIndex(nextIndex);
      toast.info("Action redone");
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
    toast.success(`${selectedPageIds.size} pages deleted`);
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
        files.map(async f => PDFDocument.load(await f.arrayBuffer()))
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
      const name = files[0].name.replace(/\.pdf$/i, "_organized.pdf");

      setResults({
        url,
        name,
        pageCount: pages.length,
        size: (blob.size / (1024 * 1024)).toFixed(2) + " MB"
      });

      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      toast.success("PDF organized successfully!");
    } catch (err) {
      console.error("Organize failed", err);
      toast.error("Failed to process PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPages([]);
    setSelectedPageIds(new Set());
    setHistory([]);
    setHistoryIndex(-1);
    setResults(null);
    setProgress(0);
    setZoom(1);
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
      metaTitle="Organize PDF Online — Drag & Drop Pages"
      metaDescription="Professional PDF organizer. Reorder, rotate, delete and duplicate pages. Drag and drop interface for seamless document management."
      toolId="organize"
      hideHeader={files.length > 0}
    >
      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload
              accept=".pdf"
              files={files}
              onFilesChange={handleFilesChange}
              label="Select PDF to organize"
              multiple={true}
            />
          </div>
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
          <div className="mt-4 mx-auto max-w-2xl w-full text-center space-y-6">
            <div className="bg-card border-2 border-green-500/20 shadow-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-500/10 rounded-3xl flex items-center justify-center border border-green-500/20 shadow-sm">
                  <CheckCircle2 className="h-8 sm:h-10 w-8 sm:w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">PDF Organized Successfully</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Changes have been applied permanently.</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Pages</p>
                  <p className="text-xl font-black text-primary">{results.pageCount}</p>
                </div>
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">File Size</p>
                  <p className="text-xl font-black text-primary">{results.size}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 h-14 text-sm font-black uppercase tracking-widest shadow-glow" onClick={() => {
                const a = document.createElement('a'); a.href = results.url; a.download = results.name; a.click();
              }}>
                <Download className="mr-2 h-5 w-5" /> Download Organized PDF
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-sm font-black uppercase tracking-widest border-2" onClick={resetAll}>
                <RefreshCw className="mr-2 h-5 w-5" /> Organize Another PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            {/* WORKSPACE TOOLBAR */}
            <div className="bg-card border-b border-border shadow-sm p-3 flex flex-wrap items-center gap-2 sm:gap-4 shrink-0 transition-all duration-300">
              <div className="flex items-center gap-1.5 pr-2 border-r border-border h-8">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={historyIndex <= 0} onClick={undo} title="Undo">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={historyIndex >= history.length - 1} onClick={redo} title="Redo">
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Button variant="outline" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest gap-2 bg-secondary/10 border-2" onClick={() => fileInputRef.current?.click()}>
                  <Plus className="h-3 w-3" /> Add More PDF
                </Button>
                <Button variant="outline" size="sm" className="h-9 px-3 text-[10px] font-black uppercase tracking-widest gap-2 bg-secondary/10 border-2" onClick={insertBlankPage}>
                  <PlusSquare className="h-3 w-3" /> Insert Blank
                </Button>
              </div>

              <div className="flex items-center gap-1.5 px-2 border-x border-border h-8">
                <Button variant="secondary" size="sm" className="h-8 px-2 text-[9px] font-black uppercase tracking-tighter" disabled={selectedPageIds.size === 0} onClick={() => rotateSelected(90)}>
                  <RotateCw className="h-3 w-3 mr-1" /> Rotate
                </Button>
                <Button variant="destructive" size="sm" className="h-8 px-2 text-[9px] font-black uppercase tracking-tighter" disabled={selectedPageIds.size === 0} onClick={deleteSelected}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2 text-[9px] font-black uppercase tracking-tighter border-2" disabled={selectedPageIds.size === 0} onClick={duplicateSelected}>
                  <Copy className="h-3 w-3 mr-1" /> Duplicate
                </Button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center bg-secondary/30 rounded-full px-2 py-1 gap-1 border border-border/50">
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}>
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <span className="text-[9px] font-black w-8 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setZoom(prev => Math.min(1.8, prev + 0.2))}>
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="h-9 text-[10px] font-black uppercase tracking-widest border-2" onClick={selectAll}>
                  {selectedPageIds.size === pages.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </div>

            {/* MAIN WORKSPACE GRID */}
            <div className="flex-1 min-h-0 bg-background flex flex-col relative overflow-hidden transition-all duration-500">
              <div className="p-4 border-b border-border bg-secondary/10 flex justify-between items-center sm:px-8 shrink-0">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors" onClick={resetAll}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h2 className="text-sm font-black text-foreground uppercase tracking-tight">Organization Workspace</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
                      {pages.length} Pages • {selectedPageIds.size} Selected
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="h-12 px-8 text-[11px] font-black uppercase tracking-widest shadow-glow rounded-xl"
                  onClick={applyChanges}
                >
                  Apply Changes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-8 bg-secondary/10 custom-scrollbar">
                {loadingThumbnails && pages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Pages...</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <StrictDroppable droppableId="pages" direction="horizontal">
                      {(provided: any) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="flex flex-wrap gap-8 pb-32 justify-center sm:justify-start"
                        >
                          {pages.map((page, index) => (
                            <Draggable key={page.id} draggableId={page.id} index={index}>
                              {(provided: any, snapshot: any) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "relative flex flex-col items-center transition-all duration-300",
                                    snapshot.isDragging ? "z-50 scale-105" : "scale-100"
                                  )}
                                  style={{
                                    ...provided.draggableProps.style,
                                    width: `${170 * zoom}px`,
                                  }}
                                >
                                  <div
                                    className={cn(
                                      "relative aspect-[3/4.2] w-full bg-white border-2 rounded-2xl shadow-elevated transition-all duration-300 overflow-hidden ring-offset-2 group cursor-pointer",
                                      selectedPageIds.has(page.id) ? "border-primary ring-2 ring-primary shadow-glow" : "border-border hover:border-primary/40",
                                      snapshot.isDragging && "shadow-2xl ring-4 ring-primary/20 border-primary"
                                    )}
                                    onClick={(e) => togglePageSelection(e, page.id)}
                                  >
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="absolute top-2 right-2 z-20 p-1.5 bg-white/80 border border-border/50 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className="absolute top-2 left-2 z-20">
                                      {selectedPageIds.has(page.id) ? (
                                        <div className="bg-primary text-white rounded-lg p-1 shadow-md">
                                          <CheckSquare className="h-4 w-4" />
                                        </div>
                                      ) : (
                                        <div className="bg-white/80 border border-border/50 rounded-lg p-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                          <Square className="h-4 w-4 text-muted-foreground/30" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Individual Controls Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                      <div className="flex gap-1 pointer-events-auto">
                                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-md" onClick={(e) => { e.stopPropagation(); rotateSingle(e, page.id, 90); }}>
                                          <RotateCw className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-md" onClick={(e) => { e.stopPropagation(); setSelectedPageIds(new Set([page.id])); deleteSelected(); }}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Thumbnail */}
                                    <div
                                      className="w-full h-full p-2 flex items-center justify-center bg-white/50 transition-transform duration-500"
                                      style={{ transform: `rotate(${page.rotation}deg)` }}
                                    >
                                      <img src={page.thumbnail} alt={`P${index + 1}`} className="max-w-[85%] max-h-[85%] object-contain" />
                                    </div>

                                    {/* Page Badge */}
                                    <div className="absolute bottom-0 left-0 right-0 py-2 bg-secondary/90 backdrop-blur-sm border-t border-border flex items-center justify-center">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Page {index + 1}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </StrictDroppable>
                  </DragDropContext>
                )}
              </div>

              {/* Bottom Info Bar */}
              <div className="shrink-0 p-3 bg-secondary/5 border-t border-border flex justify-center gap-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Safe & Lossless</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Instant Preview</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" className="hidden" multiple={true} accept=".pdf" onChange={(e) => {
        if (e.target.files?.length) handleFilesChange(Array.from(e.target.files));
      }} />
    </ToolLayout>
  );
};

export default OrganizePdf;
