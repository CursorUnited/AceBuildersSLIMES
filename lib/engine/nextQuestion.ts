// Pure. Picks the next profile field to ask about. Source: docs/CONTRACTS.md §2.3.
import { FIELD_ASK_ORDER } from "./fields";
import type { ProfileField, SchemeResult } from "./types";

/**
 * Score = number of needs_info results whose missing_fields contain the field.
 * Highest score wins; ties go to the earlier field in FIELD_ASK_ORDER.
 * Returns null when no result is needs_info (or none has a missing field).
 */
export function nextQuestion(
  results: readonly SchemeResult[],
): { field: ProfileField; unlock_count: number } | null {
  const scores = new Map<ProfileField, number>();
  for (const result of results) {
    if (result.status !== "needs_info") continue;
    for (const field of new Set(result.missing_fields)) {
      scores.set(field, (scores.get(field) ?? 0) + 1);
    }
  }

  let best: { field: ProfileField; unlock_count: number } | null = null;
  for (const field of FIELD_ASK_ORDER) {
    const score = scores.get(field) ?? 0;
    if (score === 0) continue;
    if (best === null || score > best.unlock_count) {
      best = { field, unlock_count: score };
    }
  }
  return best;
}
