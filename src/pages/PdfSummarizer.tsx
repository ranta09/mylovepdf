import { useState, useRef, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import ToolHeader from "@/components/ToolHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Copy, Download, FileText, Loader2, ShieldCheck,
  CheckCircle2, AlertCircle, Link2, X, Plus, MessageSquare,
  BookOpen, Highlighter, ListChecks, GraduationCap, ClipboardList,
  FileBarChart, Search, Send, ChevronDown, BrainCircuit,
  Zap, AlignLeft, BarChart3
} from "lucide-react";
import { extractDocument, extractUrl, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import FileUpload from "@/components/FileUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import ToolSeoSection from "@/components/ToolSeoSection";
import DocumentInfoCard from "@/components/DocumentInfoCard";

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "idle" | "extracting" | "summarizing" | "completed" | "error";
type SummaryMode = "quick" | "full" | "executive";
type SummaryLength = "short" | "medium" | "long";

type TabId = "overview" | "bullets" | "insights" | "study" | "chat" | "glossary" | "actions" | "quiz";

interface FileResult {
  name: string;
  text: string;
  pageCount?: number;
  method: string;
}

interface DocMeta {
  title?: string;
  topic?: string;
  language?: string;
  type?: string;
}

interface SummaryResults {
  overview: string;
  bullets: string;
  insights: string;
  study: string;
  glossary: string;
  actions: string;
  quiz: string;
}

const EMPTY_RESULTS: SummaryResults = {
  overview: "", bullets: "", insights: "", study: "", glossary: "", actions: "", quiz: "",
};

// Modes to generate per summary mode
const MODE_TABS: Record<SummaryMode, (keyof SummaryResults)[]> = {
  quick: ["overview", "bullets"],
  executive: ["overview"],
  full: ["overview", "bullets", "insights", "study", "glossary", "actions", "quiz"],
};

const MODE_AI_MODES: Record<SummaryMode, string[]> = {
  quick: ["overview", "bullets_full"],
  executive: ["executive"],
  full: ["overview", "bullets_full", "insights", "study", "glossary", "actions", "quiz"],
};

// ─── File type icons ──────────────────────────────────────────────────────────

const FILE_TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  pdf: { icon: "📄", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  docx: { icon: "📝", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  doc: { icon: "📝", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  xlsx: { icon: "📊", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  xls: { icon: "📊", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  csv: { icon: "📋", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  pptx: { icon: "📑", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  ppt: { icon: "📑", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
  txt: { icon: "📃", color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-950/30" },
  epub: { icon: "📚", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
  png: { icon: "🖼️", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  jpg: { icon: "🖼️", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  jpeg: { icon: "🖼️", color: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30" },
  url: { icon: "🌐", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPE_ICONS[ext] ?? { icon: "📄", color: "text-foreground", bg: "bg-secondary" };
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "bullets", label: "Bullet Points", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "insights", label: "Key Insights", icon: <Highlighter className="h-3.5 w-3.5" /> },
  { id: "study", label: "Study Notes", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: "chat", label: "Ask AI", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "glossary", label: "Glossary", icon: <Search className="h-3.5 w-3.5" /> },
  { id: "actions", label: "Action Items", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: "quiz", label: "Study Quiz", icon: <GraduationCap className="h-3.5 w-3.5" /> },
];

const SUMMARY_MODES: { key: keyof SummaryResults; aiMode: string }[] = [
  { key: "overview", aiMode: "overview" },
  { key: "bullets", aiMode: "bullets_full" },
  { key: "insights", aiMode: "insights" },
  { key: "study", aiMode: "study" },
  { key: "glossary", aiMode: "glossary" },
  { key: "actions", aiMode: "actions" },
  { key: "quiz", aiMode: "quiz" },
];

// ─── AI Call helper ───────────────────────────────────────────────────────────

async function callAI(text: string, mode: string, question?: string, length: SummaryLength = "medium"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-summarize", {
    body: { text, mode, length, ...(question ? { question } : {}) },
  });
  if (error) throw error;
  return data.summary as string;
}

async function detectDocMeta(text: string): Promise<DocMeta> {
  try {
    const { data } = await supabase.functions.invoke("ai-summarize", {
      body: { text: text.slice(0, 2000), mode: "detect" },
    });
    return data ?? {};
  } catch {
    return {};
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const DocSummarizer = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SummaryResults>(EMPTY_RESULTS);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loadingTabs, setLoadingTabs] = useState<Set<TabId>>(new Set());
  const [extractedFiles, setExtractedFiles] = useState<FileResult[]>([]);
  const [docMeta, setDocMeta] = useState<DocMeta>({});
  const [summaryMode, setSummaryMode] = useState<SummaryMode>("full");
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");

  // Chat state
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  // Drag-and-drop
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatHistory]);

  // ─── File handling ───────────────────────────────────────────────────────

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) setFiles(prev => [...prev, ...dropped]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  // ─── Summarize ───────────────────────────────────────────────────────────

  const handleSummarize = async () => {
    setStatus("extracting");
    setProgress(0);
    setResults(EMPTY_RESULTS);
    setChatHistory([]);
    setDocMeta({});

    const sources: FileResult[] = [];

    try {
      // Extract all files
      if (urlMode && urlInput.trim()) {
        setStatusText("Fetching URL content…");
        const res = await extractUrl(urlInput.trim());
        sources.push({ name: urlInput.trim(), text: res.text, method: "url" });
      } else {
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          setStatusText(`Extracting ${f.name} (${i + 1}/${files.length})…`);
          setProgress(Math.round((i / files.length) * 30));
          const res = await extractDocument(f, (p, s) => {
            setProgress(Math.round((i / files.length) * 30 + (p / files.length) * 0.30));
            setStatusText(s);
          });
          sources.push({ name: f.name, text: res.text, pageCount: res.pageCount, method: res.method });
          if (res.warning) toast({ title: "Warning", description: res.warning });
        }
      }

      if (sources.every(s => !s.text.trim())) {
        throw new Error("No text could be extracted from the provided document(s). The file may be a scanned image PDF | try uploading a text-based PDF.");
      }

      setExtractedFiles(sources);

      // Combine texts for multi-file
      const combinedText = sources.length === 1
        ? sources[0].text
        : sources.map((s, i) => `--- Document ${i + 1}: ${s.name} ---\n${s.text}`).join("\n\n");

      // Detect document metadata in parallel with starting summarization
      setProgress(32);
      setStatusText("Detecting document topic…");
      const meta = await detectDocMeta(combinedText);
      setDocMeta(meta);

      setStatus("summarizing");
      setProgress(38);

      // Determine which tabs to generate based on summaryMode
      const tabKeys = MODE_TABS[summaryMode];
      const aiModes = MODE_AI_MODES[summaryMode];

      // Generate selected summary tabs
      const newResults: SummaryResults = { ...EMPTY_RESULTS };
      for (let i = 0; i < tabKeys.length; i++) {
        const key = tabKeys[i];
        const aiMode = aiModes[i];
        setStatusText(`Generating ${key} (${i + 1}/${tabKeys.length})…`);
        setProgress(38 + Math.round((i / tabKeys.length) * 57));
        setLoadingTabs(prev => new Set([...prev, key as TabId]));
        try {
          newResults[key] = await callAI(combinedText, aiMode, undefined, summaryLength);
        } catch {
          newResults[key] = "*Could not generate this section.*";
        }
        setResults({ ...newResults });
        setLoadingTabs(prev => { const n = new Set(prev); n.delete(key as TabId); return n; });
      }

      setProgress(100);
      setStatus("completed");
      setActiveTab(tabKeys[0] as TabId);
      const modeLabel = summaryMode === "quick" ? "Quick Summary" : summaryMode === "executive" ? "Executive Brief" : "Full Analysis";
      toast({ title: "Done!", description: `${modeLabel} generated successfully.` });
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusText(e.message || "Failed to process document.");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ─── Chat ────────────────────────────────────────────────────────────────

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatHistory(h => [...h, { role: "user", text: question }]);
    setChatLoading(true);
    try {
      const combinedText = extractedFiles.map(f => f.text).join("\n\n");
      const answer = await callAI(combinedText, "chat", question);
      setChatHistory(h => [...h, { role: "ai", text: answer }]);
    } catch {
      setChatHistory(h => [...h, { role: "ai", text: "Sorry, I could not answer that. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Export ──────────────────────────────────────────────────────────────

  const getActiveContent = () => results[activeTab as keyof SummaryResults] ?? "";

  const copyContent = () => {
    const text = activeTab === "chat"
      ? chatHistory.map(m => `${m.role === "user" ? "Q" : "A"}: ${m.text} `).join("\n\n")
      : getActiveContent();
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Content copied to clipboard." });
  };

  const downloadMarkdown = () => {
    const content = TABS.map(t => `# ${t.label} \n\n${results[t.id as keyof SummaryResults] ?? ""} `).join("\n\n---\n\n");
    saveAs(new Blob([content], { type: "text/markdown" }), "summary.md");
  };

  const downloadTxt = () => {
    const content = TABS.map(t => `${t.label.toUpperCase()} \n${"=".repeat(40)} \n${results[t.id as keyof SummaryResults] ?? ""} `).join("\n\n");
    saveAs(new Blob([content], { type: "text/plain" }), "summary.txt");
  };

  const downloadDocx = async () => {
    try {
      const content = TABS.map(t => `${t.label.toUpperCase()} \n${"=".repeat(40)} \n${results[t.id as keyof SummaryResults] ?? ""} `).join("\n\n");
      const doc = new Document({
        sections: [{
          properties: {},
          children: content.split("\n").map(text => 
            new Paragraph({ children: [new TextRun(text)] })
          )
        }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "summary.docx");
    } catch {
      toast({ title: "Error", description: "Failed to generate DOCX", variant: "destructive" });
    }
  };

  const downloadPdf = async () => {
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const margin = 50, fontSize = 10, lineH = 16;

      let page = doc.addPage();
      let y = page.getHeight() - margin;

      const addLine = (text: string, isBold = false, size = fontSize) => {
        if (!page || y < margin + 20) {
          page = doc.addPage();
          y = page.getHeight() - margin;
        }
        const f = isBold ? bold : font;
        const w = page.getWidth() - margin * 2;
        const words = text.split(" ");
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word} ` : word;
          if (f.widthOfTextAtSize(test, size) > w) {
            page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
            y -= lineH;
            if (y < margin + 20) { page = doc.addPage(); y = page.getHeight() - margin; }
            line = word;
          } else { line = test; }
        }
        if (line) { page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) }); y -= lineH; }
      };

      for (const tab of TABS) {
        const content = results[tab.id as keyof SummaryResults];
        if (!content) continue;
        y -= 10;
        addLine(tab.label.toUpperCase(), true, 14); y -= 4;
        content.replace(/[#*•]/g, "").split("\n").filter(l => l.trim()).forEach(l => addLine(l));
        y -= 20;
      }

      const bytes = await doc.save();
      saveAs(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "summary.pdf");
    } catch { toast({ title: "Export failed", description: "Could not generate PDF.", variant: "destructive" }); }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const isProcessing = status === "extracting" || status === "summarizing";
  const canStart = (files.length > 0 || (urlMode && urlInput.trim().length > 5)) && !isProcessing;

  return (
    <ToolLayout
      title="AI Document Summarizer"
      description="Summarize PDFs, Word, PPT, Excel, images and URLs with AI."
      category="ai"
      icon={<Wand2 className="h-7 w-7" />}
      metaTitle="AI Document Summarizer – Summarize PDFs, Word, PPT & More | MagicDocx"
      metaDescription="Summarize documents instantly using AI. Upload PDF, Word, PPT, Excel or images and get quick summaries, key insights and study notes online for free."
      toolId="ai-summarizer"
      hideHeader={status !== "idle"}
    >
      <div className="space-y-8">

        {/* ── Upload / Input area ─────────────────────────────────────── */}
        {status === "idle" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button onClick={() => setUrlMode(false)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${!urlMode ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                <FileText className="h-3.5 w-3.5" /> Upload Files
              </button>
              <button onClick={() => setUrlMode(true)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${urlMode ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                <Link2 className="h-3.5 w-3.5" /> Paste URL
              </button>
            </div>

            {!urlMode ? (
              <>
                <FileUpload
                  onFilesChange={setFiles}
                  files={files}
                  accept={SUPPORTED_EXTENSIONS}
                  label="Upload documents"
                />
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/article"
                    className="flex-1 rounded-xl font-mono text-sm"
                    onKeyDown={e => e.key === "Enter" && canStart && handleSummarize()}
                  />
                  {urlInput && <button onClick={() => setUrlInput("")} className="px-2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
                </div>
                <p className="text-xs text-muted-foreground">Paste any publicly accessible URL to summarize its content.</p>
              </div>
            )}

            {/* Document info card | shown after files are added */}
            {files.length > 0 && !urlMode && (
              <DocumentInfoCard
                name={files.length === 1 ? files[0].name : `${files.length} documents selected`}
                sizeBytes={files.reduce((acc, f) => acc + f.size, 0)}
              />
            )}

            {/* Summary Mode & Length | shown when files are ready */}
            {(files.length > 0 || (urlMode && urlInput.trim().length > 5)) && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-foreground">Analysis Settings</h3>

                {/* Summary Mode */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Summary Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "quick" as SummaryMode, label: "Quick", icon: <Zap className="h-3.5 w-3.5" />, desc: "Overview + Bullets" },
                      { id: "full" as SummaryMode, label: "Full Analysis", icon: <BarChart3 className="h-3.5 w-3.5" />, desc: "All 7 sections" },
                      { id: "executive" as SummaryMode, label: "Executive", icon: <BrainCircuit className="h-3.5 w-3.5" />, desc: "Board-level brief" },
                    ] as const).map(m => (
                      <button key={m.id} onClick={() => setSummaryMode(m.id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center text-xs font-semibold transition-all ${summaryMode === m.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/40"}`}>
                        {m.icon}
                        <span className="font-bold">{m.label}</span>
                        <span className={`text-[10px] ${summaryMode === m.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary Length */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Output Length</label>
                  <div className="flex gap-2">
                    {(["short", "medium", "long"] as SummaryLength[]).map(l => (
                      <button key={l} onClick={() => setSummaryLength(l)}
                        className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-all ${summaryLength === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summarize button */}
            <Button
              onClick={handleSummarize}
              disabled={!canStart}
              size="lg"
              className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 gap-2.5"
            >
              <Wand2 className="h-5 w-5" />
              {files.length > 1 ? `Summarize ${files.length} Documents` : summaryMode === "quick" ? "Quick Summarize" : summaryMode === "executive" ? "Generate Executive Brief" : "Summarize with AI"}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Files are encrypted and automatically deleted after processing. Never stored.
            </p>
          </motion.div>
        )}

        {/* ── Processing ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl border border-border bg-card p-10 text-center space-y-6 shadow-sm">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <Loader2 className="absolute h-20 w-20 animate-spin text-primary/15" />
                <Wand2 className="h-9 w-9 animate-pulse text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{status === "extracting" ? "Extracting Content" : "Generating AI Summary"}</h3>
                <p className="text-sm text-muted-foreground">{statusText}</p>
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <Progress value={progress} className="h-2 rounded-full" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{Math.round(progress)}% Complete</p>
              </div>
              {status === "summarizing" && (
                <p className="text-xs text-muted-foreground">
                  {summaryMode === "quick" ? "Generating quick summary…" : summaryMode === "executive" ? "Generating executive brief…" : "Generating comprehensive analysis…"}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {status === "error" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-destructive text-lg">Processing Failed</h3>
              <p className="text-sm text-destructive/70 mt-1">{statusText}</p>
            </div>
            <Button variant="outline" onClick={() => { setStatus("idle"); setFiles([]); setUrlInput(""); }} className="rounded-xl border-destructive/20 text-destructive">
              Try Again
            </Button>
          </motion.div>
        )}

        {/* ── Results ─────────────────────────────────────────────────── */}
        {status === "completed" && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden relative">

              {/* Toolbar / File info bar */}
              <div className="bg-background/80 backdrop-blur border-b border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground">AI Intelligence Report</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {docMeta.topic && (
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">📚 {docMeta.topic}</span>
                      )}
                      {docMeta.language && docMeta.language !== "English" && (
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">🌐 {docMeta.language}</span>
                      )}
                      {extractedFiles.map((f, i) => {
                        const { icon } = getFileIcon(f.name);
                        return (
                          <div key={i} className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                            <span>{icon}</span>
                            <span className="max-w-[100px] truncate">{f.name.split("/").pop()}</span>
                            {f.pageCount && <span className="text-primary/60">({f.pageCount}p)</span>}
                            {i < extractedFiles.length - 1 && <span>•</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={copyContent} className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button variant="ghost" size="sm" onClick={downloadMarkdown} className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> MD
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadTxt} className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> TXT
                  </Button>
                  <Button variant="ghost" size="sm" onClick={downloadDocx} className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                    <Download className="h-3.5 w-3.5 mr-1.5" /> DOCX
                  </Button>
                  <Button variant="default" size="sm" onClick={downloadPdf} className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => { setStatus("idle"); setFiles([]); setUrlInput(""); setResults(EMPTY_RESULTS); setExtractedFiles([]); setChatHistory([]); }}
                    className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New
                  </Button>
                </div>
              </div>

              {/* Tabs navigation */}
              <div className="bg-secondary/5 border-b border-border px-6 py-2 flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`flex items - center gap - 2 rounded - xl px - 4 py - 2 text - [10px] font - black uppercase whitespace - nowrap transition - all border ${activeTab === t.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-muted-foreground hover:text-foreground bg-background"} `}>
                    {t.icon}
                    <span>{t.label}</span>
                    {loadingTabs.has(t.id) && <Loader2 className="h-3 w-3 animate-spin text-primary ml-1" />}
                    {!loadingTabs.has(t.id) && results[t.id as keyof SummaryResults] && activeTab !== t.id && <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />}
                  </button>
                ))}
              </div>

              {/* Main Workspace Area */}
              <div className="flex-1 overflow-hidden relative bg-secondary/5">
                {activeTab === "chat" ? (
                  <div className="h-full flex flex-col max-w-5xl mx-auto border-x border-border bg-background">
                    <ScrollArea ref={chatRef} className="flex-1 p-8">
                      <div className="space-y-6">
                        {chatHistory.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
                            <div className="p-4 rounded-full bg-primary/5">
                              <MessageSquare className="h-10 w-10 text-primary/30" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-black uppercase tracking-widest text-foreground">Interactive Knowledge Base</p>
                              <p className="text-xs">Ask specific questions about the processed documents</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                              {["Summarize key findings", "What are the main risks?", "List requirements", "Explain the technical details"].map(q => (
                                <button key={q} onClick={() => { setChatInput(q); }}
                                  className="rounded-xl border border-border bg-background px-4 py-2 text-[10px] font-bold uppercase hover:border-primary/50 transition-all">{q}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {chatHistory.map((m, i) => (
                          <div key={i} className={`flex gap - 4 ${m.role === "user" ? "justify-end" : "justify-start"} `}>
                            {m.role === "ai" && (
                              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-primary/20">
                                <Wand2 className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                            <div className={`max - w - [85 %] rounded - 2xl px - 5 py - 4 text - sm leading - relaxed shadow - sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card border border-border text-foreground rounded-tl-none"} `}>
                              {m.role === "ai"
                                ? <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed text-foreground"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                                : m.text}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex gap-4">
                            <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <Loader2 className="h-4 w-4 text-primary animate-spin" />
                            </div>
                            <div className="rounded-2xl rounded-tl-none bg-card border border-border px-5 py-4 shadow-sm">
                              <div className="flex gap-1.5 items-center h-5">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    <div className="p-6 bg-background border-t border-border shrink-0">
                      <div className="flex gap-3 max-w-4xl mx-auto relative">
                        <Input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder="Query Document Intelligence..."
                          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                          className="flex-1 h-12 rounded-xl bg-secondary/20 border-border focus:ring-primary/20 pr-12 text-sm font-medium"
                        />
                        <Button onClick={handleChat} disabled={chatLoading || !chatInput.trim()} className="absolute right-1 top-1 h-10 w-10 p-0 rounded-lg">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-center mt-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Powered by Advanced Document Neural Analysis</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-full bg-background">
                    <div className="max-w-4xl mx-auto p-12 lg:p-16">
                      <div className="prose prose-sm md:prose-base max-w-none text-foreground prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed dark:prose-invert">
                        {loadingTabs.has(activeTab) ? (
                          <div className="flex flex-col items-center gap-4 text-muted-foreground py-24">
                            <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Synthesizing {TABS.find(t => t.id === activeTab)?.label}...</span>
                          </div>
                        ) : results[activeTab as keyof SummaryResults] ? (
                          <ReactMarkdown>{results[activeTab as keyof SummaryResults]}</ReactMarkdown>
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-muted-foreground py-24 opacity-50 italic">
                            <span className="text-sm">No structured data found for this analysis vector.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Status Bar */}
              <div className="bg-background border-t border-border px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Encrypted Document Processing Active</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 border-l border-border pl-6">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Analysis Vectors: </span>
                    <span className="text-[10px] font-black text-primary uppercase">7 Intelligent Modes</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase">{extractedFiles.length} Source{extractedFiles.length > 1 ? 's' : ''} Synthesized</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── SEO Content ──────────────────────────────────────────────── */}
        <ToolSeoSection
          toolName="AI Document Summarizer"
          category="ai"
          intro="The most powerful online tool to instantly summarize any document. Powered by AI | supports PDF, Word, PowerPoint, Excel, images, and URLs."
          features={[
            { icon: FileBarChart, title: "9 Summary Types", desc: "Overview, bullets, insights, executive, study notes, actions, TLDR, glossary, quiz" },
            { icon: MessageSquare, title: "Chat with Document", desc: "Ask any question and get accurate answers based on your document" },
            { icon: GraduationCap, title: "Study & Quiz Mode", desc: "Flashcards, quiz questions, and study guides generated automatically" },
            { icon: Search, title: "Knowledge Extraction", desc: "Key terms, statistics, people, organizations, and dates extracted" },
          ]}
          steps={[
            "Upload your document or paste a URL above",
            "Click Summarize with AI",
            "Wait a few seconds while AI processes your document",
            "View results across 7 intelligent tabs"
          ]}
          formats={["PDF", "DOCX", "PPTX", "XLSX", "CSV", "TXT", "PNG", "JPG", "URLs"]}
          relatedTools={[
            { name: "Chat With PDF", path: "/chat-with-pdf", icon: MessageSquare },
            { name: "AI Quiz Generator", path: "/quiz-generator", icon: BrainCircuit },
            { name: "ATS Resume Checker", path: "/ats-checker", icon: Search },
            { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          ]}
          faqs={[
            { q: "How does the AI summarizer work?", a: "MagicDocx extracts text from your document using advanced parsing and OCR, then sends it to an AI model that generates structured summaries across 9 different formats." },
            { q: "Can I summarize Word or PowerPoint files?", a: "Yes | DOCX, DOC, PPTX, and PPT files are all supported. Simply upload the file and the AI will process it automatically." },
            { q: "Is my document secure?", a: "Absolutely. Your files are processed entirely in your browser for extraction, and no document content is ever stored on our servers. Files are automatically deleted after processing." },
            { q: "Can I summarize large PDFs?", a: "Yes. MagicDocx uses intelligent chunk processing to handle documents up to 300+ pages. Large documents are split, summarized in parts, and then combined into a coherent output." },
            { q: "Can I summarize multiple files at once?", a: "Yes | upload multiple files and the AI will generate both individual summaries and a combined summary across all documents." },
          ]}
        />

      </div>
    </ToolLayout>
  );
};

export default DocSummarizer;
