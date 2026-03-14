import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Merge, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";

const MergePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [results, setResults] = useState<ProcessingResult[]>([]);

  const merge = async () => {
    if (files.length < 2) {
      toast.error("Please add at least 2 PDF files");
      return;
    }
    setProcessing(true);
    setProgress(10);
    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));

        setProgress(10 + ((i + 1) / files.length) * 80);
      }

      const pdfBytes = await mergedPdf.save();
      setProgress(100);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{
        file: blob,
        url,
        filename: "merged_document.pdf"
      }]);

      toast.success("PDFs merged successfully!");
    } catch {
      toast.error("Failed to merge PDFs");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="Merge PDF" description="Combine multiple PDF files into a single document" category="merge" icon={<Merge className="h-7 w-7" />}
      metaTitle="Merge PDF — Combine PDF Files Online Free" metaDescription="Merge multiple PDF files into one document. Free, fast and secure online PDF merger." toolId="merge" hideHeader>
      <ToolHeader
        title="Merge PDF"
        description="Combine multiple PDF files into a single document"
        icon={<Merge className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" multiple files={files} onFilesChange={setFiles} label="Select PDF files to merge" collapsible={false} />

            {files.length > 0 && files.length < 2 && (
              <div className="mt-4 text-center p-4 bg-orange-500/10 text-orange-600 rounded-xl border border-orange-500/20 text-sm font-medium">
                Please add at least one more PDF file to merge.
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={merge}
              buttonText={`Merge ${files.length} files`}
              processingText="Merging..."
              estimateText="Estimated time: ~3-10 seconds depending on size"
              disabled={files.length < 2}
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
    </ToolLayout>
  );
};

export default MergePdf;
