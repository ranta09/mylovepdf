import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wand2, CheckCircle } from "lucide-react";
import RelatedTools from "@/components/RelatedTools";

const SummarizeBookPdf = () => (
    <>
        <Helmet>
            <title>Summarize a Book PDF Online Free | AI Book Summary Generator | MagicDOCX</title>
            <meta name="description" content="Get an AI-generated summary of any book PDF online for free. Upload your book, ebook, or novel and get chapter summaries, key themes, characters, and insights instantly." />
            <meta name="keywords" content="summarize book PDF, book PDF summarizer, AI book summary, summarize ebook, summarize novel PDF online" />
            <link rel="canonical" href="https://mylovepdf.lovable.app/summarize-book-pdf" />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-20 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Summarize a Book PDF Online Free</h1>
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Don't have time to read the whole book? Upload any book or ebook PDF and get key themes, chapter highlights, character analysis, and important ideas in minutes.</p>
                            <div className="mt-8"><Button asChild size="lg" className="rounded-2xl px-8 py-6 text-base font-bold gap-2"><Link to="/pdf-summarizer"><Wand2 className="h-5 w-5" /> Summarize My Book PDF</Link></Button></div>
                        </motion.div>
                    </div>
                </section>
                <section className="container max-w-4xl py-16 space-y-12">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-8">
                        <h2 className="text-2xl font-bold text-foreground">AI Book Summarizer | Get the Gist in Minutes</h2>
                        <p>Reading a full book takes anywhere from 5 to 20 hours. An AI book summarizer can give you the core ideas, key arguments, main characters, themes, and conclusions in under 5 minutes. Whether you're a student required to read a novel, a professional trying to stay current with business books, or a curious reader who wants to decide if a book is worth your time, MagicDOCX is the perfect tool.</p>
                        <p>Our AI handles both fiction and non-fiction. For non-fiction books, it extracts the central argument, supporting frameworks, and actionable takeaways. For fiction, it identifies plot arcs, character motivations, themes, and narrative structure.</p>
                        <h2 className="text-2xl font-bold text-foreground">What You Get from a Book PDF Summary</h2>
                        <ul className="space-y-2">
                            {["Chapter-by-chapter highlights and key moments", "Central thesis or main argument (non-fiction)", "Major themes and recurring motifs", "Key characters and their roles (fiction)", "Important quotes and memorable passages", "Author's main conclusions or calls-to-action", "Reading list and related recommendations"].map(u => (
                                <li key={u} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" />{u}</li>
                            ))}
                        </ul>
                        <h2 className="text-2xl font-bold text-foreground">Books That Work Great with This Tool</h2>
                        <div className="not-prose grid grid-cols-2 md:grid-cols-3 gap-3">
                            {["Business & self-help books", "Academic textbooks", "History & biography", "Fiction & novels", "Philosophy & essays", "Science & technology", "Economics & finance", "Psychology & wellness", "Politics & policy"].map(g => (
                                <div key={g} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm font-medium text-center text-foreground">{g}</div>
                            ))}
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">FAQs About Summarizing Books</h2>
                        {[
                            { q: "What's the maximum book length you can summarize?", a: "Our chunked processing handles books of any length. A standard 300-page business book typically takes 2–4 minutes. A 600-page novel may take 5–8 minutes." },
                            { q: "Can I summarize an EPUB ebook?", a: "Yes! MagicDOCX supports EPUB format natively, in addition to PDF." },
                            { q: "Does it handle scanned or photographed book pages?", a: "Yes | our OCR engine processes scanned book pages and image-based PDFs automatically." },
                        ].map(({ q, a }) => (
                            <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">{q}<span className="text-muted-foreground">▾</span></summary>
                                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                    <RelatedTools toolIds={["ai-summarizer", "ai-notes", "ai-flashcard", "ai-study-guide", "ai-chat", "ai-keyword"]} />
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default SummarizeBookPdf;
