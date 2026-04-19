import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Lock, Trash2, Mail, CheckCircle2, ServerOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - MagicDOCX</title>
        <meta
          name="description"
          content="We believe your data is yours. Read our transparent privacy policy to see why MagicDOCX is the most secure free document tool on the web."
        />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
        <Navbar />
        <main className="flex-1 relative overflow-hidden pb-20">
          {/* Subtle Background Gradients */}
          <div className="absolute top-0 right-1/4 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
          
          {/* Header Section */}
          <section className="container pt-32 pb-12 md:pt-40 md:pb-16 text-center max-w-4xl mx-auto border-b border-border/50">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-foreground mb-4">
              Total Privacy, Zero Compromise.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We built MagicDOCX specifically because we were tired of tools that harvested our documents. 
              Here is our plain-English commitment to your security.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Effective: March 29, 2026</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Plain English</span>
            </div>
          </section>

          {/* Content Section (Using tailwind prose) */}
          <section className="container py-16 max-w-3xl mx-auto">
            <article className="prose prose-base md:prose-lg prose-slate dark:prose-invert max-w-none 
                                prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight 
                                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                prose-li:marker:text-primary prose-strong:text-foreground">
              
              <div className="not-prose bg-primary/5 border border-primary/20 p-6 rounded-2xl mb-12 flex items-start gap-4">
                <ServerOff className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">The Golden Rule</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    We <strong>never</strong> read, store, or analyze the content of your files. We do not use your documents to train AI models.
                  </p>
                </div>
              </div>

              <h2>What data do we collect?</h2>
              <p>
                We believe in data minimization. The only personal data we potentially collect is an <strong>optional email address</strong> 
                if you actively choose to subscribe to our newsletter or contact support. Yes, that's it.
              </p>
              <ul>
                <li><strong>No mandatory accounts:</strong> We do not force you to register.</li>
                <li><strong>No invasive telemetry:</strong> We do not track your granular mouse movements or keystrokes.</li>
              </ul>

              <h2>How are uploaded files handled?</h2>
              <p>
                We utilize a highly advanced hybrid processing architecture designed specifically to keep your data out of our hands:
              </p>
              <ul>
                <li>
                  <strong>Browser-Based Processing:</strong> For over 60% of our tools (e.g., merging, splitting, compressing), your files never leave your computer. The processing happens entirely inside your browser tab using WebAssembly.
                </li>
                <li>
                  <strong>Secure Enclaves:</strong> For complex computational tasks (like AI summarization or OCR extraction), your file is transmitted via secured SSL encryption into a temporary server memory block.
                </li>
                <li>
                  <strong>Automated Deletion:</strong> Any file touching our servers is <strong>permanently and irreversibly deleted</strong> after 60 minutes. We hold zero backups of user processing files.
                </li>
              </ul>

              <h2>Do you sell my data?</h2>
              <p>
                <strong>No. Never.</strong> We do not sell, rent, or trade your data, documents, or metadata to third parties. Our business model relies on advertising and optional premium support, not on brokering your privacy.
              </p>

              <h2>Cookie Usage</h2>
              <p>
                We are deeply opposed to the modern web's invasive tracking culture. 
              </p>
              <ul>
                <li><strong>No Third-Party Cookies:</strong> We do not use Facebook Pixels or cross-site tracking systems.</li>
                <li><strong>Plausible Analytics:</strong> We use an open-source, GDPR-compliant analytics tracker (Plausible) to count broad statistics (like page views) which natively operates 100% without cookies.</li>
                <li><strong>Functional Storage:</strong> The only local storage we utilize is for remembering your dark mode preference and preventing repetitive popups (like our subscription toast during a single session).</li>
              </ul>

              <hr className="my-12 border-border" />

              <h2>Contact Information</h2>
              <p>
                Transparency is our core principle. If you have any questions, concerns, or technical privacy audits you want to discuss, our founder's inbox is open to you.
              </p>
              
              <div className="not-prose mt-8">
                <p className="text-sm text-muted-foreground italic">Contact support through our feedback form on the homepage.</p>
              </div>

            </article>
          </section>

          {/* Global CTA */}
          <section className="container max-w-3xl mx-auto pt-8 border-t border-border/50 text-center">
            <h2 className="text-2xl font-bold mb-4 font-display">Convinced? Let's get to work.</h2>
            <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
              <Link to="/">
                <Search className="mr-2 h-4 w-4" /> Try Our Free Tools 
              </Link>
            </Button>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;
