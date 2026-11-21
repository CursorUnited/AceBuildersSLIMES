import { describe, expect, it } from "vitest";
import { nextQuestion } from "../lib/engine/nextQuestion";
import type { SchemeResult } from "../lib/engine/types";

function result(
  scheme_id: string,
  status: SchemeResult["status"],
  missing_fields: SchemeResult["missing_fields"],
): SchemeResult {
  return { scheme_id, status, reasons: [], missing_fields };
}

describe("nextQuestion", () => {
  it("N1: returns null when no scheme is needs_info", () => {
    const results: SchemeResult[] = [
      result("a", "likely_eligible", []),
      result("b", "not_eligible", ["gender"]),
    ];
    expect(nextQuestion(results)).toBeNull();
  });

  it("N2: picks the field with the highest score", () => {
    const results: SchemeResult[] = [
      result("a", "needs_info", ["income"]),
      result("b", "needs_info", ["income", "community"]),
      result("c", "needs_info", ["income"]),
      result("d", "needs_info", ["gender"]),
    ];
    expect(nextQuestion(results)).toEqual({ field: "income", unlock_count: 3 });
  });

  it("N3: ties go to the field earlier in FIELD_ASK_ORDER", () => {
    const results: SchemeResult[] = [
      result("a", "needs_info", ["gender", "community"]),
      result("b", "needs_info", ["gender", "community"]),
    ];
    expect(nextQuestion(results)).toEqual({ field: "community", unlock_count: 2 });
  });

  it("N4: fields only in not_eligible results are not chosen", () => {
    const results: SchemeResult[] = [
      result("a", "needs_info", ["community"]),
      result("b", "not_eligible", ["income"]),
      result("c", "not_eligible", ["income"]),
    ];
    expect(nextQuestion(results)).toEqual({ field: "community", unlock_count: 1 });
  });
});
