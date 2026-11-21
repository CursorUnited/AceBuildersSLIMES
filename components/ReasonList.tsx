"use client";

// Lists every engine reason for one scheme: ✓ pass, ✗ fail, ? check (please confirm), ? unknown (label only).
import type { SchemeResult } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import type { Lang } from "@/lib/storage";

type Props = {
  reasons: SchemeResult["reasons"];
  lang: Lang;
};

export default function ReasonList({ reasons, lang }: Props) {
  if (reasons.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2 text-base text-gray-800">
      {reasons.map((r, i) => {
        if (r.result === "pass") {
          return (
            <li key={`r${i}`}>
              <span aria-hidden="true">✓</span> {r.label[lang]}
            </li>
          );
        }
        if (r.result === "fail") {
          return (
            <li key={`r${i}`}>
              <span aria-hidden="true">✗</span> {r.label[lang]}
            </li>
          );
        }
        if (r.result === "check") {
          return (
            <li key={`r${i}`}>
              <span aria-hidden="true">?</span> {r.label[lang]} {t("pleaseConfirm", lang)}
            </li>
          );
        }
        return (
          <li key={`r${i}`}>
            <span aria-hidden="true">?</span> {r.label[lang]}
          </li>
        );
      })}
    </ul>
  );
}
