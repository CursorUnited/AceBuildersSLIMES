"use client";

// One scheme in the results list. Whole card links to /scheme/<id>; the interactive bits sit above the link overlay (z-10).
import { useEffect, useState } from "react";
import Link from "next/link";
import ChipRow from "@/components/ChipRow";
import DeadlineChip from "@/components/DeadlineChip";
import type { ProfileField, Scheme, SchemeResult } from "@/lib/engine";
import { QUESTIONS } from "@/lib/i18n/questions";
import { t } from "@/lib/i18n/strings";
import { getApplications, setApplications, type Lang } from "@/lib/storage";

type Props = {
  scheme: Scheme;
  result: SchemeResult;
  lang: Lang;
  onAnswer: (field: ProfileField, value: unknown) => void;
};

export default function SchemeCard({ scheme, result, lang, onAnswer }: Props) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    setTracked(getApplications().some((a) => a.scheme_id === scheme.id));
  }, [scheme.id]);

  function track() {
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

  const levelLabel =
    scheme.level === "central"
      ? t("levelCentral", lang)
      : scheme.level === "state"
        ? t("levelState", lang)
        : t("levelShared", lang);

  // Reason lines: a failing reason for not_eligible, otherwise up to 3 passing reasons (labels from the engine).
  const reasonLines: { key: string; text: string }[] =
    result.status === "not_eligible"
      ? result.reasons
          .filter((r) => r.result === "fail")
          .slice(0, 1)
          .map((r, i) => ({ key: `r${i}`, text: `✗ ${r.label[lang]}` }))
      : result.reasons
          .filter((r) => r.result === "pass" || r.result === "check")
          .slice(0, 3)
          .map((r, i) => ({
            key: `r${i}`,
            text:
              r.result === "check"
                ? `✓ ${r.label[lang]} (${t("confirmThis", lang)})`
                : `✓ ${r.label[lang]}`,
          }));

  const field = result.status === "needs_info" ? result.missing_fields[0] : undefined;
  const template = field ? QUESTIONS[field] : undefined;

  return (
    <article className="relative rounded-xl border border-accent-teal/30 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent-teal/10 px-3 py-1 text-sm font-semibold text-accent-teal">{levelLabel}</span>
        <DeadlineChip deadline={scheme.deadline} lang={lang} />
      </div>

      <Link
        href={`/scheme/${scheme.id}`}
        className="link mt-2 block cursor-pointer text-lg font-semibold text-accent-teal after:absolute after:inset-0 after:content-['']"
      >
        {scheme.name[lang]}
      </Link>

      <p className="mt-1 text-base font-medium text-foreground">{scheme.benefit[lang]}</p>

      {reasonLines.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 text-base text-gray-800">
          {reasonLines.map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
        </ul>
      )}

      {field && template && (
        <div className="relative z-10 mt-3 flex flex-col gap-2">
          <p className="text-base text-gray-800">
            {t("tellUsToCheck", lang)} {template[lang]}
          </p>
          {template.chips.length > 0 && (
            <ChipRow
              chips={template.chips.map((c, i) => ({ value: String(i), label: c.label }))}
              lang={lang}
              onPick={(v) => {
                const chip = template.chips[Number(v)];
                if (chip) onAnswer(field, chip.value);
              }}
            />
          )}
        </div>
      )}

      <div className="relative z-10 mt-3">
        <button
          type="button"
          onClick={track}
          className={
            tracked
              ? "min-h-[44px] cursor-pointer rounded-[1.375rem] border border-accent-teal bg-accent-teal/10 px-4 py-2 text-base font-medium text-accent-teal"
              : "btn-outline min-h-[44px] cursor-pointer px-4 py-2 text-base font-medium"
          }
        >
          {tracked ? `${t("tracked", lang)} ★` : `${t("track", lang)} ☆`}
        </button>
      </div>
    </article>
  );
}
