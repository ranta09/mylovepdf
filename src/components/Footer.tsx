import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { tools, aiTools } from "@/lib/tools";

const footerSections = [
  {
    title: "AI Tools",
    links: aiTools.map(t => ({ label: t.name, path: t.path })),
  },
  {
    title: "Convert",
    links: tools.filter(t => t.category === "convert").map(t => ({ label: t.name, path: t.path })),
  },
  {
    title: "Edit & Organize",
    links: tools.filter(t => t.category === "edit").map(t => ({ label: t.name, path: t.path })),
  },
  {
    title: "More Tools",
    links: [
      ...tools.filter(t => ["merge", "split", "compress", "protect"].includes(t.category)).map(t => ({ label: t.name, path: t.path })),
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-border bg-secondary/50 py-12">
    <div className="container">
      {/* Link Grid */}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-10">
        {footerSections.map(section => (
          <div key={section.title}>
            <h3 className="font-display text-sm font-bold text-foreground mb-3">{section.title}</h3>
            <ul className="space-y-1.5">
              {section.links.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Brand + Description */}
      <div className="border-t border-border pt-8 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="MagicPDF" className="h-10 w-10" />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-lg font-bold text-foreground">
            Magic<span className="text-primary">PDF</span>
          </span>
        </div>
        <p className="max-w-lg text-sm text-muted-foreground">
          Every tool you need to work with PDFs — plus AI-powered document tools. Merge, split, compress, convert, summarize, generate quizzes, chat with PDFs, and check resume ATS scores. Free, fast, and secure.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground/60">
          <span>🔒 Files processed locally & auto-deleted</span>
          <span>⚡ No sign-up required</span>
          <span>💯 100% free, no limits</span>
        </div>
        <p className="text-xs text-muted-foreground/40 mt-2">
          © {new Date().getFullYear()} MagicPDF. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
