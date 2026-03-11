import { useState } from "react";
import * as XLSX from "xlsx";
import pptxgen from "pptxgenjs";
import { Presentation, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";

const ExcelToPpt = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ProcessingResult[]>([]);

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
                            headers.map(h => ({ text: h, options: { bold: true, fill: "F1F5F9", color: "333333" } }))
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
                                const chartType = labels.length > 6 ? pptx.charts.BAR : pptx.charts.PIE;

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

                newResults.push({
                    file: blobContent,
                    url: URL.createObjectURL(blobContent),
                    filename: `${pptx.title}.pptx`
                });
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
            metaTitle="Excel to PPT — Smart Presentation Generator" metaDescription="Convert Excel sheets automatically to PowerPoint presentations. Free AI-powered PPT generation." toolId="excel-to-ppt" hideHeader>
            <div className="rounded-2xl border border-border bg-secondary/30 p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                        <Presentation className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-display text-xl font-bold text-foreground">Smart Excel to PPT Generator</h1>
                        <p className="text-sm text-muted-foreground">Turn spreadsheets into structured presentations instantly</p>
                        <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Supports .xlsx and .xls files. 100% private.</span></div>
                    </div>
                </div>
            </div>

            <div className="mt-5">
                {results.length === 0 ? (
                    <>
                        <FileUpload multiple accept=".xlsx,.xls" files={files} onFilesChange={setFiles} label="Select spreadsheets to convert" />

                        {files.length > 0 && (
                            <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                                <h3 className="font-bold text-foreground mb-4">Presentation Settings</h3>
                                <div className="space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={options.generateCharts}
                                            onCheckedChange={(c) => setOptions({ ...options, generateCharts: !!c })}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">Auto-generate Charts</span>
                                            <span className="text-xs text-muted-foreground">Create charts from numeric data</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={options.includeRawTables}
                                            onCheckedChange={(c) => setOptions({ ...options, includeRawTables: !!c })}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">Include Data Tables</span>
                                            <span className="text-xs text-muted-foreground">Add slides with clean table previews</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={options.createSummary}
                                            onCheckedChange={(c) => setOptions({ ...options, createSummary: !!c })}
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">AI Summary Slides</span>
                                            <span className="text-xs text-muted-foreground">Generate sheet summary overviews</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        <ProcessingView
                            files={files}
                            processing={processing}
                            progress={progress}
                            onProcess={convert}
                            buttonText="Generate PPT"
                            processingText="Analyzing spreadsheet and styling slides..."
                        />
                    </>
                ) : (
                    <ResultView
                        results={results}
                        onReset={() => {
                            setFiles([]);
                            setResults([]);
                        }}
                    />
                )}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">Works best with structured tabular data containing clear column headers.</p>
        </ToolLayout>
    );
};

export default ExcelToPpt;
