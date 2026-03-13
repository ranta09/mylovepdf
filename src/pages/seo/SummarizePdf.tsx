import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wand2, Shield, CheckCircle, Users, ChevronRight, Star } from "lucide-react";
import RelatedTools from "@/components/RelatedTools";

const SummarizePdf = () => (
    <>
        <Helmet>
            <title>Free AI PDF Summarizer Online — Summarize PDF Instantly | MagicDOCX</title>
            <meta name="description" content="Summarize any PDF online for free using AI. Get instant overviews, bullet points, key insights, and study notes from any PDF document in seconds. No signup required." />
            <meta name="keywords" content="summarize PDF online, free PDF summarizer, AI PDF summary tool, PDF summarizer online free, summarize PDF instantly" />
            <link rel="canonical" href="https://mylovepdf.lovable.app/summarize-pdf" />
            <meta property="og:title" content="Free AI PDF Summarizer Online — MagicDOCX" />
            <meta property="og:description" content="Summarize any PDF using AI in seconds. Free, no signup, no file size limits." />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                {/* Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 py-20 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
                                <Wand2 className="h-3 w-3" /> AI-Powered
                            </span>
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                                Free PDF Summarizer Online
                            </h1>
                            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                                Upload any PDF and get an AI-generated summary in under 30 seconds. Overview, bullet points, key insights, study notes — all in one click.
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild size="lg" className="rounded-2xl px-8 py-6 text-base font-bold shadow-lg gap-2">
                                    <Link to="/pdf-summarizer"><Wand2 className="h-5 w-5" /> Try Free PDF Summarizer</Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="rounded-2xl px-8 py-6 text-base">
                                    <Link to="/chat-with-pdf">Chat with PDF Instead <ChevronRight className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                                {["No signup required", "Files auto-deleted", "100% free", "50,000+ users"].map(b => (
                                    <span key={b} className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" />{b}</span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Main SEO Content */}
                <section className="container max-w-4xl py-16 space-y-12">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-8">
                        <h2 className="text-2xl font-bold text-foreground">What is a PDF Summarizer?</h2>
                        <p>A PDF summarizer is an AI-powered tool that reads the full text of a PDF document and condenses it into a shorter, more digestible version. Instead of spending hours reading a 100-page report, you can get the key points in under a minute.</p>
                        <p>Modern AI PDF summarizers like MagicDOCX go far beyond simple text extraction. They understand context, identify the most important information, and generate structured summaries covering overviews, bullet points, key insights, glossaries, and even practice questions — all automatically.</p>

                        <h2 className="text-2xl font-bold text-foreground">How to Summarize a PDF Online for Free</h2>
                        <ol className="space-y-3 list-decimal list-inside">
                            <li><strong>Go to the PDF Summarizer tool</strong> — click the button above to open MagicDOCX's free AI summarizer.</li>
                            <li><strong>Upload your PDF</strong> — drag and drop or click to browse. Supports PDFs up to 300+ pages.</li>
                            <li><strong>Click "Summarize with AI"</strong> — the AI reads your full document and begins generating.</li>
                            <li><strong>View your results</strong> — switch between Overview, Bullet Points, Key Insights, Study Notes, Glossary, Action Items, and Quiz tabs.</li>
                            <li><strong>Export</strong> — download your summary as a PDF, Markdown, or plain text file.</li>
                        </ol>

                        <h2 className="text-2xl font-bold text-foreground">Why Use MagicDOCX to Summarize PDFs?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-prose">
                            {[
                                { icon: <Wand2 className="h-5 w-5 text-primary" />, title: "7 Summary Types", desc: "Get overview, bullets, insights, study notes, action items, glossary, and quiz — all from one upload." },
                                { icon: <Shield className="h-5 w-5 text-primary" />, title: "100% Private", desc: "Files are processed securely and automatically deleted. Never stored on our servers." },
                                { icon: <Users className="h-5 w-5 text-primary" />, title: "Trusted by 50,000+", desc: "Students, researchers, lawyers, and professionals use MagicDOCX to save hours every day." },
                            ].map(f => (
                                <div key={f.title} className="rounded-xl border border-border bg-card p-5 space-y-2">
                                    {f.icon}
                                    <h3 className="font-bold text-foreground">{f.title}</h3>
                                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">What Types of PDFs Can You Summarize?</h2>
                        <p>MagicDOCX can summarize virtually any type of PDF document:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 not-prose">
                            {["Research papers & academic articles", "Business reports & whitepapers", "Legal contracts & agreements", "Textbooks & study materials", "News articles & blog posts", "Meeting notes & transcripts", "Financial reports & earnings calls", "Technical documentation & manuals", "Books & ebooks (EPUB supported)"].map(t => (
                                <div key={t} className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs font-medium text-foreground">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{t}
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">Summarize PDFs Online: Comparing Free Tools</h2>
                        <p>There are many PDF summarizer tools available, but most have significant limitations. Many require sign-up, charge for advanced features, limit file sizes, or store your documents on their servers. MagicDOCX offers a genuinely free, private, and powerful alternative that requires no account and imposes no file size limits.</p>
                        <p>Our AI is powered by advanced language models that understand document structure, academic language, legal terminology, and technical concepts — making it more accurate than simple extractive summaries that just pull sentences from the text.</p>

                        <h2 className="text-2xl font-bold text-foreground">Summarize PDFs for Different Audiences</h2>
                        <p>Our tool serves a wide range of use cases. Browse our specialized landing pages for your exact need:</p>
                        <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                { label: "Summarize PDF for Students", path: "/summarize-pdf-for-students" },
                                { label: "Summarize Research Papers", path: "/summarize-research-paper" },
                                { label: "Summarize Business Reports", path: "/summarize-business-report" },
                                { label: "Summarize Legal Documents", path: "/summarize-legal-document" },
                                { label: "Summarize Books in PDF", path: "/summarize-book-pdf" },
                            ].map(l => (
                                <Link key={l.path} to={l.path} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors">
                                    <ChevronRight className="h-4 w-4 text-primary" />{l.label}
                                </Link>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                        {[
                            { q: "Is MagicDOCX really free?", a: "Yes — completely free. No subscription, no credit card, no watermarks. We support the tool through minimal, non-intrusive advertising." },
                            { q: "How long can my PDF be?", a: "There's no hard page limit. Our AI uses chunked processing to handle large documents up to 300+ pages. Longer documents may take slightly more time." },
                            { q: "Does it work for scanned PDFs?", a: "Yes. MagicDOCX automatically applies OCR to scanned PDFs to extract text before summarizing." },
                            { q: "Is my PDF stored on your servers?", a: "No. Files are processed in a privacy-first manner and are permanently deleted immediately after your session ends. Nothing is retained." },
                            { q: "Can I summarize multiple PDFs at once?", a: "Yes — upload multiple files and the AI generates both individual and combined summaries across all documents." },
                            { q: "What other file types can I summarize?", a: "In addition to PDF, we support DOCX, XLSX, PPTX, TXT, EPUB, and image files (JPG, PNG, TIFF) with automatic OCR." },
                        ].map(({ q, a }) => (
                            <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">
                                    {q}<span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                                </summary>
                                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>

                    <RelatedTools
                        title="More AI-Powered PDF Tools"
                        toolIds={["ai-quiz", "ai-chat", "ai-flashcard", "ai-notes", "ai-study-guide", "ai-questions", "ai-outline", "ai-keyword"]}
                    />
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default SummarizePdf;
