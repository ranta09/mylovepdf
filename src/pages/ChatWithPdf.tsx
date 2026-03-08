import { useState, useRef, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Send, Loader2, User, Bot, Info } from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdfTextExtract";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const ChatWithPdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [documentText, setDocumentText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleExtract = async () => {
    if (files.length === 0) return;
    setExtracting(true);
    setProgress(30);

    try {
      const text = await extractTextFromPdf(files[0]);
      setProgress(100);

      if (!text.trim()) {
        toast({ title: "Error", description: "Could not extract text from PDF.", variant: "destructive" });
        setExtracting(false);
        return;
      }

      setDocumentText(text);
      setMessages([{ role: "assistant", content: "I've read your document! Ask me anything about it — summaries, explanations, key points, and more." }]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to extract text.", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          documentText,
          messages: newMessages.filter((m) => m.role !== "assistant" || !m.content.startsWith("I've read your document")),
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to get response");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length === newMessages.length + 1) {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Chat failed.", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <ToolLayout
      title="Chat with PDF"
      description="Upload any PDF and ask questions — get instant AI answers based on your document."
      category="ai"
      icon={<MessageSquare className="h-7 w-7" />}
      metaTitle="Chat with PDF — Ask Questions About Any Document | PDF Magic"
      metaDescription="Upload any PDF and have a conversation with it. Ask questions, get explanations, and explore your document with AI."
      hideHeader
    >
      <div className="space-y-6">
        {!documentText ? (
          <>
            {/* Instructions first */}
            <div className="rounded-2xl border border-tool-ai/20 bg-tool-ai/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-ai">
                  <MessageSquare className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-foreground">Chat with PDF</h1>
                  <p className="text-sm text-muted-foreground">Talk to your document like a conversation</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { step: "1", text: "Upload any PDF file" },
                  { step: "2", text: "AI reads your document" },
                  { step: "3", text: "Ask anything about it" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-ai text-xs font-bold text-primary-foreground">{s.step}</span>
                    <span className="text-sm text-foreground">{s.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Try asking: "What is the main idea?", "Summarize chapter 2", "Explain this concept", or "List the key takeaways". The AI answers only from your document. Files are private and deleted after use.
                </p>
              </div>
            </div>

            {/* Upload below instructions */}
            <FileUpload accept=".pdf" multiple={false} onFilesChange={setFiles} files={files} label="Upload a PDF to chat with" />

            {files.length > 0 && (
              <div className="space-y-3">
                {extracting && <Progress value={progress} className="h-2" />}
                <Button onClick={handleExtract} disabled={extracting} size="lg" className="w-full rounded-xl">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  {extracting ? "Reading Document…" : "Start Chatting"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col" style={{ height: "65vh" }}>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-secondary/20 p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border shadow-card"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your document…"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="rounded-xl"
                disabled={isStreaming}
              />
              <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} size="icon" className="shrink-0 rounded-xl">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Your files are private and automatically deleted.</p>
              <Button variant="ghost" size="sm" onClick={() => { setDocumentText(""); setFiles([]); setMessages([]); }} className="text-xs">
                Upload New PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default ChatWithPdf;
