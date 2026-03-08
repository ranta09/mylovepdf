import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { translations, LANGUAGES, type LangCode, type TranslationKeys } from "./translations";

interface LanguageContextType {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: TranslationKeys;
  /** Translate with interpolation: t("key", { var: "value" }) */
  tt: (key: keyof TranslationKeys, vars?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function detectBrowserLang(): LangCode {
  const browserLang = navigator.language?.slice(0, 2) || "en";
  const supported = LANGUAGES.map(l => l.code) as readonly string[];
  return (supported.includes(browserLang) ? browserLang : "en") as LangCode;
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<LangCode>(() => {
    const saved = localStorage.getItem("magicpdf-lang") as LangCode | null;
    return saved && translations[saved] ? saved : detectBrowserLang();
  });

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
    localStorage.setItem("magicpdf-lang", code);
  }, []);

  const t = translations[lang];

  const tt = useCallback((key: keyof TranslationKeys, vars?: Record<string, string>) => {
    let str = translations[lang][key] || translations.en[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  }, [lang]);

  // Set dir for RTL languages
  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tt }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
