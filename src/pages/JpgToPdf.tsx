import { useState, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { FileImage, GripVertical } from "lucide-react";
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
  const [previews, setPreviews] = useState<string[]>([]);

  // Settings
  const [pageSize, setPageSize] = useState("fit");
  const [orientation, setOrientation] = useState("portrait");

  // Generate previews when files change
  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    // Generate previews
    const urls = newFiles.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  }, []);

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const newFiles = [...files];
    const [moved] = newFiles.splice(from, 1);
    newFiles.splice(to, 0, moved);
    handleFilesChange(newFiles);
  };

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
        const scale = Math.min(pw / img.width, ph / img.height);
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const x = (pw - imgWidth) / 2;
        const y = (ph - imgHeight) / 2;
        page.drawImage(img, { x, y, width: imgWidth, height: imgHeight });
        setProgress(10 + ((i + 1) / files.length) * 80);
      }

      const pdfBytes = await doc.save();
      setProgress(100);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setResults([{ file: blob, url, filename: "images_converted.pdf" }]);
      toast.success("Images converted to PDF!");
    } catch {
      toast.error("Failed to convert images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="JPG to PDF"
      description="Convert JPG and PNG images into a PDF document"
      category="convert"
      icon={<FileImage className="h-7 w-7" />}
      metaTitle="JPG to PDF — Convert Images to PDF Online Free"
      metaDescription="Convert JPG, JPEG, and PNG images to a single PDF document. Drag to reorder, choose page size and orientation. Free online converter."
      toolId="jpg-to-pdf"
      hideHeader
    >
      <ToolHeader
        title="JPG to PDF"
        description="Convert your images to a single PDF document"
        icon={<FileImage className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".jpg,.jpeg,.png" multiple files={files} onFilesChange={handleFilesChange} label="Select images to convert (JPG, JPEG, PNG)" collapsible={false} />

            {files.length > 1 && (
              <div className="mt-6 mx-auto max-w-xl">
                <p className="text-sm font-medium text-foreground mb-3">Drag to reorder pages:</p>
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveFile(i, i - 1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                        <button onClick={() => moveFile(i, i + 1)} disabled={i === files.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {previews[i] && <img src={previews[i]} alt="" className="h-12 w-12 object-cover rounded-lg border border-border" />}
                      <span className="text-sm text-foreground truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">Page {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Page Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Page Size</Label>
                    <Select value={pageSize} onValueChange={setPageSize}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fit">Fit to Image Size</SelectItem>
                        <SelectItem value="a4">A4 (Standard)</SelectItem>
                        <SelectItem value="letter">US Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Orientation</Label>
                    <Select value={orientation} onValueChange={setOrientation} disabled={pageSize === "fit"}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
              buttonText={`Convert ${files.length} image${files.length !== 1 ? "s" : ""} to PDF`}
              processingText="Converting..."
            />
          </>
        ) : (
          <ResultView
            results={results}
            onReset={() => { setFiles([]); setResults([]); setPreviews([]); }}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default JpgToPdf;
