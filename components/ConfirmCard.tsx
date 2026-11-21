"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import ChipRow from "@/components/ChipRow";
import { useLang } from "@/components/LangProvider";
import { describeFact } from "@/lib/i18n/describe";
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

// describeFact returns "<Field>: <Value>"; keep only the value part.
function valuePart(line: string): string {
  const i = line.indexOf(": ");
  return i >= 0 ? line.slice(i + 2) : line;
}

export default function ConfirmCard({ profile, changedFields, onProfileChange, onClose }: Props): ReactNode {
  const { lang } = useLang();
  const router = useRouter();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [openField, setOpenField] = useState<ProfileField | null>(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("understood", lang)}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg outline-none"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-accent-teal">{t("understood", lang)}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-outline min-h-[44px] min-w-[44px] cursor-pointer rounded-full px-3 text-base"
          >
            {CLOSE[lang]}
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {knownFields.map((field) => {
            const q = QUESTIONS[field];
            const idx = currentChipIndex(field);
            const valueLabel =
              idx >= 0 ? q.chips[idx].label[lang] : valuePart(describeFact(field, profile[field], lang));
            const open = openField === field;
            const chips = q.chips.map((c, i) => ({ value: String(i), label: c.label }));
            return (
              <li key={field} className="rounded-lg border border-accent-teal/30">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenField(open ? null : field)}
                  className="link flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-base"
                >
                  <span className="flex items-center gap-2">
                    {changedFields.includes(field) && (
                      <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent-teal" />
                    )}
                    <span className="text-accent-teal">{lang === "ta" ? q.ta : q.en}</span>
                  </span>
                  <span className="font-medium text-accent-teal/80">{valueLabel}</span>
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
          className="btn-primary mt-4 min-h-[44px] w-full cursor-pointer rounded-full px-4 py-2 text-base font-medium"
        >
          {t("looksRight", lang)}
        </button>
      </div>
    </div>
  );
}
