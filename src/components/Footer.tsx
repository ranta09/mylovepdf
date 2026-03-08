import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border bg-secondary/50 py-12">
    <div className="container">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
            <Heart className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold text-foreground">My Love PDF</span>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          Every tool you need to work with PDFs — plus AI-powered tools to summarize, generate quizzes, and chat with your documents. Free, fast, and secure.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Your files are automatically deleted after processing for privacy.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
