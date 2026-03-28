import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import HeroUpload from "@/components/HeroUpload";

import { tools, aiTools, categoryColors, type ToolCategory } from "@/lib/tools";
import { motion } from "framer-motion";
import {
  Heart, Shield, Zap, Search, MessageCircleWarning, ImagePlus,
  Wand2, FileText, Edit3, Lock, Minimize2, Scissors, Merge, Globe, CheckCircle, X, Loader2, ChevronDown
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const categoryMeta = [
  { id: "ai", labelKey: "catAi" as const, icon: Wand2, filter: (t: any) => t.category === "ai" },
  { id: "convert", labelKey: "catConvert" as const, icon: FileText, filter: (t: any) => t.category === "convert" || t.category === "image" },
  { id: "edit", labelKey: "catEdit" as const, icon: Edit3, filter: (t: any) => t.category === "edit" },
  { id: "merge", labelKey: "catMerge" as const, icon: Merge, filter: (t: any) => t.category === "merge" },
  { id: "split", labelKey: "catSplit" as const, icon: Scissors, filter: (t: any) => t.category === "split" },
  { id: "compress", labelKey: "catCompress" as const, icon: Minimize2, filter: (t: any) => t.category === "compress" },
  { id: "protect", labelKey: "catProtect" as const, icon: Lock, filter: (t: any) => t.category === "protect" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "MagicDOCX",
  "url": "https://mylovepdf.lovable.app",
  "description": "Free online PDF tools: merge, split, compress, convert, edit, protect PDFs plus AI-powered summarizer, quiz generator, chat with PDF, ATS resume checker and translator.",
  "applicationCategory": "Productivity",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "12500" },
};

const sitelinksJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MagicDOCX",
  "url": "https://mylovepdf.lovable.app",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://mylovepdf.lovable.app/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackScreenshot, setFeedbackScreenshot] = useState<File | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const { t, tt } = useLanguage();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    categoryMeta.map(c => c.id) // All expanded by default
  );
  const [activeCategory, setActiveCategory] = useState<string>(categoryMeta[0].id);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const lastTool = sessionStorage.getItem("lastVisitedTool");
    if (lastTool) {
      sessionStorage.removeItem("lastVisitedTool");
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-tool-path="${lastTool}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, []);

  const allTools = [...aiTools, ...tools];
  const filtered = allTools.filter(tool =>
    tool.name.toLowerCase().includes(search.toLowerCase()) ||
    tool.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() || !feedbackEmail.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setFeedbackLoading(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke("send-contact", {
        body: {
          fullName: "Homepage Feedback User",
          email: feedbackEmail,
          subject: "🚨 Homepage Bug Report/Feedback",
          message: feedbackText,
        },
      });

      if (invokeError) {
        console.error("Feedback error:", invokeError);
        toast.error("Failed to send feedback. Please try again later.");
        return;
      }

      toast.success("Feedback sent! Thank you for helping us improve.");
      setFeedbackText("");
      setFeedbackEmail("");
      setFeedbackScreenshot(null);
      setFeedbackOpen(false);
    } catch (err) {
      console.error("Feedback catch error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>MagicDOCX | Free Online PDF Tools | Merge, Split, Compress, Convert & AI</title>
        <meta name="description" content="Every tool you need to work with PDFs - completely free. Merge, split, compress, convert, edit, protect PDFs. Plus AI-powered summarizer, quiz generator, chat with PDF, ATS resume checker & translator. No sign-up required." />
        <meta name="keywords" content="PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF to JPG, edit PDF, AI PDF summarizer, PDF quiz generator, chat with PDF, ATS resume checker, translate PDF, free PDF tools, online PDF editor, convert PDF" />
        <link rel="canonical" href="https://mylovepdf.lovable.app" />
        <meta property="og:title" content="MagicDOCX | Free Online PDF & AI Document Tools" />
        <meta property="og:description" content="35+ free PDF tools: merge, split, compress, convert, edit, protect. Plus AI summarizer, quiz generator, chat & ATS checker. No sign-up." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mylovepdf.lovable.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(sitelinksJsonLd)}</script>
      </Helmet>

      <div className="relative flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-1">

          {/* ─── HERO ─── */}
          <section className="relative overflow-hidden py-16 md:py-24">
            {/* Subtle gradient blobs */}
            <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full opacity-30 blur-3xl"
              style={{ background: "radial-gradient(ellipse at center, hsl(217 91% 72%) 0%, transparent 70%)" }} />

            <div className="container max-w-[1600px] w-[95%] relative z-10 text-center">
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                {/* Headline */}
                <h2 className="font-display mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground md:text-6xl md:leading-tight mb-4">
                  Drop your file anywhere to start
                </h2>
                <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                  We'll detect the file and suggest the right tool <span className="text-primary font-semibold">instantly</span>.
                </p>

                {/* Large Upload Zone */}
                <div className="mb-10">
                  <HeroUpload />
                </div>
              </motion.div>
            </div>
          </section>



          {/* ─── TOOLS ─── */}
          <section className="container max-w-[1600px] w-[95%] py-14">
            <div className="flex flex-col gap-8">
              {/* Tab Bar & Search */}
              <div className="flex flex-col md:flex-row w-full items-center justify-between gap-4 rounded-3xl bg-card border border-border p-2 shadow-sm">
                {/* Tabs */}
                <div className="flex w-full md:w-auto items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {categoryMeta.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setSearch(""); 
                      }}
                      className={cn(
                        "whitespace-nowrap rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-300",
                        activeCategory === cat.id && !search
                          ? cn("shadow-md", categoryColors[cat.id as ToolCategory]) 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      {t[cat.labelKey]}
                    </button>
                  ))}
                </div>

                {/* Search Component inside the tab bar */}
                <div className="relative w-full md:w-64 pr-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={search ? t.searchPlaceholder : "Search tools..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-10 pl-10 pr-8 rounded-xl border-none bg-secondary/40 focus-visible:ring-primary/20"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 flex items-center justify-center"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tool Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {search ? (
                  filtered.length === 0 ? (
                    <div className="col-span-full py-16 text-center">
                      <p className="text-lg text-muted-foreground">{tt("noToolsFound", { query: search })}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{t.trySearching}</p>
                    </div>
                  ) : (
                    filtered.map((tool, i) => (
                      <ToolCard key={tool.id} tool={tool} index={i} />
                    ))
                  )
                ) : (
                  allTools
                    .filter(categoryMeta.find(c => c.id === activeCategory)?.filter || (() => true))
                    .map((tool, i) => (
                      <ToolCard key={tool.id} tool={tool} index={i} />
                    ))
                )}
              </div>
            </div>
          </section>

          {/* ─── HOW IT WORKS (Removed per design) ─── */}

          {/* ─── WHY US ─── */}
          {!search && (
            <section className="border-t border-border bg-secondary/30 py-16">
              <div className="container">
                <h2 className="font-display text-2xl font-bold text-foreground text-center mb-10 md:text-3xl">{t.whyTitle}</h2>
                <div className="grid gap-8 md:grid-cols-3">
                  {[
                    { icon: Zap, title: t.whyFastTitle, desc: t.whyFastDesc },
                    { icon: Shield, title: t.whySecureTitle, desc: t.whySecureDesc },
                    { icon: Heart, title: t.whyFreeTitle, desc: t.whyFreeDesc },
                  ].map((f, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-card"
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
                  <p className="text-sm text-muted-foreground">{t.somethingNotWorking}</p>
                  <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl gap-2">
                        <MessageCircleWarning className="h-4 w-4" />
                        {t.reportIssue}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-display">{t.reportIssue}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <Input placeholder="Your email *" type="email" value={feedbackEmail} onChange={e => setFeedbackEmail(e.target.value)} className="rounded-xl" required />
                        <Textarea placeholder="Describe the issue…" value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4} className="rounded-xl resize-none" />
                        <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border p-3 hover:bg-secondary/50 transition-colors">
                          <ImagePlus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {feedbackScreenshot ? feedbackScreenshot.name : "Attach a screenshot (optional)"}
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={e => setFeedbackScreenshot(e.target.files?.[0] || null)} />
                        </label>
                        <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim() || !feedbackEmail.trim() || feedbackLoading} className="w-full rounded-xl">
                          {feedbackLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : "Submit"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </section>
          )}

        </main>

        {/* ─── SEO CONTENT SECTION ─── */}
        <section className="container py-20 border-t border-border">
          <div className="max-w-4xl mx-auto prose prose-sm md:prose-base dark:prose-invert space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-display font-bold text-foreground m-0">Global PDF Excellence for Everyone</h2>
              <p className="text-lg text-muted-foreground">MagicDOCX is more than just a PDF editor. It's a complete ecosystem designed to make document management accessible, secure, and intelligent.</p>
            </div>

            <div className="grid gap-12 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">Secure & Private by Design</h3>
                <p>
                  Most online PDF tools upload your sensitive documents to their servers. We do things differently.
                  MagicDOCX utilizes <strong>browser-based processing</strong> (WebAssembly and Javascript) to
                  manipulate your files directly on your device. This means your private data stays private.
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground">Powered by Advanced AI</h3>
                <p>
                  We are bridging the gap between traditional PDF utilities and future-proof AI. Our platform
                  includes tools to <strong>summarize lengthy PDFs</strong>, generate quizzes for students,
                  translate documents into 65+ languages, and even chat with your documents using natural language.
                </p>
              </div>
            </div>

            <div className="bg-secondary/20 rounded-3xl p-8 md:p-12 space-y-6">
              <h3 className="text-2xl font-bold text-foreground text-center">Free Tools, Professional Quality</h3>
              <p className="text-center text-muted-foreground">
                We believe that powerful productivity shouldn't come with a subscription price tag. MagicDOCX
                offers 35+ professional tools | from merging and splitting to OCR and electronic signatures
                completely free of charge. No watermarks, no sign-ups, and no hidden limits.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {["Merge", "Convert", "OCR", "Sign", "Protect", "Compress", "Translate", "Summarize"].map(tool => (
                  <div key={tool} className="flex items-center gap-2 justify-center py-2 px-4 rounded-xl bg-background border border-border text-xs font-bold">
                    <CheckCircle className="h-3 w-3 text-primary" /> {tool}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-foreground">Why Browser-Based Tools Matter?</h3>
              <p>
                When you use MagicDOCX, you are using the latest in web technology. Traditional server-side
                converters add latency, pose security risks, and often have strict file size limits. By
                leveraging the power of your modern browser, we provide <strong>instant results</strong>
                without the wait. Your computer does the work, and your data stays in your hands.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Index;
