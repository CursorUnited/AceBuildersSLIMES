"use client";

// Results page: profile from phone storage, schemes from /api/schemes, evaluated in the browser by the pure engine.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import SchemeCard from "@/components/SchemeCard";
import { evaluateAll, SchemeSchema, type ProfileField, type Scheme, type SchemeResult } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import { getLang, getProfile, setProfile, type Lang, type Profile } from "@/lib/storage";

const SchemesSchema = z.array(SchemeSchema);

export default function ResultsPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("ta");
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showNotEligible, setShowNotEligible] = useState(false);

  useEffect(() => {
    const saved = getProfile();
    if (Object.keys(saved).length === 0) {
      router.replace("/");
      return;
    }
    setLang(getLang());
    setProfileState(saved);

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
              className="btn-outline flex min-h-[44px] w-full cursor-pointer items-center justify-between text-left"
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
