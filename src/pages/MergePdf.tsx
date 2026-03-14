import { useState, useEffect, useRef, useMemo } from "react";
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
  Eye
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
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

const MergePdf = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [mergeMode, setMergeMode] = useState<"full" | "pages">("full");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ url: string; name: string; size: string; pages: number } | null>(null);

  // UI States
  const [previewZoom, setPreviewZoom] = useState(1);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const [activeTab, setActiveTab] = useState("configure");
  const { setDisableGlobalFeatures } = useGlobalUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      console.error("Merge failed", err);
      toast.error("Failed to merge PDFs. Please try again.");
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
    <div className="flex-1 bg-card border border-border shadow-elevated rounded-3xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Document Preview</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
              {mergeMode === 'full'
                ? `${files.find(f => f.id === activeFileId)?.pageCount || 0} Pages (Active File)`
                : `${pages.length} Pages (Merged Sequence)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.2))}>
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-[10px] font-bold text-muted-foreground w-12 text-center">{Math.round(previewZoom * 100)}%</span>
          <button className="p-2 hover:bg-secondary rounded-lg transition-colors" onClick={() => setPreviewZoom(z => Math.min(2, z + 0.2))}>
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-secondary/10 custom-scrollbar">
        <div className="flex flex-col items-center gap-12 py-10 origin-top" style={{ transform: `scale(${previewZoom})` }}>
          {previewPages.map((page, idx) => (
            <div key={idx} className="relative group max-w-full">
              <div className="bg-white border shadow-elevated rounded-lg transition-all transition-transform duration-300" style={{ transform: `rotate(${page.rotation || 0}deg)` }}>
                <img src={page.thumbnail} alt={`Page ${idx + 1}`} className="w-full h-auto max-w-[500px]" />
              </div>
              <div className="mt-4 text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-white px-2 py-1 border rounded-lg shadow-sm">
                  {page.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ConfigurationPanel = () => (
    <div className="flex-1 bg-card border border-border shadow-elevated rounded-3xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
            {mergeMode === 'full' ? <FileText className="h-4 w-4 text-primary" /> : <LayoutGrid className="h-4 w-4 text-primary" />}
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground tracking-tight uppercase">
              {mergeMode === 'full' ? "File Sequence" : "Page Sequence"}
            </h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mt-1">
              {mergeMode === 'full' ? `${files.length} Files Uploaded` : `${pages.length} Pages in document`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest border-2" onClick={() => fileInputRef.current?.click()}>
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
                          "p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 group",
                          snapshot.isDragging ? "border-primary bg-primary/[0.03] shadow-glow z-50" : "border-border bg-background hover:border-primary/20"
                        )}
                        onClick={() => setActiveFileId(file.id)}
                      >
                        <div {...draggableProvided.dragHandleProps} className="text-muted-foreground/30 hover:text-primary transition-colors">
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="w-12 h-16 bg-secondary/50 rounded-lg border border-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <img src={file.thumbnails[0]} alt="file" className="w-full h-full object-contain p-1" />
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
                            <img src={page.thumbnail} alt={`p${idx}`} className="w-full h-full object-contain shadow-sm" />
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
    <div className="bg-card border border-border shadow-elevated rounded-3xl p-4 sm:p-6 flex flex-col relative overflow-hidden flex-1 xl:h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

      <div className="mb-6 relative z-10">
        <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
          Merge Mode
        </h2>
        <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-3.5 uppercase tracking-widest leading-relaxed">How should we process files?</p>
      </div>

      <ScrollArea className="flex-1 pr-2 -mr-2">
        <div className="space-y-3 sm:space-y-4 relative z-10 pb-4 pr-1">
          <button
            onClick={() => setMergeMode('full')}
            className={cn(
              "w-full p-6 sm:p-8 rounded-[2rem] border-2 transition-all duration-500 group relative overflow-hidden flex flex-col items-start gap-1",
              mergeMode === 'full'
                ? "border-primary bg-primary/[0.03] shadow-inner-sm"
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
              "w-full p-6 sm:p-8 rounded-[2rem] border-2 transition-all duration-500 group relative overflow-hidden flex flex-col items-start gap-1",
              mergeMode === 'pages'
                ? "border-primary bg-primary/[0.03] shadow-inner-sm"
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

      {/* Primary Action Button - Hidden here on mobile, shown in footer */}
      <div className="hidden xl:block shrink-0 pt-4 border-t border-border mt-auto">
        <Button
          size="lg"
          className="w-full h-16 text-md font-black uppercase tracking-[0.2em] shadow-elevated rounded-[2rem] group relative overflow-hidden"
          onClick={startMerging}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          Merge PDF
          <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-2 transition-transform" />
        </Button>
      </div>
    </div>
  );

  return (
    <ToolLayout title="Merge PDF Online" description="Combine multiple PDFs into one document" category="merge" icon={<Merge className="h-7 w-7" />}
      metaTitle="Merge PDF Online — Combine PDF Files Free" metaDescription="Merge multiple PDF files into one document with our professional online PDF tool. Drag and drop files, reorder pages, and build your custom PDF." toolId="merge" hideHeader={files.length > 0}>

      <div className="mt-2 flex flex-col h-full">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload accept=".pdf" multiple={true} files={files.map(f => f.file)} onFilesChange={(newFiles) => handleFilesChange(newFiles)} label="Select PDF files to merge" />
          </div>
        ) : processing ? (
          <div className="mt-4 mx-auto max-w-2xl w-full rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-6 relative flex justify-center items-center h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              </div>
              <Merge className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>

            <h3 className="text-xl font-bold mb-1">Merging your PDFs...</h3>
            <p className="text-sm text-muted-foreground mb-8">Building your combined document</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span>Merge Progress</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/50 shadow-inner">
                <motion.div
                  className="h-full bg-primary rounded-full shadow-glow"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
            </div>
          </div>
        ) : results ? (
          <div className="mt-4 mx-auto max-w-2xl w-full text-center space-y-6">
            <div className="bg-card border-2 border-green-500/20 shadow-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none"></div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-500/10 rounded-3xl flex items-center justify-center border border-green-500/20 shadow-sm">
                  <CheckCircle2 className="h-8 sm:h-10 w-8 sm:w-10 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase">Merge Completed!</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">Your PDFs have been successfully combined.</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Pages</p>
                  <p className="text-lg sm:text-xl font-black text-primary">{results.pages}</p>
                </div>
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">File Size</p>
                  <p className="text-lg sm:text-xl font-black text-primary">{results.size}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="flex-1 h-14 text-sm font-black uppercase tracking-widest shadow-glow" onClick={() => {
                const a = document.createElement('a');
                a.href = results.url;
                a.download = results.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}>
                <Download className="mr-2 h-5 w-5" /> Download PDF
              </Button>
              <Button size="lg" variant="outline" className="flex-1 h-14 text-sm font-black uppercase tracking-widest border-2" onClick={resetAll}>
                <RefreshCw className="mr-2 h-5 w-5" /> Merge Another
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
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
    </ToolLayout>
  );
};

export default MergePdf;
