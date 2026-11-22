"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n/strings";
import { clearAll } from "@/lib/storage";

const TAP = "min-h-[44px] min-w-[44px] px-3 text-base";

export default function Header() {
  const { lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function forgetMe() {
    clearAll();
    window.location.reload();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-3 py-1 lg:max-w-6xl">
          <span className="min-w-0 truncate text-sm font-bold text-accent-teal sm:text-base">{t("appTitle", lang)}</span>

          <div className="flex shrink-0 items-center gap-1">
            <div role="group" aria-label="Language" className="flex shrink-0 rounded-full border border-accent-teal/30">
              <button
                type="button"
                aria-pressed={lang === "ta"}
                onClick={() => setLang("ta")}
                className={`min-h-[44px] min-w-[44px] px-2 text-base inline-flex items-center justify-center btn-outline cursor-pointer rounded-full ${lang === "ta" ? "bg-accent-teal text-white" : "text-accent-teal"}`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                aria-pressed={lang === "en"}
                onClick={() => setLang("en")}
                className={`min-h-[44px] min-w-[44px] px-2 text-base inline-flex items-center justify-center btn-outline cursor-pointer rounded-full ${lang === "en" ? "bg-accent-teal text-white" : "text-accent-teal"}`}
              >
                EN
              </button>
            </div>

            <Link href="/applications" className={`${TAP} max-sm:hidden shrink-0 link cursor-pointer text-accent-teal sm:inline-flex items-center justify-center`}>
              {t("myApplications", lang)}
            </Link>

            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={`${TAP} btn-outline cursor-pointer text-accent-teal inline-flex items-center justify-center`}
              >
                {t("menu", lang)}
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-1 w-max max-w-[calc(100vw-1.5rem)] rounded-lg border border-black/10 bg-white shadow-md">
                  <Link
                    href="/applications"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className={`${TAP} w-full text-left link cursor-pointer text-accent-teal inline-flex sm:hidden items-center justify-start`}
                  >
                    {t("myApplications", lang)}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmOpen(true);
                    }}
                    className={`${TAP} w-full cursor-pointer inline-flex items-center justify-start text-left text-red-700`}
                  >
                    {t("forgetMe", lang)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="alertdialog" aria-modal="true" aria-describedby="forget-body" className="w-full max-w-sm rounded-xl bg-white p-4 shadow-xl">
            <p id="forget-body" className="text-base text-foreground">
              {t("forgetConfirmBody", lang)}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={forgetMe}
                className={`${TAP} w-full cursor-pointer inline-flex items-center justify-center rounded-lg bg-red-700 text-white`}
              >
                {t("forgetConfirmYes", lang)}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className={`${TAP} btn-outline w-full cursor-pointer inline-flex items-center justify-center rounded-lg`}
              >
                {t("cancel", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
