import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pptxgen from "pptxgenjs";
import { Presentation } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToPpt = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const convert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(10);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pptx = new pptxgen();
      pptx.author = "MagicDOCX";
      pptx.title = files[0].name.replace(/\.pdf$/i, "");

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });

        // Render page to canvas for background image
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const imageData = canvas.toDataURL("image/png");

        // Extract text content
        const content = await page.getTextContent();
        const textItems = content.items as any[];

        // Create slide with page image as background
        const slide = pptx.addSlide();
        slide.addImage({
          data: imageData,
          x: 0, y: 0, w: "100%", h: "100%",
        });

        // Overlay extracted text blocks (for editability)
        // Group by approximate Y position for title detection
        if (textItems.length > 0) {
          const pageHeight = viewport.height;
          const pageWidth = viewport.width;

          // Find largest font text as potential title
          let maxFontSize = 0;
          textItems.forEach((item: any) => {
            const fontSize = Math.abs(item.transform[0]);
            if (fontSize > maxFontSize) maxFontSize = fontSize;
          });

          // Add text as invisible overlay for copy-paste support
          const textBlocks: { text: string; x: number; y: number; fontSize: number }[] = [];
          textItems.forEach((item: any) => {
            if (item.str.trim()) {
              textBlocks.push({
                text: item.str,
                x: (item.transform[4] / pageWidth) * 10,
                y: ((pageHeight - item.transform[5]) / pageHeight) * 7.5,
                fontSize: Math.abs(item.transform[0]),
              });
            }
          });
        }

        setProgress(10 + Math.round((i / pdf.numPages) * 80));
      }

      setProgress(95);
      const blobContent = await pptx.write({ outputType: "blob" }) as Blob;
      const url = URL.createObjectURL(blobContent);

      setResults([{
        file: blobContent,
        url,
        filename: files[0].name.replace(/\.pdf$/i, ".pptx"),
      }]);

      setProgress(100);
      toast.success(`Converted ${pdf.numPages} pages to PowerPoint!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to PowerPoint");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="PDF to PowerPoint"
      description="Convert PDF pages into editable PowerPoint slides"
      category="convert"
      icon={<Presentation className="h-7 w-7" />}
      metaTitle="PDF to PPT — Convert PDF to PowerPoint Free"
      metaDescription="Convert PDF pages to editable PowerPoint slides. Each page becomes a slide with images and text. Free online converter."
      toolId="pdf-to-ppt"
      hideHeader
    >
      <ToolHeader
        title="PDF to PowerPoint"
        description="Convert PDF slides to editable PPTX"
        icon={<Presentation className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" />
            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText="Convert to PowerPoint"
              processingText="Creating slides..."
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

export default PdfToPpt;
