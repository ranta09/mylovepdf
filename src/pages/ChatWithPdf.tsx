import { useState, useRef, useEffect, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ToolHeader from "@/components/ToolHeader";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { extractDocument, extractUrl, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Loader2, User, Bot, ShieldCheck,
  FileText, Link2, X, Mic, MicOff, Download, Clipboard,
  Sparkles, BookOpen, ListChecks, HelpCircle, Lightbulb,
  RotateCcw, FileQuestion, ChevronDown, CheckCircle2,
  Zap, Wand2, BrainCircuit, Search, Layout
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ToolSeoSection from "@/components/ToolSeoSection";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      hideHeader={!!documentText || extracting}
    >
      <div className="space-y-8">

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

        {/* ── IMMERSIVE CHAT WORKSPACE ───────────────────────────────────────── */}
        {documentText && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-row overflow-hidden relative">

              {/* LEFT SIDE: Document Intelligence */}
              <div className="w-80 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Document Intelligence</span>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* Active Documents */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Active Documents</h3>
                      <div className="space-y-2">
                        {docNames.map((name, i) => (
                          <div key={i} className="p-3 bg-primary/5 rounded-xl border border-primary/20 flex items-center gap-3">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-[10px] font-bold text-foreground uppercase truncate tracking-tight">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Intelligence */}
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        Quick Vectors
                      </h3>
                      <div className="space-y-2">
                        {QUICK_ACTIONS.map(a => (
                          <button key={a.mode} onClick={() => runQuickAction(a.mode)}
                            disabled={!!quickLoading || isStreaming}
                            className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all group ${a.color}`}>
                            {quickLoading === a.mode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.icon}
                            <span className="text-[10px] font-black uppercase tracking-wider">{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Security Protocol */}
                    <div className="pt-6 border-t border-border">
                      <div className="p-4 bg-secondary/20 rounded-2xl border border-border space-y-3">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Data Integrity
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold leading-relaxed">
                          Your files are encrypted during processing and automatically purged from our neural buffers after session termination.
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* CENTER: Chat Stream */}
              <div className="flex-1 bg-secondary/10 flex flex-col items-center p-8 overflow-hidden relative">
                <div className="w-full max-w-4xl h-full flex flex-col bg-background shadow-2xl rounded-2xl border border-border overflow-hidden relative">

                  {/* Messages Area */}
                  <ScrollArea className="flex-1">
                    <div className="p-8 space-y-8 min-h-full flex flex-col">

                      {/* Initial State / Suggestions */}
                      {messages.length <= 1 && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500 py-12">
                          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-4 border-primary/20">
                            <Bot className="h-10 w-10 text-primary" />
                          </div>
                          <div className="text-center space-y-2">
                            <h2 className="text-xl font-black uppercase tracking-tighter">I've parsed your documents</h2>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select a starter prompt or ask anything</p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                            {SUGGESTED_PROMPTS.map(p => (
                              <button key={p} onClick={() => sendMessage(p)}
                                className="rounded-full border border-border bg-background px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:border-primary/40 hover:text-primary transition-all shadow-sm">
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message list */}
                      <div className="space-y-8">
                        {messages.map((msg, i) => (
                          <div key={i} className={`flex gap-4 group ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mt-1">
                                <Bot className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className={`flex flex-col gap-2 max-w-[85%]`}>
                              {msg.mode && msg.mode !== "chat" && (
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">{MODE_LABELS[msg.mode as QuickMode]}</span>
                              )}
                              <div className={`rounded-2xl px-6 py-4 text-[13px] leading-relaxed relative ${msg.role === "user" ? "bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20" : "bg-secondary/50 border border-border text-foreground"}`}>
                                {msg.role === "assistant" ? (
                                  <div className="prose prose-sm max-w-none dark:prose-invert text-foreground font-medium">
                                    <ReactMarkdown>{msg.content || "Thinking..."}</ReactMarkdown>
                                  </div>
                                ) : (
                                  <p className="uppercase tracking-tight">{msg.content}</p>
                                )}

                                {msg.role === "assistant" && msg.content && (
                                  <button onClick={() => copyMessage(i, msg.content)}
                                    className="absolute -right-10 top-2 p-2 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                                    {copied === i ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                                  </button>
                                )}
                              </div>
                            </div>
                            {msg.role === "user" && (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background mt-1">
                                <User className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                        ))}
                        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                          <div className="flex gap-4 animate-pulse">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mt-1">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div className="bg-secondary/50 border border-border rounded-2xl px-6 py-4 flex items-center gap-3">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Neural Buffer Overflow...</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-6 border-t border-border bg-background/50 backdrop-blur-md">
                    <div className="flex gap-3 items-end max-w-3xl mx-auto w-full">
                      <div className="relative flex-1 group">
                        <textarea
                          ref={inputRef}
                          value={input}
                          rows={1}
                          onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Interrogate your document stream..."
                          disabled={isStreaming}
                          className="w-full rounded-2xl border-2 border-border bg-secondary/20 px-6 py-4 pr-14 text-xs font-bold uppercase tracking-tight resize-none focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 disabled:opacity-60 max-h-[120px] transition-all placeholder:text-muted-foreground/50"
                        />
                        <button onClick={toggleVoice}
                          className={`absolute right-4 bottom-4 p-2 rounded-xl transition-all ${listening ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
                          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()} size="icon"
                        className="h-14 w-14 rounded-2xl shrink-0 shadow-lg shadow-primary/20 bg-primary hover:shadow-primary/40 transition-all">
                        {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Global Actions */}
              <div className="w-96 border-l border-border bg-background flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Strategic Hub</span>
                  <Button variant="ghost" size="sm" onClick={resetChat} className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive px-3 gap-2">
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-8">
                    {/* Suggestion Prompts */}
                    {messages.length > 2 && (
                      <div className="space-y-4">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                          <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Follow-ups
                        </h3>
                        <div className="flex flex-col gap-2">
                          {SUGGESTED_PROMPTS.slice(0, 3).map(p => (
                            <button key={p} onClick={() => sendMessage(p)} className="text-left p-3 rounded-xl border border-border bg-secondary/20 text-[10px] font-bold uppercase tracking-tight text-muted-foreground hover:border-primary/30 hover:text-primary transition-all">
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Export Profiles */}
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                        <Download className="h-3.5 w-3.5" /> Intelligence Export
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { label: "Neural PDF Report", icon: <Download className="h-4 w-4" />, action: exportPDF },
                          { label: "Clean Markdown", icon: <FileText className="h-4 w-4" />, action: exportMD },
                          { label: "Plain Text Stream", icon: <Clipboard className="h-4 w-4" />, action: exportTXT },
                        ].map((exp, i) => (
                          <Button key={i} variant="outline" onClick={exp.action} className="justify-start h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-4 border-border hover:bg-secondary/50">
                            {exp.icon} {exp.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border bg-secondary/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest uppercase">Neural Link Established</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToolSeoSection
          toolName="Chat With PDF"
          category="ai"
          intro="The best free online tool to chat with PDF. Ask questions, get summaries, and extract insights from your documents instantly using advanced AI."
          features={[
            { icon: MessageSquare, title: "Intelligent Chat", desc: "Natural conversation with your documents — ask anything and get accurate answers" },
            { icon: Zap, title: "Instant Summaries", desc: "Get a high-level overview of long documents in seconds" },
            { icon: ShieldCheck, title: "Privacy First", desc: "Your documents are processed securely and never stored on our servers" },
            { icon: Layout, title: "Interactive Interface", desc: "Clean, fast, and easy-to-use chat interface with file preview" },
          ]}
          steps={[
            "Upload your PDF document",
            "Wait for the AI to analyze the content",
            "Type your questions in the chat box",
            "Get instant, accurate answers based on the document"
          ]}
          formats={["PDF", "DOCX", "PPTX", "XLSX", "TXT", "PNG", "JPG", "URLs"]}
          relatedTools={[
            { name: "AI Document Summarizer", path: "/summarizer", icon: Wand2 },
            { name: "AI Quiz Generator", path: "/quiz-generator", icon: BrainCircuit },
            { name: "ATS Resume Checker", path: "/ats-checker", icon: Search },
            { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          ]}
          faqs={[
            { q: "Is Chat with PDF free?", a: "Yes, MagicDocx Chat With PDF is completely free to use. There are no limits on the number of questions you can ask." },
            { q: "Can it handle large PDF files?", a: "Yes, our AI can process large documents. For extremely long PDFs, it focuses on the most relevant sections to provide accurate answers." },
            { q: "Are my files secure?", a: "Absolutely. Files are processed securely, and we do not store your documents permanently. Your privacy is our priority." },
            { q: "Do I need to create an account?", a: "No account or sign-up is required to use the Chat with PDF tool." },
            { q: "Which languages are supported?", a: "You can chat with your PDF in any language supported by the AI, including English, Spanish, French, German, and many more." },
          ]}
        />
      </div>
    </ToolLayout>
  );
};

export default ChatWithPdf;
