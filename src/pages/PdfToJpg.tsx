import { useState, useCallback } from "react";
import { Image } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import ProcessingView from "@/components/ProcessingView";
import ResultView, { ProcessingResult } from "@/components/ResultView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const PdfToJpg = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Options
  const [quality, setQuality] = useState("high"); // low, medium, high
  const [dpi, setDpi] = useState("300"); // 150, 300, 600
  const [pageRange, setPageRange] = useState(""); // e.g. "1-3,5"

  const parsePageRange = (range: string, total: number): number[] => {
    if (!range.trim()) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set<number>();
    range.split(",").forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map(Number);
        for (let i = Math.max(1, start); i <= Math.min(total, end); i++) pages.add(i);
      } else {
        const n = Number(trimmed);
        if (n >= 1 && n <= total) pages.add(n);
      }
    });
    return [...pages].sort((a, b) => a - b);
  };

  const convert = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setPreviews([]);
    setResults([]);
    try {
      const qualityMap: Record<string, number> = { low: 0.6, medium: 0.8, high: 0.95 };
      const scaleMap: Record<string, number> = { "150": 1.5, "300": 2, "600": 4 };
      const jpgQuality = qualityMap[quality] || 0.95;
      const scale = scaleMap[dpi] || 2;

      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const pagesToConvert = parsePageRange(pageRange, pdf.numPages);
      const totalPages = pagesToConvert.length;
      const images: string[] = [];
      const newResults: ProcessingResult[] = [];

      for (let idx = 0; idx < totalPages; idx++) {
        const pageNum = pagesToConvert[idx];
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", jpgQuality);
        images.push(dataUrl);

        // Create blob for each page
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        newResults.push({
          file: blob,
          url,
          filename: `page-${pageNum}.jpg`,
        });

        setProgress(Math.round(((idx + 1) / totalPages) * 90));
      }

      setPreviews(images);
      setProgress(95);

      // If multiple pages, also create a ZIP
      if (newResults.length > 1) {
        const zip = new JSZip();
        for (const r of newResults) {
          zip.file(r.filename, r.file);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        newResults.unshift({
          file: zipBlob,
          url: zipUrl,
          filename: "all-pages.zip",
        });
      }

      setResults(newResults);
      setProgress(100);
      toast.success(`Converted ${totalPages} page${totalPages > 1 ? "s" : ""} to JPG!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to images");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [files, quality, dpi, pageRange]);

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Convert each PDF page into a high-quality JPG image"
      category="convert"
      icon={<Image className="h-7 w-7" />}
      metaTitle="PDF to JPG Converter – Convert PDF Pages to Images | MagicDocx"
      metaDescription="Convert PDF pages to high-resolution JPG images. Choose quality, DPI, and specific pages. Free online PDF to image converter."
      toolId="pdf-to-jpg"
      hideHeader
    >
      <ToolHeader
        title="PDF to JPG"
        description="Extract every page from your PDF into a JPG image"
        icon={<Image className="h-5 w-5 text-primary-foreground" />}
      />
      <div className="mt-5">
        {results.length === 0 ? (
          <>
            <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to convert" collapsible={false} />

            {files.length > 0 && (
              <div className="mt-8 mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                <h3 className="font-bold text-foreground mb-4">Conversion Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Image Quality</Label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Smaller size)</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High (Best quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Resolution (DPI)</Label>
                    <Select value={dpi} onValueChange={setDpi}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="150">150 DPI</SelectItem>
                        <SelectItem value="300">300 DPI</SelectItem>
                        <SelectItem value="600">600 DPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pages (optional)</Label>
                    <Input
                      placeholder="e.g. 1-3, 5"
                      value={pageRange}
                      onChange={e => setPageRange(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            <ProcessingView
              files={files}
              processing={processing}
              progress={progress}
              onProcess={convert}
              buttonText="Convert to JPG"
              processingText="Converting pages..."
            />
          </>
        ) : (
          <>
            {/* Image Previews */}
            {previews.length > 0 && (
              <div className="mb-6">
                <p className="text-center text-sm font-medium text-foreground mb-3">
                  {previews.length} image{previews.length > 1 ? "s" : ""} generated
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-w-2xl mx-auto">
                  {previews.slice(0, 9).map((src, i) => (
                    <img key={i} src={src} alt={`Page ${i + 1}`} className="rounded-lg border border-border shadow-sm" />
                  ))}
                </div>
                {previews.length > 9 && (
                  <p className="text-center text-xs text-muted-foreground mt-2">+{previews.length - 9} more pages</p>
                )}
              </div>
            )}
            <ResultView
              results={results}
              onReset={() => { setFiles([]); setResults([]); setPreviews([]); }}
            />
          </>
        )}
      </div>
    </ToolLayout>
  );
};

export default PdfToJpg;
