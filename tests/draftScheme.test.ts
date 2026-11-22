import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateJson } from "../lib/llm/gemini";
import { draftScheme } from "../lib/llm/draftScheme";

vi.mock("../lib/llm/gemini", () => ({
  generateJson: vi.fn(),
}));

const mockedGenerate = vi.mocked(generateJson);

function validDraft(): Record<string, unknown> {
  return {
    id: "test-scheme",
    name: { en: "Test Scheme", ta: "சோதனைத் திட்டம்" },
    level: "state",
    states: ["TN"],
    segment: "college",
    department: "Test Department",
    benefit: { en: "Monthly help", ta: "மாதாந்திர உதவி" },
    conditions: [
      {
        label: { en: "Girl student", ta: "மாணவி" },
        field: "gender",
        op: "in",
        value: ["female"],
      },
    ],
    documents: [{ en: "Marksheet", ta: "மதிப்பெண் பட்டியல்" }],
    apply: {
      mode: "online",
      portal_url: "https://example.gov.in/apply",
      steps: [{ en: "Open the portal", ta: "இணையதளத்தைத் திறக்கவும்" }],
    },
    deadline: {
      status: "open",
      closes_on: "2026-11-25",
      note: { en: "Closes 25 Nov", ta: "நவம்பர் 25 கடைசி" },
    },
    sources: ["https://example.gov.in/scheme"],
    last_verified: "2026-11-21",
    confidence: "high",
  };
}

const INPUT = {
  text: "x".repeat(60),
  source_url: "https://example.gov.in/scheme",
  today: "2026-11-21",
};

describe("draftScheme", () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
  });

  it("drops an invalid condition field and warns", async () => {
    const draft = validDraft();
    draft.conditions = [
      {
        label: { en: "Girl student", ta: "மாணவி" },
        field: "gender",
        op: "in",
        value: ["female"],
      },
      {
        label: { en: "Bad rule", ta: "தவறான விதி" },
        field: "not_a_field",
        op: "in",
        value: ["x"],
      },
    ];
    mockedGenerate.mockResolvedValueOnce(draft);

    const result = await draftScheme(INPUT);

    expect(result.draft).not.toBeNull();
    expect(result.draft?.conditions).toHaveLength(1);
    expect(result.warnings.some((w) => /Dropped condition 2/.test(w))).toBe(true);
  });

  it("passes a valid draft with no warnings", async () => {
    mockedGenerate.mockResolvedValueOnce(validDraft());

    const result = await draftScheme(INPUT);

    expect(result.draft?.id).toBe("test-scheme");
    expect(result.warnings).toEqual([]);
    expect(mockedGenerate).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 30000 }));
  });

  it("warns when Tamil text is missing", async () => {
    const draft = validDraft();
    draft.benefit = { en: "Monthly help", ta: "" };
    mockedGenerate.mockResolvedValueOnce(draft);

    const result = await draftScheme(INPUT);

    expect(result.warnings.some((w) => /Missing Tamil text: benefit/.test(w))).toBe(true);
    expect(result.warnings).toContain("needs manual fixing");
  });
});
