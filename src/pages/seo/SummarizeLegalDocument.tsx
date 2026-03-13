import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wand2, CheckCircle } from "lucide-react";
import RelatedTools from "@/components/RelatedTools";

const SummarizeLegalDocument = () => (
    <>
        <Helmet>
            <title>Summarize Legal Documents Online Free — AI Contract Summarizer | MagicDOCX</title>
            <meta name="description" content="Summarize legal documents, contracts, and agreements online for free using AI. Get plain-English summaries of complex legal PDFs in seconds. No signup required." />
            <meta name="keywords" content="summarize legal document, legal PDF summarizer, contract summarizer AI, summarize contract online, legal document summary tool" />
            <link rel="canonical" href="https://mylovepdf.lovable.app/summarize-legal-document" />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-20 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Summarize Legal Documents with AI</h1>
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Upload any legal PDF — contract, agreement, policy, court ruling — and get a clear, plain-English summary in seconds. Understand what you're signing without a law degree.</p>
                            <div className="mt-8"><Button asChild size="lg" className="rounded-2xl px-8 py-6 text-base font-bold gap-2"><Link to="/pdf-summarizer"><Wand2 className="h-5 w-5" /> Summarize Legal Document Free</Link></Button></div>
                            <p className="mt-4 text-xs text-muted-foreground">⚠️ For informational purposes only — not a substitute for professional legal advice.</p>
                        </motion.div>
                    </div>
                </section>
                <section className="container max-w-4xl py-16 space-y-12">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-8">
                        <h2 className="text-2xl font-bold text-foreground">Understand Legal Documents Without a Lawyer</h2>
                        <p>Legal documents are deliberately complex. Contracts, terms of service, privacy policies, and agreements are written in legal jargon that most people struggle to understand. Our AI legal document summarizer translates complex legalese into plain English, highlighting key obligations, rights, deadlines, and risk clauses so you know what you're actually agreeing to.</p>
                        <p>While this tool does not replace professional legal advice, it can help you quickly understand the substance of a document before consulting a lawyer — saving you both time and money in legal fees.</p>
                        <h2 className="text-2xl font-bold text-foreground">Types of Legal Documents We Can Summarize</h2>
                        <div className="not-prose grid grid-cols-2 md:grid-cols-3 gap-3">
                            {["Employment contracts", "NDA agreements", "Terms of service", "Privacy policies", "Lease agreements", "Purchase agreements", "Partnership agreements", "Court rulings", "Regulatory filings"].map(t => (
                                <div key={t} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs font-medium text-foreground"><CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />{t}</div>
                            ))}
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">What the AI Identifies in Legal Documents</h2>
                        <ul className="space-y-2">
                            {["Key parties and their obligations", "Important dates, deadlines, and timeframes", "Payment terms and financial obligations", "Termination clauses and exit conditions", "Liability limitations and indemnification", "Intellectual property and ownership rights", "Dispute resolution and governing law clauses"].map(u => (
                                <li key={u} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{u}</li>
                            ))}
                        </ul>
                        <h2 className="text-2xl font-bold text-foreground">FAQs</h2>
                        {[
                            { q: "Is this a substitute for a lawyer?", a: "No. This tool helps you understand and navigate documents more efficiently, but for binding legal decisions, always consult a qualified attorney." },
                            { q: "Is my contract kept confidential?", a: "Absolutely. Files are processed securely and permanently deleted immediately after your session. We never store document content." },
                            { q: "Can it understand foreign language contracts?", a: "Our primary strength is English legal documents. For foreign language contracts, combine this with our Translate PDF tool first." },
                        ].map(({ q, a }) => (
                            <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">{q}<span className="text-muted-foreground">▾</span></summary>
                                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                    <RelatedTools toolIds={["ai-summarizer", "ai-chat", "ai-keyword", "ai-questions", "ai-translate", "pdf-to-text"]} />
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default SummarizeLegalDocument;
