import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Scissors, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { parseRange } from "@/lib/parseRange";

const SplitPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [pageRange, setPageRange] = useState("");
  const [splitMode, setSplitMode] = useState("custom"); // custom, every, half
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    if (newFiles.length > 0) {
      const bytes = await newFiles[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setTotalPages(doc.getPageCount());
    } else {
      setTotalPages(0);
    }
  };

  const split = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const docCount = doc.getPageCount();

      let pagesToExtract: number[] = [];

      if (splitMode === 'custom') {
        pagesToExtract = parseRange(pageRange, docCount);
        if (pagesToExtract.length === 0) {
          toast.error("Invalid page range");
          setProcessing(false);
          return;
        }
      } else if (splitMode === 'every') {
        // Just extract every single page into one document for now (real tool would zip multiple PDFs)
        // Since we are standardizing the ResultView, we'll extract them into one.
        pagesToExtract = Array.from({ length: docCount }, (_, i) => i + 1);
      } else if (splitMode === 'half') {
        const mid = Math.ceil(docCount / 2);
        pagesToExtract = Array.from({ length: mid }, (_, i) => i + 1);
      }

      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(doc, pagesToExtract.map(p => p - 1));
      copied.forEach(p => newDoc.addPage(p));
      setProgress(80);

      const pdfBytes = await newDoc.save();
      setProgress(100);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{
        file: blob,
        url,
        filename: files[0].name.replace(/\.pdf$/i, "_split.pdf")
      }]);

      toast.success("PDF split successfully!");
    } catch {
      toast.error("Failed to split PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Split PDF" description="Extract specific pages from your PDF document" category="split" icon={<Scissors className="h-7 w-7" />}
      metaTitle="Split PDF — Extract Pages Online Free" metaDescription="Split PDF files and extract pages. Free online PDF splitter tool." toolId="split" hideHeader>
      <ToolHeader
        title="Split PDF"
        description="Split one PDF into multiple files"
        icon={<Scissors className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={handleFilesChange} multiple={false} label="Select a PDF to split" />

            {totalPages > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                  <h3 className="font-bold text-foreground">Split Settings</h3>
                  <p className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {totalPages} Pages Total
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Split Mode</Label>
                    <Select value={splitMode} onValueChange={setSplitMode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select split mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom Range (Extract specific pages)</SelectItem>
                        <SelectItem value="half">Extract First Half</SelectItem>
                        <SelectItem value="every">Extract All Pages</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {splitMode === 'custom' && (
                    <div className="space-y-3 pt-2">
                      <Label className="text-sm font-medium">Pages to Extract</Label>
                      <Input
                        placeholder={`e.g. 1-3, 5, 7-${totalPages}`}
                        value={pageRange}
                        onChange={e => setPageRange(e.target.value)}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enter page numbers or ranges separated by commas.<br />
                        For example: <code className="bg-secondary px-1 py-0.5 rounded">1-3, 5, 8</code> will extract pages 1, 2, 3, 5, and 8.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={split}
              buttonText="Split PDF"
              processingText="Splitting..."
              estimateText="Estimated time: ~2-5 seconds"
              disabled={splitMode === 'custom' && !pageRange}
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => {
              setFiles([]);
              setResults([]);
              setPageRange("");
            }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default SplitPdf;
