import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import logoImg from "@/assets/logo.png";

interface HeroSectionProps {
  search: string;
  onSearchChange: (value: string) => void;
}

const HeroSection = ({ search, onSearchChange }: HeroSectionProps) => (
  <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 md:py-24">
    <div className="container relative z-10 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <img src={logoImg} alt="PDF Magic" className="mx-auto mb-5 h-28 w-28 md:h-36 md:w-36" />
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Every PDF tool you need
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
          Merge, split, compress, convert, edit and protect your PDFs — plus{" "}
          <span className="font-semibold text-primary">AI-powered tools</span> to summarize, quiz, and chat with your documents.
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tools… e.g. merge, summarize, quiz"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-10 rounded-xl border-border bg-card shadow-card h-12 text-sm"
            />
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
