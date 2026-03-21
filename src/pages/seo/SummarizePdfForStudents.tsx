import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Wand2, CheckCircle, ChevronRight, GraduationCap } from "lucide-react";
import RelatedTools from "@/components/RelatedTools";

const SummarizePdfForStudents = () => (
    <>
        <Helmet>
            <title>Summarize PDF for Students | Free AI Study Tool | MagicDOCX</title>
            <meta name="description" content="Free AI tool to summarize PDFs for students. Get instant study notes, flashcards, quizzes, and key insights from textbooks, lecture notes, and research papers. No signup." />
            <meta name="keywords" content="summarize PDF for students, PDF summarizer for students, student PDF tool, summarize textbook PDF free, AI study tool" />
            <link rel="canonical" href="https://mylovepdf.lovable.app/summarize-pdf-for-students" />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-20 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
                                <GraduationCap className="h-3 w-3" /> For Students
                            </span>
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">Summarize PDF for Students</h1>
                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">The ultimate free AI study tool for students. Upload any textbook, lecture note, or research paper | get instant summaries, flashcards, study guides, and quizzes.</p>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <Button asChild size="lg" className="rounded-2xl px-8 py-6 text-base font-bold gap-2">
                                    <Link to="/pdf-summarizer"><Wand2 className="h-5 w-5" /> Start Summarizing Free</Link>
                                </Button>
                            </div>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                                {["No signup required", "100% free", "Works for any subject", "Exam-ready output"].map(b => (
                                    <span key={b} className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-green-500" />{b}</span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>

                <section className="container max-w-4xl py-16 space-y-12">
                    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-8">
                        <h2 className="text-2xl font-bold text-foreground">Why Students Love AI PDF Summarizers</h2>
                        <p>As a student, you're constantly battling dense reading lists, long textbooks, and back-to-back assignments. Traditional note-taking is slow, inefficient, and inconsistent. AI PDF summarizers change everything | they read your documents for you and extract exactly what you need to know, in the format you need it.</p>
                        <p>MagicDOCX is specifically designed with students in mind. Unlike generic summarizers, we generate study-formatted outputs including structured notes, flashcards for memorization, quizzes for self-testing, and glossaries of key terms | all from one upload.</p>

                        <h2 className="text-2xl font-bold text-foreground">Study Smarter: 7 AI Tools Students Can Use</h2>
                        <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { label: "📄 PDF Summarizer", desc: "Get overview + bullet points from any PDF", path: "/pdf-summarizer" },
                                { label: "🃏 Flashcard Generator", desc: "Auto-generate study flashcards", path: "/flashcard-generator" },
                                { label: "📝 Notes Generator", desc: "Structured, organized study notes", path: "/notes-generator" },
                                { label: "❓ Quiz Generator", desc: "Multiple choice quiz from your PDF", path: "/quiz-generator" },
                                { label: "📋 Study Guide", desc: "Complete exam prep study guide", path: "/study-guide-generator" },
                                { label: "🙋 Question Generator", desc: "Comprehension Q&A for self-testing", path: "/question-generator" },
                            ].map(t => (
                                <Link key={t.path} to={t.path} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                                    <p className="font-bold text-foreground">{t.label}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                                </Link>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">How to Use a PDF Summarizer for Studying</h2>
                        <ol className="space-y-3 list-decimal list-inside">
                            <li>Upload your lecture notes or textbook chapter PDF</li>
                            <li>Get an instant overview of the most important concepts</li>
                            <li>Switch to the <strong>Bullet Points</strong> tab for quick revision</li>
                            <li>Use the <strong>Study Notes</strong> tab before exams</li>
                            <li>Test yourself with the <strong>Quiz</strong> tab</li>
                            <li>Review key terminology in the <strong>Glossary</strong> tab</li>
                        </ol>

                        <h2 className="text-2xl font-bold text-foreground">Works for Every Subject</h2>
                        <div className="not-prose grid grid-cols-2 md:grid-cols-4 gap-3">
                            {["Biology", "History", "Law", "Computer Science", "Economics", "Psychology", "Medicine", "Engineering", "Literature", "Mathematics", "Chemistry", "Philosophy"].map(s => (
                                <div key={s} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-center text-sm font-medium text-foreground">{s}</div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold text-foreground">Student Tips for Maximum Productivity</h2>
                        <p>Here are proven strategies for using AI PDF summarizers as part of your study workflow:</p>
                        <ul className="space-y-2">
                            <li><strong>Before class:</strong> Pre-summarize the reading to understand main themes before lectures</li>
                            <li><strong>After class:</strong> Compare AI notes with your lecture notes to fill gaps</li>
                            <li><strong>Before exams:</strong> Use the Study Guide and Flashcard modes for rapid revision</li>
                            <li><strong>For essays:</strong> Use Key Insights to identify argument threads in academic papers</li>
                            <li><strong>Group study:</strong> Generate a summary and share with classmates as a discussion starter</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
                        {[
                            { q: "Is this legal to use for studying?", a: "Absolutely. Using AI to understand and summarize study materials is no different from using a dictionary or reference book. It's a learning aid, not a shortcut for submitting work." },
                            { q: "Can I summarize exam papers and past questions?", a: "Yes | upload any past exam PDF and use the Question Generator to identify question patterns and the Summary mode to spot frequent topics." },
                            { q: "Does this work for scientific papers and research articles?", a: "Yes. Our AI handles academic language, statistical findings, and research methodology well. Check out our Research Paper summarizer for an optimized experience." },
                            { q: "Can I use this on mobile?", a: "Yes | MagicDOCX is fully mobile-responsive. Access it from any browser on iPhone or Android, no app download needed." },
                        ].map(({ q, a }) => (
                            <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">{q}<span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span></summary>
                                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a}</p>
                            </details>
                        ))}
                    </div>
                    <RelatedTools title="More Study Tools" toolIds={["ai-flashcard", "ai-notes", "ai-study-guide", "ai-quiz", "ai-questions", "ai-outline"]} />
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default SummarizePdfForStudents;
