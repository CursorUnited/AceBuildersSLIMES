"use client";

// Scheme detail: one scheme fetched from /api/schemes/<id>, evaluated in the browser by the pure engine.
import { use, useEffect, useState } from "react";
import Link from "next/link";
import DeadlineChip from "@/components/DeadlineChip";
import DocChecklist from "@/components/DocChecklist";
import ReasonList from "@/components/ReasonList";
import { evaluateAll, SchemeSchema, type Scheme, type SchemeResult } from "@/lib/engine";
import { t, type StringKey } from "@/lib/i18n/strings";
import { getApplications, getLang, getProfile, setApplications, type Lang, type Profile } from "@/lib/storage";

type Props = {
  params: Promise<{ id: string }>;
};

type LoadState = "loading" | "ready" | "missing";

const STATUS_KEY: Record<SchemeResult["status"], StringKey> = {
  likely_eligible: "statusLikely",
  needs_info: "sectionOneAway",
  not_eligible: "sectionNotEligible",
};

export default function SchemeDetailPage({ params }: Props) {
  const { id } = use(params);
  const [lang, setLang] = useState<Lang>("ta");
  const [profile, setProfile] = useState<Profile>({});
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    setLang(getLang());
    setProfile(getProfile());
    setTracked(getApplications().some((a) => a.scheme_id === id));

    let cancelled = false;
    fetch(`/api/schemes/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("scheme request failed");
        return res.json();
      })
      .then((json: unknown) => {
        const parsed = SchemeSchema.safeParse(json);
        if (!parsed.success) throw new Error("scheme response invalid");
        if (!cancelled) {
          setScheme(parsed.data);
          setState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setState("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function track() {
    if (!scheme) return;
    const apps = getApplications();
    if (!apps.some((a) => a.scheme_id === scheme.id)) {
      setApplications([
        ...apps,
        {
          scheme_id: scheme.id,
          status: "not_started",
          docs_checked: [],
          reminder_on: null,
          updated_at: new Date().toISOString(),
        },
      ]);
    }
    setTracked(true);
  }

  const back = (
    <Link href="/results" className="link inline-flex min-h-[44px] w-fit cursor-pointer items-center text-base font-medium">
      {t("backToResults", lang)}
    </Link>
  );

  if (state === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
        {back}
        <p className="text-base text-gray-700">{t("schemeLoading", lang)}</p>
      </main>
    );
  }

  if (state === "missing" || scheme === null) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
        {back}
        <p className="text-base text-red-700">{t("schemeNotFound", lang)}</p>
      </main>
    );
  }

  const result = evaluateAll(profile, [scheme]).find((r) => r.scheme_id === scheme.id);
  const levelLabel =
    scheme.level === "central"
      ? t("levelCentral", lang)
      : scheme.level === "state"
        ? t("levelState", lang)
        : t("levelShared", lang);

  const applyModeText =
    scheme.apply.mode === "online"
      ? t("applyOnline", lang)
      : scheme.apply.mode === "offline"
        ? t("applyOffline", lang)
        : t("applyAutomatic", lang);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      {back}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent-teal/10 px-3 py-1 text-base font-semibold text-accent-teal">{levelLabel}</span>
          <DeadlineChip deadline={scheme.deadline} lang={lang} />
        </div>
        <h1 className="text-2xl font-bold text-accent-teal">{scheme.name[lang]}</h1>
        <p className="text-base text-gray-700">{scheme.benefit[lang]}</p>
      </header>

      {result && (
        <section aria-label="status" className="flex flex-col gap-3 rounded-xl border border-accent-teal/30 bg-white p-4">
          <p className="text-lg font-semibold text-accent-teal">{t(STATUS_KEY[result.status], lang)}</p>
          {result.reasons.length > 0 && <ReasonList reasons={result.reasons} lang={lang} />}
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="text-xl font-semibold text-accent-teal">
          {t("docsTitle", lang)}
        </h2>
        <DocChecklist scheme={scheme} profile={profile} lang={lang} />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="apply-heading">
        <h2 id="apply-heading" className="text-xl font-semibold text-accent-teal">
          {t("howToApply", lang)}
        </h2>
        <p className="text-base text-gray-800">{applyModeText}</p>
        {scheme.apply.steps.length > 0 && (
          <ol className="flex list-decimal flex-col gap-2 pl-6 text-base text-gray-800">
            {scheme.apply.steps.map((step, i) => (
              <li key={`s${i}`}>{step[lang]}</li>
            ))}
          </ol>
        )}
        {scheme.apply.portal_url && (
          <a
            href={scheme.apply.portal_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex min-h-[44px] w-fit cursor-pointer items-center px-4 py-2 text-base font-medium"
          >
            {t("openPortal", lang)}
          </a>
        )}
      </section>

      <div>
        <button
          type="button"
          onClick={track}
          className="btn-primary min-h-[44px] cursor-pointer px-4 py-2 text-base font-medium"
        >
          {tracked ? `${t("tracked", lang)} ★` : `${t("track", lang)} ☆`}
        </button>
      </div>

      <footer className="flex flex-col gap-3 border-t border-gray-200 pt-4 text-base text-gray-600">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-gray-700">{t("sourcesTitle", lang)}</p>
          <ul className="flex flex-col gap-1">
            {scheme.sources.map((src) => (
              <li key={src}>
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex min-h-[44px] cursor-pointer items-center"
                >
                  {new URL(src).hostname}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <p>
          {t("lastChecked", lang)}: {scheme.last_verified}
        </p>
        <p>{t("officeDecides", lang)}</p>
        {scheme.confidence === "low" && <p className="text-base text-orange-800">{t("lowConfidence", lang)}</p>}
      </footer>
    </main>
  );
}
