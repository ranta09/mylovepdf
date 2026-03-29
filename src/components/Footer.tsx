import { Link } from "react-router-dom";
import { tools, aiTools } from "@/lib/tools";
import { Globe, Heart, Mail, Twitter, Github, Linkedin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/translations";

const Footer = () => {
  const { t, lang, setLang } = useLanguage();

  const footerSections = [
    { title: t.catConvert, links: tools.filter(tl => tl.category === "convert").map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
    { title: t.footerEditOrganize, links: tools.filter(tl => tl.category === "edit").map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
    { title: t.footerEssentials, links: tools.filter(tl => ["merge", "split", "compress", "protect"].includes(tl.category)).map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
  ];

  const companyLinks = [
    { label: "Blog", path: "/blog" },
    { label: "About Us", path: "/about" },
    { label: "Contact Us", path: "/contact" },
    { label: "Privacy Policy", path: "/privacy" },
    { label: "Terms of Service", path: "/terms" },
  ];

  return (
    <footer className="border-t border-border bg-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none" />
      <div className="container relative z-10 pt-16 pb-8">
        {/* Top Section: Branding & Tagline */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-border/50 pb-8">
          <div>
            <Link to="/" className="flex items-center group shrink-0 mb-3">
              <span className="relative z-10 flex items-baseline gap-0 font-display tracking-tight">
                <span className="text-3xl font-semibold text-foreground">Mag</span>
                <span className="relative text-3xl font-semibold text-foreground">
                  <span className="invisible">i</span>
                  <span className="absolute inset-0 flex flex-col items-center">
                    <span className="text-primary animate-bounce text-[12px] leading-none" style={{ marginTop: "-2px" }}>✦</span>
                    <span className="text-foreground text-3xl font-semibold leading-none" style={{ marginTop: "-4px" }}>ı</span>
                  </span>
                </span>
                <span className="text-3xl font-semibold text-foreground">c</span>
                <span className="text-3xl font-bold text-primary">DOCX</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm flex items-center gap-2">
              Made with <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" /> — <span className="font-semibold text-foreground">Free forever.</span>
            </p>
          </div>
          <div className="flex gap-4">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
              <Github className="h-4 w-4" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 mb-12 justify-between">
          {footerSections.map(section => (
            <div key={section.title}>
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/40"></span>
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map(link => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-sm font-medium text-muted-foreground hover:text-primary hover:translate-x-1 transition-all flex items-center gap-1 group">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Company Links */}
          <div>
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/40"></span>
              Company
            </h3>
            <ul className="space-y-2.5 mb-6">
              {companyLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm font-medium text-muted-foreground hover:text-primary hover:translate-x-1 transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t.footerRights.replace("{year}", String(new Date().getFullYear()))}
            </p>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <select
              value={lang}
              onChange={e => setLang(e.target.value as any)}
              className="appearance-none rounded-lg border border-border bg-muted px-3 py-1.5 pr-7 text-xs font-medium text-foreground cursor-pointer outline-none focus:ring-2 focus:ring-primary/30"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
            <Globe className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
