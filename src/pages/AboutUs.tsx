import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Heart, Zap, Lock, Code2, Server, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const AboutUs = () => {
  return (
    <>
      <Helmet>
        <title>About Us - MagicDOCX</title>
        <meta
          name="description"
          content="Learn about MagicDOCX, why we built it, and our commitment to an absolutely free and private document processing experience."
        />
      </Helmet>

      <div className="min-h-screen bg-background pb-20 relative overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-1/4 left-0 w-1/3 h-1/3 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2" />
        
        {/* Hero Section */}
        <section className="container pt-32 pb-20 md:pt-40 md:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
            >
              <Heart className="h-4 w-4" /> The MagicDOCX Story
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold font-display tracking-tight text-foreground mb-6"
            >
              Democratizing Document Processing.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground leading-relaxed"
            >
              We believe that simple tasks shouldn't require complex, expensive, or privacy-invasive solutions. That's why we built something better.
            </motion.p>
          </div>
        </section>

        {/* Why it was built */}
        <section className="container pb-24">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold tracking-tight">The Problem We Solved</h2>
              <div className="w-12 h-1.5 bg-primary rounded-full" />
              <p className="text-lg text-muted-foreground leading-relaxed">
                MagicDOCX was born out of a simple, recurring frustration. Every time we needed to merge a PDF, convert a document, or extract a page, we were met with hostile platforms.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We faced arbitrary file limits, unexpected paywalls at the end of a conversion, and terrifying privacy policies that claimed ownership of the uploaded content. <strong>We refused to accept that.</strong> We built MagicDOCX to be the tool we always wished existed: 100% free, blisteringly fast, and architected natively for the modern web.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl transform rotate-3 scale-105" />
              <div className="relative bg-card border border-border/50 p-8 rounded-3xl shadow-elevated space-y-8">
                <div className="flex gap-4 items-start">
                  <div className="bg-red-500/10 text-red-500 p-3 rounded-xl shrink-0"><Lock className="h-6 w-6" /></div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">No Paywalls</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">No "premium" subscriptions just to download your own edited file.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-amber-500/10 text-amber-500 p-3 rounded-xl shrink-0"><ShieldCheck className="h-6 w-6" /></div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">No Data Harvesting</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">Unlike other platforms, we don't sell your data, documents, or metadata.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-500/10 text-blue-500 p-3 rounded-xl shrink-0"><Zap className="h-6 w-6" /></div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">No Bloatware</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">Everything runs directly in the browser or via highly-optimized serverless functions.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The Privacy Commitment */}
        <section className="bg-secondary/30 border-y border-border py-24 mb-24 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl aspect-[2/1] bg-primary/5 rounded-[100%] blur-[80px] pointer-events-none" />
          
          <div className="container relative z-10 max-w-4xl text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Our Privacy Commitment</h2>
            
            <div className="bg-card border-2 border-primary/20 shadow-xl rounded-2xl p-8 md:p-12 mb-8">
              <p className="text-2xl md:text-3xl font-bold font-display leading-tight text-foreground">
                "We never read your files. Files are auto-deleted after 60 minutes."
              </p>
            </div>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              We employ a hybrid architecture. For tools that run on your device, your files never even hit our servers. For conversions requiring high computational power, your files are transmitted securely, processed in memory, and erased entirely from our existence instantly upon processing or within 60 minutes.
            </p>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="container pb-20">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Under The Hood</h2>
            <p className="text-lg text-muted-foreground">Built by engineers, for everyone. We leverage the most modern and scalable technologies available today.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card border border-border p-6 rounded-2xl shadow-sm"
            >
              <Code2 className="h-8 w-8 text-blue-500 mb-4" />
              <h3 className="font-bold text-lg mb-2">Frontend</h3>
              <p className="text-sm text-muted-foreground">React, TypeScript, and Vite. Designed completely responsive with Tailwind CSS and animated using Framer Motion.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card border border-border p-6 rounded-2xl shadow-sm"
            >
              <Globe className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Browser Engines</h3>
              <p className="text-sm text-muted-foreground">PDF.js, pdf-lib, and JSZip run heavy processing modules entirely client-side leveraging Web Workers.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card border border-border p-6 rounded-2xl shadow-sm"
            >
              <Database className="h-8 w-8 text-green-500 mb-4" />
              <h3 className="font-bold text-lg mb-2">Infrastructure</h3>
              <p className="text-sm text-muted-foreground">Supabase powers our telemetry, rate-limiting, and state-management with enterprise-grade PostgreSQL.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-card border border-border p-6 rounded-2xl shadow-sm"
            >
              <Server className="h-8 w-8 text-amber-500 mb-4" />
              <h3 className="font-bold text-lg mb-2">Microservices</h3>
              <p className="text-sm text-muted-foreground">Puppeteer and advanced proprietary serverless pipelines handle complex IO operations without blocking tasks.</p>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="container text-center pt-8">
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-12 max-w-3xl mx-auto flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-4">Ready to try it out?</h2>
            <p className="text-muted-foreground mb-8">No sign-up. No friction. Just get the job done.</p>
            <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
              <Link to="/">
                Explore All Tools <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default AboutUs;
