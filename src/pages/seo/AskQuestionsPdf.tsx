import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { MessageSquare, CheckCircle, Zap, Shield, ChevronRight, Sparkles } from "lucide-react";
import RelatedTools from "@/components/RelatedTools";

const AskQuestionsPdf = () => (
    <>
        <Helmet>
            <title>Ask Questions from PDF — Chat with PDF AI | MagicDOCX</title>
            <meta name="description" content="Ask any question from your PDF and get instant AI answers. Chat with PDF documents, research papers, contracts, textbooks, and more. Free online AI PDF chat tool." />
            <meta name="keywords" content="ask questions from PDF, chat with PDF, PDF question answering, AI PDF chat, ask PDF questions online free" />
            <link rel="canonical" href="https://mylovepdf.lovable.app/ask-questions-from-pdf" />
            <meta property="og:title" content="Ask Questions from Any PDF — AI Chat | MagicDOCX" />
            <meta property="og:description" content="Have a conversation with your PDF. Ask anything — get instant AI-powered answers from the document. Free, no signup." />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                {/* Viral Hero */}
                <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-24 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-8">
                        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground mb-6">
                                <Sparkles className="h-3 w-3" /> Most Popular Feature
                            </span>
                            <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-foreground leading-none">
                                Ask <span className="text-primary">Anything</span>
                                <br />from Any PDF
                            </h1>
                            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                Upload a PDF and have a conversation with it. Ask questions about specific pages, get explanations of complex concepts, extract data, or just have the AI walk you through the content — like having an expert read the document for you.
                            </p>
                            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild size="lg" className="rounded-2xl px-10 py-7 text-lg font-extrabold shadow-xl gap-2.5 bg-primary hover:bg-primary/90">
                                    <Link to="/chat-with-pdf"><MessageSquare className="h-5 w-5" /> Start Chatting with PDF — Free</Link>
                                </Button>
                            </div>
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
                                {["No signup required", "Any PDF up to 300+ pages", "100% private", "Instant answers"].map(b => (
                                    <span key={b} className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" />{b}</span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="container max-w-4xl py-16 space-y-12">
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl font-extrabold text-foreground">How It Works</h2>
                        <p className="text-muted-foreground">Three steps to get answers from any PDF</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: "01", title: "Upload Your PDF", desc: "Drag and drop any PDF up to 300+ pages. Works with text PDFs and scanned documents." },
                            { step: "02", title: "Ask Your Question", desc: "Type any question in natural language. Ask about specific sections, concepts, dates, or data." },
                            { step: "03", title: "Get Instant Answers", desc: "The AI reads your document in real-time and responds with accurate, cited answers." },
                        ].map(s => (
                            <div key={s.step} className="rounded-2xl border border-border bg-card p-6 space-y-3 text-center">
                                <span className="text-4xl font-extrabold text-primary/20">{s.step}</span>
                                <h3 className="font-bold text-foreground text-lg">{s.title}</h3>
                                <p className="text-sm text-muted-foreground">{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-8">
                        <h2 className="text-2xl font-bold text-foreground">What Questions Can You Ask Your PDF?</h2>
                        <p>Unlike a static summarizer, Chat with PDF lets you have an interactive conversation with your document. The AI maintains context throughout the session, so you can ask follow-up questions, request clarifications, and dive deeper into any topic.</p>
                        <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                                '"What are the main conclusions of this research paper?"',
                                '"What does the contract say about termination?"',
                                '"Explain section 3.2 in simple terms"',
                                '"What are the financial results for Q3?"',
                                '"List all the dates mentioned in this document"',
                                '"What are the key risks mentioned?"',
                                '"What does this statistic mean?"',
                                '"Give me a 3-point summary of chapter 5"',
                            ].map(q => (
                                <div key={q} className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm font-medium text-foreground italic">{q}</div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">Use Cases: When to Ask Questions Instead of Summarize</h2>
                        <p>Summarization is great for getting a quick overview. But when you need specific answers, ChatWithPDF is the right tool. Here's when to use each:</p>
                        <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-xl border border-border bg-card p-5">
                                <h3 className="font-bold text-foreground mb-3">Use PDF Chat When…</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {["You have specific questions about content", "You need to extract precise data or dates", "You want to verify specific claims", "You need section-by-section navigation", "You're cross-referencing information"].map(u => (
                                        <li key={u} className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary shrink-0" />{u}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-xl border border-border bg-card p-5">
                                <h3 className="font-bold text-foreground mb-3">Use Summarizer When…</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {["You want a quick overview first", "You need study notes or bullet points", "You want to share a summary with others", "You're doing a first-pass review", "You want exportable formatted output"].map(u => (
                                        <li key={u} className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />{u}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">Why MagicDOCX Chat with PDF Stands Out</h2>
                        <div className="not-prose grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { icon: <Shield className="h-5 w-5 text-primary" />, title: "100% Private", desc: "Your documents are never stored. All processing is ephemeral and private." },
                                { icon: <Zap className="h-5 w-5 text-primary" />, title: "Lightning Fast", desc: "AI responses in 2–5 seconds even for long documents." },
                                { icon: <CheckCircle className="h-5 w-5 text-primary" />, title: "Cited Answers", desc: "AI answers include references to the relevant section of your PDF." },
                            ].map(f => (
                                <div key={f.title} className="rounded-xl border border-border bg-card p-4 space-y-2">
                                    {f.icon}
                                    <p className="font-bold text-foreground">{f.title}</p>
                                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                        {[
                            { q: "How many questions can I ask per session?", a: "There's no hard limit. You can have an extended conversation with your PDF, asking dozens of questions in a single session." },
                            { q: "Does the AI remember previous answers in the chat?", a: "Yes — the AI maintains context throughout your chat session, so you can ask follow-up questions like 'Tell me more about that' or 'What does that mean?'" },
                            { q: "What's the maximum PDF size it can handle?", a: "Documents up to 300+ pages are supported. Very large documents may take a few extra seconds on the first load." },
                            { q: "Can I use this for academic research?", a: "Yes — it's excellent for quickly navigating dense academic papers. You can ask it to explain methodology, interpret statistics, or summarize the literature review section." },
                            { q: "Is all my data private?", a: "Completely. No document data is ever stored on our servers. Your session is ephemeral — as soon as you close the page, everything is deleted." },
                        ].map(({ q, a }) => (
                            <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">{q}<span className="text-muted-foreground">▾</span></summary>
                                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                    <RelatedTools title="More AI PDF Tools" toolIds={["ai-summarizer", "ai-quiz", "ai-flashcard", "ai-notes", "ai-questions", "ai-study-guide"]} />
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default AskQuestionsPdf;
