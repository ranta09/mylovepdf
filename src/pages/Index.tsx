import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import MagicBackground from "@/components/MagicBackground";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CategoryFilter, { type FilterCategory } from "@/components/CategoryFilter";
import ToolsGrid from "@/components/ToolsGrid";
import FeaturesSection from "@/components/FeaturesSection";
import ReportIssueSection from "@/components/ReportIssueSection";
import { tools, aiTools } from "@/lib/tools";
import { Helmet } from "react-helmet-async";

const allTools = [...aiTools, ...tools];

const Index = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FilterCategory>("all");

  const filtered = useMemo(() => {
    let result = allTools;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (category !== "all") {
      result = result.filter(t => t.category === category);
    }
    return result;
  }, [search, category]);

  const counts = useMemo(() => {
    const base = search
      ? allTools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
      : allTools;
    const c: Record<string, number> = { all: base.length };
    base.forEach(t => { c[t.category] = (c[t.category] || 0) + 1; });
    return c as Record<FilterCategory, number>;
  }, [search]);

  return (
    <>
      <Helmet>
        <title>PDF Magic — AI-Powered PDF & Document Tools</title>
        <meta name="description" content="Every tool you need to work with PDFs — plus AI-powered document tools. Merge, split, compress, convert, summarize, generate quizzes, chat with PDFs, and check resume ATS scores. Free, fast and secure." />
      </Helmet>
      <div className="relative flex min-h-screen flex-col">
        <MagicBackground />
        <Navbar />
        <main className="flex-1">
          <HeroSection search={search} onSearchChange={setSearch} />

          <section className="container py-10">
            <div className="mb-8">
              <CategoryFilter active={category} onChange={setCategory} counts={counts} />
            </div>
            <ToolsGrid tools={filtered} emptySearch={search || undefined} />
          </section>

          {!search && (
            <>
              <FeaturesSection />
              <section className="border-t border-border bg-secondary/30 py-8">
                <div className="container">
                  <ReportIssueSection />
                </div>
              </section>
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
