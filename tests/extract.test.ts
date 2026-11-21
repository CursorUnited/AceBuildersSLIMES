import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Profile } from "../lib/engine/types";
import { extractFacts } from "../lib/llm/extract";
import { generateJson } from "../lib/llm/gemini";

// No network: generateJson is mocked. AiError is stubbed as a plain Error subclass.
vi.mock("../lib/llm/gemini", () => ({
  generateJson: vi.fn(),
  AiError: class extends Error {},
}));

// Empty profile; cast is needed because a real Profile has required keys.
const EMPTY_PROFILE = {} as Profile;

function args() {
  return {
    message: "test",
    profile: EMPTY_PROFILE,
    asked_field: null,
    today: "2025-01-01",
  };
}

// Mock typed via vi.mocked so no `any` is needed.
const mockedGenerateJson = vi.mocked(generateJson);

describe("extractFacts", () => {
  beforeEach(() => {
    mockedGenerateJson.mockReset();
  });

  it("drops invalid enum value for gender", async () => {
    mockedGenerateJson.mockResolvedValue({
      updates: { gender: "martian" },
      ambiguous: [],
      side_answer: null,
      register: "en",
    });
    const result = await extractFacts(args());
    expect(result.updates).not.toHaveProperty("gender");
  });

  it("keeps a valid gender enum (positive control)", async () => {
    mockedGenerateJson.mockResolvedValue({
      updates: { gender: "female" },
      ambiguous: [],
      side_answer: null,
      register: "en",
    });
    const result = await extractFacts(args());
    expect(result.updates).toHaveProperty("gender", "female");
  });

  it("drops unknown keys", async () => {
    mockedGenerateJson.mockResolvedValue({
      updates: { favourite_colour: "blue" },
      ambiguous: [],
      side_answer: null,
      register: "en",
    });
    const result = await extractFacts(args());
    expect(result.updates).not.toHaveProperty("favourite_colour");
  });

  it("defaults register to en when missing", async () => {
    mockedGenerateJson.mockResolvedValue({
      updates: {},
      ambiguous: [],
      side_answer: null,
    });
    const result = await extractFacts(args());
    expect(result.register).toBe("en");
  });

  it("passes side_answer through", async () => {
    mockedGenerateJson.mockResolvedValue({
      updates: {},
      ambiguous: [],
      side_answer: "Ok, noted.",
      register: "en",
    });
    const result = await extractFacts(args());
    expect(result.side_answer).toBe("Ok, noted.");
  });
});
