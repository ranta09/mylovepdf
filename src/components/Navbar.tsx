import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
            <Heart className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            My Love PDF
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="/#ai-tools" onClick={scrollToAiTools} className="text-sm font-semibold text-tool-ai transition-colors hover:text-foreground flex items-center gap-1 cursor-pointer">✨ AI Tools</a>
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
            <a href="/#ai-tools" onClick={scrollToAiTools} className="text-sm font-semibold text-tool-ai cursor-pointer">✨ AI Tools</a>
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
