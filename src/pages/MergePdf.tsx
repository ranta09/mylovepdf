import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import DownloadScreen from "@/components/DownloadScreen";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  Merge,
  Loader2,
  Info,
  ShieldCheck,
  GripVertical,
  Trash2,
  RotateCw,
  Plus,
  LayoutGrid,
  FileBox,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Copy,
  Layers,
  ChevronRight,
  RefreshCw,
  Settings,
  Scissors,
  Minimize2
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ProcessingView from "@/components/ProcessingView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileData {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  thumbnails: string[];
}

interface PageData {
  id: string;
  fileId: string;
  originalIndex: number; // 0-indexed
  thumbnail: string;
  rotation: number;
}

interface ProcessingResult {
  url: string;
  name: string;
  size: string;
  pages: number;
}

const MergePdf = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [mergeMode, setMergeMode] = useState<"full" | "pages">("full");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI States
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [activeTab, setActiveTab] = useState("configure");
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);

  // Generate unique IDs
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleFilesChange = useCallback(async (newFiles: File[]) => {
    if (newFiles.length === 0) return;

    setLoadingThumbnails(true);
    const newFileDatas: FileData[] = [];
    const newPageDatas: PageData[] = [];

    try {
      for (const file of newFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageCount = pdf.numPages;
        const fileId = generateId();
        const thumbnails: string[] = [];

        // Generate thumbnails for all pages
        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 }); // High-res thumbnails for sharper previews
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          const thumbUrl = canvas.toDataURL();
          thumbnails.push(thumbUrl);

          newPageDatas.push({
            id: generateId(),
            fileId: fileId,
            originalIndex: i - 1,
            thumbnail: thumbUrl,
            rotation: 0
          });
        }

        newFileDatas.push({
          id: fileId,
          file: file,
          name: file.name,
          size: file.size,
          pageCount: pageCount,
          thumbnails: thumbnails
        });
      }

      setFiles(prev => [...prev, ...newFileDatas]);
      setPages(prev => [...prev, ...newPageDatas]);
      if (!activeFileId && newFileDatas.length > 0) {
        setActiveFileId(newFileDatas[0].id);
      }
    } catch (err) {
      console.error("Error loading PDF:", err);
      toast.error("Failed to load some PDF files. Please ensure they are not password protected.");
    } finally {
      setLoadingThumbnails(false);
    }
  }, [activeFileId]);

  const removeFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    setPages(pages.filter(p => p.fileId !== fileId));
    if (activeFileId === fileId) {
      const remaining = files.filter(f => f.id !== fileId);
      setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, type } = result;

    if (!destination) return;

    if (type === "FILES") {
      const newFiles = Array.from(files);
      const [removed] = newFiles.splice(source.index, 1);
      newFiles.splice(destination.index, 0, removed);
      setFiles(newFiles);
    } else if (type === "PAGES") {
      const newPages = Array.from(pages);
      const [removed] = newPages.splice(source.index, 1);
      newPages.splice(destination.index, 0, removed);
      setPages(newPages);
    }
  };

  const rotatePage = (pageId: string) => {
    setPages(pages.map(p => p.id === pageId ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  };

  const duplicatePage = (pageId: string) => {
    const index = pages.findIndex(p => p.id === pageId);
    if (index === -1) return;
    const newPage = { ...pages[index], id: generateId() };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, newPage);
    setPages(newPages);
  };

  const removePage = (pageId: string) => {
    if (pages.length <= 1) {
      toast.error("At least one page must remain in the document.");
      return;
    }
    setPages(pages.filter(p => p.id !== pageId));
  };

  const startMerging = async () => {
    if (files.length < 2 && mergeMode === 'full') {
      toast.error("Please add at least 2 PDF files to merge.");
      return;
    }

    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const mergedDoc = await PDFDocument.create();

      if (mergeMode === 'full') {
        for (let i = 0; i < files.length; i++) {
          const fileData = files[i];
          const bytes = await fileData.file.arrayBuffer();
          const doc = await PDFDocument.load(bytes);
          const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach(p => mergedDoc.addPage(p));
          setProgress(Math.round(((i + 1) / files.length) * 100));
        }
      } else {
        const fileBuffers = new Map<string, PDFDocument>();
        for (const f of files) {
          const bytes = await f.file.arrayBuffer();
          const doc = await PDFDocument.load(bytes);
          fileBuffers.set(f.id, doc);
        }

        for (let i = 0; i < pages.length; i++) {
          const pageData = pages[i];
          const sourceDoc = fileBuffers.get(pageData.fileId)!;
          const [copiedPage] = await mergedDoc.copyPages(sourceDoc, [pageData.originalIndex]);

          if (pageData.rotation !== 0) {
            copiedPage.setRotation(degrees(pageData.rotation));
          }

          mergedDoc.addPage(copiedPage);
          setProgress(Math.round(((i + 1) / pages.length) * 100));
        }
      }

      const mergedBytes = await mergedDoc.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults({
        url,
        name: "MagicDOCX_Merged_Document.pdf",
        size: (blob.size / (1024 * 1024)).toFixed(2) + " MB",
        pages: mergedDoc.getPageCount()
      });

      toast.success("PDFs merged successfully!");
    } catch (err) {
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;
      setError(errorMessage || "Failed to merge PDFs. Please try again.");
      toast.error("Failed to merge PDFs.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setPages([]);
    setResults(null);
    setProgress(0);
    setActiveFileId(null);
    setActiveTab("configure"); // Reset to configure tab
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);


  // View Components

  const ConfigurationPanel = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] lg:w-[600px] lg:h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />


      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={mergeMode === 'full' ? "files" : "pages"} type={mergeMode === 'full' ? "FILES" : "PAGES"} direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 custom-scrollbar relative z-10"
            >
              <div className="flex flex-wrap gap-4 sm:gap-8 justify-center items-start max-w-5xl mx-auto pb-20">
                {mergeMode === 'full' ? (
                  files.map((file, idx) => (
                    <Draggable key={file.id} draggableId={file.id} index={idx}>
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={cn(
                            "group relative bg-card border rounded-2xl shadow-sm w-[140px] sm:w-[180px] lg:w-[200px] overflow-hidden transition-all duration-300 flex-shrink-0 cursor-pointer",
                            snapshot.isDragging ? "border-primary shadow-glow ring-2 ring-primary/20 scale-105 z-50" :
                              activeFileId === file.id ? "border-primary shadow-md ring-1 ring-primary/10" : "border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                          )}
                          onClick={() => setActiveFileId(file.id)}
                        >
                          {/* Drag Handle Overlay */}
                          <div {...draggableProvided.dragHandleProps} className="absolute top-2 left-2 z-20 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-3 w-3" />
                          </div>

                          {/* Quick Actions Overlay */}
                          <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                              className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-110 transition-transform shadow-elevated"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Thumbnail Area */}
                          <div className="w-full aspect-[3/4] bg-secondary/20 flex items-center justify-center p-3 relative overflow-hidden">
                            {file.thumbnails[0] ? (
                              <img src={file.thumbnails[0]} alt={file.name} className="max-w-full max-h-full object-contain rounded shadow-sm group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                              <FileText className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
                            )}
                            {activeFileId === file.id && <div className="absolute inset-x-0 bottom-0 h-1 bg-primary" />}
                          </div>

                          {/* File Info Footer */}
                          <div className="p-3 bg-secondary/5 border-t border-border/50">
                            <p className={cn("text-[11px] font-black truncate transition-colors", activeFileId === file.id ? "text-primary" : "text-foreground")}>
                              {file.name}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{file.pageCount} Pages</span>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  pages.map((page, idx) => (
                    <Draggable key={page.id} draggableId={page.id} index={idx}>
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={cn(
                            "group relative bg-card border rounded-2xl shadow-sm w-[130px] sm:w-[150px] lg:w-[170px] overflow-hidden transition-all duration-300 flex-shrink-0 cursor-pointer",
                            snapshot.isDragging ? "border-primary shadow-glow ring-2 ring-primary/20 scale-105 z-50" : "border-border hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
                          )}
                        >
                          <div {...draggableProvided.dragHandleProps} className="absolute top-2 left-2 z-20 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="h-3 w-3" />
                          </div>

                          <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); rotatePage(page.id); }} className="p-1.5 bg-primary text-white rounded-lg hover:scale-110 transition-transform shadow-elevated">
                              <RotateCw className="h-3 w-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); removePage(page.id); }} className="p-1.5 bg-destructive text-white rounded-lg hover:scale-110 transition-transform shadow-elevated">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="w-full aspect-[3/4] p-3 flex items-center justify-center bg-secondary/10 relative overflow-hidden">
                            <img
                              src={page.thumbnail}
                              alt={`p${idx}`}
                              className="max-w-full max-h-full object-contain shadow-sm group-hover:scale-105 transition-transform duration-500"
                              style={{ transform: `rotate(${page.rotation}deg)` }}
                              loading="lazy"
                            />
                          </div>
                          <div className="p-2 bg-secondary/30 flex justify-center border-t border-border/50">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">Page {idx + 1}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}

                {/* Trailing "Add More" Card */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[140px] sm:w-[180px] lg:w-[200px] aspect-[3/4] border-2 border-dashed border-border hover:border-primary/50 rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group flex-shrink-0"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest">Add More</p>
                    <p className="text-[9px] font-bold uppercase opacity-50">Files or Pages</p>
                  </div>
                </motion.button>

                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );

  const OptionsPanel = () => (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar">
        <h2 className="text-xl sm:text-2xl font-black text-foreground text-center border-b border-border pb-4 mb-6">Merge PDF</h2>

        <div className="space-y-1">
          {[
            { id: 'full', label: 'FULL DOCUMENT MERGE', desc: 'Merge entire PDFs in selected order' },
            { id: 'pages', label: 'CUSTOM PAGE MERGE', desc: 'Reorder, delete, and build custom PDF' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMergeMode(m.id as "full" | "pages")}
              className={cn(
                "w-full text-left px-3 sm:px-4 py-3 sm:py-4 rounded-lg border-l-4 transition-all",
                mergeMode === m.id
                  ? "border-l-primary bg-primary/5 shadow-sm"
                  : "border-l-transparent hover:bg-secondary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-xs sm:text-sm font-bold tracking-wide transition-colors", mergeMode === m.id ? "text-primary" : "text-foreground")}>
                    {m.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                </div>
                {mergeMode === m.id && (
                  <motion.div
                    layoutId="merge-mode-check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Merge Summary */}
        <div className="mt-8 pt-0">
          <div className="p-3 sm:p-4 bg-secondary/20 rounded-xl border border-border/50 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-0.5">Merge Summary</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-muted-foreground">Original Files</span>
                <span className="font-bold text-foreground">{files.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-muted-foreground">Target Pages</span>
                <span className="font-bold text-primary">
                  {mergeMode === 'full' ? files.reduce((acc, f) => acc + f.pageCount, 0) : pages.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="hidden xl:block p-4 sm:p-6 border-t border-border flex-shrink-0 bg-background">
        <Button
          size="lg"
          className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
          onClick={startMerging}
          disabled={files.length === 0}
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          Merge PDF
          <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
            <ArrowRight className="h-3.5 w-3.5 text-white" />
          </div>
        </Button>
      </div>
    </div>
  );

  return (
    <ToolLayout title="Merge PDF Online" description="Combine multiple PDFs into one document" category="merge" icon={<Merge className="h-7 w-7" />}
      metaTitle="Merge PDF Online Free – Fast & Secure | MagicDocx" metaDescription="Merge multiple PDF files into one document online for free. Combine PDFs instantly, reorder pages, and download your merged document. No registration required." toolId="merge" hideHeader={files.length > 0}>

      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <ToolUploadScreen
            title="Merge PDF files"
            description="Combine multiple PDFs into one document"
            buttonLabel="Select PDF files"
            accept=".pdf"
            multiple={true}
            onFilesSelected={(newFiles) => handleFilesChange(newFiles)}
          />
        ) : processing ? (
          <div className="mt-8 flex justify-center w-full">
            <ProcessingView 
                files={files.map(f => f.file)} 
                processing={true} 
                progress={progress} 
                onProcess={() => {}} 
                buttonText="" 
                processingText="Merging your PDFs..." 
                estimateText="Building your combined document" 
                error={error}
                onRetry={() => {
                   setError(null);
                   setProcessing(false);
                }}
            />
          </div>
        ) : results ? (
          <DownloadScreen
            title="PDFs merged successfully!"
            downloadLabel="DOWNLOAD MERGED PDF"
            resultUrl={results.url}
            resultName={results.name}
            onReset={resetAll}
            recommendedTools={[
              { name: "Split PDF", path: "/split-pdf", icon: Scissors },
              { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
              { name: "Rotate PDF", path: "/rotate-pdf", icon: RotateCw },
              { name: "Add Page Numbers", path: "/page-numbers", icon: FileText },
              { name: "Protect PDF", path: "/protect-pdf", icon: ShieldCheck },
              { name: "Organize PDF", path: "/organize-pdf", icon: LayoutGrid },
            ]}
          />
        ) : (
          <>
            <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden select-none">
              <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
                {/* Mobile Tab Control */}
                <div className="xl:hidden bg-card border-b border-border p-2 flex gap-1 shadow-sm shrink-0">
                  <button
                    onClick={() => setActiveTab("configure")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-300",
                      activeTab === "configure" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Manage</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("options")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-300",
                      activeTab === "options" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Layers className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Options</span>
                  </button>
                </div>

                {/* Content Logic */}
                <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
                  <div className="hidden xl:flex flex-1 gap-0 h-full overflow-hidden">
                    <div className="flex-1 min-h-0 flex flex-col border-r border-border">
                      <ConfigurationPanel />
                    </div>
                    <div className="w-[350px]">
                      <OptionsPanel />
                    </div>
                  </div>

                  {/* MOBILE LAYOUT (Tabbed) */}
                  <div className="xl:hidden flex-1 flex flex-col overflow-hidden">
                    <AnimatePresence mode="wait">
                      {activeTab === "configure" && (
                        <motion.div
                          key="configure"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex-1 flex flex-col min-h-0"
                        >
                          <ConfigurationPanel />
                        </motion.div>
                      )}
                      {activeTab === "options" && (
                        <motion.div
                          key="options"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex-1 flex flex-col h-full"
                        >
                          <OptionsPanel />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Mobile Persistent Merge Button */}
                <div className="xl:hidden shrink-0 pt-4 pb-6 px-4 bg-background border-t border-border">
                  <Button
                    size="lg"
                    className="w-full h-12 sm:h-14 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-primary/25 group relative overflow-hidden flex items-center justify-center gap-3"
                    onClick={startMerging}
                  >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    Merge PDF
                    <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <ArrowRight className="h-3.5 w-3.5 text-white" />
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf"
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesChange(Array.from(e.target.files));
                }
              }}
            />
          </>
        )}
      </div>
      {files.length === 0 && (
        <ToolSeoSection
          toolName="Merge PDF"
          category="merge"
          intro="MagicDocx Merge PDF lets you combine multiple PDF files into a single, organized document in seconds. Whether you're assembling reports, collating contracts, or joining presentation slides, our free online tool handles it all. Simply drag and drop your PDFs, arrange the order you need, and merge with one click | no software installation required, no file size limits for basic use, and no sign-up needed."
          steps={[
            "Upload two or more PDF files by dragging and dropping or clicking the upload area.",
            "Reorder files or individual pages by dragging them into your desired sequence.",
            "Choose between Full Document Merge or Custom Page Merge mode.",
            "Click \"Merge PDF\" and your combined file will download automatically."
          ]}
          formats={["PDF"]}
          relatedTools={[
            { name: "Split PDF", path: "/split-pdf", icon: Scissors },
            { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2 },
            { name: "Organize Pages", path: "/organize-pdf", icon: LayoutGrid },
            { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          ]}
          schemaName="Merge PDF Online"
          schemaDescription="Free online tool to merge multiple PDF files into one document. Drag, drop, and combine PDFs instantly."
        />
      )}
    </ToolLayout>
  );
};

export default MergePdf;
