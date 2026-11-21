// Pure. Profile merge, income bands and labels. Source: docs/CONTRACTS.md §1.
import { FIELD_ASK_ORDER, INCOME_BANDS } from "./fields";
import { ProfileSchema } from "./schemas";
import type { Income, Profile, ProfileField } from "./types";

const PROFILE_FIELDS: ReadonlySet<string> = new Set<string>(FIELD_ASK_ORDER);

function sameValue(field: ProfileField, a: unknown, b: unknown): boolean {
  if (field === "income") {
    const ia = a as Income;
    const ib = b as Income;
    return ia.min === ib.min && ia.max === ib.max;
  }
  return a === b;
}

/**
 * Merges validated updates into the old profile. Unknown keys and values that
 * fail their schema are dropped. Never throws.
 */
export function mergeProfile(
  old: Profile,
  updates: unknown,
): { profile: Profile; changed_fields: ProfileField[] } {
  const profile: Profile = { ...old };
  const changed_fields: ProfileField[] = [];
  if (typeof updates !== "object" || updates === null || Array.isArray(updates)) {
    return { profile, changed_fields };
  }

  for (const key of Object.keys(updates)) {
    if (!PROFILE_FIELDS.has(key)) continue;
    const field = key as ProfileField;
    const value: unknown = (updates as Record<string, unknown>)[key];
    if (value === undefined) continue;

    const parsed = ProfileSchema.safeParse({ [field]: value });
    if (!parsed.success) continue;
    const next: unknown = (parsed.data as Record<string, unknown>)[field];
    if (next === undefined) continue;

    const current: unknown = (old as Record<string, unknown>)[field];
    if (current === undefined || !sameValue(field, current, next)) {
      changed_fields.push(field);
    }
    Object.assign(profile, { [field]: next });
  }
  return { profile, changed_fields };
}

/** Income range for a chip id from INCOME_BANDS, or null if the id is unknown. */
export function incomeFromBand(bandId: string): Income | null {
  const band = INCOME_BANDS.find((b) => b.id === bandId);
  if (band === undefined) return null;
  return { min: band.value.min, max: band.value.max };
}

function formatRupees(n: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(n)}`;
}

/**
 * Label of the income band that exactly matches; otherwise a ₹ amount
 * formatted en-IN (single value, "₹min–₹max", or "₹min+" when max is open).
 */
export function incomeLabel(income: Income, lang: "en" | "ta"): string {
  const band = INCOME_BANDS.find(
    (b) => b.value.min === income.min && b.value.max === income.max,
  );
  if (band !== undefined) return band.label[lang];
  if (income.max === null) return `${formatRupees(income.min)}+`;
  if (income.min === income.max) return formatRupees(income.min);
  return `${formatRupees(income.min)}–${formatRupees(income.max)}`;
}
