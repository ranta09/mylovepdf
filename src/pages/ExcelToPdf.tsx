import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const ExcelToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      setProgress(30);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 9;
      const margin = 40;
      const pageWidth = 841.89; // landscape A4
      const pageHeight = 595.28;
      const rowHeight = 20;
      const maxRows = Math.floor((pageHeight - margin * 2) / rowHeight) - 1;

      const colCount = Math.max(...rows.map(r => r.length));
      const colWidth = (pageWidth - margin * 2) / Math.max(colCount, 1);

      for (let chunk = 0; chunk < rows.length; chunk += maxRows) {
        const page = doc.addPage([pageWidth, pageHeight]);
        const pageRows = rows.slice(chunk, chunk + maxRows);

        pageRows.forEach((row, rowIdx) => {
          const y = pageHeight - margin - (rowIdx + 1) * rowHeight;
          const isHeader = chunk === 0 && rowIdx === 0;
          const usedFont = isHeader ? boldFont : font;

          row.forEach((cell, colIdx) => {
            const x = margin + colIdx * colWidth + 4;
            const cellValue = cell !== null && cell !== undefined ? String(cell) : "";
            const truncated = cellValue.length > 25 ? cellValue.substring(0, 22) + "…" : cellValue;
            page.drawText(truncated, { x, y: y + 5, size: fontSize, font: usedFont });
          });

          page.drawLine({
            start: { x: margin, y },
            end: { x: pageWidth - margin, y },
            thickness: 0.5,
            opacity: 0.2,
            color: rgb(0, 0, 0),
          });
        });
        setProgress(30 + Math.round(((chunk + maxRows) / rows.length) * 60));
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = files[0].name.replace(/\.[^/.]+$/, "") + ".pdf";
      a.click();
      URL.revokeObjectURL(url);
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
    <ToolLayout title="Excel to PDF" description="Convert spreadsheets into a PDF table" category="convert" icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="Excel to PDF — Convert Spreadsheets to PDF Free" metaDescription="Convert Excel and spreadsheet data to PDF tables. Free online converter." toolId="excel-to-pdf" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Excel to PDF</h1>
            <p className="text-sm text-muted-foreground">Convert spreadsheets into a PDF table</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Supports .xlsx, .xls, and .csv files. Max file size: 100MB. Your files are private and automatically deleted after processing.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".xlsx,.xls,.csv" files={files} onFilesChange={setFiles} label="Select a spreadsheet to convert" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting…</> : "Convert to PDF"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~3-5 seconds</p>}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Converts the first sheet of your spreadsheet into a professional PDF table.</p>
    </ToolLayout>
  );
};

export default ExcelToPdf;

