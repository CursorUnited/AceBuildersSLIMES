"use client";

// Document checklist for one scheme. Checked state lives in urimai.applications[].docs_checked.
// docs_checked is number[] (ApplicationSchema), so each document is keyed by its index in scheme.documents.
import { useEffect, useState } from "react";
import { filterDocuments } from "@/lib/engine/documents";
import type { Scheme } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import { getApplications, setApplications, type Lang, type Profile } from "@/lib/storage";

type Props = {
  scheme: Scheme;
  profile: Profile;
  lang: Lang;
};

export default function DocChecklist({ scheme, profile, lang }: Props) {
  const [checked, setChecked] = useState<number[]>([]);

  useEffect(() => {
    const entry = getApplications().find((a) => a.scheme_id === scheme.id);
    setChecked(entry?.docs_checked ?? []);
  }, [scheme.id]);

  // Map each shown document back to its stable index in scheme.documents.
  const shown = filterDocuments(scheme, profile).map((item) => ({
    item,
    index: scheme.documents.findIndex((d) => d.en === item.text.en),
  }));

  function toggle(index: number, on: boolean) {
    const apps = getApplications();
    const now = new Date().toISOString();
    const hasEntry = apps.some((a) => a.scheme_id === scheme.id);
    const next = hasEntry
      ? apps.map((a) => {
          if (a.scheme_id !== scheme.id) return a;
          const docs = on
            ? Array.from(new Set([...a.docs_checked, index]))
            : a.docs_checked.filter((i) => i !== index);
          return { ...a, docs_checked: docs, updated_at: now };
        })
      : [
          ...apps,
          {
            scheme_id: scheme.id,
            status: "not_started" as const,
            docs_checked: on ? [index] : [],
            reminder_on: null,
            updated_at: now,
          },
        ];
    setApplications(next);
    setChecked(next.find((a) => a.scheme_id === scheme.id)?.docs_checked ?? []);
  }

  if (shown.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {shown.map(({ item, index }) => {
        const isChecked = index >= 0 && checked.includes(index);
        return (
          <li key={item.text.en}>
            <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-base text-gray-800">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer"
                checked={isChecked}
                disabled={index < 0}
                onChange={(e) => toggle(index, e.target.checked)}
              />
              <span>
                {item.text[lang]}
                {item.if_applicable && (
                  <span className="ml-1 text-base text-gray-600">{t("ifApplicable", lang)}</span>
                )}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
