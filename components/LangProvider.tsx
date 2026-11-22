"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getLang, setLang as saveLang, type Lang } from "@/lib/storage";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Server render and first client render both use "ta"; the saved or browser-derived value is read after mount.
  // Children stay invisible until then, so the wrong language never flashes on screen.
  const [lang, setLangState] = useState<Lang>("ta");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const resolved = getLang();
    setLangState(resolved);
    document.documentElement.lang = resolved;
    setReady(true);
  }, []);

  const setLang = useCallback((next: Lang) => {
    saveLang(next);
    setLangState(next);
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);

  return (
    <LangContext.Provider value={value}>
      {/* display: contents keeps the parent's layout; visibility hides the pre-resolution render. */}
      <div className="contents" style={ready ? undefined : { visibility: "hidden" }}>
        {children}
      </div>
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (ctx === null) {
    throw new Error("useLang must be used inside <LangProvider>");
  }
  return ctx;
}
