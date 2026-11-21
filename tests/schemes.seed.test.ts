// Seed data checks. No network. Source: data/schemes.seed.json, lib/engine/schemas.ts.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SchemeSchema } from "../lib/engine/schemas";

const raw: unknown = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "schemes.seed.json"), "utf8"),
);
const items: unknown[] = Array.isArray(raw) ? raw : [];

describe("schemes.seed.json", () => {
  it("S1 every item parses with SchemeSchema", () => {
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const r = SchemeSchema.safeParse(item);
      expect(r.success, JSON.stringify(r.success ? "" : r.error.issues)).toBe(true);
    }
  });

  it("S2 every top-level condition has label.en and label.ta", () => {
    for (const item of items) {
      const s = SchemeSchema.parse(item);
      for (const c of s.conditions) {
        expect(c.label?.en, `${s.id}: en`).toBeTruthy();
        expect(c.label?.ta, `${s.id}: ta`).toBeTruthy();
      }
    }
  });

  it("S3 ids are unique", () => {
    const ids = items.map((item) => SchemeSchema.parse(item).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("S4 each item has at least one https source and a last_verified date", () => {
    for (const item of items) {
      const s = SchemeSchema.parse(item);
      expect(s.sources.some((u) => u.startsWith("https://")), `${s.id}: https source`).toBe(true);
      expect(s.last_verified, `${s.id}: last_verified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
