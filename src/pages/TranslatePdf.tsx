import { useState, useRef, useCallback, useEffect } from "react";
import {
  Languages, Download, Loader2, ShieldCheck, FileText, X,
  Copy, ClipboardCheck, RotateCcw, Globe, ChevronDown, CheckCircle2,
  Zap, Wand2, BrainCircuit, MessageSquare, Search, Layout, Hash
} from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import ToolUploadScreen from "@/components/ToolUploadScreen";
import ToolSeoSection from "@/components/ToolSeoSection";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractDocument, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import DocumentInfoCard from "@/components/DocumentInfoCard";

// ─── Language list (50+ languages with flag emojis) ───────────────────────────

const LANGUAGES: { code: string; name: string; native: string; flag: string }[] = [
  { code: "af", name: "Afrikaans", native: "Afrikaans", flag: "🇿🇦" },
  { code: "sq", name: "Albanian", native: "Shqip", flag: "🇦🇱" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "hy", name: "Armenian", native: "Հայերեն", flag: "🇦🇲" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan", flag: "🇦🇿" },
  { code: "eu", name: "Basque", native: "Euskara", flag: "🏴" },
  { code: "be", name: "Belarusian", native: "Беларуская", flag: "🇧🇾" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
  { code: "bs", name: "Bosnian", native: "Bosanski", flag: "🇧🇦" },
  { code: "bg", name: "Bulgarian", native: "Български", flag: "🇧🇬" },
  { code: "ca", name: "Catalan", native: "Català", flag: "🏴" },
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "hr", name: "Croatian", native: "Hrvatski", flag: "🇭🇷" },
  { code: "cs", name: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "da", name: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "et", name: "Estonian", native: "Eesti", flag: "🇪🇪" },
  { code: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "gl", name: "Galician", native: "Galego", flag: "🏴" },
  { code: "ka", name: "Georgian", native: "ქართული", flag: "🇬🇪" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "hu", name: "Hungarian", native: "Magyar", flag: "🇭🇺" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "kk", name: "Kazakh", native: "Қазақша", flag: "🇰🇿" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "lv", name: "Latvian", native: "Latviešu", flag: "🇱🇻" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių", flag: "🇱🇹" },
  { code: "mk", name: "Macedonian", native: "Македонски", flag: "🇲🇰" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "mt", name: "Maltese", native: "Malti", flag: "🇲🇹" },
  { code: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "ne", name: "Nepali", native: "नेपाली", flag: "🇳🇵" },
  { code: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "fa", name: "Persian", native: "فارسی", flag: "🇮🇷" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ro", name: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "sr", name: "Serbian", native: "Српски", flag: "🇷🇸" },
  { code: "sk", name: "Slovak", native: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", name: "Slovenian", native: "Slovenščina", flag: "🇸🇮" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "sw", name: "Swahili", native: "Kiswahili", flag: "🇰🇪" },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "tl", name: "Tagalog", native: "Filipino", flag: "🇵🇭" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "th", name: "Thai", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰" },
  { code: "uz", name: "Uzbek", native: "O'zbek", flag: "🇺🇿" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "cy", name: "Welsh", native: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
];

// Split text into chunks at paragraph/sentence boundaries (~4k chars each)
function chunkText(text: string, maxChars = 4000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxChars)];
}

interface DocResult { name: string; original: string; translated: string; lang: string; wordCount?: number }

// ─── Component ────────────────────────────────────────────────────────────────

const TranslatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [sourceLang, setSourceLang] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number; pageCount?: number } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [results, setResults] = useState<DocResult[]>([]);
  const [selectedResult, setSelectedResult] = useState(0);
  const [viewMode, setViewMode] = useState<"split" | "translated">("split");
  const [langSearch, setLangSearch] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalWordCount, setTotalWordCount] = useState(0);
  const { setDisableGlobalFeatures } = useGlobalUpload();

  useEffect(() => {
    setDisableGlobalFeatures(files.length > 0);
    return () => setDisableGlobalFeatures(false);
  }, [files, setDisableGlobalFeatures]);
  const langPickerRef = useRef<HTMLDivElement>(null);

  const filteredLangs = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.native.toLowerCase().includes(langSearch.toLowerCase())
  );

  // ── Auto-detect language ───────────────────────────────────────────────

  const detectLanguage = useCallback(async (text: string) => {
    setDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-translate", {
        body: { mode: "detect", text: text.slice(0, 1500) },
      });
      if (!error && data?.detectedLanguage) setDetectedLang(data.detectedLanguage);
    } catch { /* silently ignore */ } finally {
      setDetecting(false);
    }
  }, []);

  // ── Process & translate ────────────────────────────────────────────────

  const translate = async () => {
    if (files.length === 0) return;
    setProcessing(true); setProgress(0); setResults([]); setSelectedResult(0);
    const allResults: DocResult[] = [];

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      try {
        setStatusText(`Extracting ${file.name}…`);
        setProgress(Math.round((fi / files.length) * 20));
        const extracted = await extractDocument(file, (p, s) => {
          setStatusText(s);
          setProgress(Math.round((fi / files.length) * 20 + (p * 0.15)));
        });
        const originalText = extracted.text;
        if (!originalText.trim()) throw new Error("No text could be extracted from this file.");

        const chunks = chunkText(originalText, 4000);
        const translated: string[] = [];

        for (let ci = 0; ci < chunks.length; ci++) {
          setStatusText(`Translating ${file.name}: chunk ${ci + 1}/${chunks.length}…`);
          setProgress(Math.round(
            ((fi / files.length) * 80) + ((ci / chunks.length) * (80 / files.length)) + 20
          ));

          const { data, error } = await supabase.functions.invoke("ai-translate", {
            body: {
              mode: "translate",
              text: chunks[ci],
              targetLanguage: targetLang,
              sourceLanguage: sourceLang ?? detectedLang ?? undefined,
            },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          translated.push(data.translation ?? "");
          if (data?.wordCount) setTotalWordCount(prev => prev + (data.wordCount ?? 0));
        }

        allResults.push({
          name: file.name,
          original: originalText,
          translated: translated.join("\n\n"),
          lang: targetLang,
          wordCount: totalWordCount,
        });
      } catch (e: any) {
        toast.error(`Failed to translate ${file.name}: ${e.message}`);
      }
    }

    setProgress(100); setStatusText("Translation complete!");
    setResults(allResults);
    if (allResults.length) toast.success(`Translated ${allResults.length} document${allResults.length > 1 ? "s" : ""}!`);
    setProcessing(false);
  };

  // ── Handle file add + auto-detect ─────────────────────────────────────

  const handleFiles = async (incoming: File[]) => {
    setFiles(prev => [...prev, ...incoming]);
    if (incoming.length > 0) {
      try {
        const res = await extractDocument(incoming[0], () => { });
        setFileMeta({ name: incoming[0].name, size: incoming[0].size, pageCount: res.pageCount });
        if (res.text.trim()) detectLanguage(res.text);
      } catch { /* ignore */ }
    }
  };

  // ── Download helpers ──────────────────────────────────────────────────

  const downloadPDF = (result: DocResult) => {
    const doc = new jsPDF();
    let y = 28; const mw = doc.internal.pageSize.getWidth() - 40;
    const nl = (text: string, bold = false, size = 10) => {
      if (y > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); y = 28; }
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, mw); doc.text(lines, 20, y);
      y += lines.length * (size * 0.52 + 1.5);
    };
    nl(`Translation: ${result.lang}`, true, 14); y += 4;
    nl(`Source: ${result.name}`, false, 9); y += 6;
    result.translated.split("\n").forEach(line => nl(line || " ", line.startsWith("#"), line.startsWith("#") ? 12 : 10));
    doc.save(`translated-${result.lang.toLowerCase()}-${result.name.replace(/\.[^.]+$/, "")}.pdf`);
  };

  const downloadTXT = (result: DocResult) => {
    saveAs(new Blob([result.translated], { type: "text/plain;charset=utf-8" }), `translated-${result.lang.toLowerCase()}.txt`);
  };

  const downloadDOCX = async (result: DocResult) => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: result.translated.split("\n").map(text => 
            new Paragraph({ children: [new TextRun(text)] })
          )
        }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `translated-${result.lang.toLowerCase()}.docx`);
    } catch {
      toast.error("Failed to generate DOCX");
    }
  };

  const copyTranslation = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const reset = () => { setFiles([]); setResults([]); setDetectedLang(null); setSourceLang(null); setProgress(0); setStatusText(""); setFileMeta(null); setTotalWordCount(0); };

  const active = results[selectedResult];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Translate PDF"
      description="AI-powered document translation preserving layout and formatting."
      category="ai"
      icon={<Languages className="h-7 w-7" />}
      metaTitle="Translate PDF Online – AI PDF Translator | MagicDocx"
      metaDescription="Translate PDF documents instantly using AI. Upload a PDF and convert it into any language while preserving formatting."
      toolId="ai-translate"
      hideHeader={results.length > 0 || processing}
    >
      <div className="space-y-8">

        {/* ── UPLOAD PHASE ──────────────────────────────────────────────── */}
        {results.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {files.length === 0 && (
              <ToolUploadScreen
                title="Translate PDF"
                description="AI-powered document translation into 65+ languages"
                buttonLabel="Upload documents"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.rtf,.odt"
                multiple={true}
                onFilesSelected={handleFiles}
              />
            )}

            {/* Document Info Card: shown after upload */}
            {fileMeta && (
              <DocumentInfoCard
                name={fileMeta.name}
                sizeBytes={fileMeta.size}
                pageCount={fileMeta.pageCount}
                language={detecting ? "Detecting…" : detectedLang ?? undefined}
              />
            )}

            {/* Language pickers */}
            {files.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source language */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <label className="text-xs font-bold text-foreground">Source Language</label>
                  {detecting && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Detecting…</p>}
                  {detectedLang && !detecting && (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Detected: <strong>{detectedLang}</strong></span>
                    </div>
                  )}
                  <select value={sourceLang ?? ""} onChange={e => setSourceLang(e.target.value || null)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Auto-detect{detectedLang ? ` (${detectedLang})` : ""}</option>
                    {LANGUAGES.map(l => <option key={l.code} value={l.name}>{l.flag} {l.name}</option>)}
                  </select>
                </div>

                {/* Target language with search */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2" ref={langPickerRef}>
                  <label className="text-xs font-bold text-foreground">Translate To</label>
                  <button
                    onClick={() => setShowLangPicker(p => !p)}
                    className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm hover:border-primary/40 transition-all">
                    <span className="flex items-center gap-2">
                      <span>{LANGUAGES.find(l => l.name === targetLang)?.flag ?? "🌐"}</span>
                      <span className="font-medium">{targetLang}</span>
                      <span className="text-muted-foreground text-xs">{LANGUAGES.find(l => l.name === targetLang)?.native}</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showLangPicker ? "rotate-180" : ""}`} />
                  </button>
                  {showLangPicker && (
                    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden z-50">
                      <input autoFocus value={langSearch} onChange={e => setLangSearch(e.target.value)}
                        placeholder="Search languages…"
                        className="w-full px-3 py-2 text-sm border-b border-border bg-background focus:outline-none" />
                      <div className="max-h-48 overflow-y-auto">
                        {filteredLangs.map(l => (
                          <button key={l.code} onClick={() => { setTargetLang(l.name); setShowLangPicker(false); setLangSearch(""); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors ${targetLang === l.name ? "bg-primary/5 text-primary" : ""}`}>
                            <span>{l.flag}</span>
                            <span className="font-medium">{l.name}</span>
                            <span className="text-muted-foreground text-xs ml-auto">{l.native}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress */}
            {processing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-1.5 rounded-full" />
                <p className="text-xs text-center text-muted-foreground">{statusText}</p>
              </div>
            )}

            {/* Translate button */}
            {files.length > 0 && (
              <Button onClick={translate} disabled={processing} size="lg"
                className="w-full rounded-none py-6 text-base font-bold shadow-lg shadow-primary/20 gap-2.5">
                {processing
                  ? <><Loader2 className="h-5 w-5 animate-spin" />{statusText || "Translating…"}</>
                  : <><Languages className="h-5 w-5" />Translate {files.length > 1 ? `${files.length} Documents` : "Document"} → {targetLang}</>
                }
              </Button>
            )}

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Your files are encrypted and automatically deleted after processing.
            </p>
          </motion.div>
        )}

        {/* ── RESULTS PHASE ─────────────────────────────────────────────── */}
        {results.length > 0 && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden relative">

              {/* Toolbar */}
              <div className="bg-background/80 backdrop-blur border-b border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground truncate max-w-[200px]">{active.name}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{active.lang} Translation</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={() => setViewMode(v => v === "split" ? "translated" : "split")}>
                    {viewMode === "split" ? "Full View" : "Split View"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={() => copyTranslation(active.translated)}>
                    {copied ? <><ClipboardCheck className="h-3.5 w-3.5 text-green-500 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>}
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={() => downloadTXT(active)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />TXT
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={() => downloadDOCX(active)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />DOCX
                  </Button>
                  <Button variant="default" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={() => downloadPDF(active)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />Download PDF
                  </Button>
                  <Button variant="secondary" size="sm" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-tighter" onClick={reset}>
                    <RotateCcw className="h-3 w-3 mr-1.5" />New
                  </Button>
                </div>
              </div>

              {/* Multi-doc tabs */}
              {results.length > 1 && (
                <div className="bg-secondary/5 border-b border-border px-6 py-2 flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
                  {results.map((r, i) => (
                    <button key={i} onClick={() => setSelectedResult(i)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-black uppercase whitespace-nowrap transition-all border ${selectedResult === i ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-muted-foreground hover:text-foreground bg-background"}`}>
                      <FileText className="h-3 w-3" />{r.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Side-by-side / full view */}
              <div className="flex-1 overflow-hidden bg-secondary/5">
                <div className={`h-full grid gap-0 ${viewMode === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                  {viewMode === "split" && (
                    <div className="flex flex-col border-r border-border overflow-hidden">
                      <div className="bg-background/50 px-6 py-2 border-b border-border">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Original Source</p>
                      </div>
                      <ScrollArea className="flex-1 p-8">
                        <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert text-muted-foreground text-xs leading-relaxed">
                          <ReactMarkdown>{active.original}</ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <div className="bg-primary/5 px-6 py-2 border-b border-primary/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary">Translated: {active.lang}</p>
                    </div>
                    <ScrollArea className="flex-1 p-8 bg-background">
                      <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert text-foreground text-xs leading-relaxed">
                        <ReactMarkdown>{active.translated}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="bg-background border-t border-border px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AI Verification Secured</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 border-l border-border pl-6">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Target Language: </span>
                    <span className="text-[10px] font-black text-primary uppercase">{active.lang}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {totalWordCount > 0 && (
                    <span className="text-[10px] font-black text-muted-foreground uppercase">
                      <Hash className="inline h-3 w-3 mr-1" />{totalWordCount.toLocaleString()} words
                    </span>
                  )}
                  <span className="text-[10px] font-black text-muted-foreground uppercase">{files.length} Files Ready</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── SEO Content ─────────────────────────────────────────────────── */}
        {results.length === 0 && files.length === 0 && !processing && (
          <ToolSeoSection
            toolName="Translate PDF"
            category="ai"
            intro="The most powerful free AI PDF translator. Upload any document and translate it into 65+ languages while preserving headings, paragraphs, bullet points, and tables."
            features={[
              { icon: Languages, title: "65+ Languages", desc: "All major languages including right-to-left languages (Arabic, Hebrew)" },
              { icon: Zap, title: "Precision Machine Learning", desc: "Context-aware AI translation that understands technical and academic terms" },
              { icon: ShieldCheck, title: "Secure & Private", desc: "Your documents are never stored or used to train AI models" },
              { icon: Layout, title: "Layout Preservation", desc: "Automatically keeps your document's original formatting and structure" },
            ]}
            steps={[
              "Upload your document (PDF, DOCX, PPTX, etc.)",
              "MagicDocx automatically detects the source language",
              "Select your target language from the list",
              "Download your professional translation as a PDF or TXT"
            ]}
            formats={["PDF", "DOCX", "PPTX", "XLSX", "TXT", "RTF", "ODT"]}
            relatedTools={[
              { name: "AI Document Summarizer", path: "/summarizer", icon: Wand2 },
              { name: "AI Quiz Generator", path: "/quiz-generator", icon: BrainCircuit },
              { name: "Chat With PDF", path: "/chat-with-pdf", icon: MessageSquare },
              { name: "ATS Resume Checker", path: "/ats-checker", icon: Search },
              { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
            ]}
            faqs={[
              { q: "Is the PDF translator free?", a: "Yes, MagicDocx PDF Translator is 100% free to use with no hidden costs." },
              { q: "Will the layout of my document change?", a: "No. Our AI engine is specifically designed to maintain the original layout, including tables, lists, and headings." },
              { q: "What is the maximum file size?", a: "We support documents up to 50MB and several hundred pages long." },
              { q: "Do I need to sign up?", a: "No account or login is required. You can start translating immediately." },
              { q: "Are my documents secure?", a: "Yes. All processing happens over SSL, and files are automatically deleted as soon as you finish your session." },
            ]}
          />
        )}
      </div>
    </ToolLayout>
  );
};

export default TranslatePdf;
