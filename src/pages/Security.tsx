import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Lock, Server, Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Security = () => (
  <>
    <Helmet>
      <title>Security, MagicDOCX</title>
      <meta name="description" content="Learn how MagicDOCX protects your files with browser-based processing, SSL encryption, and automatic deletion. Your privacy is our foundation." />
      <link rel="canonical" href="https://magicdocx.lovable.app/security" />
    </Helmet>
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-28 border-b border-border">
          <div className="container max-w-3xl text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 mx-auto">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-none">
                Built for <span className="text-primary">Security</span>, by Design.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Your documents are sensitive. We've architected MagicDOCX from the ground up so your files stay yours, always.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="container max-w-5xl py-20 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Server, title: "Browser-First Processing", color: "text-primary", bg: "bg-primary/10", desc: "Over 60% of our tools run entirely inside your browser. Your files never leave your device for operations like merging, splitting, and compressing." },
              { icon: Lock, title: "SSL Encryption in Transit", color: "text-blue-500", bg: "bg-blue-500/10", desc: "For AI-powered features, all file transfers are secured with TLS 1.3 encryption, the same standard used by banks." },
              { icon: Eye, title: "Zero Data Retention", color: "text-amber-500", bg: "bg-amber-500/10", desc: "Any file that touches our servers is automatically and permanently deleted within 60 minutes. No backups. No exceptions." },
            ].map(({ icon: Icon, title, color, bg, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Commitments */}
          <div className="bg-secondary/30 rounded-3xl border border-border p-10 space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Our Security Commitments</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "No file content is ever read or analyzed by our team",
                "No files are used to train AI models",
                "No third-party tracking cookies",
                "GDPR-compliant telemetry via Plausible Analytics",
                "No mandatory account creation required",
                "No file content sold or shared with third parties",
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
              <Link to="/">Explore Our Tools <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default Security;
