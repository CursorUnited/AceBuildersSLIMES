// Pure. Filters a scheme's documents by their only_if condition. Source: docs/CONTRACTS.md §2.1–2.2.
import { evaluateCondition } from "./evaluate";
import type { Localized, Profile, Scheme } from "./types";

/**
 * - no only_if            -> shown, if_applicable false
 * - only_if pass          -> shown, if_applicable false
 * - only_if fail          -> hidden
 * - only_if unknown       -> shown, if_applicable true
 */
export function filterDocuments(
  scheme: Scheme,
  profile: Profile,
): { text: Localized; if_applicable: boolean }[] {
  const out: { text: Localized; if_applicable: boolean }[] = [];
  for (const doc of scheme.documents) {
    const text: Localized = { en: doc.en, ta: doc.ta };
    if (doc.only_if === undefined) {
      out.push({ text, if_applicable: false });
      continue;
    }
    const { result } = evaluateCondition(doc.only_if, profile);
    if (result === "fail") continue;
    out.push({ text, if_applicable: result === "unknown" });
  }
  return out;
}
