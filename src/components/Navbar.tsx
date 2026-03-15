import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutGrid, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { tools, aiTools, categoryTextColors, categoryColors } from "@/lib/tools";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const allTools = [...aiTools, ...tools];
const byId = (id: string) => allTools.find(t => t.id === id)!;

interface MenuColumn {
  sections: { label: string; toolIds: string[] }[];
}

const megaColumns: MenuColumn[] = [
  {
    sections: [
      { label: "Compress & Split", toolIds: ["compress", "split"] },
      { label: "AI Tools", toolIds: ["ai-summarizer", "ai-quiz", "ai-chat", "ai-ats", "ai-translate"] },
    ],
  },
  {
    sections: [
      { label: "Organize", toolIds: ["merge", "rotate", "delete-pages", "extract-pages", "organize"] },
    ],
  },
  {
    sections: [
      {
        label: "Edit & Annotate",
        toolIds: ["edit", "page-numbers", "crop-pdf", "redact-pdf", "watermark", "repair", "compare-pdf"],
      },
    ],
  },
  {
    sections: [
      { label: "Convert from PDF", toolIds: ["pdf-to-word", "pdf-to-excel", "pdf-to-ppt", "pdf-to-jpg"] },
    ],
  },
  {
    sections: [
      {
        label: "Convert to PDF",
        toolIds: ["word-to-pdf", "excel-to-pdf", "ppt-to-pdf", "jpg-to-pdf", "ocr-pdf", "html-to-pdf", "pdf-to-pdfa"],
      },
      { label: "Smart Generators", toolIds: ["excel-to-ppt"] },
    ],
  },
  {
    sections: [
      { label: "Sign & Protect", toolIds: ["sign-pdf", "unlock", "protect", "flatten-pdf"] },
    ],
  },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const megaRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeTool = allTools.find(t => t.path === location.pathname);

  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        megaRef.current &&
        !megaRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMegaOpen(false);
      }
    };
    if (megaOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [megaOpen]);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center group">
            <span
              className="relative z-10 flex items-baseline gap-0"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
            >
              <span className="text-2xl font-bold tracking-tight text-foreground">Mag</span>
              <span className="relative text-2xl font-bold tracking-tight text-foreground">
                <span className="invisible">i</span>
                <span className="absolute inset-0 flex flex-col items-center">
                  <span className="text-primary animate-bounce text-[10px] leading-none" style={{ marginTop: "-2px" }}>✦</span>
                  <span className="text-foreground text-2xl font-bold leading-none" style={{ marginTop: "-4px" }}>ı</span>
                </span>
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground">c</span>
              <span className="text-2xl font-black tracking-tight text-primary">DOCX</span>
            </span>
          </Link>

          <AnimatePresence mode="wait">
            {activeTool && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="hidden sm:flex items-center gap-3"
              >
                <div className="h-6 w-[1px] bg-border mx-1" />
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300",
                  "bg-secondary/50 border-border/50 shadow-sm"
                )}>
                  <activeTool.icon className={cn("h-4 w-4", categoryTextColors[activeTool.category])} />
                  <span className="text-xs font-black uppercase tracking-widest text-foreground truncate max-w-[120px]">
                    {activeTool.name}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <button
            ref={triggerRef}
            onClick={() => setMegaOpen(prev => !prev)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${megaOpen
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
          >
            <LayoutGrid className="h-4 w-4" />
            All Tools
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
          </button>
          <Link
            to="/blog"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          >
            Blog
          </Link>
          <Link
            to="/contact"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          >
            Contact Us
          </Link>
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Desktop Mega Menu */}
      <AnimatePresence>
        {megaOpen && (
          <motion.div
            ref={megaRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="hidden md:block absolute left-0 right-0 top-full z-50 border-b border-border bg-card shadow-elevated"
          >
            <div className="container py-6">
              <div className="grid grid-cols-3 gap-x-8 gap-y-6 lg:grid-cols-6">
                {megaColumns.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-4">
                    {col.sections.map(sec => {
                      const sectionTools = sec.toolIds.map(id => byId(id)).filter(Boolean);
                      if (sectionTools.length === 0) return null;
                      return (
                        <div key={sec.label} className="flex flex-col gap-1">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            {sec.label}
                          </h4>
                          {sectionTools.map(tool => {
                            const Icon = tool.icon;
                            const isActive = location.pathname === tool.path;
                            const colorClass = categoryTextColors[tool.category];

                            return (
                              <Link
                                key={tool.id}
                                to={tool.path}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-200 group relative",
                                  isActive
                                    ? `${colorClass} bg-secondary/80 font-bold`
                                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                                )}
                              >
                                <Icon className={cn(
                                  "h-4 w-4 shrink-0 transition-colors",
                                  isActive ? colorClass : "text-muted-foreground group-hover:text-primary"
                                )} />
                                <span className="text-xs truncate">{tool.name}</span>
                                {isActive && (
                                  <motion.div
                                    layoutId="active-tool-indicator"
                                    className={cn("absolute left-0 w-0.5 h-4 rounded-full", colorClass.replace('text-', 'bg-'))}
                                  />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card md:hidden max-h-[80vh] overflow-y-auto"
          >
            <div className="px-4 py-4 space-y-6">
              {megaColumns.map((col, ci) =>
                col.sections.map(sec => {
                  const sectionTools = sec.toolIds.map(id => byId(id)).filter(Boolean);
                  if (sectionTools.length === 0) return null;
                  return (
                    <div key={`${ci}-${sec.label}`}>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                        {sec.label}
                      </h4>
                      <div className="flex flex-col gap-0.5">
                        {sectionTools.map(tool => {
                          const Icon = tool.icon;
                          const isActive = location.pathname === tool.path;
                          const colorClass = categoryTextColors[tool.category];

                          return (
                            <Link
                              key={tool.id}
                              to={tool.path}
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                  ? `${colorClass} bg-secondary font-bold`
                                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                              )}
                              onClick={() => setMobileOpen(false)}
                            >
                              <Icon className={cn("h-4 w-4 shrink-0", isActive ? colorClass : "")} />
                              {tool.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
              <div className="px-4 pb-6 space-y-2 border-t border-border pt-4">
                <Link
                  to="/blog"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Blog
                </Link>
                <Link
                  to="/contact"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
