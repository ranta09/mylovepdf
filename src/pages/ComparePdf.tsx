import ToolLayout from "@/components/ToolLayout";
import { GitCompare } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useToast } from "@/hooks/use-toast";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const ComparePdf = () => {
  const [files1, setFiles1] = useState<File[]>([]);
  const [files2, setFiles2] = useState<File[]>([]);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<{ pages1: number; pages2: number; text1: string; text2: string } | null>(null);
  const { toast } = useToast();

  const extractText = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n\n";
    }
    return { pages: pdf.numPages, text };
  };

  const handleCompare = async () => {
    if (files1.length === 0 || files2.length === 0) return;
    setComparing(true);
    try {
      const [r1, r2] = await Promise.all([extractText(files1[0]), extractText(files2[0])]);
      setResult({ pages1: r1.pages, pages2: r2.pages, text1: r1.text, text2: r2.text });
      toast({ title: "Comparison Ready", description: "Documents compared successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to compare PDFs.", variant: "destructive" });
    } finally {
      setComparing(false);
    }
  };

  return (
    <ToolLayout
      title="Compare PDF"
      description="Compare two PDF documents side by side. Spot differences between file versions quickly."
      category="edit"
      icon={<GitCompare className="h-8 w-8" />}
      metaTitle="Compare PDF — Side-by-Side PDF Comparison Online Free"
      metaDescription="Compare two PDF files side by side and easily spot differences between document versions. Free online PDF comparison tool with no sign-up."
      toolId="compare-pdf"
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">How to compare PDFs</h2>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mb-6">
            <li>Upload the first PDF document</li>
            <li>Upload the second PDF document to compare</li>
            <li>Click "Compare" to see the differences</li>
          </ol>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Document 1</p>
              <FileUpload accept=".pdf" onFilesChange={setFiles1} files={files1} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Document 2</p>
              <FileUpload accept=".pdf" onFilesChange={setFiles2} files={files2} />
            </div>
          </div>

          {files1.length > 0 && files2.length > 0 && (
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {comparing ? "Comparing…" : "Compare Documents"}
            </button>
          )}
        </div>

        {result && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Comparison Results</h2>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="rounded-xl bg-secondary/50 p-3 text-sm">
                <p className="font-medium text-foreground">Document 1: {files1[0]?.name}</p>
                <p className="text-muted-foreground">{result.pages1} pages</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 text-sm">
                <p className="font-medium text-foreground">Document 2: {files2[0]?.name}</p>
                <p className="text-muted-foreground">{result.pages2} pages</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Document 1 Text</h3>
                <div className="max-h-64 overflow-auto rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                  {result.text1.slice(0, 3000) || "No text extracted"}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Document 2 Text</h3>
                <div className="max-h-64 overflow-auto rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                  {result.text2.slice(0, 3000) || "No text extracted"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default ComparePdf;
