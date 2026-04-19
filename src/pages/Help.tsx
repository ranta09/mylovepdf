import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HelpCircle, MessageSquare, BookOpen, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";

const faqs = [
  {
    q: "Are all MagicDOCX tools really free?",
    a: "Yes, completely free. There are no hidden paywalls, no subscriptions, and no limits on how many times you can use any tool. We believe document processing should be accessible to everyone.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account is required for any tool. Just visit the tool page, upload your file, and download the result. It's that simple.",
  },
  {
    q: "How are my files handled?",
    a: "For most tools (merging, splitting, compressing, rotating), your files are processed entirely within your browser and never leave your device. For AI-powered tools, files are transmitted securely via SSL, processed in memory, and permanently deleted within 60 minutes.",
  },
  {
    q: "What file formats are supported?",
    a: "We support PDF as the primary format, plus DOCX, XLSX, PPTX, JPG, PNG, and HTML for conversion tools. More formats are being added regularly.",
  },
  {
    q: "Is there a file size limit?",
    a: "For browser-based tools, the limit depends on your device's RAM. For server-processed tools (like AI summarization), the current limit is 50 MB per file.",
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: "We'd love to hear from you! Use our Contact Us page to send a message directly to our team. We typically respond within 24 hours.",
  },
  {
    q: "Do the AI tools work on any PDF?",
    a: "Our AI tools work best on text-based PDFs. For scanned documents, we recommend running OCR first using our OCR tool before using AI features.",
  },
  {
    q: "Can I use MagicDOCX on mobile?",
    a: "Yes! MagicDOCX is fully responsive and works on any modern mobile browser. Some tools with complex interfaces work best on a desktop.",
  },
];

const HelpFaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-foreground hover:bg-secondary/40 transition-colors"
      >
        <span className="text-sm">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
};

const Help = () => (
  <>
    <Helmet>
      <title>Help Center, MagicDOCX</title>
      <meta name="description" content="Find answers to common questions about MagicDOCX PDF tools, file security, supported formats, and more in our Help Center." />
      <link rel="canonical" href="https://magicdocx.lovable.app/help" />
    </Helmet>
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-24 border-b border-border">
          <div className="container max-w-3xl text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 mx-auto">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                How can we help you?
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Browse our frequently asked questions or reach out to our team directly.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="container max-w-4xl py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: BookOpen, title: "Getting Started", desc: "Learn how to use MagicDOCX tools for the first time.", href: "/" },
              { icon: MessageSquare, title: "Contact Support", desc: "Can't find your answer? Send us a message directly.", href: "/contact" },
            ].map(({ icon: Icon, title, desc, href }) => (
              <Link
                key={title}
                to={href}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container max-w-3xl pb-20 space-y-6">
          <h2 className="text-2xl font-extrabold text-foreground">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map(faq => <HelpFaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
          <div className="pt-8 text-center">
            <p className="text-muted-foreground text-sm mb-4">Still have questions?</p>
            <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
              <Link to="/contact">Contact Us <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default Help;
