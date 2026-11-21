// Question template checks. No network. Source: docs/CONTRACTS.md §1.
import { describe, expect, it } from "vitest";
import { ENUMS, FIELD_ASK_ORDER, INCOME_BANDS } from "../lib/engine/fields";
import { QUESTIONS } from "../lib/i18n/questions";

describe("QUESTIONS templates", () => {
  it("has a non-empty ta, en and tanglish question for every field in FIELD_ASK_ORDER", () => {
    for (const field of FIELD_ASK_ORDER) {
      const q = QUESTIONS[field];
      expect(q, field).toBeDefined();
      expect(q.ta.trim().length, `${field}.ta`).toBeGreaterThan(0);
      expect(q.en.trim().length, `${field}.en`).toBeGreaterThan(0);
      expect(q.tanglish.trim().length, `${field}.tanglish`).toBeGreaterThan(0);
    }
  });

  it("gives every chip a non-empty en and ta label", () => {
    for (const field of FIELD_ASK_ORDER) {
      for (const c of QUESTIONS[field].chips) {
        expect(c.label.en.trim().length, `${field} chip en`).toBeGreaterThan(0);
        expect(c.label.ta.trim().length, `${field} chip ta`).toBeGreaterThan(0);
      }
    }
  });

  it("covers every enum value with a chip for each enum field", () => {
    for (const field of Object.keys(ENUMS) as (keyof typeof ENUMS)[]) {
      const values = QUESTIONS[field].chips.map((c) => c.value);
      expect([...values].sort(), field).toEqual([...(ENUMS[field] as readonly string[])].sort());
    }
  });

  it("income chips use the INCOME_BANDS values", () => {
    expect(QUESTIONS.income.chips.map((c) => c.value)).toEqual(INCOME_BANDS.map((b) => b.value));
  });
});
