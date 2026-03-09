import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Wand2, FileText, Edit3, Lock, Minimize2, Scissors, Merge, ChevronDown, LayoutGrid } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { tools, aiTools, type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";

const navCategories = [
  { id: "ai", labelKey: "catAi" as const, icon: Wand2, isNew: true },
  { id: "compress", labelKey: "catCompress" as const, icon: Minimize2 },
  { id: "convert", labelKey: "catConvert" as const, icon: FileText },
  { id: "merge", labelKey: "catMerge" as const, icon: Merge },
  { id: "split", labelKey: "catSplit" as const, icon: Scissors },
  { id: "edit", labelKey: "catEdit" as const, icon: Edit3 },
  { id: "protect", labelKey: "catProtect" as const, icon: Lock },
];

const allTools = [...aiTools, ...tools];

const getToolsByCategory = (catId: string): PdfTool[] =>
  allTools.filter(t => t.category === catId);

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  const handleMouseEnter = (catId: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(catId);
  };

  const handleMouseLeave = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  // Close dropdown on route change
  const location = useLocation();
  useEffect(() => {
    setActiveDropdown(null);
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <span
            className="relative z-10 flex items-baseline gap-0"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
          >
            <span className="text-xl font-bold tracking-tight text-foreground">Mag</span>
            <span className="relative text-xl font-bold tracking-tight text-foreground">
              <span className="invisible">i</span>
              <span className="absolute inset-0 flex flex-col items-center">
                <span className="text-primary animate-bounce text-[8px] leading-none" style={{ marginTop: '-2px' }}>✦</span>
                <span className="text-foreground text-xl font-bold leading-none" style={{ marginTop: '-3px' }}>ı</span>
              </span>
            </span>
            <span className="text-xl font-bold tracking-tight text-foreground">c</span>
            <span className="text-xl font-black tracking-tight text-primary">DOCX</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-0.5 lg:flex ml-6">
          {/* All Tools button */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("all")}
            onMouseLeave={handleMouseLeave}
          >
            <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60">
              <LayoutGrid className="h-3.5 w-3.5" />
              Tools
              <ChevronDown className={cn("h-3 w-3 transition-transform", activeDropdown === "all" && "rotate-180")} />
            </button>

            {activeDropdown === "all" && (
              <div
                className="absolute left-0 top-full pt-1 z-50"
                onMouseEnter={() => handleMouseEnter("all")}
                onMouseLeave={handleMouseLeave}
              >
                <div className="w-[600px] rounded-xl border border-border bg-card shadow-lg p-4 grid grid-cols-2 gap-1 max-h-[70vh] overflow-y-auto">
                  {navCategories.map(cat => {
                    const catTools = getToolsByCategory(cat.id);
                    if (catTools.length === 0) return null;
                    const Icon = cat.icon;
                    return (
                      <div key={cat.id} className="mb-3">
                        <div className="flex items-center gap-1.5 px-2 mb-1">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            {t[cat.labelKey]}
                          </span>
                          {cat.isNew && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold leading-none text-primary-foreground">NEW</span>}
                        </div>
                        {catTools.map(tool => {
                          const TIcon = tool.icon;
                          return (
                            <Link
                              key={tool.id}
                              to={tool.path}
                              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                            >
                              <div className={cn("flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground", categoryColors[tool.category])}>
                                <TIcon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium">{tool.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Individual category dropdowns */}
          {navCategories.map(cat => {
            const catTools = getToolsByCategory(cat.id);
            if (catTools.length === 0) return null;
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                className="relative"
                onMouseEnter={() => handleMouseEnter(cat.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:text-foreground hover:bg-secondary/60",
                  activeDropdown === cat.id ? "text-foreground bg-secondary/40" : "text-muted-foreground"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                  {t[cat.labelKey]}
                  {cat.isNew && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold leading-none text-primary-foreground ml-0.5">NEW</span>}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", activeDropdown === cat.id && "rotate-180")} />
                </button>

                {activeDropdown === cat.id && (
                  <div
                    className="absolute left-0 top-full pt-1 z-50"
                    onMouseEnter={() => handleMouseEnter(cat.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="w-[260px] rounded-xl border border-border bg-card shadow-lg p-2">
                      {catTools.map(tool => {
                        const TIcon = tool.icon;
                        return (
                          <Link
                            key={tool.id}
                            to={tool.path}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
                          >
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground", categoryColors[tool.category])}>
                              <TIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{tool.name}</div>
                              <div className="text-[11px] text-muted-foreground leading-tight">{tool.description}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-3 lg:hidden max-h-[80vh] overflow-y-auto">
          {navCategories.map(cat => {
            const catTools = getToolsByCategory(cat.id);
            if (catTools.length === 0) return null;
            const Icon = cat.icon;
            const isExpanded = mobileExpanded === cat.id;
            return (
              <div key={cat.id} className="mb-1">
                <button
                  onClick={() => setMobileExpanded(isExpanded ? null : cat.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary/60"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {t[cat.labelKey]}
                    {cat.isNew && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold leading-none text-primary-foreground">NEW</span>}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                </button>
                {isExpanded && (
                  <div className="ml-4 mb-2 space-y-0.5">
                    {catTools.map(tool => {
                      const TIcon = tool.icon;
                      return (
                        <Link
                          key={tool.id}
                          to={tool.path}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        >
                          <div className={cn("flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground", categoryColors[tool.category])}>
                            <TIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-medium">{tool.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
