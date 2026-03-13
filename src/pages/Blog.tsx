import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const posts = [
    {
        slug: "best-ai-tools-for-students",
        title: "10 Best AI Tools for Students in 2025 (Free & Paid)",
        excerpt: "From PDF summarizers to AI flashcard generators, discover the top AI tools that can cut your study time in half and boost your grades.",
        date: "March 10, 2025",
        readTime: "8 min read",
        category: "AI Tools",
        image: "📚",
    },
    {
        slug: "how-to-summarize-long-pdfs",
        title: "How to Summarize Long PDFs Quickly (5 Best Methods)",
        excerpt: "Whether it's a 200-page research paper or a massive textbook, here are the fastest and most effective ways to summarize long PDFs.",
        date: "March 8, 2025",
        readTime: "6 min read",
        category: "PDF Tips",
        image: "📄",
    },
    {
        slug: "ai-study-tools-for-college-students",
        title: "AI Study Tools for College Students: The Complete Guide",
        excerpt: "College is harder than ever. Learn how AI-powered study tools can help you tackle assignments, ace exams, and study smarter — not harder.",
        date: "March 5, 2025",
        readTime: "10 min read",
        category: "Study Tips",
        image: "🎓",
    },
    {
        slug: "best-pdf-tools-online",
        title: "15 Best Free PDF Tools Online in 2025",
        excerpt: "A comprehensive guide to the best free online PDF tools for merging, splitting, compressing, converting, and editing PDFs without installing software.",
        date: "March 3, 2025",
        readTime: "7 min read",
        category: "PDF Tools",
        image: "🛠️",
    },
];

const Blog = () => (
    <>
        <Helmet>
            <title>Blog — AI Tools, PDF Tips & Study Guides | MagicDOCX</title>
            <meta name="description" content="Expert articles on AI document tools, PDF productivity, study strategies, and document management. Free guides for students, professionals, and researchers." />
            <link rel="canonical" href="https://mylovepdf.lovable.app/blog" />
        </Helmet>
        <div className="flex min-h-screen flex-col bg-background">
            <Navbar />
            <main className="flex-1">
                <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-16 border-b border-border">
                    <div className="container max-w-4xl text-center space-y-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">MagicDOCX Blog</h1>
                            <p className="mt-4 text-lg text-muted-foreground">Expert guides on AI tools, PDF productivity, and study strategies</p>
                        </motion.div>
                    </div>
                </section>
                <section className="container max-w-4xl py-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {posts.map(p => (
                            <motion.article key={p.slug} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 h-40 flex items-center justify-center text-6xl">{p.image}</div>
                                <div className="p-6 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-0.5 font-semibold">{p.category}</span>
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{p.date}</span>
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{p.readTime}</span>
                                    </div>
                                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug">{p.title}</h2>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{p.excerpt}</p>
                                    <Link to={`/blog/${p.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">
                                        Read Article <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    </>
);

export default Blog;
