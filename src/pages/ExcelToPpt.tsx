import { useState, useEffect, useCallback, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import { Presentation, Loader2, Info, FileSpreadsheet, Download, Settings, RefreshCcw, Layout, SplitSquareVertical, ArrowRight, X, Plus, Layers, Table, BarChart3, FileBox, ArrowLeft } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { validateExcelFile, sanitizeFilename } from "@/lib/fileValidation";
import { withRetry } from "@/lib/retryUtil";
import { handleConversionError, logError } from "@/lib/errorHandler";
import { PerformanceMonitor, trackConversion } from "@/lib/performanceMonitor";
import { globalMemoryManager } from "@/lib/memoryManager";

import { analyzeExcelData, generatePptx, PptTheme, GenerationMode, SlideSchema, THEMES, getExcelMetadata, SlideLayout } from "@/lib/excelToPptEngine";

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

interface FileWithMetadata {
  file: File;
  metadata?: { sheetNames: string[]; totalSheets: number; hasCharts: boolean; hasTables: boolean };
  selectedSheets: string[];
}

// ──── Internal Components ──────────────────────────────────────────────────────────

const SlideCard = ({ slide, theme, index }: { slide: SlideSchema, theme: PptTheme, index: number }) => {
  const t = THEMES[theme];
  
  return (
    <div 
      className="shrink-0 snap-center rounded-2xl overflow-hidden border-2 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
      style={{ 
        width: "100%", 
        aspectRatio: "16/9", 
        backgroundColor: `#${t.bg}`,
        borderColor: `#${t.tableBorder}`,
        color: `#${t.textMain}`
      }}
    >
      <div className="relative w-full h-full flex flex-col p-6 font-sans">
         
         {(slide.type === "title" || slide.type === "header") && (
           <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
             <h2 className="text-3xl font-black" style={{ color: `#${t.primaryBg}` }}>
               {slide.title}
             </h2>
             {slide.subtitle && (
               <p className="text-lg opacity-80" style={{ color: `#${t.textMuted}` }}>{slide.subtitle}</p>
             )}
           </div>
         )}

         {(slide.type === "table" || slide.type === "split_table") && (
           <div className="flex-1 flex flex-col pt-2">
             <h3 className="text-xl font-bold mb-1">{slide.title}</h3>
             {slide.subtitle && <p className="text-xs italic mb-4" style={{ color: `#${t.textMuted}` }}>{slide.subtitle}</p>}
             
             {slide.headers && slide.rows && (
               <div className="flex-1 overflow-hidden" style={{ borderColor: `#${t.tableBorder}` }}>
                 <table className="w-full text-[10px] text-left border-collapse" style={{ color: `#${t.textMain}` }}>
                   <thead>
                     <tr style={{ backgroundColor: `#${t.primaryBg}`, color: `#${t.primaryText}` }}>
                       {slide.headers.map((h, i) => <th key={i} className="p-2 border" style={{ borderColor: `#${t.tableBorder}` }}>{h}</th>)}
                     </tr>
                   </thead>
                   <tbody>
                     {slide.rows.slice(0, 8).map((r, rowIndex) => (
                       <tr key={rowIndex}>
                         {r.map((c, colIndex) => <td key={colIndex} className="p-1.5 border truncate max-w-[100px]" style={{ borderColor: `#${t.tableBorder}` }}>{c}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
                 {slide.rows.length > 8 && <div className="text-[8px] mt-2 italic opacity-50 text-center">... {slide.rows.length - 8} more rows in final output</div>}
               </div>
             )}
           </div>
         )}
         
         {slide.type === "chart" && (
           <div className="flex-1 flex flex-col pt-2">
             <h3 className="text-xl font-bold mb-4">{slide.title}</h3>
             {slide.subtitle && <p className="text-xs italic mb-2" style={{ color: `#${t.textMuted}` }}>{slide.subtitle}</p>}
             <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center opacity-50" style={{ borderColor: `#${t.primaryBg}` }}>
                  <BarChart3 className="h-10 w-10 mb-2" />
                  <span className="text-xs uppercase font-bold tracking-widest">{slide.chartType} Chart</span>
                  <span className="text-[10px] mt-1 opacity-70">{slide.chartLabels?.length || 0} data points</span>
                </div>
             </div>
           </div>
         )}

         {/* Footer */}
         <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: `#${t.primaryBg}` }} />
         <div className="absolute bottom-2 left-4 text-[8px] uppercase tracking-widest opacity-60 font-bold">{slide.sheetName}</div>
         <div className="absolute bottom-2 right-4 text-[8px] uppercase tracking-widest font-bold">Slide {index + 1}</div>
      </div>
    </div>
  );
};


// ──── Main Page ─────────────────────────────────────────────────────────────────

const ExcelToPpt = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { setDisableGlobalFeatures } = useGlobalUpload();
  
  // Settings
  const [theme, setTheme] = useState<PptTheme>("professional");
  const [mode, setMode] = useState<GenerationMode>("auto");
  const [splitTables, setSplitTables] = useState(true);
  const [maxRows, setMaxRows] = useState(12);

  // Parse & Engine State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [slides, setSlides] = useState<SlideSchema[]>([]);
  
  // Generation State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files.length, processing, results.length, setDisableGlobalFeatures]);

  // Re-run analysis whenever files or settings change
  const analyzeFile = useCallback(async () => {
    if (files.length === 0) {
      setSlides([]);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const generatedSlides = await analyzeExcelData(buffer, {
        theme, mode, splitTables, maxRowsPerSlide: maxRows
      }, file.name);
      
      setSlides(generatedSlides);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to analyze Excel structure.");
      setFiles([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [files, theme, mode, splitTables, maxRows]);

  useEffect(() => {
    analyzeFile();
  }, [analyzeFile]);

  const handleGenerate = async () => {
    if (slides.length === 0 || files.length === 0) return;
    
    setProcessing(true);
    setProgress(0);
    
    try {
      const file = files[0];
      const pptFilename = file.name.replace(/\.[^/.]+$/, "") + ".pptx";
      
      const blob = await generatePptx(slides, theme, pptFilename, (p) => setProgress(p));
      const url = URL.createObjectURL(blob);
      
      setResults([{
        file: blob,
        url,
        filename: pptFilename
      }]);
      toast.success("PowerPoint generated successfully!");
      
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during PPTX creation.");
    } finally {
      setProcessing(false);
      setProgress(100);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setSlides([]);
    setResults([]);
    setProgress(0);
  };

  return (
    <ToolLayout
      title="Excel to PPT (Smart Generator)"
      description="Turn spreadsheets into structured presentations instantly using Layout AI."
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="Excel to PPT | Smart Presentation Generator"
      metaDescription="Convert Excel sheets automatically to PowerPoint presentations. Free AI-powered PPT generation."
      toolId="excel-to-ppt"
      hideHeader={files.length > 0 || results.length > 0 || processing || isAnalyzing}
    >
      <style>{`
         .no-scrollbar::-webkit-scrollbar { display: none; }
         .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* ── WORKSPACE ─────────────────────────────────────────────────────────── */}
      {(files.length > 0 || processing || results.length > 0) && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col lg:flex-row overflow-hidden font-sans">
          
          {processing ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-secondary/5 p-8">
              <div className="w-full max-w-md space-y-8 text-center">
                 <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                   <div className="absolute inset-0 rounded-full border-4 border-red-500/10" />
                   <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin" />
                   <Presentation className="h-10 w-10 text-red-600 animate-pulse" />
                 </div>
                 <div className="space-y-3">
                   <h3 className="text-xl font-bold uppercase tracking-tighter">Synthesizing Presentation</h3>
                   <Progress value={progress} className="h-2 rounded-full" />
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Written</p>
                 </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ResultView results={results} onReset={resetAll} hideShare={true} />
            </div>
          ) : (
            <>
              {/* LEFT SIDE: Slide Live Preview */}
              <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/10 flex flex-col h-[60vh] lg:h-full overflow-hidden shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" onClick={resetAll} className="h-8 w-8 rounded-full hover:bg-secondary/20 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="flex flex-col">
                        <h4 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                           <FileSpreadsheet className="h-3.5 w-3.5 text-red-600" /> {files[0].name}
                        </h4>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                           Live Preview • {slides.length} Slides Detected
                        </span>
                      </div>
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar p-8">
                   <div className="max-w-3xl mx-auto space-y-12 pb-20">
                     {isAnalyzing ? (
                       <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-50">
                         <Loader2 className="h-8 w-8 animate-spin" />
                         <span className="text-xs font-bold uppercase tracking-widest">Parsing Spreadsheet Structure...</span>
                       </div>
                     ) : (
                       slides.map((slide, i) => (
                         <SlideCard key={slide.id} slide={slide} theme={theme} index={i} />
                       ))
                     )}
                   </div>
                </div>
              </div>

              {/* RIGHT SIDE: Settings */}
              <div className="flex-1 bg-background flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-secondary/5 flex items-center gap-2 shrink-0">
                   <Settings className="h-4 w-4 text-red-600" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Synthesis Engine</span>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                     
                     <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Presentation Theme</h3>
                        <div className="grid grid-cols-3 gap-3">
                           {["light", "dark", "professional"].map(t => (
                             <button
                               key={t}
                               onClick={() => setTheme(t as PptTheme)}
                               className={cn(
                                 "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                 theme === t ? "border-red-600 bg-red-600/5 ring-1 ring-red-500/20" : "border-border hover:border-red-500/30 bg-card"
                               )}
                             >
                               <div className={cn("w-full h-8 rounded-md border shadow-sm", {
                                 "bg-white border-slate-200": t === "light",
                                 "bg-slate-900 border-slate-700": t === "dark",
                                 "bg-blue-900 border-blue-950": t === "professional"
                               })} />
                               <span className="text-[10px] font-black uppercase tracking-widest">{t}</span>
                             </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Layout & Data Truncation</h3>
                        <RadioGroup value={mode} onValueChange={(v) => setMode(v as GenerationMode)} className="space-y-3">
                           <Label 
                             className={cn("flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all", mode === "auto" ? "border-red-500 bg-red-500/5" : "border-border hover:bg-secondary/20")}
                           >
                             <div className="flex items-center gap-3">
                               <RadioGroupItem value="auto" id="auto" />
                               <div className="flex-1">
                                 <span className="text-xs font-bold uppercase tracking-widest">Smart Matrix</span>
                                 <p className="text-[10px] text-muted-foreground leading-relaxed mt-1 normal-case font-medium">Automatically detects charts and structures raw data tables efficiently.</p>
                               </div>
                               <Layout className="h-5 w-5 text-red-500" />
                             </div>
                           </Label>
                        </RadioGroup>
                     </div>

                     <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Table Splitting</h3>
                        
                        <div className={cn("flex flex-col p-4 border-2 rounded-xl transition-all cursor-pointer", splitTables ? "border-red-500 bg-red-500/5" : "border-border hover:bg-secondary/20")} onClick={() => setSplitTables(!splitTables)}>
                          <div className="flex items-center gap-3">
                            <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", splitTables ? "border-red-600 bg-red-600" : "border-input")}>
                               {splitTables && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                              <span className="text-xs font-bold uppercase tracking-widest">Split Large Tables</span>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-1 normal-case font-medium">If a table spans beyond the 16:9 vertical bounds, auto-fork into subsequent slides.</p>
                            </div>
                            <SplitSquareVertical className="h-5 w-5 text-red-500" />
                          </div>
                        </div>

                        {splitTables && (
                          <div className="px-2 pt-2 animate-in fade-in slide-in-from-top-2">
                             <div className="flex justify-between items-center mb-2">
                               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rows Per Slide</span>
                               <span className="text-[10px] font-black">{maxRows}</span>
                             </div>
                             <input type="range" min="4" max="25" value={maxRows} onChange={(e) => setMaxRows(parseInt(e.target.value))} className="w-full accent-red-600 h-1.5 bg-secondary rounded-full appearance-none outline-none cursor-pointer" />
                          </div>
                        )}
                     </div>
                     
                  </div>
                </ScrollArea>
                
                {/* Fixed Footer */}
                <div className="p-4 border-t border-border bg-card shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                  <Button 
                    size="lg" 
                    onClick={handleGenerate} 
                    disabled={processing || isAnalyzing || slides.length === 0} 
                    className="w-full h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 transition-all gap-2 transform active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" /> Download PowerPoint
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── BEFORE UPLOAD: SEO AND DRAG-DROP AREA ─────────────────────── */}
      <div className="mt-5">
        {files.length === 0 && (
          <div className="mt-10 text-center">
            <FileUpload accept=".xlsx,.xls" files={[]} onFilesChange={(f) => setFiles(f.slice(0, 1))} label="Select Excel File" multiple={false} />
          </div>
        )}
      </div>

      {!files.length && !results.length && !processing && (
        <ToolSeoSection
          toolName="Excel to PPT Online"
          category="convert"
          intro="MagicDocx Excel to PPT automatically transforms your spreadsheet data into a professionally structured PowerPoint presentation. Our Smart Matrix engine detects relationships inside worksheets, generating beautiful Title graphics, automated Bar/Pie charts for numeric columns, and natively splits heavy structural lists into perfectly spaced 16:9 slides. Pick your theme and see your structural blueprint live before you even download."
          steps={[
            "Drop your .xlsx or .xls file into the secure dropzone.",
            "Watch our engine instantly construct a live native CSS mock of your spreadsheet data across optimized slides.",
            "Adjust formatting themes and maximum-row boundaries with real-time feedback.",
            "Click output to download your native, fully-editable PowerPoint format!"
          ]}
          formats={["XLSX", "XLS"]}
          relatedTools={[
            { name: "Excel to PDF", path: "/excel-to-pdf", icon: Presentation },
            { name: "PPT to PDF", path: "/ppt-to-pdf", icon: Presentation },
            { name: "Sign PDF", path: "/sign-pdf", icon: Presentation },
          ]}
          schemaName="Excel to PowerPoint Online"
          schemaDescription="Free online Excel to PPT converter. Automatically transforms spreadsheet worksheets into PowerPoint slides. Responsive Live Edge UI included."
        />
      )}
    </ToolLayout>
  );
};

export default ExcelToPpt;
