import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wand2, Copy, Download, FileText, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ReactMarkdown from "react-markdown";
import { extractTextFromPdf } from "@/lib/pdfTextExtract";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";

type SummaryMode = "short" | "bullets" | "highlights";
type Status = "idle" | "extracting" | "summarizing" | "completed" | "error";

const PdfSummarizer = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processingStatus, setProcessingStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [mode, setMode] = useState<SummaryMode>("short");
  const { toast } = useToast();

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
    if (summary) {
      setSummary("");
      setProcessingStatus("idle");
    }
  };

  const handleSummarize = async () => {
    if (files.length === 0) return;
    setProcessingStatus("extracting");
    setProgress(0);
    setSummary("");

    try {
      // 1. Extraction (with OCR support)
      const text = await extractTextFromPdf(files[0], (p, status) => {
        setProgress(p * 0.4); // Extraction is 40% of the total progress
        setStatusText(status);
      });

      if (!text.trim()) {
        throw new Error("This PDF could not be processed. It might be corrupt or contain no text.");
      }

      setProcessingStatus("summarizing");
      setStatusText("Analyzing document content...");
      setProgress(40);

      // 2. Chunking Logic for Large Documents
      const MAX_CHUNK_LENGTH = 45000;
      let finalSummary = "";

      if (text.length > MAX_CHUNK_LENGTH) {
        const chunks = [];
        for (let i = 0; i < text.length; i += MAX_CHUNK_LENGTH) {
          chunks.push(text.slice(i, i + MAX_CHUNK_LENGTH));
        }

        setStatusText(`Document is large. Summarizing in ${chunks.length} parts...`);
        const chunkSummaries = [];

        for (let i = 0; i < chunks.length; i++) {
          setProgress(40 + Math.round(((i + 1) / chunks.length) * 50));
          const { data, error } = await supabase.functions.invoke("ai-summarize", {
            body: { text: chunks[i], mode: "short" },
          });
          if (error) throw error;
          chunkSummaries.push(data.summary);
        }

        setStatusText("Combining summaries...");
        const { data: combinedData, error: combinedError } = await supabase.functions.invoke("ai-summarize", {
          body: { text: "Below are summaries of different parts of a document. Combine them into one cohesive masterpiece:\n\n" + chunkSummaries.join("\n\n"), mode },
        });
        if (combinedError) throw combinedError;
        finalSummary = combinedData.summary;
      } else {
        // Single call for smaller docs
        setProgress(60);
        setStatusText("Generating your summary...");
        const { data, error } = await supabase.functions.invoke("ai-summarize", {
          body: { text, mode },
        });
        setProgress(90);
        if (error) throw error;
        finalSummary = data.summary;
      }

      setSummary(finalSummary);
      setProcessingStatus("completed");
      setProgress(100);
      toast({ title: "Success", description: "Your summary is ready!" });
    } catch (e: any) {
      console.error(e);
      setProcessingStatus("error");
      setStatusText(e.message || "Failed to summarize.");
      toast({ title: "Error", description: e.message || "Failed to summarize.", variant: "destructive" });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast({ title: "Copied!", description: "Summary copied to clipboard." });
  };

  const downloadAsPdf = async () => {
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const margin = 50;
      const maxWidth = 495;

      const lines: string[] = [];
      const cleanSummary = summary.replace(/[#*]/g, ""); // Basic cleanup for default PDF font

      for (const paragraph of cleanSummary.split("\n")) {
        if (!paragraph.trim()) {
          lines.push("");
          continue;
        }
        const words = paragraph.split(" ");
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      let page = doc.addPage();
      let y = page.getHeight() - margin;
      for (const line of lines) {
        if (y < margin) {
          page = doc.addPage();
          y = page.getHeight() - margin;
        }
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        y -= fontSize + 4;
      }

      const pdfBytes = await doc.save();
      saveAs(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }), `${files[0].name.replace(".pdf", "")}-summary.pdf`);
    } catch (e) {
      toast({ title: "Error", description: "Failed to generate PDF download.", variant: "destructive" });
    }
  };

  return (
    <ToolLayout
      title="PDF Summarizer"
      description="Professional AI-powered document analysis and summarization."
      category="ai"
      icon={<Wand2 className="h-7 w-7" />}
      metaTitle="AI PDF Summarizer — Instant Document Analysis | MagicDOCX"
      metaDescription="Summarize any PDF with high accuracy. Supports scanned documents, large files, and professional structured output."
      toolId="ai-summarizer"
      hideHeader
    >
      <div className="space-y-8">
        <ToolHeader
          title="PDF Summarizer with AI"
          description="Get professional insights from any PDF document"
          icon={<Wand2 className="h-5 w-5 text-primary-foreground" />}
          className="bg-tool-ai/5 border-tool-ai/20"
          iconBgClass="bg-tool-ai"
        />

        <div className="mx-auto w-full max-w-2xl space-y-6">
          <FileUpload
            accept=".pdf"
            multiple={false}
            onFilesChange={handleFilesChange}
            files={files}
            label="Drop your PDF here or click to browse"
          />

          <AnimatePresence mode="wait">
            {files.length > 0 && processingStatus === "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-muted-foreground">Summary Style</span>
                  <div className="flex gap-2">
                    {(["short", "bullets", "highlights"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${mode === m
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSummarize}
                  size="lg"
                  className="w-full rounded-2xl bg-primary py-6 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30"
                >
                  <Wand2 className="mr-2 h-5 w-5" />
                  Summarize Document
                </Button>

                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Your files are private and automatically deleted after processing.
                </p>
              </motion.div>
            )}

            {(processingStatus === "extracting" || processingStatus === "summarizing") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-border bg-card p-8 text-center space-y-6 shadow-sm"
              >
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                  <Loader2 className="absolute h-16 w-16 animate-spin text-primary/20" />
                  <Wand2 className="h-8 w-8 animate-pulse text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">{processingStatus === "extracting" ? "Extracting Content" : "Generating Summary"}</h3>
                  <p className="text-sm text-muted-foreground">{statusText}</p>
                </div>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2 rounded-full" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{Math.round(progress)}% Complete</p>
                </div>
              </motion.div>
            )}

            {processingStatus === "error" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-4"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-destructive">Processing Failed</h3>
                  <p className="text-sm text-destructive/80">{statusText}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setProcessingStatus("idle")} className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10">
                  Try Again
                </Button>
              </motion.div>
            )}

            {summary && processingStatus === "completed" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h3 className="font-display text-lg font-bold">Document Summary</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 rounded-lg px-2 text-xs">
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button variant="ghost" size="sm" onClick={downloadAsPdf} className="h-8 rounded-lg px-2 text-xs">
                      <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-8 shadow-card prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:font-bold prose-p:leading-relaxed prose-li:leading-relaxed">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>

                <Button
                  variant="outline"
                  onClick={() => { setSummary(""); setFiles([]); setProcessingStatus("idle"); }}
                  className="w-full rounded-2xl py-6"
                >
                  Analyze New Document
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ToolLayout>
  );
};

export default PdfSummarizer;
