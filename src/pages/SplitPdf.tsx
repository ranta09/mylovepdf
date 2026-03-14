import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Scissors, Loader2, Info, ShieldCheck, Download, Trash2, Plus, ArrowRight, Layout, CheckCircle2, FileBox, FileText, X, LayoutGrid, Layers, Settings, Zap } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import JSZip from "jszip";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type SplitMode = 'extract' | 'range' | 'every' | 'fixed';

interface PageThumbnail {
  pageIndex: number; // 0-indexed
  dataUrl: string;
}

interface SplitResult {
  blob: Blob;
  filename: string;
  url: string;
  pages: string;
}

const SplitPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);

  const [splitMode, setSplitMode] = useState<SplitMode>('extract');
  const [selectedPages, setSelectedPages] = useState<number[]>([]); // 0-indexed
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // Mode specific states
  const [mergeSelected, setMergeSelected] = useState(true);
  const [ranges, setRanges] = useState<{ from: string, to: string }[]>([{ from: '1', to: '' }]);
  const [fixedPageCount, setFixedPageCount] = useState(2);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SplitResult[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  const handleFilesChange = async (newFiles: File[]) => {
    if (newFiles.length === 0) {
      setFiles([]);
      setThumbnails([]);
      setTotalPages(0);
      return;
    }

    const file = newFiles[0]; // Split PDF only handles one source file
    setFiles([file]);
    setLoadingThumbnails(true);
    setThumbnails([]);
    setSelectedPages([]);
    setResults([]);
    setZipUrl(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);

      // Generate thumbnails for all pages
      const thumbList: PageThumbnail[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport }).promise;
        thumbList.push({
          pageIndex: i - 1,
          dataUrl: canvas.toDataURL()
        });

        // Update incrementally for perceived speed
        if (i % 5 === 0 || i === pdf.numPages) {
          setThumbnails([...thumbList]);
        }
      }
    } catch (err) {
      console.error("Failed to load PDF thumbnails", err);
      toast.error("Failed to load PDF pages. The file might be corrupted or too large.");
    } finally {
      setLoadingThumbnails(false);
    }
  };

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
  }, [files, setDisableGlobalFeatures]);

  const togglePageSelection = (index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(index, lastSelectedIndex);
      const end = Math.max(index, lastSelectedIndex);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);

      setSelectedPages(prev => {
        const newSet = new Set(prev);
        range.forEach(p => newSet.add(p));
        return Array.from(newSet).sort((a, b) => a - b);
      });
    } else {
      setSelectedPages(prev =>
        prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index].sort((a, b) => a - b)
      );
    }
    setLastSelectedIndex(index);
  };

  const handleAddRange = () => {
    setRanges([...ranges, { from: '', to: '' }]);
  };

  const removeRange = (index: number) => {
    setRanges(ranges.filter((_, i) => i !== index));
  };

  const updateRange = (index: number, field: 'from' | 'to', value: string) => {
    const newRanges = [...ranges];
    newRanges[index][field] = value;
    setRanges(newRanges);
  };

  const startSplitting = async () => {
    if (files.length === 0 || processing) return;

    setProcessing(true);
    setProgress(0);
    const newResults: SplitResult[] = [];
    const sourceFile = files[0];

    try {
      const sourceBytes = await sourceFile.arrayBuffer();
      const sourceDoc = await PDFDocument.load(sourceBytes);
      const total = sourceDoc.getPageCount();

      let splitConfigs: { pages: number[], name: string }[] = [];

      if (splitMode === 'extract') {
        if (selectedPages.length === 0) {
          toast.error("Please select at least one page to extract.");
          setProcessing(false);
          return;
        }
        if (mergeSelected) {
          splitConfigs.push({
            pages: selectedPages,
            name: `${sourceFile.name.replace(/\.pdf$/i, '')}_extracted.pdf`
          });
        } else {
          selectedPages.forEach(p => {
            splitConfigs.push({
              pages: [p],
              name: `${sourceFile.name.replace(/\.pdf$/i, '')}_page_${p + 1}.pdf`
            });
          });
        }
      } else if (splitMode === 'every') {
        for (let i = 0; i < total; i++) {
          splitConfigs.push({
            pages: [i],
            name: `${sourceFile.name.replace(/\.pdf$/i, '')}_page_${i + 1}.pdf`
          });
        }
      } else if (splitMode === 'fixed') {
        for (let i = 0; i < total; i += fixedPageCount) {
          const end = Math.min(i + fixedPageCount, total);
          const range = Array.from({ length: end - i }, (_, k) => i + k);
          splitConfigs.push({
            pages: range,
            name: `${sourceFile.name.replace(/\.pdf$/i, '')}_pages_${i + 1}-${end}.pdf`
          });
        }
      } else if (splitMode === 'range') {
        ranges.forEach((r, idx) => {
          const from = parseInt(r.from);
          const to = parseInt(r.to) || from;
          if (!isNaN(from) && from > 0 && from <= total && to >= from && to <= total) {
            const rangeArr = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k);
            splitConfigs.push({
              pages: rangeArr,
              name: `${sourceFile.name.replace(/\.pdf$/i, '')}_range_${from}-${to}.pdf`
            });
          }
        });
        if (splitConfigs.length === 0) {
          toast.error("Please define at least one valid page range.");
          setProcessing(false);
          return;
        }
      }

      // Process each chunk
      for (let i = 0; i < splitConfigs.length; i++) {
        const config = splitConfigs[i];
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourceDoc, config.pages);
        copiedPages.forEach(p => newDoc.addPage(p));

        const bytes = await newDoc.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        newResults.push({
          blob,
          filename: config.name,
          url,
          pages: config.pages.length === 1 ? `Page ${config.pages[0] + 1}` : `Pages ${config.pages[0] + 1}-${config.pages[config.pages.length - 1] + 1}`
        });

        setProgress(Math.round(((i + 1) / splitConfigs.length) * 100));
      }

      // If multiple files, create a ZIP
      if (newResults.length > 1) {
        const zip = new JSZip();
        newResults.forEach(res => {
          zip.file(res.filename, res.blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        setZipUrl(url);

        // Auto-download ZIP
        const a = document.createElement("a");
        a.href = url;
        a.download = "MagicDOCX_Split_PDFs.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (newResults.length === 1) {
        // Auto-download single PDF
        const a = document.createElement("a");
        a.href = newResults[0].url;
        a.download = newResults[0].filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setResults(newResults);
      toast.success("PDF split successfully!");
    } catch (err) {
      console.error("Splitting failed", err);
      toast.error("Failed to split PDF. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setThumbnails([]);
    setResults([]);
    setZipUrl(null);
    setSelectedPages([]);
    setProgress(0);
  };

  return (
    <ToolLayout title="Split PDF Online" description="Extract specific pages or split one PDF into multiple files" category="split" icon={<Scissors className="h-7 w-7" />}
      metaTitle="Split PDF Online — Extract PDF Pages Free" metaDescription="Split PDF files and extract pages with our professional online PDF splitter. Support for ranges, fixed splits, and ZIP downloads." toolId="split" hideHeader={files.length > 0}>

      <div className="mt-2">
        {files.length === 0 ? (
          <div className="mt-5">
            <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} multiple={false} label="Select PDF file to split" />
          </div>
        ) : processing ? (
          <div className="mt-4 mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-elevated text-center">
            <div className="mb-6 relative flex justify-center items-center h-24">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              </div>
              <Scissors className="h-7 w-7 text-primary absolute animate-pulse" />
            </div>

            <h3 className="text-xl font-bold mb-1">Splitting your PDF...</h3>
            <p className="text-sm text-muted-foreground mb-8">Processing pages based on your settings</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                <span>Overall Progress</span>
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
        ) : results.length > 0 ? (
          <div className="mt-4 mx-auto max-w-3xl space-y-4">
            <div className="bg-card border-2 border-green-500/20 shadow-elevated rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full pointer-events-none -z-0"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 shadow-sm shrink-0">
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-foreground tracking-tight">Split Completed!</h2>
                  <p className="text-sm text-muted-foreground font-medium">Your PDF has been split into {results.length} professional files.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border shadow-elevated rounded-2xl p-5 flex flex-col h-[400px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Generated Files</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary rounded-full text-muted-foreground uppercase">{results.length} files</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {results.slice(0, 50).map((res, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl border border-border/50 group hover:border-primary/30 transition-all">
                      <div className="w-8 h-10 bg-background rounded border border-border flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold truncate group-hover:text-primary transition-colors">{res.filename}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">{res.pages}</p>
                      </div>
                      <a
                        href={res.url}
                        download={res.filename}
                        className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                  {results.length > 50 && (
                    <p className="text-center text-[10px] text-muted-foreground py-2 font-bold uppercase tracking-widest">
                      + {results.length - 50} more files
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/[0.03] border-2 border-primary/20 shadow-elevated rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 h-[250px]">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-inner group">
                    <Zap className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-foreground tracking-tight">Ready to Download</h4>
                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-1 leading-relaxed">
                      {results.length > 1 ? "We've bundled all your files into a single ZIP for convenience." : "Your split PDF is ready for safe download."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {zipUrl && (
                    <Button
                      size="lg"
                      className="w-full text-md h-12 shadow-glow"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = zipUrl;
                        a.download = "MagicDOCX_Split_PDFs.zip";
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                    >
                      <Download className="mr-2 h-5 w-5" /> Download All (ZIP)
                    </Button>
                  )}
                  {results.length === 1 && (
                    <Button
                      size="lg"
                      className="w-full text-md h-12 shadow-glow"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = results[0].url;
                        a.download = results[0].filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                    >
                      <Download className="mr-2 h-5 w-5" /> Download PDF
                    </Button>
                  )}
                  <Button variant="outline" className="w-full h-12 text-sm font-bold border-2" onClick={resetAll}>
                    Split Another PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
              {/* LEFT SIDE: PREVIEW PANEL */}
              <div className="flex-1 bg-card border-r border-border flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                      <LayoutGrid className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-foreground tracking-tight uppercase">Page Preview</h2>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{totalPages} Pages Total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2">
                      {selectedPages.length} selected
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary" onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i))}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500" onClick={() => setSelectedPages([])}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-secondary/10 custom-scrollbar">
                  {loadingThumbnails && thumbnails.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Loading thumbnails...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const thumb = thumbnails.find(t => t.pageIndex === idx);
                        const isSelected = selectedPages.includes(idx);

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (idx % 10) * 0.03 }}
                            className={cn(
                              "relative group cursor-pointer transition-all duration-300 transform-gpu",
                              isSelected ? "scale-[1.02]" : "hover:scale-[1.05]"
                            )}
                            onClick={(e) => togglePageSelection(idx, e)}
                          >
                            <div className={cn(
                              "aspect-[3/4] rounded-xl border-2 overflow-hidden shadow-sm transition-all duration-300",
                              isSelected
                                ? "border-primary bg-primary/[0.03] ring-4 ring-primary/10 shadow-glow"
                                : "border-background bg-background hover:border-primary/40 hover:shadow-md"
                            )}>
                              {thumb ? (
                                <img src={thumb.dataUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 scale-110">
                                  <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                  <div className="w-8 h-1 bg-muted-foreground/10 rounded-full animate-pulse"></div>
                                </div>
                              )}

                              {/* Overlay for selection */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                  <div className="bg-primary text-white p-2 rounded-full shadow-glow transform scale-110">
                                    <CheckCircle2 className="h-6 w-6" />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between px-1">
                              <span className={cn(
                                "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter transition-colors",
                                isSelected ? "bg-primary text-white" : "bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                              )}>
                                Page {idx + 1}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: CONFIGURATION PANEL */}
              <div className="w-full lg:w-[400px] flex flex-col shrink-0 bg-card overflow-hidden">
                <div className="bg-card p-6 flex flex-col relative overflow-hidden flex-1 min-h-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

                  <div className="mb-6 relative z-10 shrink-0">
                    <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 uppercase">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                      Split Settings
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-bold mt-0.5 ml-3.5 uppercase tracking-widest leading-relaxed">Choose how you want to split your file</p>
                  </div>

                  <div className="space-y-4 relative z-10 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'extract', label: 'Extract', icon: Layers },
                        { id: 'range', label: 'Ranges', icon: LayoutGrid },
                        { id: 'every', label: 'Every Page', icon: FileBox },
                        { id: 'fixed', label: 'Fixed Split', icon: Scissors }
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSplitMode(m.id as SplitMode)}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 gap-2 group",
                            splitMode === m.id
                              ? "border-primary bg-primary/[0.03] shadow-inner-sm text-primary"
                              : "border-border bg-background hover:border-primary/30 hover:shadow-sm text-muted-foreground"
                          )}
                        >
                          <m.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", splitMode === m.id ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-border mt-4">
                      <AnimatePresence mode="wait">
                        {splitMode === 'extract' && (
                          <motion.div
                            key="extract"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                          >
                            <div className="p-4 bg-secondary/30 rounded-2xl border border-border/50">
                              <div className="flex justify-between items-center mb-3">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Extraction Mode</Label>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                                <span className="text-xs font-bold text-foreground">Merge into one PDF</span>
                                <Switch checked={mergeSelected} onCheckedChange={setMergeSelected} />
                              </div>
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground text-center px-4 leading-relaxed italic">
                              Tip: Click page thumbnails on the left to select pages or Shift-Click for a range.
                            </p>
                          </motion.div>
                        )}

                        {splitMode === 'range' && (
                          <motion.div
                            key="range"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-3"
                          >
                            <div className="space-y-2">
                              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground px-1">Define Custom Ranges</Label>
                              {ranges.map((r, idx) => (
                                <div key={idx} className="flex items-center gap-2 group animate-in fade-in slide-in-from-right-1">
                                  <div className="flex-1 flex items-center gap-2 bg-secondary/30 p-1.5 rounded-xl border border-border/50 transition-all hover:border-primary/30">
                                    <Input
                                      placeholder="From"
                                      value={r.from}
                                      onChange={(e) => updateRange(idx, 'from', e.target.value)}
                                      className="h-8 text-xs font-black bg-transparent border-none focus-visible:ring-0 text-center"
                                    />
                                    <div className="h-px w-2 bg-muted-foreground/30"></div>
                                    <Input
                                      placeholder="To"
                                      value={r.to}
                                      onChange={(e) => updateRange(idx, 'to', e.target.value)}
                                      className="h-8 text-xs font-black bg-transparent border-none focus-visible:ring-0 text-center"
                                    />
                                  </div>
                                  {ranges.length > 1 && (
                                    <button onClick={() => removeRange(idx)} className="p-2 hover:bg-red-50 text-muted-foreground hover:text-red-500 rounded-lg transition-colors">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" className="w-full h-10 border-dashed border-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl" onClick={handleAddRange}>
                              <Plus className="h-3.5 w-3.5 mr-2" /> Add Range
                            </Button>
                          </motion.div>
                        )}

                        {splitMode === 'every' && (
                          <motion.div
                            key="every"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-6 bg-primary/[0.03] border border-primary/20 rounded-2xl text-center"
                          >
                            <FileBox className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                            <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Split Every Page</h4>
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium leading-relaxed italic">
                              Every page of your PDF will be extracted into a separate document.
                              A {totalPages} page PDF will result in {totalPages} separate files.
                            </p>
                          </motion.div>
                        )}

                        {splitMode === 'fixed' && (
                          <motion.div
                            key="fixed"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                          >
                            <div className="p-6 bg-secondary/30 rounded-2xl border border-border/50 text-center space-y-4">
                              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Split Every N Pages</Label>
                              <div className="flex items-center justify-center gap-6">
                                <button
                                  className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 text-foreground transition-all"
                                  onClick={() => setFixedPageCount(Math.max(1, fixedPageCount - 1))}
                                >
                                  <X className="h-4 w-4 rotate-45" />
                                </button>
                                <span className="text-3xl font-black text-primary tracking-tighter w-12">{fixedPageCount}</span>
                                <button
                                  className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-primary/50 text-foreground transition-all"
                                  onClick={() => setFixedPageCount(Math.min(totalPages, fixedPageCount + 1))}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                Result: {Math.ceil(totalPages / fixedPageCount)} files
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="shrink-0 pt-4 pb-6 mt-auto border-t border-border bg-card">
                    <Button
                      size="lg"
                      className="w-full h-14 text-sm font-black uppercase tracking-[0.1em] shadow-elevated rounded-2xl group relative overflow-hidden"
                      onClick={startSplitting}
                      disabled={splitMode === 'extract' && selectedPages.length === 0}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground/20 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      Split PDF
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default SplitPdf;
