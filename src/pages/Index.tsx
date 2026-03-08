import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools } from "@/lib/tools";
import { motion } from "framer-motion";
import { Heart, Shield, Zap, Search } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";

const Index = () => {
  const [search, setSearch] = useState("");

  const filtered = tools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>My Love PDF — Free Online PDF Tools</title>
        <meta name="description" content="Every tool you need to work with PDFs. Merge, split, compress, convert, edit and protect your PDF files. Free, fast and secure." />
      </Helmet>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-20 md:py-28">
            <div className="container relative z-10 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <img src="/logo.png" alt="My Love PDF" className="mx-auto mb-6 h-24 w-24" />
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">
                  Every PDF tool you need
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                  Merge, split, compress, convert, edit and protect your PDF files. All in one place — free and easy to use.
                </p>

                {/* Search */}
                <div className="mx-auto mt-8 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search tools… e.g. merge, compress, convert"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-10 rounded-xl border-border bg-card shadow-card h-12 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
          </section>

          {/* Tools Grid */}
          <section className="container py-16">
            {search && filtered.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">No tools found for "{search}"</p>
                <p className="mt-2 text-sm text-muted-foreground">Try searching for "merge", "convert", or "compress"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filtered.map((tool, i) => (
                  <ToolCard key={tool.id} tool={tool} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* Features */}
          {!search && (
            <section className="border-t border-border bg-secondary/30 py-16">
              <div className="container">
                <div className="grid gap-8 md:grid-cols-3">
                  {[
                    { icon: Zap, title: "Lightning Fast", desc: "Process files instantly in your browser. No waiting, no queues." },
                    { icon: Shield, title: "100% Secure", desc: "Files are processed locally and automatically deleted after use." },
                    { icon: Heart, title: "Completely Free", desc: "All tools are free to use with no hidden limits or sign-ups." },
                  ].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex flex-col items-center gap-3 text-center"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <f.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
