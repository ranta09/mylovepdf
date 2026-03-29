import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import HeroUpload from "@/components/HeroUpload";

import { tools, aiTools, categoryColors, type ToolCategory } from "@/lib/tools";
import { motion } from "framer-motion";
import {
  Heart, Shield, Zap, Search, MessageCircleWarning, ImagePlus,
  Wand2, FileText, Edit3, Lock, Minimize2, Scissors, Merge, Globe, CheckCircle, X, Loader2, ChevronDown, Trash2, UserX
} from "lucide-react";

const trustBadges = [
  { icon: Lock, title: "SSL Encrypted", desc: "Bank-level security", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: Trash2, title: "Auto-Deleted", desc: "Files gone in 60 min", color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: UserX, title: "No Signup", desc: "Start using instantly", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Zap, title: "Lightning Fast", desc: "Processes in seconds", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: Globe, title: "Trusted Globally", desc: "Used by 50,000+ people", color: "text-indigo-500", bg: "bg-indigo-500/10" },
];
import { Helmet } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
      <SEOHead
        title="MagicDOCX — Free PDF & DOCX Tools Online | No Signup Required"
        description="35+ free PDF tools: merge, split, compress, convert, edit, protect, sign. Plus AI summarizer, quiz generator, chat with PDF, ATS checker & translator. No sign-up."
        canonicalUrl="/"
      />
      <Helmet>
        <meta name="keywords" content="PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF to JPG, edit PDF, AI PDF summarizer, PDF quiz generator, chat with PDF, ATS resume checker, translate PDF, free PDF tools, online PDF editor, convert PDF" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(sitelinksJsonLd)}</script>
      </Helmet>

      <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30">
        {/* Subtle Background Gradients - Keeping it premium but clean */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[50%] rounded-full bg-indigo-500/5 blur-[100px]" />
          <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-violet-500/5 blur-[120px]" />
        </div>
        
        <Navbar />
        <main className="flex-1 relative z-10">

          {/* ─── HERO ─── */}
          <section className="relative pt-20 pb-28 md:pt-32 md:pb-40 -mt-[1px]">
            {/* The NeuralBackground shows through seamlessly, providing the theme-based color and magical cursor effects */}

            <div className="container max-w-[1200px] w-[95%] relative z-10 text-center">
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {/* Headline */}
                <h1 className="font-display mx-auto max-w-5xl text-4xl font-extrabold tracking-tight text-foreground md:text-7xl md:leading-[1.15] mb-6 drop-shadow-sm">
                  Convert, Compress & Edit PDFs Free — <span className="text-primary tracking-tight">No Signup</span>
                </h1>
                
                {/* Subtitle */}
                <p className="text-lg md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto font-medium">
                  100% free. Files deleted after 1 hour. No account needed.
                </p>

                {/* Large Upload Zone */}
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                   className="mx-auto max-w-4xl bg-card/80 dark:bg-background/80 backdrop-blur-2xl rounded-3xl p-2 md:p-3 shadow-2xl ring-1 ring-border overflow-hidden"
                >
                  <HeroUpload />
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ─── TRUST BADGES ─── */}
          <section className="border-b border-border/50 bg-secondary/10 relative z-20">
            <div className="container max-w-[1400px] w-[95%] mx-auto pt-8 pb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
                {trustBadges.map((badge, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-4 group"
                  >
                    <div className={`p-3 shrink-0 rounded-2xl ${badge.bg} ${badge.color} transition-transform duration-300 group-hover:scale-110 group-hover:shadow-sm`}>
                      <badge.icon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm md:text-base text-foreground mb-0.5">{badge.title}</h4>
                      <p className="text-xs text-muted-foreground">{badge.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="text-center">
                 <Link to="/privacy" className="inline-flex items-center text-xs font-semibold text-muted-foreground/70 hover:text-primary transition-colors">
                   <Shield className="mr-1.5 h-3.5 w-3.5" />
                   We never read or store your files. Read our strict Privacy Policy.
                 </Link>
              </div>
            </div>
          </section>

          {/* ─── TOOLS ─── */}
          <section className="container max-w-[1600px] w-[95%] py-16">
            <div className="flex flex-col gap-12">
              {/* Search */}
              <div className="flex w-full items-center justify-center">
                <div className="relative w-full max-w-2xl">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={search ? t.searchPlaceholder : "Search for a tool..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-14 pl-12 pr-12 rounded-2xl border border-border bg-card shadow-sm text-base focus-visible:ring-primary/20"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 flex items-center justify-center bg-secondary rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tool Grid(s) */}
              <div className="flex flex-col gap-16">
                {search ? (
                  filtered.length === 0 ? (
                    <div className="py-16 text-center">
                      <p className="text-lg text-muted-foreground">{tt("noToolsFound", { query: search })}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{t.trySearching}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6">
                      {filtered.map((tool, i) => (
                        <ToolCard key={tool.id} tool={tool} index={i} />
                      ))}
                    </div>
                  )
                ) : (
                  [
                    { id: "convert", label: "Convert", filter: (t: any) => t.category === "convert" || t.category === "image" },
                    { id: "optimize", label: "Optimize & Edit", filter: (t: any) => t.category === "compress" || t.category === "edit" },
                    { id: "organize", label: "Organize", filter: (t: any) => t.category === "merge" || t.category === "split" },
                    { id: "security", label: "Security", filter: (t: any) => t.category === "protect" },
                  ].map((group, groupIdx) => {
                    const groupTools = allTools.filter(group.filter);
                    if (groupTools.length === 0) return null;
                    return (
                      <div key={group.id} className="flex flex-col gap-6">
                        <h2 className="text-2xl font-bold text-foreground border-b border-border/50 pb-3">{group.label}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6">
                          {groupTools.map((tool, i) => (
                            <ToolCard key={tool.id} tool={tool} index={i} />
                          ))}
                        </div>
                      </div>
                    );
                  })
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
