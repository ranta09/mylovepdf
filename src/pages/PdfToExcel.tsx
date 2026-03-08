import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileSpreadsheet } from "lucide-react";
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
      metaTitle="PDF to Excel — Extract PDF Tables Free" metaDescription="Extract tables and data from PDF files to CSV/Excel format. Free online tool." toolId="pdf-to-excel">
      <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to extract data from" />
      {processing && <Progress value={progress} className="mt-4" />}
      {files.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={convert} disabled={processing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {processing ? "Extracting…" : "Extract to CSV"}
          </Button>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">Extracts text positioned as table data. Open the CSV in Excel or Google Sheets.</p>
    </ToolLayout>
  );
};

export default PdfToExcel;
