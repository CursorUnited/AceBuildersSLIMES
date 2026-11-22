// MCP tool implementations. Plain async functions, no MCP SDK imports.
// Server only (reads scheme data). Never log the profile or any tool input.
import { filterDocuments } from "@/lib/engine/documents";
import { evaluateAll } from "@/lib/engine/evaluate";
import { nextQuestion } from "@/lib/engine/nextQuestion";
import { ProfileSchema } from "@/lib/engine/schemas";
import type { Profile, ProfileField, Scheme, SchemeStatus } from "@/lib/engine/types";
import { getPublished, getPublishedById } from "@/lib/data/schemesRepo";
import { QUESTIONS } from "@/lib/i18n/questions";

export type Lang = "en" | "ta";

export interface MatchResult {
  id: string;
  name_en: string;
  name_ta: string;
  status: SchemeStatus;
  benefit_en: string;
  deadline_status: Scheme["deadline"]["status"];
  reasons: { label_en: string; result: string }[];
}

/**
 * Lenient profile parse. Each top-level key is checked on its own against ProfileSchema;
 * invalid and unknown keys are dropped. Never throws. Non-object input gives {}.
 */
export function parseProfileLenient(input: unknown): Profile {
  const out: Profile = {};
  if (typeof input !== "object" || input === null || Array.isArray(input)) return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const parsed = ProfileSchema.safeParse({ [key]: value });
    if (parsed.success) Object.assign(out, parsed.data);
  }
  return out;
}

/** Evaluates all published schemes for the profile. Results are "likely eligible", never guaranteed. */
export async function matchSchemes(input: unknown): Promise<MatchResult[]> {
  const profile = parseProfileLenient(input);
  const schemes = await getPublished();
  const byId = new Map<string, Scheme>(schemes.map((s): [string, Scheme] => [s.id, s]));
  const out: MatchResult[] = [];
  for (const r of evaluateAll(profile, schemes)) {
    const s = byId.get(r.scheme_id);
    if (s === undefined) continue;
    out.push({
      id: s.id,
      name_en: s.name.en,
      name_ta: s.name.ta,
      status: r.status,
      benefit_en: s.benefit.en,
      deadline_status: s.deadline.status,
      reasons: r.reasons.map((x) => ({ label_en: x.label.en, result: x.result })),
    });
  }
  return out;
}

/** Next profile field to ask about, or null when no scheme needs more info. */
export async function nextQuestionTool(
  input: unknown,
): Promise<{ field: ProfileField; question_en: string; unlock_count: number } | null> {
  const profile = parseProfileLenient(input);
  const schemes = await getPublished();
  const next = nextQuestion(evaluateAll(profile, schemes));
  if (next === null) return null;
  return {
    field: next.field,
    question_en: QUESTIONS[next.field].en,
    unlock_count: next.unlock_count,
  };
}

/** One scheme with every Localized value resolved to the chosen language. */
export async function getScheme(id: string, lang: Lang) {
  const s = await getPublishedById(id);
  if (s === null) return null;
  return {
    id: s.id,
    name: s.name[lang],
    benefit: s.benefit[lang],
    apply: {
      mode: s.apply.mode,
      portal_url: s.apply.portal_url,
      steps: s.apply.steps.map((step) => step[lang]),
    },
    documents: s.documents.map((d) => d[lang]),
    deadline: {
      status: s.deadline.status,
      closes_on: s.deadline.closes_on,
      note: s.deadline.note[lang],
    },
    sources: s.sources,
    last_verified: s.last_verified,
  };
}

/** Documents for a scheme after only_if filtering, for this profile. */
export async function documentChecklist(scheme_id: string, input: unknown) {
  const s = await getPublishedById(scheme_id);
  if (s === null) return null;
  const profile = parseProfileLenient(input);
  return filterDocuments(s, profile).map((d) => ({
    text_en: d.text.en,
    text_ta: d.text.ta,
    if_applicable: d.if_applicable,
  }));
}
