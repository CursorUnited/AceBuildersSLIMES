"use client";

// Results page: profile from phone storage, schemes from /api/schemes, evaluated in the browser by the pure engine.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import SchemeCard from "@/components/SchemeCard";
import { buildReminders } from "@/components/ApplicationCard";
import { evaluateAll, SchemeSchema, type ProfileField, type Scheme, type SchemeResult } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import { getApplications, getLang, getProfile, setProfile, type Application, type Lang, type Profile } from "@/lib/storage";

const SchemesSchema = z.array(SchemeSchema);

export default function ResultsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ta");
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showNotEligible, setShowNotEligible] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    const saved = getProfile();
    if (Object.keys(saved).length === 0) {
      router.replace("/");
      return;
    }
    setLang(getLang());
    setProfileState(saved);
    setApps(getApplications());

    let cancelled = false;
    fetch("/api/schemes")
      .then((res) => {
        if (!res.ok) throw new Error("schemes request failed");
        return res.json();
      })
      .then((json: unknown) => {
        const parsed = SchemesSchema.safeParse(json);
        if (!parsed.success) throw new Error("schemes response invalid");
        if (!cancelled) setSchemes(parsed.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleAnswer(field: ProfileField, value: unknown) {
    if (profile === null) return;
    const next = { ...profile, [field]: value } as Profile;
    setProfile(next);
    setProfileState(next);
  }

  const ready = profile !== null && !loading && !failed;
  const results: SchemeResult[] = profile !== null ? evaluateAll(profile, schemes) : [];
  const byId = new Map(schemes.map((s) => [s.id, s]));
  const reminders = buildReminders(apps, schemes);

  const likely = results.filter((r) => r.status === "likely_eligible");
  const oneAway = results.filter((r) => r.status === "needs_info");
  const notEligible = results.filter((r) => r.status === "not_eligible");

  function renderCards(list: SchemeResult[]) {
    return list.map((r) => {
      const scheme = byId.get(r.scheme_id);
      if (!scheme) return null;
      return (
        <SchemeCard key={r.scheme_id} scheme={scheme} result={r} lang={lang} onAnswer={handleAnswer} />
      );
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-accent-teal">{t("resultsTitle", lang)}</h1>
        <Link
          href="/"
          className="link inline-flex min-h-[44px] w-fit cursor-pointer items-center text-base font-medium"
        >
          {t("editAnswers", lang)}
        </Link>
      </header>

      {reminders.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent-turmeric/20 p-3 text-base text-foreground">
          <span>
            {reminders[0].kind === "closing"
              ? `${reminders[0].days === 0 ? t("reminderClosesToday", lang) : t("reminderCloses", lang).replace("{n}", String(reminders[0].days))}: ${reminders[0].scheme.name[lang]}`
              : `${t("reminderDue", lang)}: ${reminders[0].scheme.name[lang]}`}
          </span>
          <Link href="/applications" className="link inline-flex min-h-[44px] cursor-pointer items-center font-medium">
            {t("reminderViewAll", lang)}
          </Link>
        </div>
      )}

      {!ready && !failed && <p className="text-base text-gray-700">{t("loadingResults", lang)}</p>}
      {failed && <p className="text-base text-red-700">{t("loadFailed", lang)}</p>}

      {ready && schemes.length === 0 && <p className="text-base text-gray-700">{t("noSchemes", lang)}</p>}

      {ready && schemes.length > 0 && (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="likely-heading">
            <h2 id="likely-heading" className="text-xl font-semibold text-green-800">
              {`${t("sectionLikely", lang)} (${likely.length})`}
            </h2>
            {renderCards(likely)}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="oneaway-heading">
            <h2 id="oneaway-heading" className="text-xl font-semibold text-orange-800">
              {`${t("sectionOneAway", lang)} (${oneAway.length})`}
            </h2>
            {renderCards(oneAway)}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="noteligible-heading">
            <h2 id="noteligible-heading" className="text-xl font-semibold text-gray-700">
              <button
                type="button"
                aria-expanded={showNotEligible}
                onClick={() => setShowNotEligible((v) => !v)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-accent-teal/30 bg-white px-4 py-3 text-left hover:bg-accent-teal/5 cursor-pointer"
              >
                <span>{`${t("sectionNotEligible", lang)} (${notEligible.length})`}</span>
                <span className="text-base font-medium text-accent-teal">
                  {showNotEligible ? t("hideNotEligible", lang) : t("showNotEligible", lang)}
                </span>
              </button>
            </h2>
            {showNotEligible && renderCards(notEligible)}
          </section>
        </>
      )}

      <footer className="border-t border-gray-200 pt-4 text-base text-gray-600">
        <p>{t("resultsFooter", lang)}</p>
      </footer>
    </main>
  );
}
