import { useState, useRef, useEffect, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ToolHeader from "@/components/ToolHeader";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { extractDocument, extractUrl, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Loader2, User, Bot, ShieldCheck,
  FileText, Link2, X, Mic, MicOff, Download, Clipboard,
  Sparkles, BookOpen, ListChecks, HelpCircle, Lightbulb,
  RotateCcw, FileQuestion, ChevronDown, CheckCircle2
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = "file" | "url";
type QuickMode = "summarize" | "keypoints" | "studynotes" | "quiz" | "explain";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mode?: QuickMode | "chat";
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const AUTH_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUGGESTED_PROMPTS = [
  "What is this document about?",
  "Summarize the key findings",
  "List the most important points",
  "What conclusions does this document draw?",
  "Explain the most complex concepts",
];

const QUICK_ACTIONS: { mode: QuickMode; label: string; icon: React.ReactNode; color: string }[] = [
  { mode: "summarize", label: "Summarize", icon: <Sparkles className="h-3.5 w-3.5" />, color: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800" },
  { mode: "keypoints", label: "Key Points", icon: <ListChecks className="h-3.5 w-3.5" />, color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800" },
  { mode: "studynotes", label: "Study Notes", icon: <BookOpen className="h-3.5 w-3.5" />, color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800" },
  { mode: "quiz", label: "Make Quiz", icon: <FileQuestion className="h-3.5 w-3.5" />, color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800" },
  { mode: "explain", label: "Explain", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-800" },
];

const MODE_LABELS: Record<QuickMode, string> = {
  summarize: "📝 Summary",
  keypoints: "💡 Key Points",
  studynotes: "📚 Study Notes",
  quiz: "❓ Quiz",
  explain: "🔍 Explanation",
};

// ─── SpeechRecognition types ──────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const ChatWithPdf = () => {
  // Upload state
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractStatus, setExtractStatus] = useState("");

  // Chat state
  const [documentText, setDocumentText] = useState("");
  const [docNames, setDocNames] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickLoading, setQuickLoading] = useState<QuickMode | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  // Voice
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // ─── Extract ────────────────────────────────────────────────────────────

  const handleExtract = async () => {
    setExtracting(true); setExtractProgress(5); setExtractStatus("Preparing…");
    try {
      const parts: string[] = [];
      const names: string[] = [];

      if (inputMode === "file") {
        for (let i = 0; i < files.length; i++) {
          setExtractStatus(`Reading ${files[i].name} (${i + 1}/${files.length})…`);
          setExtractProgress(5 + (i / files.length) * 80);
          const res = await extractDocument(files[i], (_, s) => setExtractStatus(s));
          parts.push(res.text);
          names.push(files[i].name);
        }
      } else {
        setExtractStatus("Fetching URL content…"); setExtractProgress(30);
        const res = await extractUrl(urlInput.trim());
        parts.push(res.text);
        names.push(urlInput.trim());
      }

      const combined = parts.join("\n\n---\n\n");
      if (!combined.trim()) throw new Error("No text could be extracted.");

      setDocumentText(combined);
      setDocNames(names);
      setExtractProgress(100);
      setMessages([{
        role: "assistant",
        content: `I've read **${names.join(", ")}**. Ask me anything about ${names.length > 1 ? "these documents" : "this document"} — summaries, explanations, specific sections, comparisons, and more.\n\nOr use the quick actions above to instantly generate a summary, key points, study notes, or quiz!`,
        mode: "chat"
      }]);
    } catch (e: any) {
      toast({ title: "Extraction failed", description: e.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  // ─── Quick Action ────────────────────────────────────────────────────────

  const runQuickAction = async (mode: QuickMode) => {
    if (quickLoading || isStreaming) return;
    setQuickLoading(mode);
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${AUTH_KEY}` },
        body: JSON.stringify({ documentText, messages: [], mode }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [
        ...prev,
        { role: "user", content: `Generate: ${MODE_LABELS[mode]}`, mode },
        { role: "assistant", content: data.result ?? "", mode },
      ]);
    } catch (e: any) {
      toast({ title: "Quick action failed", description: e.message, variant: "destructive" });
    } finally {
      setQuickLoading(null);
    }
  };

  // ─── Chat send ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: text, mode: "chat" };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    let accumulated = "";

    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${AUTH_KEY}` },
        body: JSON.stringify({
          documentText,
          mode: "chat",
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) throw new Error("No response from AI");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      // Add placeholder
      setMessages(prev => [...prev, { role: "assistant", content: "", mode: "chat" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).replace(/\r$/, "");
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const chunk = JSON.parse(raw);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: accumulated, mode: "chat" };
                return copy;
              });
            }
          } catch { /* partial json — continue */ }
        }
      }
    } catch (e: any) {
      toast({ title: "Chat error", description: e.message, variant: "destructive" });
      setMessages(prev => prev.filter(m => !(m.role === "assistant" && m.content === "")));
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, documentText, isStreaming, toast]);

  // ─── Voice ──────────────────────────────────────────────────────────────

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast({ title: "Voice not supported", description: "Use Chrome or Edge for voice input.", variant: "destructive" }); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US";
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  // ─── Copy ───────────────────────────────────────────────────────────────

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content).then(() => { setCopied(idx); setTimeout(() => setCopied(null), 2000); });
  };

  // ─── Export ─────────────────────────────────────────────────────────────

  const exportPDF = () => {
    const doc = new jsPDF();
    let y = 25;
    const mw = doc.internal.pageSize.getWidth() - 40;
    const nl = (text: string, bold = false, size = 10) => {
      if (y > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); y = 25; }
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, mw); doc.text(lines, 20, y); y += lines.length * (size * 0.5 + 1) + 2;
    };
    nl("Chat with Document — MagicDocx", true, 14); y += 4;
    messages.forEach(m => { if (m.content) { nl(`${m.role === "user" ? "You" : "AI"}:`, true, 10); nl(m.content, false, 9); y += 3; } });
    doc.save("chat-export.pdf");
  };

  const exportMD = () => {
    const md = messages.map(m => `**${m.role === "user" ? "You" : "AI"}:**\n\n${m.content}`).join("\n\n---\n\n");
    saveAs(new Blob([md], { type: "text/markdown" }), "chat-export.md");
  };

  const exportTXT = () => {
    const txt = messages.map(m => `${m.role === "user" ? "You" : "AI"}:\n${m.content}`).join("\n\n");
    saveAs(new Blob([txt], { type: "text/plain" }), "chat-export.txt");
  };

  const resetChat = () => { setDocumentText(""); setDocNames([]); setFiles([]); setMessages([]); setUrlInput(""); };

  const canStart = (inputMode === "file" && files.length > 0) || (inputMode === "url" && urlInput.trim().length > 10);

  // ─── UI ─────────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="Chat With PDF"
      description="Upload any document and ask questions — get instant AI answers."
      category="ai"
      icon={<MessageSquare className="h-7 w-7" />}
      metaTitle="Chat With PDF – Ask Questions About Documents | MagicDocx"
      metaDescription="Chat with PDFs and documents using AI. Upload files, ask questions, generate summaries, and extract insights instantly with MagicDocx."
      toolId="ai-chat"
      hideHeader
    >
      <div className="space-y-8">
        <ToolHeader
          title="Chat With PDF"
          description="Ask questions about any document using AI"
          icon={<MessageSquare className="h-5 w-5 text-primary-foreground" />}
          className="bg-tool-ai/5 border-tool-ai/20"
          iconBgClass="bg-tool-ai"
        />

        {/* ── UPLOAD PHASE ──────────────────────────────────────────────── */}
        {!documentText && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Input mode tabs */}
            <div className="flex gap-1.5 rounded-2xl bg-secondary p-1.5">
              {([{ id: "file", label: "Upload Files", icon: <FileText className="h-3.5 w-3.5" /> }, { id: "url", label: "Website URL", icon: <Link2 className="h-3.5 w-3.5" /> }] as const).map(t => (
                <button key={t.id} onClick={() => setInputMode(t.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold flex-1 justify-center transition-all ${inputMode === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {inputMode === "file" && (
              <div className="space-y-3">
                <FileUpload
                  onFilesChange={setFiles}
                  files={files}
                  accept={SUPPORTED_EXTENSIONS}
                  label="Upload documents"
                />
              </div>
            )}

            {inputMode === "url" && (
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/article-or-page"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}

            {extracting && (
              <div className="space-y-2">
                <Progress value={extractProgress} className="h-1.5 rounded-full" />
                <p className="text-xs text-center text-muted-foreground">{extractStatus}</p>
              </div>
            )}

            <Button onClick={handleExtract} disabled={!canStart || extracting} size="lg"
              className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20 gap-2.5">
              {extracting ? <><Loader2 className="h-5 w-5 animate-spin" />Reading documents…</> : <><MessageSquare className="h-5 w-5" />Start Chatting</>}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Files encrypted and automatically deleted after 1 hour.
            </p>

            {/* Feature preview */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {[
                { icon: <Sparkles className="h-4 w-4 text-purple-500" />, label: "Instant Summaries" },
                { icon: <ListChecks className="h-4 w-4 text-blue-500" />, label: "Key Point Extraction" },
                { icon: <BookOpen className="h-4 w-4 text-green-500" />, label: "Study Notes" },
                { icon: <HelpCircle className="h-4 w-4 text-orange-500" />, label: "Quiz Generation" },
                { icon: <Lightbulb className="h-4 w-4 text-yellow-500" />, label: "Concept Explanation" },
                { icon: <MessageSquare className="h-4 w-4 text-primary" />, label: "Free-form Chat" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  {icon} {label}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CHAT PHASE ─────────────────────────────────────────────────── */}
        {documentText && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">

            {/* Doc info bar */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{docNames.join(", ")}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{docNames.length > 1 ? `(${docNames.length} docs)` : ""}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-3">
                <Button variant="ghost" size="sm" onClick={exportPDF} className="rounded-lg h-7 px-2 text-xs gap-1"><Download className="h-3 w-3" />PDF</Button>
                <Button variant="ghost" size="sm" onClick={exportMD} className="rounded-lg h-7 px-2 text-xs gap-1"><Download className="h-3 w-3" />MD</Button>
                <Button variant="ghost" size="sm" onClick={exportTXT} className="rounded-lg h-7 px-2 text-xs gap-1"><Download className="h-3 w-3" />TXT</Button>
                <Button variant="outline" size="sm" onClick={resetChat} className="rounded-lg h-7 px-2 text-xs gap-1"><RotateCcw className="h-3 w-3" />New</Button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(a => (
                <button key={a.mode} onClick={() => runQuickAction(a.mode)}
                  disabled={!!quickLoading || isStreaming}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${a.color}`}>
                  {quickLoading === a.mode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.icon}
                  {a.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-[420px] max-h-[56vh] overflow-y-auto rounded-2xl border border-border bg-secondary/10 p-4 space-y-4 scroll-smooth">

              {/* Suggested prompts (shown before first user message) */}
              {messages.length <= 1 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suggested Questions</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.map(p => (
                      <button key={p} onClick={() => sendMessage(p)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-secondary/50 transition-all text-left">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 group ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col gap-1 max-w-[84%]">
                    {msg.mode && msg.mode !== "chat" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{MODE_LABELS[msg.mode as QuickMode]}</span>
                    )}
                    <div className={`rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border shadow-sm rounded-bl-sm"}`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground">
                          <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                    </div>
                    {msg.role === "assistant" && msg.content && (
                      <button onClick={() => copyMessage(i, msg.content)}
                        className="self-start flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all px-1">
                        {copied === i ? <><CheckCircle2 className="h-3 w-3 text-green-500" />Copied</> : <><Clipboard className="h-3 w-3" />Copy</>}
                      </button>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary mt-0.5">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming cursor */}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"><Bot className="h-4 w-4 text-primary" /></div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /><span className="text-xs text-muted-foreground">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex gap-2 items-end">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask a question about your document…"
                  disabled={isStreaming}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 max-h-[120px]"
                />
                <button onClick={toggleVoice}
                  className={`absolute right-3 bottom-3 p-1.5 rounded-full transition-all ${listening ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:text-primary hover:bg-secondary"}`}>
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()} size="icon"
                className="h-11 w-11 rounded-2xl shrink-0 shadow-sm">
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />Files encrypted and automatically deleted after 1 hour. · {messages.length - 1} messages
            </p>
          </motion.div>
        )}

        {/* ── SEO Content ──────────────────────────────────────────────────── */}
        <div className="mt-16 space-y-10 text-sm text-muted-foreground border-t border-border pt-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold text-foreground">Chat With PDF</h1>
            <p className="text-base max-w-2xl mx-auto">The most powerful AI document chat assistant. Upload any document and get instant answers, summaries, insights, and study materials — no waiting, no sign-up required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">How to chat with a document</h2>
              <ol className="space-y-2 list-decimal list-inside text-sm">
                <li>Upload your document (PDF, DOCX, PPTX, image, or paste a URL)</li>
                <li>Click <strong>Start Chatting</strong> — AI reads your file instantly</li>
                <li>Ask any question or use a quick action (Summarize, Key Points, Quiz…)</li>
                <li>Copy or export your answers as PDF, Markdown, or TXT</li>
              </ol>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Supported file formats</h2>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {["PDF", "DOCX / DOC", "PPTX / PPT", "XLSX / XLS / CSV", "TXT / RTF / ODT", "EPUB", "PNG / JPG / TIFF (OCR)", "Website URLs", "Markdown files"].map(f => (
                  <span key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />{f}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Features of MagicDocx AI document chat</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <Sparkles className="h-4 w-4" />, t: "Instant Summaries", d: "Generate comprehensive summaries in seconds" },
                { icon: <ListChecks className="h-4 w-4" />, t: "Key Point Extraction", d: "Automatically identify the most important information" },
                { icon: <Mic className="h-4 w-4" />, t: "Voice Questions", d: "Ask questions by speaking — no typing required" },
                { icon: <FileText className="h-4 w-4" />, t: "Multi-Format Support", d: "Works with PDFs, Word, PowerPoint, spreadsheets, and more" },
                { icon: <Download className="h-4 w-4" />, t: "Export Conversations", d: "Save your chat as PDF, Markdown, or plain text" },
                { icon: <ShieldCheck className="h-4 w-4" />, t: "100% Private", d: "Files deleted automatically — never stored or trained on" },
              ].map(({ icon, t, d }) => (
                <div key={t} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <div className="text-primary">{icon}</div>
                  <p className="font-semibold text-foreground text-xs">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Use cases — students, researchers, professionals</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {["Students — Chat with textbooks and papers", "Researchers — Ask questions across academic papers", "Professionals — Extract insights from reports", "Legal — Analyze contracts and legal documents", "Finance — Understand financial documents", "HR — Review and summarize CVs and policies"].map(u => (
                <div key={u} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-medium text-foreground">{u}</div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
            {[
              { q: "How does Chat With PDF work?", a: "You upload a document (or paste a URL), MagicDocx extracts all the text, and then you can ask any question. Our AI reads the document and answers specifically from its content — not from general knowledge." },
              { q: "Can I chat with Word or PowerPoint files?", a: "Yes! MagicDocx supports PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS, CSV, TXT, RTF, EPUB, and image files (with OCR for scanned documents). You can also paste any website URL." },
              { q: "Is my document secure?", a: "Absolutely. Your files are encrypted during processing and automatically deleted within 1 hour. We never store document contents, and your files are never used for AI training." },
              { q: "Can I upload large documents?", a: "Yes — MagicDocx handles large documents through intelligent chunking. For very large documents, the AI focuses on the most relevant sections to give accurate, fast answers." },
              { q: "Can I export my chat conversation?", a: "Yes — you can download the full conversation as a PDF report, Markdown file, or plain text at any time using the export buttons in the chat header." },
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

export default ChatWithPdf;
