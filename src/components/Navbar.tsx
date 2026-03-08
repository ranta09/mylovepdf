import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Wand2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToAiTools = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === "/") {
      document.getElementById("ai-tools")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById("ai-tools")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center group relative">
          <motion.div
            className="flex items-center relative"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <img src={logoImg} alt="My Love PDF logo" className="h-20 w-20 object-contain -my-4" />
            <span
              className="text-2xl font-black tracking-tight text-foreground relative z-0 pl-1.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.02em" }}
            >
              My Love PDF
            </span>
          </motion.div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="/#ai-tools" onClick={scrollToAiTools} className="text-sm font-semibold text-primary transition-colors hover:text-foreground flex items-center gap-1 cursor-pointer"><Wand2 className="h-4 w-4" /> AI Tools <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">NEW</span></a>
          <Link to="/merge-pdf" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Merge</Link>
          <Link to="/split-pdf" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Split</Link>
          <Link to="/compress-pdf" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Compress</Link>
          <Link to="/jpg-to-pdf" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Convert</Link>
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border bg-card px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <a href="/#ai-tools" onClick={scrollToAiTools} className="text-sm font-semibold text-primary cursor-pointer flex items-center gap-1"><Wand2 className="h-4 w-4" /> AI Tools <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">NEW</span></a>
            <Link to="/merge-pdf" className="text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Merge PDF</Link>
            <Link to="/split-pdf" className="text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Split PDF</Link>
            <Link to="/compress-pdf" className="text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>Compress PDF</Link>
            <Link to="/jpg-to-pdf" className="text-sm font-medium text-muted-foreground" onClick={() => setOpen(false)}>JPG to PDF</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
