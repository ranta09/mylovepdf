import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, Zap, ShieldCheck, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const useCases = [
  { icon: BookOpen, title: "Research & Study", desc: "Summarize long textbooks and research papers with our AI-powered summarizer. Extract key insights in seconds, not hours." },
  { icon: Users, title: "Group Projects", desc: "Merge, split, and organize PDF reports from multiple contributors seamlessly without any software installation." },
  { icon: GraduationCap, title: "Exam Prep", desc: "Convert notes and slides to PDF, generate quiz questions with AI, and create flashcards automatically from any document." },
  { icon: Zap, title: "Assignments", desc: "Compress large PDF assignments to meet submission file size limits. Add page numbers and watermarks with a single click." },
];

const Education = () => (
  <>
    <Helmet>
      <title>MagicDOCX for Education, Free AI PDF Tools for Students</title>
      <meta name="description" content="Free AI-powered PDF tools for students and educators. Summarize textbooks, generate quizzes, organize study materials, and more, all in your browser." />
      <link rel="canonical" href="https://magicdocx.lovable.app/education" />
    </Helmet>
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-28 border-b border-border">
          <div className="container max-w-4xl text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-6">
                <GraduationCap className="h-3.5 w-3.5" /> For Students & Educators
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-none">
                Study Smarter,<br /><span className="text-primary">Not Harder.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                MagicDOCX is 100% free for students and educators. From AI summarizers to quiz generators, we've built every tool you need to succeed academically.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="rounded-2xl px-8 py-6 text-base font-bold shadow-xl gap-2" asChild>
                  <Link to="/"><BookOpen className="h-5 w-5" /> Start Learning for Free</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
                {["No signup required", "100% free forever", "Works on any device", "No file size limits"].map(b => (
                  <span key={b} className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />{b}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="container max-w-5xl py-20 space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-foreground">Made for How Students Actually Work</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every tool designed around real student workflows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="bg-secondary/30 rounded-3xl border border-border p-10 space-y-6">
            <h2 className="text-2xl font-bold text-foreground">What Students Are Saying</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { quote: "The AI summarizer saved me hours during exam week. I can understand 50-page papers in minutes.", name: "Ananya S., CS Student" },
                { quote: "MagicDOCX is literally the only tool I use for all my PDF assignments. And it's free!", name: "Marcus L., Economics" },
                { quote: "The quiz generator helped me study for finals. It asked questions I didn't even think of.", name: "Priya K., Med Student" },
              ].map(({ quote, name }) => (
                <div key={name} className="bg-card rounded-xl border border-border p-5 space-y-3">
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(n => <Star key={n} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">"{quote}"</p>
                  <p className="text-xs font-bold text-foreground">{name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">Ready to transform how you study?</h2>
            <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
              <Link to="/">Explore All Tools <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default Education;
