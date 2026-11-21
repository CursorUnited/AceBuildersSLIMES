// Rule engine evaluation tests. Inline schemes and profiles only (no seed file, no network).
import { describe, expect, it } from "vitest";
import { evaluateAll, evaluateCondition, evaluateScheme } from "../lib/engine/evaluate";
import type { Condition, Profile, Scheme } from "../lib/engine/types";

const L = (en: string) => ({ en, ta: `${en} (ta)` });

/** Builds a leaf condition with a label. */
const leaf = (field: string, op: string, value: unknown) => ({ label: L(`${field} ${op}`), field, op, value });

/** Builds a scheme with only the fields the engine reads. Cast: the test scheme is partial by design. */
const makeScheme = (id: string, states: string[], conditions: unknown[]): Scheme =>
  ({ id, states, conditions }) as unknown as Scheme;

const profile = (p: Record<string, unknown>): Profile => p as Profile;

const cond = (c: unknown): Condition => c as Condition;

describe("evaluateCondition", () => {
  it("E1: in passes when value is in the list", () => {
    const r = evaluateCondition(cond(leaf("gender", "in", ["female"])), profile({ gender: "female" }));
    expect(r).toEqual({ result: "pass", missing: [] });
  });

  it("E3: leaf on a missing field is unknown and reports the field", () => {
    const r = evaluateCondition(cond(leaf("gender", "in", ["female"])), profile({}));
    expect(r).toEqual({ result: "unknown", missing: ["gender"] });
  });

  it("E3b: null counts as missing", () => {
    const r = evaluateCondition(cond(leaf("gender", "in", ["female"])), profile({ gender: null }));
    expect(r).toEqual({ result: "unknown", missing: ["gender"] });
  });

  it("E4: income {0,100000} lte 250000 passes", () => {
    const r = evaluateCondition(cond(leaf("income", "lte", 250000)), profile({ income: { min: 0, max: 100000 } }));
    expect(r.result).toBe("pass");
  });

  it("E5: income {200001,250000} lte 200000 fails", () => {
    const r = evaluateCondition(cond(leaf("income", "lte", 200000)), profile({ income: { min: 200001, max: 250000 } }));
    expect(r.result).toBe("fail");
  });

  it("E6: income {100001,350000} lte 250000 is unknown (range straddles), no missing field", () => {
    const r = evaluateCondition(cond(leaf("income", "lte", 250000)), profile({ income: { min: 100001, max: 350000 } }));
    expect(r).toEqual({ result: "unknown", missing: [] });
  });

  it("E7: income {800001,null} lte 800000 fails", () => {
    const r = evaluateCondition(cond(leaf("income", "lte", 800000)), profile({ income: { min: 800001, max: null } }));
    expect(r.result).toBe("fail");
  });

  it("E8: income {450001,800000} gte 500000 is unknown", () => {
    const r = evaluateCondition(cond(leaf("income", "gte", 500000)), profile({ income: { min: 450001, max: 800000 } }));
    expect(r.result).toBe("unknown");
  });

  it("E9: last_exam_percent 78 gte 50 passes", () => {
    const r = evaluateCondition(cond(leaf("last_exam_percent", "gte", 50)), profile({ last_exam_percent: 78 }));
    expect(r.result).toBe("pass");
  });

  it("E10: any(pass, unknown) passes", () => {
    const c = { any: [leaf("gender", "in", ["female"]), leaf("community", "in", ["SC"])] };
    const r = evaluateCondition(cond(c), profile({ gender: "female" }));
    expect(r).toEqual({ result: "pass", missing: [] });
  });

  it("E11: any(fail, unknown) is unknown and reports the unknown field", () => {
    const c = { any: [leaf("gender", "in", ["male"]), leaf("community", "in", ["SC"])] };
    const r = evaluateCondition(cond(c), profile({ gender: "female" }));
    expect(r).toEqual({ result: "unknown", missing: ["community"] });
  });

  it("E12: all(fail, unknown) fails", () => {
    const c = { all: [leaf("gender", "in", ["male"]), leaf("community", "in", ["SC"])] };
    const r = evaluateCondition(cond(c), profile({ gender: "female" }));
    expect(r).toEqual({ result: "fail", missing: [] });
  });

  it("manual is check and never missing", () => {
    const r = evaluateCondition(cond({ label: L("manual"), manual: true }), profile({}));
    expect(r).toEqual({ result: "check", missing: [] });
  });

  it("E17: first_graduate false, eq true fails", () => {
    const r = evaluateCondition(cond(leaf("first_graduate", "eq", true)), profile({ first_graduate: false }));
    expect(r.result).toBe("fail");
  });

  it("E18: not_in fails when value is listed, passes when not, unknown when missing", () => {
    const c = cond(leaf("community", "not_in", ["SC", "ST"]));
    expect(evaluateCondition(c, profile({ community: "SC" })).result).toBe("fail");
    expect(evaluateCondition(c, profile({ community: "BC" })).result).toBe("pass");
    expect(evaluateCondition(c, profile({}))).toEqual({ result: "unknown", missing: ["community"] });
  });
});

