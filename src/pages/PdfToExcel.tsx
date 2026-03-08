import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileSpreadsheet, Loader2, Info } from "lucide-react";
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
        const rows: Map<number, { x: number; text: string }[]> = new Map();
        content.items.forEach((item: any) => {
          const y = Math.round(item.transform[5]);
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y)!.push({ x: item.transform[4], text: item.str });
        });
        const sortedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]);
        for (const [, items] of sortedRows) {
          items.sort((a, b) => a.x - b.x);
          const row = items.map(item => `"${item.text.replace(/"/g, '""')}"`).join(",");
          if (row.replace(/[",\s]/g, "").length > 0) csvContent += row + "\n";
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
      <div className="space-y-6">
        <div className="rounded-2xl border border-tool-convert/20 bg-tool-convert/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-convert">
              <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">PDF to Excel</h1>
              <p className="text-sm text-muted-foreground">Extract tables and data from PDF to CSV</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Extracts text positioned as table data. Open the CSV in Excel or Google Sheets for editing.
            </p>
          </div>
        </div>

        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to extract data from" />

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF file" },
            { step: "2", text: "We extract table data" },
            { step: "3", text: "Download as CSV file" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-convert text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>

        {processing && <Progress value={progress} className="h-2" />}
        {files.length > 0 && (
          <Button size="lg" onClick={convert} disabled={processing} className="w-full rounded-xl">
            {processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Extracting…</> : <><FileSpreadsheet className="mr-2 h-5 w-5" />Extract to CSV</>}
          </Button>
        )}
        {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~5-15 seconds</p>}
      </div>
    </ToolLayout>
  );
};

export default PdfToExcel;
