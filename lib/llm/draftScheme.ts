// Server only. Turns pasted official scheme text into a draft Scheme via Gemini.
// Nothing is saved here; the admin reviews the draft in SchemeEditor.
import { z } from "zod";
import { generateJson } from "./gemini";
import { ENUMS, FIELD_ASK_ORDER } from "../engine/fields";
import { SchemeSchema } from "../engine/schemas";

export type SchemeData = z.infer<typeof SchemeSchema>;

export interface DraftResult {
  /** null only when the model output could not be repaired into a valid scheme. */
  draft: SchemeData | null;
  warnings: string[];
}

const DRAFT_TIMEOUT_MS = 30000;
const NEEDS_MANUAL = "needs manual fixing";

const NUMERIC_FIELDS =
  "year_of_study (integer 1-6), disability_percent (0-100), last_exam_percent (0-100), age (integer), income ({min, max} rupees per year, max may be null; use lte/gte)";

const SCHEME_EXAMPLE = `{
  "id": "pudhumai-penn",
  "name": { "en": "Pudhumai Penn", "ta": "புதுமைப் பெண்" },
  "level": "state",
  "states": ["TN"],
  "segment": "college",
  "department": "Social Welfare & Women Empowerment Dept, Govt of Tamil Nadu",
  "benefit": { "en": "₹1,000 every month until you finish your course", "ta": "..." },
  "conditions": [
    { "label": { "en": "Girl student", "ta": "மாணவி" }, "field": "gender", "op": "in", "value": ["female"] },
    { "label": { "en": "Studied Class 6-12 in a government school", "ta": "..." }, "field": "school_6_to_12", "op": "in", "value": ["govt_all", "govt_aided_tamil_all"] },
    { "label": { "en": "Now in a college course", "ta": "..." }, "any": [ { "field": "education_level", "op": "in", "value": ["ug", "diploma", "iti"] } ] },
    { "label": { "en": "Confirm your college is on the scheme list", "ta": "..." }, "manual": true }
  ],
  "documents": [
    { "en": "Class 6-12 school records / Transfer Certificate", "ta": "..." },
    { "en": "Community certificate", "ta": "...", "only_if": { "field": "community", "op": "in", "value": ["SC", "ST"] } }
  ],
  "apply": { "mode": "online", "portal_url": "https://...", "steps": [ { "en": "...", "ta": "..." } ] },
  "deadline": { "status": "open", "closes_on": "2026-11-25", "note": { "en": "2026-27 applications close 25 Nov 2026", "ta": "..." } },
  "sources": ["https://...official page..."],
  "last_verified": "2026-11-21",
  "confidence": "high",
  "notes": "Anything uncertain, in plain English, for the admin only."
}`;

const SYSTEM_PROMPT = [
  "Turn this official government scheme text into JSON matching the schema below.",
  "Use ONLY facts in the text; never invent amounts, dates or rules.",
  `Conditions may only use these fields and enum values. Fields: ${FIELD_ASK_ORDER.join(", ")}. Enum values: ${JSON.stringify(ENUMS)}. Numeric fields: ${NUMERIC_FIELDS}. Operators: in, not_in, eq, lte, gte. Use "any" and "all" groups for OR and AND.`,
  'Anything the app cannot check becomes { "label": {"en", "ta"}, "manual": true }.',
  "Unknown amounts or dates: leave them out and explain in notes; set confidence to 'low' if unsure.",
  "Write simple Tamil (ta) for every label, benefit and step that a Class 9 student can read.",
  "sources = [source_url]. last_verified = today. id = a short lowercase-hyphen slug of the English name.",
  "Every student-facing text is { en, ta }. Output JSON only.",
  "Schema example:",
  SCHEME_EXAMPLE,
].join("\n");

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function rec(v: unknown): Record<string, unknown> | undefined {
  return isRecord(v) ? v : undefined;
}