describe("evaluateScheme", () => {
  it("E1: in pass gives likely_eligible", () => {
    const s = makeScheme("g", ["ALL"], [leaf("gender", "in", ["female"])]);
    const r = evaluateScheme(profile({ gender: "female" }), s);
    expect(r.status).toBe("likely_eligible");
    expect(r.reasons).toEqual([{ label: L("gender in"), result: "pass" }]);
    expect(r.missing_fields).toEqual([]);
    expect(r.scheme_id).toBe("g");
  });

  it("E2: in fail gives not_eligible", () => {
    const s = makeScheme("g", ["ALL"], [leaf("gender", "in", ["female"])]);
    expect(evaluateScheme(profile({ gender: "male" }), s).status).toBe("not_eligible");
  });

  it("E3: missing field gives needs_info with missing_fields", () => {
    const s = makeScheme("g", ["ALL"], [leaf("gender", "in", ["female"])]);
    const r = evaluateScheme(profile({}), s);
    expect(r.status).toBe("needs_info");
    expect(r.missing_fields).toEqual(["gender"]);
    expect(r.reasons).toEqual([{ label: L("gender in"), result: "unknown" }]);
  });

  it("E13: manual only gives likely_eligible with a check reason", () => {
    const s = makeScheme("m", ["ALL"], [{ label: L("Confirm college"), manual: true }]);
    const r = evaluateScheme(profile({}), s);
    expect(r.status).toBe("likely_eligible");
    expect(r.reasons).toEqual([{ label: L("Confirm college"), result: "check" }]);
  });

  it("E14: states [TN] with state KA gives not_eligible", () => {
    const s = makeScheme("tn", ["TN"], [leaf("gender", "in", ["female"])]);
    const r = evaluateScheme(profile({ state: "KA", gender: "female" }), s);
    expect(r.status).toBe("not_eligible");
  });

  it("E15: states [TN] with no state gives needs_info with state missing", () => {
    const s = makeScheme("tn", ["TN"], [leaf("gender", "in", ["female"])]);
    const r = evaluateScheme(profile({ gender: "female" }), s);
    expect(r.status).toBe("needs_info");
    expect(r.missing_fields).toEqual(["state"]);
    expect(r.reasons[0]).toEqual({
      label: { en: "Lives in Tamil Nadu", ta: expect.any(String) },
      result: "unknown",
    });
  });

  it("E16: states [ALL] never asks for state", () => {
    const s = makeScheme("all", ["ALL"], [leaf("gender", "in", ["female"])]);
    const r = evaluateScheme(profile({}), s);
    expect(r.missing_fields).toEqual(["gender"]);
    expect(r.reasons).toHaveLength(1);
  });

  it("E19: missing_fields are unique and in FIELD_ASK_ORDER", () => {
    const s = makeScheme("o", ["ALL"], [
      leaf("rural", "eq", true),
      leaf("community", "in", ["SC"]),
      leaf("income", "lte", 100000),
      leaf("education_level", "in", ["ug"]),
      leaf("community", "in", ["BC"]),
    ]);
    const r = evaluateScheme(profile({}), s);
    expect(r.missing_fields).toEqual(["education_level", "income", "community", "rural"]);
  });
});

describe("evaluateAll", () => {
  it("E20: sorts likely_eligible, then needs_info, then not_eligible, stable inside groups", () => {
    const needsA = makeScheme("needs-a", ["ALL"], [leaf("community", "in", ["SC"])]);
    const bad = makeScheme("bad", ["ALL"], [leaf("gender", "in", ["male"])]);
    const good = makeScheme("good", ["ALL"], [{ label: L("manual"), manual: true }]);
    const needsB = makeScheme("needs-b", ["ALL"], [leaf("income", "lte", 100000)]);
    const out = evaluateAll(profile({ gender: "female" }), [needsA, bad, good, needsB]);
    expect(out.map((r) => r.scheme_id)).toEqual(["good", "needs-a", "needs-b", "bad"]);
    expect(out.map((r) => r.status)).toEqual(["likely_eligible", "needs_info", "needs_info", "not_eligible"]);
  });
});
