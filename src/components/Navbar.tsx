import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Wand2, FileText, Edit3, Lock, Minimize2, Scissors, Merge } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const navCategories = [
  { id: "ai", labelKey: "catAi" as const, icon: Wand2, isNew: true },
  { id: "convert", labelKey: "catConvert" as const, icon: FileText },
  { id: "edit", labelKey: "catEdit" as const, icon: Edit3 },
  { id: "merge", labelKey: "catMerge" as const, icon: Merge },
  { id: "split", labelKey: "catSplit" as const, icon: Scissors },
  { id: "compress", labelKey: "catCompress" as const, icon: Minimize2 },
  { id: "protect", labelKey: "catProtect" as const, icon: Lock },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const scrollToCategory = (e: React.MouseEvent, catId: string) => {
    e.preventDefault();
    setOpen(false);
    const doScroll = () => {
      document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: "smooth" });
    };
    if (location.pathname === "/") {
      doScroll();
    } else {
      navigate("/");
      setTimeout(doScroll, 400);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center group relative">
          <motion.div
            className="flex items-center relative"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <span
              className="relative z-10 flex items-baseline gap-0"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
            >
              <span className="text-2xl font-bold tracking-tight text-foreground">Magic</span>
              <span className="text-2xl font-black tracking-tight text-primary">PDF</span>
            </span>
            <motion.img
              src={logoImg}
              alt="Magic PDF"
              className="h-8 w-8 relative z-10 ml-1.5"
              whileHover={{ rotate: 15, scale: 1.1 }}
            />
          </motion.div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {navCategories.map(cat => {
            const Icon = cat.icon;
            return (
              <a
                key={cat.id}
                href={`/#cat-${cat.id}`}
                onClick={e => scrollToCategory(e, cat.id)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60 cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5" />
                {t[cat.labelKey]}
                {cat.isNew && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
              </a>
            );
          })}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border bg-card px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navCategories.map(cat => {
              const Icon = cat.icon;
              return (
                <a
                  key={cat.id}
                  href={`/#cat-${cat.id}`}
                  onClick={e => scrollToCategory(e, cat.id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  {t[cat.labelKey]}
                  {cat.isNew && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold leading-none text-primary-foreground">NEW</span>}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
