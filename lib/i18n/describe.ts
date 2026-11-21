// Human-readable "<Field>: <Value>" line for chat notes. Pure: no next/react/supabase/genai/fs imports.
import type { ProfileField } from "@/lib/engine/types";
import { incomeLabel } from "@/lib/engine/profile";
import { QUESTIONS } from "@/lib/i18n/questions";
import { FIELD_NAMES } from "@/lib/i18n/strings";

type Lang = "ta" | "en";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

export function describeFact(field: ProfileField, value: unknown, lang: Lang): string {
  const name = FIELD_NAMES[field][lang];
  const yes = lang === "en" ? "Yes" : "ஆமா";
  const no = lang === "en" ? "No" : "இல்லை";

  let valueText: string;
  if (typeof value === "boolean") {
    valueText = value ? yes : no;
  } else if (field === "income" && typeof value === "object" && value !== null) {
    valueText = incomeLabel(value as Parameters<typeof incomeLabel>[0], lang);
  } else if (field === "year_of_study" && value === 1) {
    valueText = lang === "en" ? "1st year" : "முதலாம் ஆண்டு";
  } else {
    const chip = QUESTIONS[field].chips.find((c) => deepEqual(c.value, value));
    if (chip) {
      valueText = typeof chip.label === "string" ? chip.label : chip.label[lang];
    } else {
      valueText = String(value ?? "");
    }
  }

  return `${name}: ${valueText}`;
}
