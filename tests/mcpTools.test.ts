// MCP tool functions against the local seed data (no Supabase env -> data/schemes.seed.json). No network.
import { describe, expect, it } from "vitest";
import { documentChecklist, getScheme, matchSchemes, nextQuestionTool } from "../lib/mcpTools";

const kavya = {
  state: "TN",
  education_level: "ug",
  year_of_study: 1,
  course_type: "engineering",
  aicte_approved: true,
  institution_type: "govt",
  gender: "female",
  community: "SC",
  religion: "hindu",
  income: { min: 0, max: 100000 },
  school_6_to_12: "govt_all",
  first_graduate: true,
  admission_route: "govt_school_7_5_quota",
  disability_percent: 0,
};

describe("matchSchemes", () => {
  it("marks pudhumai-penn likely_eligible for Kavya", async () => {
    const results = await matchSchemes(kavya);
    expect(results).toContainEqual(expect.objectContaining({ id: "pudhumai-penn", status: "likely_eligible" }));
  });
});

describe("nextQuestionTool", () => {
  it("returns a question field for an empty profile", async () => {
    const q = await nextQuestionTool({});
    expect(q).not.toBeNull();
    expect(typeof q?.field).toBe("string");
  });
});

describe("getScheme", () => {
  it("returns the Tamil name for pudhumai-penn in ta", async () => {
    const s = await getScheme("pudhumai-penn", "ta");
    expect(s).not.toBeNull();
    expect(s?.name).toBe("புதுமைப் பெண் திட்டம்");
  });

  it("returns null for an unknown id", async () => {
    expect(await getScheme("unknown-id", "en")).toBeNull();
  });
});

describe("documentChecklist", () => {
  it("returns null for an unknown scheme", async () => {
    expect(await documentChecklist("unknown-id", kavya)).toBeNull();
  });
});
