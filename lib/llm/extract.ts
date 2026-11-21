// Gemini fact extraction. Server-side only. Never logs the message or raw output.
import { z } from "zod";
import { FIELD_ASK_ORDER } from "../engine/fields";
import { ProfileSchema } from "../engine/schemas";
import type { Profile } from "../engine/types";
import { generateJson } from "./gemini";
import { buildExtractionPrompt } from "./prompts";

export type Register = "ta" | "en" | "tanglish";

export interface ExtractResult {
  updates: Partial<Profile>;
  evidence: Record<string, string>;
  ambiguous: { field: string; reason: string }[];
  side_answer: string | null;
  register: Register;
}

const REGISTERS: readonly Register[] = ["ta", "en", "tanglish"];

// Lenient outer shape: unknown keys are stripped, malformed sections are handled below.
const RawSchema = z.object({
  updates: z.record(z.string(), z.unknown()).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  ambiguous: z.array(z.unknown()).optional(),
  side_answer: z.unknown().optional(),
  register: z.unknown().optional(),
});

const AmbiguousItemSchema = z.object({ field: z.string(), reason: z.string() });

const PROFILE_FIELDS: ReadonlySet<string> = new Set<string>(FIELD_ASK_ORDER);

function cleanUpdates(raw: Record<string, unknown>): Partial<Profile> {
  const out: Partial<Profile> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!PROFILE_FIELDS.has(key) || value === undefined) continue;
    // Same per-field validator mergeProfile uses (lib/engine/profile.ts).
    const parsed = ProfileSchema.safeParse({ [key]: value });
    if (!parsed.success) continue;
    const next: unknown = (parsed.data as Record<string, unknown>)[key];
    if (next === undefined) continue;
    Object.assign(out, { [key]: next });
  }
  return out;
}

function cleanEvidence(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return out;
}

function cleanAmbiguous(raw: unknown[]): { field: string; reason: string }[] {
  const out: { field: string; reason: string }[] = [];
  for (const item of raw) {
    const parsed = AmbiguousItemSchema.safeParse(item);
    if (parsed.success) out.push({ field: parsed.data.field, reason: parsed.data.reason });
  }
  return out;
}

function cleanSideAnswer(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function cleanRegister(raw: unknown): Register {
  return typeof raw === "string" && (REGISTERS as readonly string[]).includes(raw)
    ? (raw as Register)
    : "en";
}

export async function extractFacts(args: {
  message: string;
  profile: Profile;
  asked_field: string | null;
  today: string;
  model?: string;
}): Promise<ExtractResult> {
  const p = buildExtractionPrompt({
    profile: args.profile,
    asked_field: args.asked_field,
    today: args.today,
  });
  // AiError from generateJson propagates unchanged.
  const raw: unknown = await generateJson({
    system: p.system,
    user: p.user(args.message),
    model: args.model,
  });

  const parsed = RawSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};

  return {
    updates: cleanUpdates(data.updates ?? {}),
    evidence: cleanEvidence(data.evidence ?? {}),
    ambiguous: cleanAmbiguous(data.ambiguous ?? []),
    side_answer: cleanSideAnswer(data.side_answer),
    register: cleanRegister(data.register),
  };
}
