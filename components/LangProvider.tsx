"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getLang, setLang as saveLang, type Lang } from "@/lib/storage";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Server render and first client render both use "ta"; the stored value is read after mount.
  const [lang, setLangState] = useState<Lang>("ta");

  useEffect(() => {
    const stored = getLang();
    setLangState(stored);
    document.documentElement.lang = stored;
  }, []);

  const setLang = useCallback((next: Lang) => {
    saveLang(next);
    setLangState(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (ctx === null) {
    throw new Error("useLang must be used inside <LangProvider>");
  }
  return ctx;
}
