import { Link } from "react-router-dom";
import { tools, aiTools } from "@/lib/tools";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES } from "@/lib/i18n/translations";

const Footer = () => {
  const { t, lang, setLang } = useLanguage();

  const footerSections = [
    { title: t.catAi, links: aiTools.map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
    { title: t.catConvert, links: tools.filter(tl => tl.category === "convert").map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
    { title: t.footerEditOrganize, links: tools.filter(tl => tl.category === "edit").map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
    { title: t.footerEssentials, links: tools.filter(tl => ["merge", "split", "compress", "protect"].includes(tl.category)).map(tl => ({ label: t[`tool.${tl.id}` as keyof typeof t] || tl.name, path: tl.path })) },
  ];

  return (
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
                    <Link to={link.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Language Selector */}
        <div className="border-t border-border pt-6 pb-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span className="font-medium">{t.language}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  lang === l.code
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/50">
            {t.footerRights.replace("{year}", String(new Date().getFullYear()))}
          </p>
          <div className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1.5">🔒 {t.footerLocal}</span>
            <span className="flex items-center gap-1.5">⚡ {t.footerNoSignup}</span>
            <span className="flex items-center gap-1.5">💯 {t.footerFree}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
