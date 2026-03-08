import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ReportIssue from "./ReportIssue";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import toolFaqs from "@/lib/toolFaqs";

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

const ToolLayout = ({ title, description, category, icon, children, metaTitle, metaDescription, hideHeader, toolId }: ToolLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== "/";
  const faqs = toolId ? toolFaqs[toolId] : undefined;

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
        <title>{metaTitle || `${title} - MagicPDFs`}</title>
        <meta name="description" content={metaDescription || description} />
        {faqJsonLd && <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>}
      </Helmet>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          {!hideHeader && (
            <section className="border-b border-border bg-secondary/30 py-12">
              <div className="container text-center">
                <div className={cn("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground", categoryColors[category])}>
                  {icon}
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{description}</p>
              </div>
            </section>
          )}
          <section className="container max-w-3xl py-10">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="mb-6 gap-2 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all tools
              </Button>
            )}
            {children}
            <ReportIssue />
          </section>

          {/* Tool-specific FAQ */}
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
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ToolLayout;
