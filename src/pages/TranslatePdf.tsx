import { useState, useRef, useCallback } from "react";
import {
  Languages, Download, Loader2, ShieldCheck, FileText, X,
  Copy, ClipboardCheck, RotateCcw, Globe, ChevronDown, CheckCircle2
} from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractDocument, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

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

interface DocResult { name: string; original: string; translated: string; lang: string }

// ─── Component ────────────────────────────────────────────────────────────────

const TranslatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [sourceLang, setSourceLang] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
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
          setStatusText(`Translating ${file.name} — chunk ${ci + 1}/${chunks.length}…`);
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
        }

        allResults.push({
          name: file.name,
          original: originalText,
          translated: translated.join("\n\n"),
          lang: targetLang,
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
    nl(`Translation — ${result.lang}`, true, 14); y += 4;
    nl(`Source: ${result.name}`, false, 9); y += 6;
    result.translated.split("\n").forEach(line => nl(line || " ", line.startsWith("#"), line.startsWith("#") ? 12 : 10));
    doc.save(`translated-${result.lang.toLowerCase()}-${result.name.replace(/\.[^.]+$/, "")}.pdf`);
  };

  const downloadTXT = (result: DocResult) => {
    saveAs(new Blob([result.translated], { type: "text/plain;charset=utf-8" }), `translated-${result.lang.toLowerCase()}.txt`);
  };

  const copyTranslation = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const reset = () => { setFiles([]); setResults([]); setDetectedLang(null); setSourceLang(null); setProgress(0); setStatusText(""); };

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
      hideHeader
    >
      <div className="space-y-8">
        <ToolHeader
          title="Translate PDF Online"
          description="AI-powered document translation — 65+ languages, layout preserved"
          icon={<Languages className="h-5 w-5 text-primary-foreground" />}
          className="bg-tool-ai/5 border-tool-ai/20"
          iconBgClass="bg-tool-ai"
        />

        {/* ── UPLOAD PHASE ──────────────────────────────────────────────── */}
        {results.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Standard File Upload */}
            <FileUpload
              onFilesChange={handleFiles}
              files={files}
              accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.rtf,.odt"
              label="Upload documents"
            />

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
                className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20 gap-2.5">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Multi-doc tabs */}
            {results.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {results.map((r, i) => (
                  <button key={i} onClick={() => setSelectedResult(i)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all border ${selectedResult === i ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground bg-card"}`}>
                    <FileText className="h-3 w-3" />{r.name}
                  </button>
                ))}
              </div>
            )}

            {/* Toolbar */}
            {active && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-foreground">{active.name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary font-bold">{active.lang}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewMode(v => v === "split" ? "translated" : "split")}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-all text-muted-foreground hover:text-foreground">
                      {viewMode === "split" ? "Full View" : "Split View"}
                    </button>
                    <button onClick={() => copyTranslation(active.translated)}
                      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-all text-muted-foreground hover:text-foreground">
                      {copied ? <><ClipboardCheck className="h-3.5 w-3.5 text-green-500" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                    </button>
                    <button onClick={() => downloadTXT(active)}
                      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-all text-muted-foreground hover:text-foreground">
                      <Download className="h-3.5 w-3.5" />TXT
                    </button>
                    <button onClick={() => downloadPDF(active)}
                      className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all">
                      <Download className="h-3.5 w-3.5" />PDF
                    </button>
                    <button onClick={reset}
                      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-all text-muted-foreground hover:text-foreground">
                      <RotateCcw className="h-3 w-3" />New
                    </button>
                  </div>
                </div>

                {/* Side-by-side / full view */}
                <div className={`grid gap-4 ${viewMode === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                  {viewMode === "split" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Original</p>
                      <div className="rounded-2xl border border-border bg-secondary/10 p-4 max-h-[65vh] overflow-y-auto prose prose-sm max-w-none dark:prose-invert text-muted-foreground text-xs">
                        <ReactMarkdown>{active.original}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary px-1">
                      Translated — {active.lang}
                    </p>
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 max-h-[65vh] overflow-y-auto prose prose-sm max-w-none dark:prose-invert text-foreground text-xs">
                      <ReactMarkdown>{active.translated}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── SEO Content ─────────────────────────────────────────────────── */}
        <div className="mt-16 space-y-10 text-sm text-muted-foreground border-t border-border pt-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold text-foreground">Translate PDF Online</h1>
            <p className="text-base max-w-2xl mx-auto">The most powerful free AI PDF translator. Upload any document and translate it into 65+ languages while preserving headings, paragraphs, bullet points, and tables.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">How to translate PDF documents</h2>
              <ol className="space-y-2 list-decimal list-inside text-sm">
                <li>Upload your document (PDF, DOCX, PPTX, XLSX, TXT…)</li>
                <li>The source language is automatically detected</li>
                <li>Select your target language from 65+ options</li>
                <li>Click <strong>Translate Document</strong></li>
                <li>Preview the side-by-side result</li>
                <li>Download as PDF or TXT</li>
              </ol>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Supported languages (selection)</h2>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {["🇪🇸 Spanish", "🇫🇷 French", "🇩🇪 German", "🇮🇳 Hindi", "🇨🇳 Chinese", "🇯🇵 Japanese", "🇸🇦 Arabic", "🇵🇹 Portuguese", "🇷🇺 Russian", "🇰🇷 Korean", "🇮🇹 Italian", "🇳🇱 Dutch"].map(l => (
                  <span key={l} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />{l}</span>
                ))}
                <span className="text-muted-foreground">+ 50 more languages</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Features of MagicDocx PDF Translator</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <Languages className="h-4 w-4" />, t: "65+ Languages", d: "Including right-to-left languages like Arabic, Hebrew, Urdu" },
                { icon: <Globe className="h-4 w-4" />, t: "Auto Language Detection", d: "Automatically identifies the source language of your document" },
                { icon: <FileText className="h-4 w-4" />, t: "Layout Preserved", d: "Headings, bullets, tables, and paragraph structure kept intact" },
                { icon: <CheckCircle2 className="h-4 w-4" />, t: "Multi-Format Support", d: "Works with PDF, DOCX, PPTX, XLSX, TXT, and more" },
                { icon: <Download className="h-4 w-4" />, t: "Download as PDF or TXT", d: "Export your translated document in your preferred format" },
                { icon: <ShieldCheck className="h-4 w-4" />, t: "100% Private", d: "Files deleted after processing — never stored" },
              ].map(({ icon, t, d }) => (
                <div key={t} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <div className="text-primary">{icon}</div>
                  <p className="font-semibold text-foreground text-xs">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
            {[
              { q: "How do I translate a PDF?", a: "Upload your PDF to MagicDocx, select your target language, and click Translate. The AI reads the document, translates all text while keeping the structure intact, and shows you a side-by-side preview you can download." },
              { q: "Can I translate scanned PDFs?", a: "Yes — MagicDocx uses OCR (Optical Character Recognition) to extract text from scanned or image-based PDFs before translating. The full document is converted to searchable text first." },
              { q: "Does the tool preserve formatting?", a: "Yes. The AI translation engine is specifically instructed to preserve headings, bullet points, numbered lists, paragraph spacing, and table structure. The translated output matches the original document layout." },
              { q: "Is my document secure?", a: "Absolutely. Your files are encrypted during processing and automatically deleted after translation. MagicDocx never stores your documents and never uses them for AI training." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">
                  {q} <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default TranslatePdf;
