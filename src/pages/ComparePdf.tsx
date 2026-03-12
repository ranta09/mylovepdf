import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { GitCompare, Loader2, Info } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";
import { useToast } from "@/hooks/use-toast";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const ComparePdf = () => {
  const [files1, setFiles1] = useState<File[]>([]);
  const [files2, setFiles2] = useState<File[]>([]);
  const [comparing, setComparing] = useState(false);
  const [progress, setProgress] = useState(0);
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
    setProgress(20);
    try {
      const [r1, r2] = await Promise.all([extractText(files1[0]), extractText(files2[0])]);
      setProgress(90);
      setResult({ pages1: r1.pages, pages2: r2.pages, text1: r1.text, text2: r2.text });
      setProgress(100);
      toast({ title: "Comparison Ready", description: "Documents compared successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to compare PDFs.", variant: "destructive" });
    } finally {
      setComparing(false);
      setProgress(0);
    }
  };

  return (
    <ToolLayout
      title="Compare PDF"
      description="Compare two PDF documents side by side and spot differences."
      category="edit"
      icon={<GitCompare className="h-7 w-7" />}
      metaTitle="Compare PDF — Side-by-Side PDF Comparison Online Free"
      metaDescription="Compare two PDF files side by side and easily spot differences between document versions. Free online PDF comparison tool with no sign-up."
      toolId="compare-pdf"
      hideHeader
    >
      <div className="rounded-2xl border border-border bg-secondary/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
            <GitCompare className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Compare PDF</h1>
            <p className="text-sm text-muted-foreground">Compare two PDF files side by side and spot differences</p>
            <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Works great with contract revisions, document versions, and legal comparisons. Max file size: 100MB.</span></div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Document 1</p>
          <FileUpload accept=".pdf" onFilesChange={setFiles1} files={files1} label="Upload first PDF" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Document 2</p>
          <FileUpload accept=".pdf" onFilesChange={setFiles2} files={files2} label="Upload second PDF" />
        </div>
      </div>

      {comparing && <Progress value={progress} className="mt-4" />}

      {files1.length > 0 && files2.length > 0 && !result && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <Button size="lg" onClick={handleCompare} disabled={comparing} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8">
            {comparing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Comparing…</> : "Compare Documents"}
          </Button>
          {comparing && <p className="text-xs text-muted-foreground">Estimated time: ~5-15 seconds</p>}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
          <Button variant="ghost" onClick={() => { setResult(null); setFiles1([]); setFiles2([]); }} className="rounded-xl">
            Compare Another Pair
          </Button>
        </div>
      )}
    </ToolLayout>
  );
};

export default ComparePdf;
