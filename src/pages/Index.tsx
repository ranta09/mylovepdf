import { useState } from "react";
import Navbar from "@/components/Navbar";
import MagicBackground from "@/components/MagicBackground";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools, aiTools } from "@/lib/tools";
import { motion } from "framer-motion";
import { Heart, Shield, Zap, Search, Sparkles, MessageCircleWarning, ImagePlus } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [search, setSearch] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackScreenshot, setFeedbackScreenshot] = useState<File | null>(null);
  const { toast } = useToast();

  const allTools = [...tools, ...aiTools];
  const filtered = allTools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPdfTools = filtered.filter(t => t.category !== "ai");
  const filteredAiTools = filtered.filter(t => t.category === "ai");

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim() || !feedbackEmail.trim()) return;
    toast({ title: "Feedback Sent", description: "Thank you! We'll look into it." });
    setFeedbackText("");
    setFeedbackEmail("");
    setFeedbackScreenshot(null);
    setFeedbackOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>PDF Magic — AI-Powered PDF & Document Tools</title>
        <meta name="description" content="Every tool you need to work with PDFs — plus AI-powered document tools. Merge, split, compress, convert, summarize, generate quizzes, chat with PDFs, and check resume ATS scores. Free, fast and secure." />
      </Helmet>
      <div className="relative flex min-h-screen flex-col">
        <MagicBackground />
        <Navbar />
        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-20 md:py-28">
            <div className="container relative z-10 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <motion.img
                  src={logoImg}
                  alt="PDF Magic"
                  className="mx-auto mb-6 h-24 w-24 relative"
                  whileHover={{ scale: 1.15, rotate: [0, -8, 8, -4, 0] }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                />
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
                  Every PDF tool you need
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                  Merge, split, compress, convert, edit and protect your PDFs — plus <span className="font-semibold text-primary">AI-powered tools</span> to summarize, quiz, and chat with your documents. All free.
                </p>

                {/* Search */}
                <div className="mx-auto mt-8 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search tools… e.g. merge, summarize, quiz, ATS"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-10 rounded-xl border-border bg-card shadow-card h-12 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Tools Grid */}
          <section className="container py-16">
            {search && filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">No tools found for "{search}"</p>
                <p className="mt-2 text-sm text-muted-foreground">Try searching for "merge", "convert", or "summarize"</p>
              </div>
            ) : (
              <>
                {/* AI Tools FIRST */}
                {filteredAiTools.length > 0 && (
                  <div className="mb-16" id="ai-tools">
                    {!search && (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">AI Document Tools</h2>
                        <p className="mt-2 text-muted-foreground">Supercharge your documents with AI — summarize, quiz, chat & more</p>
                      </motion.div>
                    )}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
                      {filteredAiTools.map((tool, i) => (
                        <ToolCard key={tool.id} tool={tool} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF Tools */}
                {filteredPdfTools.length > 0 && (
                  <>
                    {!search && filteredAiTools.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 text-center">
                        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">All PDF Tools</h2>
                        <p className="mt-2 text-muted-foreground">Everything you need to work with PDF files</p>
                      </motion.div>
                    )}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {filteredPdfTools.map((tool, i) => (
                        <ToolCard key={tool.id} tool={tool} index={i} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>

          {/* Features */}
          {!search && (
            <section className="border-t border-border bg-secondary/30 py-16">
              <div className="container">
                <div className="grid gap-8 md:grid-cols-3">
                  {[
                    { icon: Zap, title: "Lightning Fast", desc: "Process files instantly in your browser. No waiting, no queues." },
                    { icon: Shield, title: "100% Secure", desc: "Files are processed locally and automatically deleted after use." },
                    { icon: Heart, title: "Completely Free", desc: "All tools are free to use with no hidden limits or sign-ups." },
                  ].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex flex-col items-center gap-3 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <f.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Report Issue */}
                <div className="mt-12 flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-muted-foreground">Something not working?</p>
                  <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl gap-2">
                        <MessageCircleWarning className="h-4 w-4" />
                        Report an Issue
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-display">Report an Issue</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div>
                          <Input
                            placeholder="Your email *"
                            type="email"
                            value={feedbackEmail}
                            onChange={e => setFeedbackEmail(e.target.value)}
                            className="rounded-xl"
                            required
                          />
                          <p className="mt-1 text-xs text-muted-foreground">Required so we can follow up</p>
                        </div>
                        <Textarea
                          placeholder="Describe the issue — which tool, what went wrong, etc."
                          value={feedbackText}
                          onChange={e => setFeedbackText(e.target.value)}
                          rows={4}
                          className="rounded-xl resize-none"
                        />
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border p-3 hover:bg-secondary/50 transition-colors">
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {feedbackScreenshot ? feedbackScreenshot.name : "Attach a screenshot (optional)"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => setFeedbackScreenshot(e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                        <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim() || !feedbackEmail.trim()} className="w-full rounded-xl">
                          Submit Report
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </section>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
