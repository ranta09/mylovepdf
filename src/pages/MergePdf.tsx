import { useState, useEffect, useRef, useMemo } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
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
  Minus,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
  Search,
  Settings,
  Eye,
  Scissors,
  Minimize2
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
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
  const [previewZoom, setPreviewZoom] = useState(0.8);
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

  const handleFilesChange = async (newFiles: File[]) => {
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
  };

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
    setProcessing(true);
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

      // Auto-download
      const a = document.createElement('a');
      a.href = url;
      a.download = "MagicDOCX_Merged_Document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("PDFs merged successfully!");
    } catch (err) {
      let errorMessage = "An unknown error occurred.";
      if (err instanceof Error) errorMessage = err.message;
      else if (typeof err === "string") errorMessage = err;
      setError(errorMessage || "Failed to merge PDFs. Please try again.");
      toast.error("Failed to merge PDFs.");
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

  const previewPages = useMemo(() => {
    if (mergeMode === 'full') {
      const activeFile = files.find(f => f.id === activeFileId);
      if (!activeFile) return [];
      return activeFile.thumbnails.map((thumb, idx) => ({
        thumbnail: thumb,
        label: `Page ${idx + 1}`,
        rotation: 0
      }));
    } else {
      return pages.map((p, idx) => ({
        thumbnail: p.thumbnail,
        label: `Page ${idx + 1}`,
        rotation: p.rotation
      }));
    }
  }, [mergeMode, files, activeFileId, pages]);

  // View Components
  const PreviewPanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-100/30">
      <div className="h-14 border-b border-border bg-background/50 backdrop-blur-md flex justify-between items-center px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Search className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-foreground tracking-widest uppercase">Document Preview</h2>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">
              {mergeMode === 'full'
                ? `${files.find(f => f.id === activeFileId)?.pageCount || 0} Pages (Active File)`
                : `${pages.length} Pages (Merged Sequence)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-secondary/5 p-1 rounded-xl border border-border">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut className="h-3.5 w-3.5" /></Button>
          <span className="text-[10px] font-black w-10 text-center">{Math.round(previewZoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-white/50 custom-scrollbar">
        <div className="min-h-full flex flex-col items-center gap-12 py-10 origin-top" style={{ transform: `scale(${previewZoom})` }}>
          {previewPages.length > 0 ? previewPages.map((page, idx) => (
            <div key={idx} className="relative group max-w-full">
              <div className="bg-white border rounded shadow-sm transition-all duration-300" style={{ transform: `rotate(${page.rotation || 0}deg)` }}>
                <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="w-full h-auto max-w-[500px]" loading="lazy" decoding="async" />
              </div>
              <div className="mt-4 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-white px-2 py-1 border rounded shadow-sm">
                  {page.label}
                </span>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-40 opacity-20">
              <FileText className="h-20 w-20 mb-4" />
              <p className="text-lg font-black uppercase tracking-tighter">No Preview Available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const ConfigurationPanel = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="h-14 border-b border-border bg-secondary/5 flex justify-between items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            {mergeMode === 'full' ? <FileText className="h-3.5 w-3.5 text-primary" /> : <LayoutGrid className="h-3.5 w-3.5 text-primary" />}
          </div>
          <div>
            <h2 className="text-[10px] font-black text-foreground tracking-widest uppercase">
              {mergeMode === 'full' ? "File Sequence" : "Page Sequence"}
            </h2>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">
              {mergeMode === 'full' ? `${files.length} Files Uploaded` : `${pages.length} Pages in document`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest border border-border px-3" onClick={() => fileInputRef.current?.click()}>
          <Plus className="h-3 w-3 mr-1.5" /> <span className="hidden sm:inline">Add Files</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId={mergeMode === 'full' ? "files" : "pages"} type={mergeMode === 'full' ? "FILES" : "PAGES"}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3"
            >
              {mergeMode === 'full' ? (
                files.map((file, idx) => (
                  <Draggable key={file.id} draggableId={file.id} index={idx}>
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={cn(
                          "p-3 rounded-xl border transition-all duration-300 flex items-center gap-3 group relative cursor-pointer",
                          snapshot.isDragging ? "border-primary bg-primary/[0.03] shadow-lg z-50 scale-[1.02]" :
                            activeFileId === file.id ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/20"
                        )}
                        onClick={() => setActiveFileId(file.id)}
                      >
                        {activeFileId === file.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                        <div {...draggableProvided.dragHandleProps} className="text-muted-foreground/30 hover:text-primary transition-colors">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="w-12 h-16 bg-secondary/50 rounded-lg border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <img src={file.thumbnails[0]} alt="file" className="w-full h-full object-contain p-1" loading="lazy" decoding="async" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate text-foreground group-hover:text-primary transition-colors">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                            {file.pageCount} Pg • {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-xl transition-all shrink-0"
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {pages.map((page, idx) => (
                    <Draggable key={page.id} draggableId={page.id} index={idx}>
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={cn(
                            "relative group rounded-xl border-2 overflow-hidden transition-all duration-300",
                            snapshot.isDragging ? "border-primary shadow-glow scale-105 z-50" : "border-border bg-background hover:border-primary/40"
                          )}
                        >
                          <div {...draggableProvided.dragHandleProps} className="absolute top-2 left-2 z-10 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 lg:opacity-0 transition-opacity">
                            <GripVertical className="h-3 w-3" />
                          </div>
                          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 lg:opacity-0 transition-opacity md:opacity-100">
                            <button onClick={() => rotatePage(page.id)} className="p-1.5 bg-primary text-white rounded-lg hover:scale-110 transition-transform shadow-elevated">
                              <RotateCw className="h-3 w-3" />
                            </button>
                            <button onClick={() => duplicatePage(page.id)} className="p-1.5 bg-secondary text-foreground rounded-lg hover:bg-white transition-all shadow-sm">
                              <Copy className="h-3 w-3" />
                            </button>
                            <button onClick={() => removePage(page.id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:scale-110 transition-transform shadow-elevated">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="aspect-[3/4] p-2 flex items-center justify-center bg-secondary/20" style={{ transform: `rotate(${page.rotation}deg)` }}>
                            <img src={page.thumbnail} alt={`p${idx}`} className="w-full h-full object-contain shadow-sm" loading="lazy" decoding="async" />
                          </div>
                          <div className="p-2 bg-secondary/30 flex justify-center">
                            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{idx + 1}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );

  const OptionsPanel = () => (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 border-b border-border bg-secondary/5 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Settings className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h2 className="text-[10px] font-black text-foreground tracking-widest uppercase">Merge Parameters</h2>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-0.5">Control the output engine</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-2 -mr-2">
        <div className="space-y-3 sm:space-y-4 relative z-10 pb-4 pr-1">
          <button
            onClick={() => setMergeMode('full')}
            className={cn(
              "w-full p-6 rounded-2xl border transition-all duration-500 group relative overflow-hidden flex flex-col items-start gap-1",
              mergeMode === 'full'
                ? "border-primary bg-primary/[0.03]"
                : "border-border bg-background hover:border-primary/20"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className={cn("p-2.5 rounded-2xl transition-all duration-500", mergeMode === 'full' ? "bg-primary text-white scale-110 shadow-glow" : "bg-secondary text-muted-foreground")}>
                <FileBox className="h-5 w-5" />
              </div>
              {mergeMode === 'full' && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </div>
            <h3 className={cn("text-xs font-black uppercase tracking-widest mt-4 transition-colors", mergeMode === 'full' ? "text-primary" : "text-muted-foreground")}>Full Document Merge</h3>
            <p className="text-[10px] text-muted-foreground opacity-60 leading-tight text-left">Merge entire PDFs in selected order</p>
          </button>

          <button
            onClick={() => setMergeMode('pages')}
            className={cn(
              "w-full p-6 rounded-2xl border transition-all duration-500 group relative overflow-hidden flex flex-col items-start gap-1",
              mergeMode === 'pages'
                ? "border-primary bg-primary/[0.03]"
                : "border-border bg-background hover:border-primary/20"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className={cn("p-2.5 rounded-2xl transition-all duration-500", mergeMode === 'pages' ? "bg-primary text-white scale-110 shadow-glow" : "bg-secondary text-muted-foreground")}>
                <Layers className="h-5 w-5" />
              </div>
              {mergeMode === 'pages' && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </div>
            <h3 className={cn("text-xs font-black uppercase tracking-widest mt-4 transition-colors", mergeMode === 'pages' ? "text-primary" : "text-muted-foreground")}>Custom Page Merge</h3>
            <p className="text-[10px] text-muted-foreground opacity-60 leading-tight text-left">Reorder, delete, and build custom PDF</p>
          </button>

          <div className="mt-4 pt-6 border-t border-border border-dashed">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 px-1">Merge Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs px-1">
                <span className="font-bold text-muted-foreground">Original Files</span>
                <span className="font-black text-foreground">{files.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs px-1">
                <span className="font-bold text-muted-foreground">Target Pages</span>
                <span className="font-black text-primary">
                  {mergeMode === 'full' ? files.reduce((acc, f) => acc + f.pageCount, 0) : pages.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="hidden xl:block shrink-0 p-6 border-t border-border bg-background">
        <Button
          size="lg"
          className="w-full h-14 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/25 rounded-2xl group relative overflow-hidden"
          onClick={startMerging}
        >
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          Merge PDF
          <Merge className="h-4 w-4 ml-3 group-hover:rotate-12 transition-transform" />
        </Button>
      </div>
    </div>
  );

  return (
    <ToolLayout title="Merge PDF Online" description="Combine multiple PDFs into one document" category="merge" icon={<Merge className="h-7 w-7" />}
      metaTitle="Merge PDF Online Free – Fast & Secure | MagicDocx" metaDescription="Merge multiple PDF files into one document online for free. Combine PDFs instantly, reorder pages, and download your merged document. No registration required." toolId="merge" hideHeader={files.length > 0}>

      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload accept=".pdf" multiple={true} files={files.map(f => f.file)} onFilesChange={(newFiles) => handleFilesChange(newFiles)} label="Select PDF files to merge" />
          </div>
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
          <div className="mt-8 mx-auto max-w-2xl w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-background border border-border p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex flex-col items-center gap-5 relative z-10">
                <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">Merge Completed!</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Your PDFs have been successfully combined.</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-px bg-border border border-border overflow-hidden rounded-xl">
                <div className="bg-secondary/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Pages</p>
                  <p className="text-2xl font-black text-primary leading-none">{results.pages}</p>
                </div>
                <div className="bg-secondary/10 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">File Size</p>
                  <p className="text-2xl font-black text-primary leading-none">{results.size}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 px-4">
              <Button size="lg" className="flex-1 h-16 text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/25 rounded-2xl group relative overflow-hidden" onClick={() => {
                const a = document.createElement('a');
                a.href = results.url;
                a.download = results.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}>
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Download className="mr-3 h-5 w-5" /> Download PDF
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-16 text-[11px] font-black uppercase tracking-[0.2em] border-2 rounded-2xl" onClick={resetAll}>
                <RefreshCw className="mr-3 h-5 w-5" /> Merge New
              </Button>
            </div>
          </div>
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
                    onClick={() => setActiveTab("preview")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-300",
                      activeTab === "preview" ? "bg-primary text-white shadow-elevated" : "text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Preview</span>
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
                  {/* DESKTOP LAYOUT (Always visible on xl) */}
                  <div className="hidden xl:flex flex-1 gap-0 h-full overflow-hidden">
                    <div className="flex-1 border-r border-border">
                      <PreviewPanel />
                    </div>
                    <div className="w-[400px] border-r border-border">
                      <ConfigurationPanel />
                    </div>
                    <div className="w-[350px]">
                      <OptionsPanel />
                    </div>
                  </div>

                  {/* MOBILE LAYOUT (Tabbed) */}
                  <div className="xl:hidden flex-1 flex flex-col overflow-hidden">
                    <AnimatePresence mode="wait">
                      {activeTab === "preview" && (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex-1 flex flex-col h-full"
                        >
                          <PreviewPanel />
                        </motion.div>
                      )}
                      {activeTab === "configure" && (
                        <motion.div
                          key="configure"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex-1 flex flex-col h-full"
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
                    className="w-full h-14 text-sm font-black uppercase tracking-[0.2em] shadow-glow rounded-2xl group relative overflow-hidden"
                    onClick={startMerging}
                  >
                    Merge PDF
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
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
    </ToolLayout>
  );
};

export default MergePdf;
