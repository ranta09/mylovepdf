import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Presentation } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";

const PptToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const doc = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const uint8 = new Uint8Array(bytes);
        const isPng = files[i].type === "image/png";
        let img;
        try {
          img = isPng ? await doc.embedPng(uint8) : await doc.embedJpg(uint8);
        } catch {
          toast.error(`Could not process ${files[i].name}`);
          continue;
        }
        const slideWidth = 960;
        const slideHeight = 720;
        const page = doc.addPage([slideWidth, slideHeight]);
        const scale = Math.min(slideWidth / img.width, slideHeight / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, {
          x: (slideWidth - w) / 2,
          y: (slideHeight - h) / 2,
          width: w,
          height: h,
        });
        setProgress(10 + Math.round(((i + 1) / files.length) * 80));
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{ file: blob, url, filename: "presentation.pdf" }]);
      setProgress(100);
      toast.success("Slides converted to PDF!");
    } catch {
      toast.error("Failed to convert to PDF");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PowerPoint to PDF"
      description="Convert presentation slide images into a PDF document"
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="PPT to PDF — Convert PowerPoint to PDF Free"
      metaDescription="Convert PowerPoint presentation slides to PDF. Free online converter."
      toolId="ppt-to-pdf"
      hideHeader
    >
      <ToolHeader
        title="PPT to PDF"
        description="Convert PowerPoint presentations to PDF"
        icon={<Presentation className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".ppt,.pptx" files={files} onFilesChange={setFiles} label="Select PowerPoint files to convert" collapsible={false} />
            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText={`Convert ${files.length} slide${files.length > 1 ? "s" : ""} to PDF`}
              processingText="Converting..."
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
      <p className="mt-4 text-center text-xs text-muted-foreground">Export your PowerPoint slides as images first, then upload them here.</p>
    </ToolLayout >
  );
};

export default PptToPdf;
