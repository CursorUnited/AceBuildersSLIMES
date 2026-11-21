import { describe, expect, it } from "vitest";
import { incomeFromBand, incomeLabel, mergeProfile } from "../lib/engine/profile";
import type { Profile } from "../lib/engine/types";

describe("mergeProfile", () => {
  it("P1: a new field is added and listed in changed_fields", () => {
    const old: Profile = { gender: "female" };
    const { profile, changed_fields } = mergeProfile(old, { state: "TN" });
    expect(profile.state).toBe("TN");
    expect(changed_fields).toContain("state");
  });

  it("P2: same value is not changed", () => {
    const old: Profile = { gender: "female" };
    const { changed_fields } = mergeProfile(old, { gender: "female" });
    expect(changed_fields).toEqual([]);
  });

  it("P3: a corrected value replaces the old one and is changed", () => {
    const old: Profile = { education_level: "class_9" };
    const { profile, changed_fields } = mergeProfile(old, { education_level: "class_10" });
    expect(profile.education_level).toBe("class_10");
    expect(changed_fields).toContain("education_level");
  });

  it("P4: an invalid enum value (community OBC) is dropped", () => {
    const old: Profile = {};
    const { profile, changed_fields } = mergeProfile(old, { community: "OBC" });
    expect(profile.community).toBeUndefined();
    expect(changed_fields).toEqual([]);
  });

  it("P5: a non-profile key (aadhaar) is dropped", () => {
    const old: Profile = {};
    const { profile, changed_fields } = mergeProfile(old, { aadhaar: "1234 5678 9012" });
    expect("aadhaar" in profile).toBe(false);
    expect(changed_fields).toEqual([]);
  });
});

describe("incomeFromBand", () => {
  it("P6: lowest band maps to { min: 0, max: 100000 }", () => {
    expect(incomeFromBand("below_1_lakh")).toEqual({ min: 0, max: 100000 });
  });
});

describe("incomeLabel", () => {
  it("returns the matching band label in the requested language", () => {
    expect(incomeLabel({ min: 0, max: 100000 }, "en")).toBe("Below ₹1 lakh");
  });

  it("formats a non-matching income as ₹ en-IN", () => {
    expect(incomeLabel({ min: 80000, max: 80000 }, "en")).toBe("₹80,000");
  });
});
