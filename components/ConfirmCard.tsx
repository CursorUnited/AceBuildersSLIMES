"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import ChipRow from "@/components/ChipRow";
import { useLang } from "@/components/LangProvider";
import { QUESTIONS } from "@/lib/i18n/questions";
import { t } from "@/lib/i18n/strings";
import { mergeProfile, type Profile, type ProfileField } from "@/lib/engine";

const CLOSE = { en: "Close", ta: "மூடு" } as const;

type Props = {
  profile: Profile;
  changedFields: string[];
  onProfileChange: (p: Profile) => void;
  onClose: () => void;
};

export default function ConfirmCard({ profile, changedFields, onProfileChange, onClose }: Props): ReactNode {
  const { lang } = useLang();
  const router = useRouter();
  const [openField, setOpenField] = useState<ProfileField | null>(null);

  const knownFields = (Object.keys(QUESTIONS) as ProfileField[]).filter((f) => profile[f] !== undefined);

  function currentChipIndex(field: ProfileField): number {
    const current = JSON.stringify(profile[field]);
    return QUESTIONS[field].chips.findIndex((c) => JSON.stringify(c.value) === current);
  }

  function pickChip(field: ProfileField, index: number): void {
    const chip = QUESTIONS[field].chips[index];
    if (!chip) return;
    onProfileChange(mergeProfile(profile, { [field]: chip.value }).profile);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("understood", lang)}
      className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-teal-900">{t("understood", lang)}</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-full px-3 text-base text-teal-800 underline"
        >
          {CLOSE[lang]}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {knownFields.map((field) => {
          const q = QUESTIONS[field];
          const idx = currentChipIndex(field);
          const valueLabel = idx >= 0 ? q.chips[idx].label[lang] : "";
          const open = openField === field;
          const chips = q.chips.map((c, i) => ({ value: String(i), label: c.label }));
          return (
            <li key={field} className="rounded-lg border border-teal-200">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenField(open ? null : field)}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-base"
              >
                <span className="flex items-center gap-2">
                  {changedFields.includes(field) && (
                    <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full bg-teal-600" />
                  )}
                  <span className="text-teal-900">{lang === "ta" ? q.ta : q.en}</span>
                </span>
                <span className="font-medium text-teal-800">{valueLabel}</span>
              </button>
              {open && (
                <div className="px-3 pb-3">
                  <ChipRow
                    chips={chips}
                    lang={lang}
                    selectedValue={idx >= 0 ? String(idx) : undefined}
                    onPick={(value) => pickChip(field, Number(value))}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => router.push("/results")}
        className="mt-4 min-h-[44px] w-full rounded-full bg-teal-700 px-4 py-2 text-base font-medium text-white"
      >
        {t("looksRight", lang)}
      </button>
    </div>
  );
}
