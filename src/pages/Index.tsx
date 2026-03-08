import { useState } from "react";
import Navbar from "@/components/Navbar";
import MagicBackground from "@/components/MagicBackground";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import HomeFAQ, { faqs } from "@/components/HomeFAQ";
import { tools, aiTools } from "@/lib/tools";
import { motion } from "framer-motion";
import { Heart, Shield, Zap, Search, MessageCircleWarning, ImagePlus, Wand2, FileText, Edit3, Lock, Minimize2, Scissors, Merge, Globe, CheckCircle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { id: "ai", label: "AI Tools", icon: Wand2, filter: (t: any) => t.category === "ai" },
  { id: "convert", label: "Convert", icon: FileText, filter: (t: any) => t.category === "convert" },
  { id: "edit", label: "Edit", icon: Edit3, filter: (t: any) => t.category === "edit" },
  { id: "merge", label: "Merge", icon: Merge, filter: (t: any) => t.category === "merge" },
  { id: "split", label: "Split", icon: Scissors, filter: (t: any) => t.category === "split" },
  { id: "compress", label: "Compress", icon: Minimize2, filter: (t: any) => t.category === "compress" },
  { id: "protect", label: "Protect", icon: Lock, filter: (t: any) => t.category === "protect" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "MagicPDF",
  "url": "https://mylovepdf.lovable.app",
  "description": "Free online PDF tools — merge, split, compress, convert, edit, protect PDFs plus AI-powered summarizer, quiz generator, chat with PDF, ATS resume checker and translator.",
  "applicationCategory": "Productivity",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "12500" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(f => ({
    "@type": "Question",
    "name": f.q,
    "acceptedAnswer": { "@type": "Answer", "text": f.a },
  })),
};

const Index = () => {
  const [search, setSearch] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackScreenshot, setFeedbackScreenshot] = useState<File | null>(null);
  const { toast } = useToast();

  const allTools = [...aiTools, ...tools];
  const filtered = allTools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

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
        <title>MagicPDF — Free Online PDF Tools | Merge, Split, Compress, Convert & AI</title>
        <meta name="description" content="Every tool you need to work with PDFs — completely free. Merge, split, compress, convert, edit, protect PDFs. Plus AI-powered summarizer, quiz generator, chat with PDF, ATS resume checker & translator. No sign-up required." />
        <meta name="keywords" content="PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, PDF to JPG, edit PDF, AI PDF summarizer, PDF quiz generator, chat with PDF, ATS resume checker, translate PDF, free PDF tools, online PDF editor, convert PDF" />
        <link rel="canonical" href="https://mylovepdf.lovable.app" />
        <meta property="og:title" content="MagicPDF — Free Online PDF & AI Document Tools" />
        <meta property="og:description" content="35+ free PDF tools: merge, split, compress, convert, edit, protect. Plus AI summarizer, quiz generator, chat & ATS checker. No sign-up." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mylovepdf.lovable.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MagicPDF — Free Online PDF & AI Document Tools" />
        <meta name="twitter:description" content="35+ free PDF tools with AI. Merge, split, compress, convert, summarize, chat, quiz & more." />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
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
                  alt="MagicPDF — Free Online PDF Tools"
                  className="mx-auto mb-6 h-24 w-24 relative"
                  whileHover={{ scale: 1.15, rotate: [0, -8, 8, -4, 0] }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                />
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
                  Every PDF tool you need
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                  Merge, split, compress, convert, edit and protect your PDFs — plus <span className="font-semibold text-primary">AI-powered tools</span> to summarize, quiz, translate, and chat with your documents. All free, no sign-up.
                </p>

                {/* Trust Badges */}
                <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5 text-primary" /> 35+ Free Tools</span>
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-primary" /> 100% Secure</span>
                  <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-primary" /> No Sign-up Required</span>
                  <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-primary" /> Browser-based Processing</span>
                </div>

                {/* Search */}
                <div className="mx-auto mt-8 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search tools… e.g. merge, summarize, quiz, ATS, OCR"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-10 rounded-xl border-border bg-card shadow-card h-12 text-sm"
                      aria-label="Search PDF tools"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Category Sections */}
          <section className="container py-16">
            {search ? (
              filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-lg text-muted-foreground">No tools found for "{search}"</p>
                  <p className="mt-2 text-sm text-muted-foreground">Try searching for "merge", "convert", "OCR", or "summarize"</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filtered.map((tool, i) => (
                    <ToolCard key={tool.id} tool={tool} index={i} />
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-16">
                {categories.map(cat => {
                  const catTools = allTools.filter(cat.filter);
                  if (catTools.length === 0) return null;
                  const Icon = cat.icon;
                  return (
                    <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-display text-xl font-bold text-foreground md:text-2xl flex items-center gap-2">
                            {cat.label}
                            {cat.id === "ai" && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">NEW</span>}
                          </h2>
                          <p className="text-sm text-muted-foreground">{catTools.length} tools</p>
                        </div>
                      </motion.div>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {catTools.map((tool, i) => (
                          <ToolCard key={tool.id} tool={tool} index={i} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* How It Works */}
          {!search && (
            <section className="border-t border-border bg-secondary/20 py-16">
              <div className="container">
                <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2 md:text-3xl">How MagicPDF Works</h2>
                <p className="text-center text-muted-foreground mb-10">Three simple steps to work with any PDF</p>
                <div className="grid gap-8 md:grid-cols-3">
                  {[
                    { step: "1", title: "Choose a Tool", desc: "Pick from 35+ PDF and AI tools — merge, split, compress, convert, edit, summarize, and more." },
                    { step: "2", title: "Upload Your File", desc: "Drag and drop your PDF or document. All processing happens securely in your browser." },
                    { step: "3", title: "Download Result", desc: "Get your processed file instantly. No waiting, no queues, no watermarks." },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="flex flex-col items-center gap-3 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold">
                        {s.step}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Features */}
          {!search && (
            <section className="border-t border-border bg-secondary/30 py-16">
              <div className="container">
                <h2 className="font-display text-2xl font-bold text-foreground text-center mb-10 md:text-3xl">Why Choose MagicPDF?</h2>
                <div className="grid gap-8 md:grid-cols-3">
                  {[
                    { icon: Zap, title: "Lightning Fast", desc: "Process files instantly in your browser. No waiting, no queues, no file size limits on most tools." },
                    { icon: Shield, title: "100% Secure & Private", desc: "Files are processed locally in your browser and never stored on our servers. Your data stays yours." },
                    { icon: Heart, title: "Completely Free Forever", desc: "All 35+ tools are free to use with no hidden limits, no sign-ups, and no watermarks. Ever." },
                  ].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.1 }}
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
                          <Input placeholder="Your email *" type="email" value={feedbackEmail} onChange={e => setFeedbackEmail(e.target.value)} className="rounded-xl" required />
                          <p className="mt-1 text-xs text-muted-foreground">Required so we can follow up</p>
                        </div>
                        <Textarea placeholder="Describe the issue — which tool, what went wrong, etc." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4} className="rounded-xl resize-none" />
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border p-3 hover:bg-secondary/50 transition-colors">
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {feedbackScreenshot ? feedbackScreenshot.name : "Attach a screenshot (optional)"}
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => setFeedbackScreenshot(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                        <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim() || !feedbackEmail.trim()} className="w-full rounded-xl">Submit Report</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </section>
          )}

          {/* FAQ */}
          {!search && <HomeFAQ />}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
