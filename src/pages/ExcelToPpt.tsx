import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import pptxgen from "pptxgenjs";
import { Presentation, Loader2, Info, FileText, FileBox, CheckCircle2, ArrowRight, RotateCcw, ShieldCheck, Settings, Layout, FileSpreadsheet, Upload } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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

    useEffect(() => {
        setDisableGlobalFeatures(files.length > 0);
        return () => setDisableGlobalFeatures(false);
    }, [files, setDisableGlobalFeatures]);

    const [options, setOptions] = useState({
        generateCharts: true,
        includeRawTables: true,
        createSummary: true,
    });

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
            metaTitle="Excel to PPT — Smart Presentation Generator" metaDescription="Convert Excel sheets automatically to PowerPoint presentations. Free AI-powered PPT generation." toolId="excel-to-ppt" hideHeader={files.length > 0 || results.length > 0 || processing}>
            {/* ── CONVERSION WORKSPACE ─────────────────────────────────────────── */}
            {(files.length > 0 || processing || results.length > 0) && (
                <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">

                    {/* Header Diagnostic / Execution Control */}
                    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                <Presentation className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-tighter">Smart PPT Engine</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                    {processing ? "Synthesizing Slides..." : results.length > 0 ? "Generation Terminal" : "Awaiting Execution"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {(results.length > 0 || !processing) && (
                                <Button variant="outline" size="sm" onClick={() => { setFiles([]); setResults([]); }} className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                                    <RotateCcw className="h-3.5 w-3.5" /> Start Over
                                </Button>
                            )}
                            {results.length === 0 && !processing && (
                                <Button size="sm" onClick={convert} className="h-9 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2">
                                    <ArrowRight className="h-4 w-4" /> Generate PPT
                                </Button>
                            )}
                        </div>
                    </div>

                    {processing ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-secondary/10 p-8">
                            <div className="w-full max-w-md space-y-8 text-center text-center">
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
                    ) : results.length > 0 ? (
                        <div className="flex-1 overflow-hidden">
                            <ResultView results={results} onReset={() => { setFiles([]); setResults([]); }} />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-row overflow-hidden">
                            {/* LEFT PANEL: File Manifest */}
                            <div className="w-96 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2 shrink-0">
                                    <FileBox className="h-4 w-4 text-red-500" />
                                    <span className="text-xs font-black uppercase tracking-widest">Payload Manifest</span>
                                </div>
                                <ScrollArea className="flex-1">
                                    <div className="p-6 space-y-3">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="p-4 bg-background rounded-2xl border border-border flex items-center gap-4 group hover:border-red-500/30 transition-all">
                                                <div className="h-12 w-10 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet className="h-5 w-5 text-red-500" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-black uppercase truncate tracking-tight">{file.name}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{formatSize(file.size)}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => setFiles([])} className="w-full p-4 border-2 border-dashed border-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all">
                                            + Resync Payload
                                        </button>
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* CENTER: Workbench */}
                            <div className="flex-1 bg-secondary/10 p-8 flex flex-col items-center">
                                <div className="w-full max-w-4xl space-y-8">
                                    {/* Configuration Map */}
                                    <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
                                        <div className="p-6 border-b border-border bg-secondary/5">
                                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                                <Settings className="h-4 w-4 text-red-500" />
                                                Generation Parameters
                                            </h3>
                                        </div>
                                        <div className="p-10 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {[
                                                    { key: 'generateCharts', label: 'Auto-Charts', desc: 'Numeric Data Viz', icon: <Presentation className="h-5 w-5" /> },
                                                    { key: 'includeRawTables', label: 'Data Tables', desc: 'Structured Grids', icon: <FileSpreadsheet className="h-5 w-5" /> },
                                                    { key: 'createSummary', label: 'AI Summary', desc: 'Sheet Overviews', icon: <Info className="h-5 w-5" /> }
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.key}
                                                        onClick={() => setOptions({ ...options, [opt.key]: !options[opt.key as keyof typeof options] })}
                                                        className={cn(
                                                            "flex flex-col items-center text-center gap-3 p-6 rounded-3xl border-2 transition-all group",
                                                            options[opt.key as keyof typeof options] ? "border-red-500 bg-red-500/5" : "border-border bg-card/50 hover:border-red-500/30"
                                                        )}>
                                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", options[opt.key as keyof typeof options] ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground")}>
                                                            {opt.icon}
                                                        </div>
                                                        <div>
                                                            <p className={cn("text-xs font-black uppercase tracking-widest", options[opt.key as keyof typeof options] ? "text-red-600" : "text-foreground")}>{opt.label}</p>
                                                            <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{opt.desc}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4 text-center justify-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                                                    * Kernel recommendation: Enable all features for maximum presentation intelligence.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ready State */}
                                    <div className="flex justify-center">
                                        <div className="flex items-center gap-4 px-6 py-3 bg-card rounded-full border border-border shadow-sm">
                                            <CheckCircle2 className="h-4 w-4 text-red-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">System Optimized for {files.length} documents · PPTX Buffer ready</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-4">
                                        <Button size="lg" onClick={convert} className="h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] px-16 shadow-2xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 gap-3">
                                            Initiate Synthesis <ArrowRight className="h-6 w-6" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Meta */}
                    <div className="h-10 border-t border-border bg-card flex items-center justify-between px-8 shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Secure Tunnel</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MagicDocx PPT-AI v2.0.0</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest uppercase text-center">Optimized for structured tabular data with clear headers.</span>
                        </div>
                    </div>
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
        </ToolLayout>
    );
};

export default ExcelToPpt;