function asList(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

/** Warns for every localized text whose Tamil part is empty or missing. */
function scanTamil(work: Record<string, unknown>, warnings: string[]): void {
  const check = (value: unknown, where: string): void => {
    const ta = rec(value)?.ta;
    if (typeof ta !== "string" || ta.trim() === "") warnings.push(`Missing Tamil text: ${where}.`);
  };
  check(work.name, "name");
  check(work.benefit, "benefit");
  check(rec(work.deadline)?.note, "deadline note");
  (asList(rec(work.apply)?.steps) ?? []).forEach((s, i) => check(s, `apply step ${i + 1}`));
  (asList(work.conditions) ?? []).forEach((c, i) => {
    const label = rec(c)?.label;
    if (label !== undefined) check(label, `condition ${i + 1} label`);
  });
  (asList(work.documents) ?? []).forEach((d, i) => check(d, `document ${i + 1}`));
}

/** Removes one invalid conditions/documents item. Returns false when nothing could be dropped. */
function dropOneInvalid(
  work: Record<string, unknown>,
  issues: z.ZodError["issues"],
  warnings: string[],
): boolean {
  for (const issue of issues) {
    const key = issue.path[0];
    const index = issue.path[1];
    if ((key === "conditions" || key === "documents") && typeof index === "number") {
      const list = asList(work[key]);
      if (list === null) return false;
      const kind = key === "conditions" ? "condition" : "document";
      const detail = issue.path.slice(2).join(".") || "invalid";
      list.splice(index, 1);
      warnings.push(`Dropped ${kind} ${index + 1}: ${detail} (${issue.message}).`);
      return true;
    }
  }

  // A top-level condition without a label fails the schema's refine check.
  if (issues.some((i) => i.path.length === 1 && i.path[0] === "conditions")) {
    const list = asList(work.conditions);
    if (list === null) return false;
    const idx = list.findIndex((c) => rec(c)?.label === undefined);
    if (idx < 0) return false;
    list.splice(idx, 1);
    warnings.push(`Dropped condition ${idx + 1}: no label.`);
    return true;
  }
  return false;
}

/** Validates; drops invalid conditions/documents one at a time until the scheme passes or nothing else can go. */
function repairDraft(work: Record<string, unknown>, warnings: string[]): SchemeData | null {
  // Every pass either returns or removes one item, so this loop terminates.
  for (;;) {
    const parsed = SchemeSchema.safeParse(work);
    if (parsed.success) return parsed.data;
    if (!dropOneInvalid(work, parsed.error.issues, warnings)) return null;
  }
}

function addQualityWarnings(d: SchemeData, warnings: string[]): void {
  if (d.deadline.status === "unknown") warnings.push("Deadline status unknown: check the official page.");
  if (d.confidence === "low") warnings.push("Confidence is low: check every field against the official page.");
  if (d.conditions.length === 0) warnings.push("No conditions left: check the scheme's eligibility rules.");
}

export async function draftScheme(input: {
  text: string;
  source_url: string;
  today: string;
}): Promise<DraftResult> {
  const raw = await generateJson({
    system: SYSTEM_PROMPT,
    user: `Official page text:\n${input.text}\n\nsource_url: ${input.source_url}\ntoday: ${input.today}`,
    timeoutMs: DRAFT_TIMEOUT_MS,
  });

  const warnings: string[] = [];
  const object = z.record(z.string(), z.unknown()).safeParse(raw);
  if (!object.success) {
    warnings.push(NEEDS_MANUAL);
    return { draft: null, warnings };
  }

  const work = object.data;
  // Enforced in code, not only by the prompt.
  work.sources = [input.source_url];
  work.last_verified = input.today;

  scanTamil(work, warnings);
  const data = repairDraft(work, warnings);
  if (data === null) {
    warnings.push(NEEDS_MANUAL);
    return { draft: null, warnings };
  }

  addQualityWarnings(data, warnings);
  return { draft: data, warnings };
}
