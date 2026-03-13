import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { FileSpreadsheet } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ExcelToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [orientation, setOrientation] = useState("landscape");
  const [selectedSheet, setSelectedSheet] = useState("all");
  const [sheetNames, setSheetNames] = useState<string[]>([]);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      try {
        const ab = await newFiles[0].arrayBuffer();
        const wb = XLSX.read(ab);
        setSheetNames(wb.SheetNames);
        setSelectedSheet("all");
      } catch {
        setSheetNames([]);
      }
    }
  };

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      setProgress(30);

      const sheetsToConvert = selectedSheet === "all"
        ? workbook.SheetNames
        : [selectedSheet];

      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 9;
      const margin = 40;
      const isLandscape = orientation === "landscape";
      const pageWidth = isLandscape ? 841.89 : 595.28;
      const pageHeight = isLandscape ? 595.28 : 841.89;
      const rowHeight = 20;
      const maxRows = Math.floor((pageHeight - margin * 2) / rowHeight) - 1;

      for (const sheetName of sheetsToConvert) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rows.length === 0) continue;

        const colCount = Math.max(...rows.map(r => r.length));
        const colWidth = (pageWidth - margin * 2) / Math.max(colCount, 1);

        for (let chunk = 0; chunk < rows.length; chunk += maxRows) {
          const page = doc.addPage([pageWidth, pageHeight]);
          const pageRows = rows.slice(chunk, chunk + maxRows);

          // Sheet name header
          if (chunk === 0 && sheetsToConvert.length > 1) {
            page.drawText(`Sheet: ${sheetName}`, {
              x: margin, y: pageHeight - margin + 10,
              size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2),
            });
          }

          pageRows.forEach((row, rowIdx) => {
            const y = pageHeight - margin - (rowIdx + 1) * rowHeight;
            const isHeader = chunk === 0 && rowIdx === 0;
            const usedFont = isHeader ? boldFont : font;

            row.forEach((cell: any, colIdx: number) => {
              const x = margin + colIdx * colWidth + 4;
              const cellValue = cell !== null && cell !== undefined ? String(cell) : "";
              const maxChars = Math.floor(colWidth / (fontSize * 0.5));
              const truncated = cellValue.length > maxChars ? cellValue.substring(0, maxChars - 1) + "…" : cellValue;
              page.drawText(truncated, { x, y: y + 5, size: fontSize, font: usedFont, color: rgb(0.1, 0.1, 0.1) });
            });

            // Row separator line
            page.drawLine({
              start: { x: margin, y },
              end: { x: pageWidth - margin, y },
              thickness: 0.5, opacity: 0.15, color: rgb(0, 0, 0),
            });

            // Header background
            if (isHeader) {
              page.drawRectangle({
                x: margin, y: y, width: pageWidth - margin * 2, height: rowHeight,
                color: rgb(0.94, 0.95, 0.97), opacity: 0.5,
              });
            }
          });
        }
      }

      setProgress(90);
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{ file: blob, url, filename: files[0].name.replace(/\.[^/.]+$/, "") + ".pdf" }]);
      setProgress(100);
      toast.success("Spreadsheet converted to PDF!");
    } catch (error) {
      console.error("Excel conversion error:", error);
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Excel to PDF"
      description="Convert spreadsheets into a professional PDF table"
      category="convert"
      icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="Excel to PDF — Convert Spreadsheets to PDF Free"
      metaDescription="Convert Excel XLSX, XLS, and CSV spreadsheets to PDF tables. Free online converter."
      toolId="excel-to-pdf"
      hideHeader
    >
      <ToolHeader
        title="Excel to PDF"
        description="Convert XLSX, XLS, and CSV spreadsheets to PDF"
        icon={<FileSpreadsheet className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".xlsx,.xls,.csv" files={files} onFilesChange={handleFilesChange} label="Select a spreadsheet to convert" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Conversion Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Page Orientation</Label>
                    <Select value={orientation} onValueChange={setOrientation}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">Landscape</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {sheetNames.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Worksheet</Label>
                      <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sheets</SelectItem>
                          {sheetNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText="Convert to PDF"
              processingText="Converting spreadsheet..."
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => { setFiles([]); setResults([]); setSheetNames([]); }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default ExcelToPdf;
