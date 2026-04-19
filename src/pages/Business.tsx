import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, BarChart3, Users, ShieldCheck, ArrowRight, CheckCircle2, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const plans = [
  { name: "Starter", price: "Free", desc: "Perfect for small teams", features: ["Up to 5 users", "All core PDF tools", "100 MB file limit", "Browser-based processing"] },
  { name: "Professional", price: "Coming Soon", desc: "For growing businesses", features: ["Unlimited users", "Priority processing", "500 MB file limit", "API access", "Dedicated support"] },
  { name: "Enterprise", price: "Contact Us", desc: "Full-scale deployment", features: ["Custom onboarding", "SSO & permissions", "Unlimited file size", "Custom integrations", "SLA guarantee"] },
];

const Business = () => (
  <>
    <Helmet>
      <title>Business Solutions, MagicDOCX</title>
      <meta name="description" content="Scale your document workflows with MagicDOCX for Business. Fast, secure, and free PDF tools built for teams." />
      <link rel="canonical" href="https://magicdocx.lovable.app/business" />
    </Helmet>
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 py-28 border-b border-border">
          <div className="container max-w-4xl text-center space-y-6">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary mb-6">
                <Building2 className="h-3.5 w-3.5" /> For Business
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-none">
                Powerful PDF Tools<br /><span className="text-primary">for Your Team.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                MagicDOCX for Business gives your team access to a full suite of secure, fast document processing tools, with no software to install.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="rounded-2xl px-8 py-6 text-base font-bold shadow-xl gap-2" asChild>
                  <Link to="/contact"><Users className="h-5 w-5" /> Contact Sales</Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl px-8 py-6 text-base font-bold" asChild>
                  <Link to="/">Try Free Tools</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="container max-w-5xl py-20 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Blazing Fast", desc: "Process documents in seconds, not minutes. Client-side processing means zero server queues." },
              { icon: ShieldCheck, title: "Enterprise Security", desc: "Files never leave your team's browser for most operations. Full SSL for cloud-based tasks." },
              { icon: Lock, title: "Team Permissions", desc: "Control access and usage across your organization. Audit logs and user management coming soon." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Plans */}
          <div>
            <h2 className="text-3xl font-extrabold text-foreground text-center mb-12">Choose Your Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, i) => (
                <div key={plan.name} className={`rounded-2xl border p-8 space-y-6 ${i === 1 ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card"}`}>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{plan.name}</p>
                    <p className="text-3xl font-black text-foreground mt-1">{plan.price}</p>
                    <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full rounded-xl" variant={i === 1 ? "default" : "outline"} asChild>
                    <Link to="/contact">{i === 2 ? "Contact Us" : "Get Started"}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-primary/5 border border-primary/20 rounded-3xl p-12 text-center space-y-4">
            <BarChart3 className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Ready to streamline your document workflows?</h2>
            <p className="text-muted-foreground">Talk to our team and get set up in under 24 hours.</p>
            <Button size="lg" className="rounded-full mt-2 shadow-lg shadow-primary/20" asChild>
              <Link to="/contact">Contact Sales <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default Business;
