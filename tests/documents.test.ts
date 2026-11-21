import { describe, expect, it } from "vitest";
import { filterDocuments } from "../lib/engine/documents";
import type { Profile, Scheme } from "../lib/engine/types";

function makeScheme(documents: Scheme["documents"]): Scheme {
  return {
    id: "test-scheme",
    name: { en: "Test", ta: "சோதனை" },
    level: "state",
    states: ["TN"],
    segment: "school",
    department: "Test Dept",
    benefit: { en: "Benefit", ta: "பலன்" },
    conditions: [],
    documents,
    apply: { mode: "online", portal_url: null, steps: [] },
    deadline: { status: "open", closes_on: null, note: { en: "Open", ta: "திறந்துள்ளது" } },
    sources: ["https://example.gov.in"],
    last_verified: "2026-11-21",
    confidence: "high",
  };
}

const plainDoc: Scheme["documents"][number] = { en: "Transfer Certificate", ta: "மாற்றுச் சான்றிதழ்" };
const communityDoc: Scheme["documents"][number] = {
  en: "Community certificate",
  ta: "சமுதாயச் சான்றிதழ்",
  only_if: { field: "community", op: "in", value: ["SC", "ST"] },
};

describe("filterDocuments", () => {
  it("D1: document without only_if is shown", () => {
    const scheme = makeScheme([plainDoc]);
    const profile: Profile = {};
    expect(filterDocuments(scheme, profile)).toEqual([
      { text: { en: plainDoc.en, ta: plainDoc.ta }, if_applicable: false },
    ]);
  });

  it("D2: only_if passes -> shown", () => {
    const scheme = makeScheme([communityDoc]);
    const profile: Profile = { community: "SC" };
    expect(filterDocuments(scheme, profile)).toEqual([
      { text: { en: communityDoc.en, ta: communityDoc.ta }, if_applicable: false },
    ]);
  });

  it("D3: only_if fails -> hidden", () => {
    const scheme = makeScheme([plainDoc, communityDoc]);
    const profile: Profile = { community: "FC" };
    expect(filterDocuments(scheme, profile)).toEqual([
      { text: { en: plainDoc.en, ta: plainDoc.ta }, if_applicable: false },
    ]);
  });

  it("D4: only_if unknown -> shown with if_applicable true", () => {
    const scheme = makeScheme([communityDoc]);
    const profile: Profile = {};
    expect(filterDocuments(scheme, profile)).toEqual([
      { text: { en: communityDoc.en, ta: communityDoc.ta }, if_applicable: true },
    ]);
  });
});
