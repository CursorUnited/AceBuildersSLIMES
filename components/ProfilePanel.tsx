"use client";

// Desktop-only side panel on home (lg+): what Urimai understood so far, counters, and two actions.
import { useRouter } from "next/navigation";
import { describeFact } from "@/lib/i18n/describe";
import { QUESTIONS } from "@/lib/i18n/questions";
import { t } from "@/lib/i18n/strings";
import type { Profile, ProfileField, Scheme, SchemeResult } from "@/lib/engine";

type Props = {
  profile: Profile;
  changedFields: string[];
  results: SchemeResult[];
  schemes: readonly Scheme[];
  lang: "ta" | "en";
  onReview: () => void;
};

// describeFact returns "<Field>: <Value>"; keep only the value part.
function valuePart(line: string): string {
  const i = line.indexOf(": ");
  return i >= 0 ? line.slice(i + 2) : line;
}

export default function ProfilePanel({ profile, changedFields, results, schemes, lang, onReview }: Props) {
  const router = useRouter();

  const knownFields = (Object.keys(QUESTIONS) as ProfileField[]).filter((f) => profile[f] !== undefined);
  const likely = results.filter((r) => r.status === "likely_eligible");
  const oneAway = results.filter((r) => r.status === "needs_info");
  const likelyNames = likely
    .slice(0, 3)
    .map((r) => schemes.find((s) => s.id === r.scheme_id))
    .filter((s): s is Scheme => s !== undefined);

  return (
    <aside className="hidden lg:flex sticky top-24 self-start w-full flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5">
      {knownFields.length === 0 ? (
        <>
          <h2 className="text-lg font-semibold text-accent-teal">{t("howTitle", lang)}</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-base text-foreground">
            <li>{t("howStep1", lang)}</li>
            <li>{t("howStep2", lang)}</li>
            <li>{t("howStep3", lang)}</li>
          </ol>
          <p className="flex items-start gap-1.5 text-base text-gray-600">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-1 shrink-0"
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>{t("privacyNote", lang)}</span>
          </p>
          {results.length > 0 && (
            <p className="text-base text-gray-600">
              {t("schemesChecked", lang).replace("{n}", String(results.length))}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-accent-teal">{t("profileUnderstood", lang)}</h2>
          <ul className="flex flex-col gap-2">
            {knownFields.map((field) => {
              const q = QUESTIONS[field];
              const value = valuePart(describeFact(field, profile[field], lang)) || "—";
              return (
                <li key={field} className="flex items-start justify-between gap-3 text-base">
                  <span className="flex items-start gap-2 text-accent-teal">
                    {changedFields.includes(field) && (
                      <span aria-hidden="true" className="mt-2 inline-block h-2 w-2 shrink-0 rounded-full bg-accent-turmeric" />
                    )}
                    <span>{lang === "ta" ? q.ta : q.en}</span>
                  </span>
                  <span className="text-right font-medium text-foreground">{value}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-base font-semibold text-green-800">
              {t("chipLikely", lang).replace("{n}", String(likely.length))}
            </span>
            <span className="rounded-full bg-accent-turmeric/20 px-3 py-1 text-base font-semibold text-foreground">
              {t("chipOneAway", lang).replace("{n}", String(oneAway.length))}
            </span>
          </div>

          {likelyNames.length > 0 && (
            <ul className="flex flex-col gap-1 text-base text-foreground">
              {likelyNames.map((s) => (
                <li key={s.id}>{s.name[lang]}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => router.push("/results")}
            className="btn-primary min-h-11 w-full cursor-pointer px-4 py-2 text-base font-medium"
          >
            {t("seeMySchemes", lang)}
          </button>
          <button
            type="button"
            onClick={onReview}
            className="btn-outline min-h-11 w-full cursor-pointer px-4 py-2 text-base font-medium"
          >
            {t("reviewAnswers", lang)}
          </button>
        </>
      )}
    </aside>
  );
}
