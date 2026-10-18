import { createContext, useContext, useEffect, useState } from "react";
import { Lang, translateValue } from "../i18n";

type LanguageContextType = {
  lang: Lang;
  toggleLanguage: () => void;
  setLanguage: (lang: Lang) => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (value) => value,
});

function translateDocument(lang: Lang) {
  if (typeof document === "undefined") return;

  const skipTags = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);

  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.textContent || "";
      const leading = raw.match(/^\s*/)?.[0] || "";
      const trailing = raw.match(/\s*$/)?.[0] || "";
      const translated = translateValue(raw, lang);
      if (translated !== raw.trim() && translated !== raw) {
        node.textContent = `${leading}${translated}${trailing}`;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    if (skipTags.has(element.tagName)) return;
    if (element.closest('[data-no-translate="true"]')) return;

    ["placeholder", "title", "aria-label"].forEach((attr) => {
      const value = element.getAttribute(attr);
      if (value) element.setAttribute(attr, translateValue(value, lang));
    });

    element.childNodes.forEach(translateNode);
  };

  translateNode(document.body);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang");
    return stored === "en" || stored === "ar" ? stored : "ar";
  });

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.dir = lang === "ar" ? "rtl" : "ltr";

    const run = () => translateDocument(lang);
    run();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(run);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => observer.disconnect();
  }, [lang]);

  const setLanguage = (nextLang: Lang) => setLang(nextLang);
  const toggleLanguage = () => setLang((prev) => (prev === "ar" ? "en" : "ar"));
  const t = (value: string) => translateValue(value, lang);

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
