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

        <div className="border-t border-border pt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground/50 text-center md:text-left">
            {t.footerRights.replace("{year}", String(new Date().getFullYear()))}
          </p>

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
