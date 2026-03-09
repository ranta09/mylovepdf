import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LayoutGrid, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { tools, aiTools, type PdfTool, type ToolCategory } from "@/lib/tools";

const categoryMeta: { id: ToolCategory; label: string; extraCategories?: ToolCategory[] }[] = [
  { id: "ai", label: "AI PDF" },
  { id: "compress", label: "Compress", extraCategories: ["split"] },
  { id: "convert", label: "Convert" },
  { id: "merge", label: "Organize" },
  { id: "edit", label: "View & Edit" },
  { id: "protect", label: "Protect & Sign" },
];

const allTools = [...aiTools, ...tools];

const groupedTools: Record<string, PdfTool[]> = {};
categoryMeta.forEach(cat => {
  groupedTools[cat.id] = allTools.filter(t => t.category === cat.id);
});

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const megaRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close mega menu on route change
  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on outside click
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
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center group relative">
          <span
            className="relative z-10 flex items-baseline gap-0"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
          >
            <span className="text-2xl font-bold tracking-tight text-foreground">Mag</span>
            <span className="relative text-2xl font-bold tracking-tight text-foreground">
              <span className="invisible">i</span>
              <span className="absolute inset-0 flex flex-col items-center">
                <span className="text-primary animate-bounce text-[10px] leading-none" style={{ marginTop: '-2px' }}>✦</span>
                <span className="text-foreground text-2xl font-bold leading-none" style={{ marginTop: '-4px' }}>ı</span>
              </span>
            </span>
            <span className="text-2xl font-bold tracking-tight text-foreground">c</span>
            <span className="text-2xl font-black tracking-tight text-primary">DOCX</span>
          </span>
        </Link>

        {/* Desktop: Tools mega-menu trigger */}
        <div className="hidden md:flex items-center gap-2">
          <button
            ref={triggerRef}
            onClick={() => setMegaOpen(prev => !prev)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              megaOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Tools
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Desktop Mega Menu Dropdown */}
      {megaOpen && (
        <div
          ref={megaRef}
          className="hidden md:block absolute left-0 right-0 top-full z-50 border-b border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="container py-6">
            <div className="flex flex-wrap gap-x-3 gap-y-4">
              {categoryMeta.map(cat => {
                const catTools = groupedTools[cat.id] || [];
                if (catTools.length === 0) return null;
                return (
                  <div key={cat.id} className="flex flex-col gap-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      {cat.label}
                    </h4>
                    {catTools.map(tool => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.id}
                          to={tool.path}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-secondary/60 hover:text-foreground transition-colors group"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="truncate text-xs font-medium">{tool.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden max-h-[80vh] overflow-y-auto">
          {categoryMeta.map(cat => {
            const catTools = groupedTools[cat.id] || [];
            if (catTools.length === 0) return null;
            return (
              <div key={cat.id} className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                  {cat.label}
                </h4>
                <div className="flex flex-col gap-0.5">
                  {catTools.map(tool => {
                    const Icon = tool.icon;
                    return (
                      <Link
                        key={tool.id}
                        to={tool.path}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {tool.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
