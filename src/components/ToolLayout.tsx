import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ReportIssue from "./ReportIssue";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import toolFaqs from "@/lib/toolFaqs";
import toolArticles from "@/lib/toolArticles";

interface ToolLayoutProps {
  title: string;
  description: string;
  category: ToolCategory;
  icon: ReactNode;
  children: ReactNode;
  metaTitle?: string;
  metaDescription?: string;
  hideHeader?: boolean;
  toolId?: string;
}

const ToolLayout = ({ title, description, category, icon, children, metaTitle, metaDescription, toolId }: ToolLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== "/";
  const faqs = toolId ? toolFaqs[toolId] : undefined;
  const articles = toolId ? toolArticles[toolId] : undefined;

  const faqJsonLd = faqs ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  } : null;

  return (
    <>
      <Helmet>
        <title>{metaTitle || `${title} - PDF Magic`}</title>
        <meta name="description" content={metaDescription || description} />
        {faqJsonLd && <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>}
      </Helmet>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Header: Icon + Title */}
          <section className="border-b border-border bg-secondary/30 pt-8 pb-10">
            <div className="container text-center">
              {showBack && (
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/")}
                    className="gap-2 rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to all tools
                  </Button>
                </div>
              )}
              <div className={cn("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground", categoryColors[category])}>
                {icon}
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{description}</p>
            </div>
          </section>

          {/* Upload / Tool Content */}
          <section className="container max-w-3xl py-10">
            {children}
          </section>

          {/* Trust badges */}
          {articles && (
            <section className="border-t border-border bg-secondary/20 py-8">
              <div className="container max-w-4xl">
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">{description}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">100% free — no sign-ups, no watermarks, no limits</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Works on any device — desktop, tablet, or mobile</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Secure browser-based processing — files never leave your device</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Features Section */}
          {articles && articles.features.length > 0 && (
            <section className="border-t border-border py-16">
              <div className="container max-w-5xl">
                <div className="grid gap-8 md:grid-cols-3">
                  {articles.features.map((feat, i) => {
                    const Icon = feat.icon;
                    return (
                      <div key={i} className="flex flex-col items-center gap-3 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-display text-base font-semibold text-foreground">{feat.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* How To Section */}
          {articles && articles.howTo.length > 0 && (
            <section className="border-t border-border bg-secondary/30 py-16">
              <div className="container max-w-3xl">
                <h2 className="font-display text-xl font-bold text-foreground text-center mb-8 md:text-2xl">
                  How to {title}
                </h2>
                <div className="space-y-4">
                  {articles.howTo.map((step, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {i + 1}
                      </div>
                      <p className="text-muted-foreground pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* FAQ */}
          {faqs && faqs.length > 0 && (
            <section className="border-t border-border bg-card py-12">
              <div className="container max-w-3xl">
                <h2 className="font-display text-xl font-bold text-foreground text-center mb-6 md:text-2xl">
                  Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="space-y-2">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-secondary/30 px-5">
                      <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline text-sm md:text-base">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          )}

          {/* Report Issue */}
          <section className="container max-w-3xl py-6">
            <ReportIssue />
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ToolLayout;
