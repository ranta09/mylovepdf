import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Sparkles, Merge, Scissors, Minimize2, ArrowLeftRight, Edit3, Lock } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";

const categories = [
  { id: "ai", label: "AI Tools", icon: Sparkles },
  { id: "merge", label: "Merge", icon: Merge },
  { id: "split", label: "Split", icon: Scissors },
  { id: "compress", label: "Compress", icon: Minimize2 },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
  { id: "edit", label: "Edit", icon: Edit3 },
  { id: "protect", label: "Protect", icon: Lock },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToCategory = (categoryId: string) => {
    setOpen(false);
    const el = document.getElementById(`category-${categoryId}`);
    if (location.pathname === "/") {
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: "smooth" });
      }, 400);
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
              className="relative z-10 flex items-baseline gap-0.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em" }}
            >
              <span className="text-2xl font-medium tracking-tight text-foreground">Magic</span>
              <span className="text-2xl font-black tracking-tight text-foreground">PDF</span>
            </span>
            <motion.img
              src={logoImg}
              alt="Magic PDF"
              className="h-8 w-8 relative z-10 ml-1.5"
              whileHover={{ rotate: 15, scale: 1.1 }}
            />
          </motion.div>
        </Link>

        {/* Desktop categories */}
        <div className="hidden items-center gap-1 md:flex">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60"
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
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
          <div className="flex flex-col gap-1">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/60 text-left"
                >
                  <Icon className="h-4 w-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
