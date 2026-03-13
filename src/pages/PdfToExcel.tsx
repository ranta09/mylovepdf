import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
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

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToExcel = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [outputFormat, setOutputFormat] = useState("xlsx"); // xlsx or csv

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const allRows: string[][] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group text items by Y position to form rows
        const rows: Map<number, { x: number; text: string }[]> = new Map();
        content.items.forEach((item: any) => {
          const y = Math.round(item.transform[5]);
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y)!.push({ x: item.transform[4], text: item.str });
        });

        // Sort rows by Y (descending) and items by X
        const sortedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);
        for (const [, items] of sortedRows) {
          items.sort((a, b) => a.x - b.x);
          const rowData = items.map(item => item.text.trim()).filter(t => t.length > 0);
          if (rowData.length > 0) {
            allRows.push(rowData);
          }
        }

        setProgress(10 + Math.round((i / pdf.numPages) * 70));
      }

      setProgress(85);

      const newResults: ProcessingResult[] = [];

      if (outputFormat === "xlsx") {
        // Create real XLSX file
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Extracted Data");
        const xlsxBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([xlsxBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: files[0].name.replace(/\.pdf$/i, ".xlsx") });
      } else {
        // Create CSV
        const csvContent = allRows.map(row =>
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        newResults.push({ file: blob, url, filename: files[0].name.replace(/\.pdf$/i, ".csv") });
      }

      // Always include both formats
      if (outputFormat === "xlsx") {
        const csvContent = allRows.map(row =>
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const csvUrl = URL.createObjectURL(csvBlob);
        newResults.push({ file: csvBlob, url: csvUrl, filename: files[0].name.replace(/\.pdf$/i, ".csv") });
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`Extracted ${allRows.length} rows from PDF!`);
    } catch {
      toast.error("Failed to extract data from PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to Excel"
      description="Extract tables and data from PDF to Excel spreadsheet"
      category="convert"
      icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="PDF to Excel — Extract PDF Tables to Spreadsheet Free"
      metaDescription="Extract tables and data from PDF files to Excel XLSX or CSV format. Free online tool."
      toolId="pdf-to-excel"
      hideHeader
    >
      <ToolHeader
        title="PDF to Excel"
        description="Extract tables and data from PDF to XLSX"
        icon={<FileSpreadsheet className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to extract data from" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Output Format</h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Primary Format</Label>
                  <Select value={outputFormat} onValueChange={setOutputFormat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Both XLSX and CSV will be generated.</p>
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText="Extract to Spreadsheet"
              processingText="Extracting tables..."
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => { setFiles([]); setResults([]); }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfToExcel;
