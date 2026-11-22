import { describe, expect, it } from "vitest";
import { ConditionSchema, IncomeSchema, ProfileSchema, SchemeSchema } from "../lib/engine/schemas";

const validScheme = {
  id: "pudhumai-penn",
  name: { en: "Pudhumai Penn", ta: "புதுமைப் பெண்" },
  level: "state",
  states: ["TN"],
  segment: "college",
  department: "Social Welfare & Women Empowerment Dept, Govt of Tamil Nadu",
  benefit: { en: "₹1,000 every month until you finish your course", ta: "..." },
  conditions: [
    {
      label: { en: "Girl student", ta: "மாணவி" },
      field: "gender",
      op: "in",
      value: ["female"],
    },
    {
      label: { en: "Now in a college course", ta: "..." },
      any: [{ field: "education_level", op: "in", value: ["ug", "diploma", "iti"] }],
    },
    {
      label: { en: "Confirm your college is on the scheme list", ta: "..." },
      manual: true,
    },
  ],
  documents: [{ en: "Transfer Certificate", ta: "..." }],
  apply: {
    mode: "online",
    portal_url: "https://example.gov.in/apply",
    steps: [{ en: "Register on the portal", ta: "..." }],
  },
  deadline: {
    status: "open",
    closes_on: "2026-11-25",
    note: { en: "2026-27 applications close 25 Nov 2026", ta: "..." },
  },
  sources: ["https://example.gov.in/scheme"],
  last_verified: "2026-11-21",
  confidence: "high",
};

describe("ProfileSchema", () => {
  it("strips unknown key aadhaar", () => {
    const out = ProfileSchema.parse({ state: "TN", aadhaar: "123412341234" });
    expect(Object.keys(out)).not.toContain("aadhaar");
    expect(out.state).toBe("TN");
  });

  it("rejects community OBC", () => {
    expect(ProfileSchema.safeParse({ community: "OBC" }).success).toBe(false);
  });
});

describe("IncomeSchema", () => {
  it("accepts { min: 0, max: null }", () => {
    expect(IncomeSchema.safeParse({ min: 0, max: null }).success).toBe(true);
  });
});

describe("SchemeSchema", () => {
  it("accepts a small valid scheme with an any-group", () => {
    expect(SchemeSchema.safeParse(validScheme).success).toBe(true);
  });

  it("rejects a top-level condition without a label", () => {
    const bad = {
      ...validScheme,
      conditions: [{ field: "gender", op: "in", value: ["female"] }],
    };
    expect(SchemeSchema.safeParse(bad).success).toBe(false);
  });

  it.each(["My Scheme!", "a/b", "a".repeat(70)])("rejects bad id %s", (id) => {
    expect(SchemeSchema.safeParse({ ...validScheme, id }).success).toBe(false);
  });

  it("accepts a clean slug id", () => {
    expect(SchemeSchema.safeParse({ ...validScheme, id: "tn-scholarship-2026" }).success).toBe(true);
  });

  it.each(["tn", "Tamil Nadu"])("rejects bad state %s", (state) => {
    expect(SchemeSchema.safeParse({ ...validScheme, states: [state] }).success).toBe(false);
  });

  it.each(["TN", "ALL"])("accepts state %s", (state) => {
    expect(SchemeSchema.safeParse({ ...validScheme, states: [state] }).success).toBe(true);
  });

  it.each(["2026-13-45", "2026-02-30"])("rejects impossible last_verified %s", (date) => {
    expect(SchemeSchema.safeParse({ ...validScheme, last_verified: date }).success).toBe(false);
  });

  it("accepts leap day 2026-02-28 as last_verified", () => {
    expect(SchemeSchema.safeParse({ ...validScheme, last_verified: "2026-02-28" }).success).toBe(true);
  });

  it("rejects status open without closes_on", () => {
    const deadline = { ...validScheme.deadline, closes_on: null };
    expect(SchemeSchema.safeParse({ ...validScheme, deadline }).success).toBe(false);
  });

  it("rejects status unknown with closes_on", () => {
    const deadline = { ...validScheme.deadline, status: "unknown" };
    expect(SchemeSchema.safeParse({ ...validScheme, deadline }).success).toBe(false);
  });
});

describe("ConditionSchema", () => {
  it("accepts a nested leaf inside an all-group", () => {
    const c = { all: [{ field: "age", op: "gte", value: 18 }] };
    expect(ConditionSchema.safeParse(c).success).toBe(true);
  });
});
