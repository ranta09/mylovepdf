import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { FileImage, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const JpgToPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  // Settings
  const [pageSize, setPageSize] = useState("fit"); // fit, a4, letter
  const [orientation, setOrientation] = useState("portrait"); // portrait, landscape

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
        const img = isPng ? await doc.embedPng(uint8) : await doc.embedJpg(uint8);

        // Define page dimensions (A4 in points: 595.28 x 841.89, Letter: 612 x 792)
        let pw = img.width;
        let ph = img.height;

        if (pageSize === "a4") {
          pw = orientation === "portrait" ? 595.28 : 841.89;
          ph = orientation === "portrait" ? 841.89 : 595.28;
        } else if (pageSize === "letter") {
          pw = orientation === "portrait" ? 612 : 792;
          ph = orientation === "portrait" ? 792 : 612;
        }

        const page = doc.addPage([pw, ph]);

        // Scale image to fit within the page while maintaining aspect ratio
        const scale = Math.min(pw / img.width, ph / img.height);
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;

        // Center the image
        const x = (pw - imgWidth) / 2;
        const y = (ph - imgHeight) / 2;

        page.drawImage(img, { x, y, width: imgWidth, height: imgHeight });
        setProgress(10 + ((i + 1) / files.length) * 80);
      }

      const pdfBytes = await doc.save();
      setProgress(100);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{
        file: blob,
        url,
        filename: "images_converted.pdf"
      }]);

      toast.success("Images converted to PDF!");
    } catch {
      toast.error("Failed to convert images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout title="JPG to PDF" description="Convert JPG and PNG images into a PDF document" category="convert" icon={<FileImage className="h-7 w-7" />}
      metaTitle="JPG to PDF — Convert Images to PDF Online Free" metaDescription="Convert JPG and PNG images to PDF. Free online image to PDF converter." toolId="jpg-to-pdf" hideHeader>
      <ToolHeader
        title="JPG to PDF"
        description="Convert your images to a single PDF document"
        icon={<FileImage className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".jpg,.jpeg,.png" multiple files={files} onFilesChange={setFiles} label="Select images to convert" />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Page Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Page Size</Label>
                    <Select value={pageSize} onValueChange={setPageSize}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select page size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fit">Fit to Image Size</SelectItem>
                        <SelectItem value="a4">A4 (Standard)</SelectItem>
                        <SelectItem value="letter">US Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Orientation</Label>
                    <Select value={orientation} onValueChange={setOrientation} disabled={pageSize === 'fit'}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select orientation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Landscape</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText={`Convert ${files.length} image${files.length !== 1 ? 's' : ''} to PDF`}
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
    </ToolLayout>
  );
};

export default JpgToPdf;
