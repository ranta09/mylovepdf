import { useState, useEffect, useRef } from "react";
import ToolSeoSection from "@/components/ToolSeoSection";
import * as XLSX from "xlsx";
import pptxgen from "pptxgenjs";
import { Presentation, Loader2, Info, FileText, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileSpreadsheet, Upload, Plus } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { useGlobalUpload } from "@/components/GlobalUploadContext";

import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";

const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

const ExcelToPpt = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ProcessingResult[]>([]);
    const { setDisableGlobalFeatures } = useGlobalUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setDisableGlobalFeatures(files.length > 0 || processing || results.length > 0);
        return () => setDisableGlobalFeatures(false);
    }, [files.length, processing, results.length, setDisableGlobalFeatures]);

    const [options, setOptions] = useState({
        generateCharts: true,
        includeRawTables: true,
        createSummary: true,
    });

    const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const convert = async () => {
        if (files.length === 0) return;
        setProcessing(true);
        setProgress(0);

        const newResults: ProcessingResult[] = [];
        const totalFiles = files.length;

        try {
            for (let f = 0; f < totalFiles; f++) {
                const file = files[f];
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                if (workbook.SheetNames.length === 0) {
                    toast.error(`File ${file.name} does not contain usable data.`);
                    continue; // Skip this file and go to next
                }

                const pptx = new pptxgen();
                pptx.author = "MagicDOCX AI";
                pptx.company = "MagicDOCX";
                pptx.title = file.name.replace(/\.[^/.]+$/, "");

                // Main Title Slide
                const mainSlide = pptx.addSlide();
                mainSlide.background = { color: "1E3A8A" }; // Deep Blue
                mainSlide.addText(pptx.title, {
                    x: "10%", y: "40%", w: "80%", h: 2,
                    fontSize: 44, color: "FFFFFF", bold: true, align: "center",
                    fontFace: "Arial"
                });
                mainSlide.addText("Smart AI Presentation Generated from Excel Data", {
                    x: "10%", y: "60%", w: "80%", h: 1,
                    fontSize: 18, color: "E2E8F0", align: "center", fontFace: "Arial"
                });

                setProgress(40);

                const sheetsLength = workbook.SheetNames.length;

                workbook.SheetNames.forEach((sheetName, index) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    if (!rows || rows.length < 2) return;

                    // Section Title Slide for Sheet
                    const sectionSlide = pptx.addSlide();
                    sectionSlide.background = { color: "F8FAFC" };
                    sectionSlide.addText(`Data from: ${sheetName}`, {
                        x: "10%", y: "45%", w: "80%", h: 1,
                        fontSize: 32, color: "0F172A", bold: true, align: "center",
                        fontFace: "Arial"
                    });

                    // Identify Headers and Data
                    const headers = rows[0].map(h => String(h || ""));
                    const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c !== null && c !== undefined && c !== ""));

                    if (dataRows.length === 0) return;

                    // Summary Slide
                    if (options.createSummary) {
                        const sumSlide = pptx.addSlide();
                        sumSlide.addText(`Summary: ${sheetName}`, {
                            x: 0.5, y: 0.5, w: "90%", h: 1, fontSize: 24, bold: true, color: "333333"
                        });

                        const rowCount = dataRows.length;
                        const colCount = headers.length;

                        let summaryText = `This dataset contains ${rowCount} rows and ${colCount} columns of information.\n`;
                        summaryText += `Key metrics tracked include: ${headers.slice(0, 3).join(", ")}.\n\n`;

                        sumSlide.addText(summaryText, {
                            x: 0.5, y: 1.5, w: "90%", h: 4,
                            fontSize: 18, color: "555555", valign: "top"
                        });
                    }

                    // Table Slide
                    if (options.includeRawTables) {
                        const tableSlide = pptx.addSlide();
                        tableSlide.addText(`${sheetName} - Data Overview`, {
                            x: 0.5, y: 0.3, w: "90%", h: 0.8, fontSize: 20, bold: true, color: "333333"
                        });

                        // Format table data suitable for pptxgen
                        const tableData = [
                            headers.map(h => ({ text: h, options: { bold: true, fill: { color: "F1F5F9" }, color: "333333" } }))
                        ];

                        // Process up to 10 rows to fit on a slide
                        const maxRows = Math.min(10, dataRows.length);
                        for (let i = 0; i < maxRows; i++) {
                            const row = [];
                            for (let j = 0; j < headers.length; j++) {
                                const val = dataRows[i][j];
                                row.push({ text: val !== undefined && val !== null ? String(val) : "" });
                            }
                            tableData.push(row);
                        }

                        tableSlide.addTable(tableData, {
                            x: 0.5, y: 1.2, w: "90%",
                            border: { type: "solid", pt: 1, color: "CBD5E1" },
                            fontSize: 12, rowH: 0.3
                        });

                        if (dataRows.length > 10) {
                            tableSlide.addText(`*Showing top 10 rows out of ${dataRows.length}`, {
                                x: 0.5, y: 6.8, w: "90%", h: 0.3, fontSize: 10, color: "64748B", italic: true
                            });
                        }
                    }

                    // Smart Charts Setup
                    if (options.generateCharts && headers.length >= 2) {
                        // Try to find a string/categorical column (usually first) and a numeric column
                        const labelColIdx = 0;
                        const numericColIndices: number[] = [];

                        for (let col = 1; col < headers.length; col++) {
                            let isNumeric = true;
                            let validNums = 0;
                            for (let r = 0; r < Math.min(5, dataRows.length); r++) {
                                const val = dataRows[r][col];
                                if (val !== undefined && val !== null && val !== "") {
                                    if (isNaN(Number(val))) {
                                        isNumeric = false;
                                        break;
                                    } else {
                                        validNums++;
                                    }
                                }
                            }
                            if (isNumeric && validNums > 0) {
                                numericColIndices.push(col);
                            }
                        }

                        if (numericColIndices.length > 0) {
                            const targetMetricCol = numericColIndices[0];
                            const labels = [];
                            const values = [];

                            for (let i = 0; i < Math.min(15, dataRows.length); i++) {
                                const lbl = dataRows[i][labelColIdx];
                                const val = Number(dataRows[i][targetMetricCol]);
                                // Ensure numeric values exist
                                if (lbl && !isNaN(val)) {
                                    labels.push(String(lbl));
                                    values.push(val);
                                }
                            }

                            if (labels.length > 0 && values.length > 0) {
                                const chartSlide = pptx.addSlide();
                                chartSlide.addText(`${headers[targetMetricCol]} by ${headers[labelColIdx]}`, {
                                    x: 0.5, y: 0.3, w: "90%", h: 0.8, fontSize: 20, bold: true, color: "333333"
                                });

                                const chartData = [
                                    {
                                        name: headers[targetMetricCol],
                                        labels: labels,
                                        values: values
                                    }
                                ];

                                // Determine chart type based on data size
                                const chartType = labels.length > 6 ? pptx.ChartType.bar : pptx.ChartType.pie;

                                chartSlide.addChart(chartType, chartData, {
                                    x: 0.5, y: 1.2, w: "90%", h: "80%",
                                    showLegend: true, showTitle: false,
                                    dataLabelFormatCode: "#,##0"
                                });
                            }
                        } // closes if (numericColIndices.length > 0)
                    } // closes if (options.generateCharts)

                    // Add incremental progress across files
                    const fileProgressBase = (f / totalFiles) * 100;
                    const fileCompletion = ((index + 1) / sheetsLength) * (100 / totalFiles);
                    setProgress(Math.round(fileProgressBase + fileCompletion));
                });

                // Create Blob output for ResultView
                const blobContent = await pptx.write({ outputType: "blob" }) as Blob;
                const pptUrl = URL.createObjectURL(blobContent);
                const pptFilename = `${pptx.title}.pptx`;

                newResults.push({
                    file: blobContent,
                    url: pptUrl,
                    filename: pptFilename
                });

                // Auto download
                const a = document.createElement("a");
                a.href = pptUrl;
                a.download = pptFilename;
                a.click();
            } // End of file loop

            if (newResults.length > 0) {
                setResults(newResults);
                toast.success(`${newResults.length} PowerPoint Presentation(s) generated!`);
            } else {
                toast.error("No valid data found to convert.");
            }

            setProgress(100);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PowerPoint");
        } finally {
            setProcessing(false);
            setProgress(0);
        }
    };

    return (
        <ToolLayout title="Excel to PPT (Smart Generator)" description="Turn spreadsheets into structured presentations instantly" category="convert" icon={<Presentation className="h-7 w-7" />}
            metaTitle="Excel to PPT | Smart Presentation Generator" metaDescription="Convert Excel sheets automatically to PowerPoint presentations. Free AI-powered PPT generation." toolId="excel-to-ppt" hideHeader={files.length > 0 || results.length > 0 || processing}>
            {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
            {(files.length > 0 || processing || results.length > 0) && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
                    {results.length > 0 ? (
                        <div className="flex-1 overflow-hidden">
                            <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
                        </div>
                    ) : processing ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-secondary/5 p-8">
                            <div className="w-full max-w-md space-y-8 text-center">
                                <div className="relative flex justify-center items-center h-32">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-24 h-24 rounded-full border-4 border-red-500/10" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-24 h-24 rounded-full border-4 border-red-500 border-t-transparent animate-spin" />
                                    </div>
                                    <Presentation className="h-8 w-8 text-red-500 animate-pulse" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Rasterizing Data Objects</h3>
                                    <Progress value={progress} className="h-2 rounded-full" />
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progress}% Synthesized</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden font-display leading-[1.1] tracking-tight">
                            {/* Left Panel: File Grid Area - 70% Width */}
                            <div className="w-full lg:w-[70%] border-b lg:border-b-0 lg:border-r border-border bg-secondary/5 flex flex-col h-[50vh] lg:h-full overflow-hidden shrink-0">
                                <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setFiles([]); setResults([]); }}
                                            className="h-8 w-8 p-0 rounded-full hover:bg-secondary/20 font-black italic"
                                        >
                                            <ArrowRight className="h-4 w-4 rotate-180" />
                                        </Button>
                                        <div className="h-4 w-[1px] bg-border mx-1" />
                                        <div className="flex items-center gap-2 text-left">
                                            <FileSpreadsheet className="h-3.5 w-3.5 text-red-600 font-black italic" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{files.length} Excel Spreadsheets</span>
                                        </div>
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleAddFiles} accept=".xlsx,.xls" multiple className="hidden" />
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {files.map((file, idx) => (
                                                <div key={idx} className="group flex flex-col gap-2 p-2 bg-background border border-border hover:border-red-500/50 rounded-xl transition-all duration-200 text-left relative">
                                                    <div className="aspect-[3/4] w-full bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center relative shadow-sm border border-border/10">
                                                        <div className="relative">
                                                            <div className="h-16 w-12 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border-2 border-emerald-500/20 flex flex-col items-center justify-center overflow-hidden">
                                                                <div className="w-full bg-emerald-500 h-3 flex items-center justify-center">
                                                                    <div className="h-[1px] w-full bg-white/20" />
                                                                </div>
                                                                <FileSpreadsheet className="h-6 w-6 text-emerald-600 mt-1" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            <button onClick={() => removeFile(idx)} className="p-1.5 bg-background/90 backdrop-blur-sm rounded-md hover:text-destructive transition-colors shadow-sm border border-border/50">
                                                                <Plus className="h-3 w-3 rotate-45" />
                                                            </button>
                                                        </div>
                                                        <div className="absolute bottom-1 left-1 bg-background/80 backdrop-blur-sm text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase text-muted-foreground">
                                                            {idx + 1}
                                                        </div>
                                                    </div>
                                                    <div className="px-1 min-w-0">
                                                        <p className="text-[9px] font-black text-foreground uppercase tracking-tight truncate">{file.name}</p>
                                                        <p className="text-[8px] font-black text-red-600 uppercase">{formatSize(file.size)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-[3/4] border-2 border-dashed border-border hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 hover:bg-red-500/5 transition-all outline-none focus:ring-2 focus:ring-red-500/20"
                                            >
                                                <Plus className="h-5 w-5" />
                                                Add More
                                            </button>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Right Panel: Settings Sidebar - 30% Width */}
                            <div className="flex-1 lg:w-[30%] bg-secondary/10 flex flex-col overflow-hidden relative">
                                <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                                    <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-8 text-left">
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground font-heading italic">Excel to PPT</h2>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Smart AI Synthesis Engine</p>
                                        </div>

                                        <div className="space-y-8 px-1">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generation Parameters</Label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        { key: 'generateCharts', label: 'Auto-Charts', desc: 'Numeric Data Viz', icon: <Presentation className="h-4 w-4" /> },
                                                        { key: 'includeRawTables', label: 'Data Tables', desc: 'Structured Grids', icon: <FileSpreadsheet className="h-4 w-4" /> },
                                                        { key: 'createSummary', label: 'AI Summary', desc: 'Sheet Overviews', icon: <Info className="h-4 w-4" /> }
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.key}
                                                            onClick={() => setOptions({ ...options, [opt.key]: !options[opt.key as keyof typeof options] })}
                                                            className={cn(
                                                                "w-full flex items-center gap-4 p-5 rounded-3xl border-2 transition-all text-left group",
                                                                options[opt.key as keyof typeof options] ? "border-red-500 bg-red-500/5" : "border-border bg-card hover:border-red-500/30"
                                                            )}
                                                        >
                                                            <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", options[opt.key as keyof typeof options] ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "bg-secondary text-muted-foreground")}>
                                                                {opt.icon}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={cn("text-xs font-bold uppercase tracking-widest", options[opt.key as keyof typeof options] ? "text-red-600" : "text-foreground")}>{opt.label}</p>
                                                                <p className="text-[9px] font-semibold text-muted-foreground uppercase mt-1 leading-tight">{opt.desc}</p>
                                                            </div>
                                                            {options[opt.key as keyof typeof options] && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-red-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 text-center uppercase">System Optimized · GPT-Buffer Ready</span>
                                            </div>

                                            <Button
                                                onClick={convert}
                                                disabled={processing}
                                                className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-base shadow-2xl shadow-red-500/20 transition-all gap-4 transform hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                {processing ? "Synthesizing..." : "Initiate Synthesis"}
                                                <ArrowRight className="h-6 w-6" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-5">
                {files.length === 0 && (
                    <div className="mt-5">
                        <FileUpload multiple accept=".xlsx,.xls" files={files} onFilesChange={setFiles} label="Select spreadsheets to convert" />
                        <p className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Works best with structured tabular data containing clear column headers.</p>
                    </div>
                )}
            </div>
            {!files.length && !results.length && !processing && (
                <ToolSeoSection
                    toolName="Excel to PPT Online"
                    category="convert"
                    intro="MagicDocx Excel to PPT automatically transforms your spreadsheet data into a professionally structured PowerPoint presentation. Each worksheet is turned into its own slide with the data formatted into readable tables. Ideal for quickly turning financial models, dashboards, or data reports into presentation-ready slides without manual copy-pasting."
                    steps={[
                        "Upload your Excel file (.xlsx or .xls) using the file upload area.",
                        "Review the detected sheets. Each sheet will become its own slide.",
                        "Click 'Convert to PPT' to generate your PowerPoint presentation.",
                        "Download your .pptx file automatically."
                    ]}
                    formats={["XLSX", "XLS"]}
                    relatedTools={[
                        { name: "Excel to PDF", path: "/excel-to-pdf", icon: Presentation },
                        { name: "PPT to PDF", path: "/ppt-to-pdf", icon: Presentation },
                        { name: "PDF to PPT", path: "/pdf-to-ppt", icon: Presentation },
                        { name: "Word to PDF", path: "/word-to-pdf", icon: Presentation },
                    ]}
                    schemaName="Excel to PowerPoint Online"
                    schemaDescription="Free online Excel to PPT converter. Automatically transforms spreadsheet worksheets into PowerPoint slides. No sign-up required."
                />
            )}
        </ToolLayout>
    );
};

export default ExcelToPpt;
