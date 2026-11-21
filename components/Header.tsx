"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n/strings";
import { clearAll } from "@/lib/storage";

const TAP = "min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 text-base";

export default function Header() {
  const { lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function forgetMe() {
    clearAll();
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 py-1">
        <span className="text-base font-semibold text-accent-teal">{t("appTitle", lang)}</span>

        <div className="flex items-center gap-1">
          <div role="group" aria-label="Language" className="flex rounded-full border border-accent-teal/30">
            <button
              type="button"
              aria-pressed={lang === "ta"}
              onClick={() => setLang("ta")}
              className={`${TAP} rounded-full ${lang === "ta" ? "bg-accent-teal text-white" : "text-accent-teal"}`}
            >
              தமிழ்
            </button>
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
              className={`${TAP} rounded-full ${lang === "en" ? "bg-accent-teal text-white" : "text-accent-teal"}`}
            >
              EN
            </button>
          </div>

          <Link href="/applications" className={`${TAP} text-accent-teal underline underline-offset-4`}>
            {t("myApplications", lang)}
          </Link>

          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className={`${TAP} text-accent-teal`}
            >
              {t("menu", lang)}
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full mt-1 w-max rounded-lg border border-black/10 bg-white shadow-md">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmOpen(true);
                  }}
                  className={`${TAP} w-full justify-start text-left text-red-700`}
                >
                  {t("forgetMe", lang)}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                className={`${TAP} w-full rounded-lg bg-red-700 text-white`}
              >
                {t("forgetConfirmYes", lang)}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className={`${TAP} w-full rounded-lg border border-accent-teal text-accent-teal`}
              >
                {t("cancel", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
