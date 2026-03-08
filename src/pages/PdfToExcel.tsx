import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToExcel = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      let csvContent = "";
      
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
          const row = items.map(item => `"${item.text.replace(/"/g, '""')}"`).join(",");
          if (row.replace(/[",\s]/g, "").length > 0) {
            csvContent += row + "\n";
          }
        }
        
        if (i < pdf.numPages) csvContent += "\n";
        setProgress(10 + Math.round((i / pdf.numPages) * 80));
      }

      setProgress(95);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "extracted-data.csv";
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success("PDF data extracted to CSV!");
    } catch {
      toast.error("Failed to extract data from PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="PDF to Excel" description="Extract text and table data from PDF as CSV" category="convert" icon={<FileSpreadsheet className="h-7 w-7" />}
      metaTitle="PDF to Excel — Extract PDF Tables Free" metaDescription="Extract tables and data from PDF files to CSV/Excel format. Free online tool." toolId="pdf-to-excel" hideHeader>
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">PDF to Excel</h1>
            <p className="text-sm text-muted-foreground">Extract text and table data from PDF as CSV</p>
            <p className="mt-1 text-xs text-muted-foreground/70">Works great with invoices, financial reports, data tables, and spreadsheets. Max file size: 100MB. Your files are private and automatically deleted after processing.</p>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to extract data from" />
      </div>
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Extracting…</> : "Extract to CSV"}
          </Button>
          {processing && <p className="text-xs text-muted-foreground">Estimated time: ~5-15 seconds</p>}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Extracts text positioned as table data. Open the CSV in Excel or Google Sheets.</p>
    </ToolLayout>
  );
};

export default PdfToExcel;
