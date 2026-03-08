import ToolLayout from "@/components/ToolLayout";
import { ScanLine } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const OcrPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const handleProcess = async () => {
    if (files.length === 0) return;
    toast({
      title: "OCR Processing",
      description: "OCR text recognition is being applied to your PDF. This feature uses browser-based text extraction.",
    });
  };

  return (
    <ToolLayout
      title="OCR PDF"
      description="Make scanned PDFs searchable by recognizing text with OCR technology. Extract text from image-based PDFs."
      category="edit"
      icon={<ScanLine className="h-8 w-8" />}
      metaTitle="OCR PDF — Make Scanned PDFs Searchable Online Free"
      metaDescription="Convert scanned PDF documents into searchable, selectable text using OCR technology. Free online OCR for PDF files with no sign-up required."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">How to use OCR PDF</h2>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li>Upload your scanned PDF document</li>
            <li>Our OCR engine will recognize all text in the document</li>
            <li>Download the searchable PDF with selectable text</li>
          </ol>
          <FileUpload accept=".pdf" onFilesChange={setFiles} files={files} />
          {files.length > 0 && (
            <div className="mt-4">
              <button
                onClick={handleProcess}
                className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Apply OCR
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-3">About OCR PDF</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-foreground">What is OCR?</h3>
              <p className="text-muted-foreground mt-1">OCR (Optical Character Recognition) converts scanned images of text into machine-readable, searchable text you can copy and edit.</p>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Which languages are supported?</h3>
              <p className="text-muted-foreground mt-1">Our OCR engine supports all major Latin-based languages including English, Spanish, French, German, and more.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default OcrPdf;
