import { Link } from "react-router-dom";
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
    title: "Essentials",
    links: tools.filter(t => ["merge", "split", "compress", "protect"].includes(t.category)).map(t => ({ label: t.name, path: t.path })),
  },
];

const Footer = () => (
  <footer className="border-t border-border bg-secondary/50 pt-12 pb-8">
    <div className="container">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 mb-10">
        {footerSections.map(section => (
          <div key={section.title}>
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.links.map(link => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground/50">
          © {new Date().getFullYear()} MagicPDF. All rights reserved.
        </p>
        <div className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1.5">🔒 Processed locally</span>
          <span className="flex items-center gap-1.5">⚡ No sign-up</span>
          <span className="flex items-center gap-1.5">💯 100% free</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
