import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wand2, CheckCircle } from "lucide-react";
import RelatedTools from "@/components/RelatedTools";

const SummarizeBusinessReport = () => (
    <>
        <Helmet>
            <title>Summarize Business Reports with AI | Free PDF Report Summarizer | MagicDOCX</title>
            <meta name="description" content="Summarize business reports, annual reports, whitepapers, and market research PDFs instantly using AI. Save hours of reading time. Free, no signup required." />
            <meta name="keywords" content="summarize business report, business PDF summarizer, annual report summary AI, whitepaper summarizer, market research PDF summary" />
            <link rel="canonical" href="https://mylovepdf.lovable.app/summarize-business-report" />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-20 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Summarize Business Reports with AI</h1>
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Don't waste hours reading 80-page reports. Upload any business PDF | annual reports, quarterly earnings, market research, whitepapers | and get an AI executive summary in under a minute.</p>
                            <div className="mt-8"><Button asChild size="lg" className="rounded-2xl px-8 py-6 text-base font-bold gap-2"><Link to="/pdf-summarizer"><Wand2 className="h-5 w-5" /> Summarize Business Report Free</Link></Button></div>
                        </motion.div>
                    </div>
                </section>
                <section className="container max-w-4xl py-16 space-y-12">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-8">
                        <h2 className="text-2xl font-bold text-foreground">Why Executives and Analysts Use AI Report Summarizers</h2>
                        <p>Business leaders, analysts, consultants, and investors receive dozens of reports weekly | quarterly earnings calls, industry reports, competitive intelligence briefings, regulatory filings. Reading all of them in full is impossible. AI summarization tools let you extract the signal from the noise, focusing your attention on what actually matters.</p>
                        <p>MagicDOCX generates structured executive summaries that identify key metrics, strategic highlights, risks, opportunities, and recommended actions from any business document | in seconds.</p>
                        <h2 className="text-2xl font-bold text-foreground">Business Documents We Summarize</h2>
                        <div className="not-prose grid grid-cols-2 md:grid-cols-3 gap-3">
                            {["Annual reports & 10-Ks", "Quarterly earnings (10-Q)", "Market research reports", "Strategy whitepapers", "ESG & sustainability reports", "Industry trend reports", "Competitive analysis", "Investment prospectuses", "Board meeting minutes"].map(t => (
                                <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs font-medium text-foreground"><CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />{t}</div>
                            ))}
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">What the Executive Summary Includes</h2>
                        <ul className="space-y-2">
                            {["Top-line financial performance and trends", "Key strategic initiatives and milestones", "Risk factors and headwinds", "Market opportunities identified", "Management guidance and outlook", "Recommended actions and next steps"].map(u => (
                                <li key={u} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{u}</li>
                            ))}
                        </ul>
                        <h2 className="text-2xl font-bold text-foreground">FAQs</h2>
                        {[
                            { q: "Can I summarize SEC filings and 10-K reports?", a: "Yes | SEC filings in PDF format are fully supported. The AI handles financial language, forward-looking statements, and risk factor sections." },
                            { q: "How do I get an action items list from a report?", a: "After uploading, switch to the 'Action Items' tab in the summarizer results to see AI-identified recommended actions from the document." },
                            { q: "Can I summarize internal company documents?", a: "Yes | all processing is private and secure. Files are never stored or accessible by anyone else." },
                        ].map(({ q, a }) => (
                            <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">{q}<span className="text-muted-foreground">▾</span></summary>
                                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                    <RelatedTools toolIds={["ai-summarizer", "ai-keyword", "ai-outline", "ai-questions", "ai-chat", "pdf-to-text"]} />
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default SummarizeBusinessReport;
