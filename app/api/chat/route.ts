// POST /api/chat. SERVER ONLY. Contract: docs/CONTRACTS.md §3.1 (shape) and §4 (error codes).
// Never logs message text. Gemini only extracts facts; code decides eligibility and the next question.
import { z } from "zod";
import {
  FIELD_ASK_ORDER,
  ProfileSchema,
  evaluateAll,
  mergeProfile,
  nextQuestion,
  type Profile,
  type SchemeStatus,
} from "../../../lib/engine";
import { getPublished } from "../../../lib/data/schemesRepo";
import { extractFacts, type Register } from "../../../lib/llm/extract";
import { AiError } from "../../../lib/llm/gemini";
import { questionFor } from "../../../lib/i18n/questions";

const BodySchema = z.object({
  message: z.string().max(1000),
  profile: z.unknown(),
  asked_field: z.enum(FIELD_ASK_ORDER).nullable().optional(),
  ui_lang: z.enum(["ta", "en"]),
});

type ErrorCode = "BAD_REQUEST" | "AI_UNAVAILABLE" | "INTERNAL";

function fail(status: number, code: ErrorCode, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

/** Keeps every profile key that passes its own schema; drops the rest. Never throws. */
function parseProfileLenient(raw: unknown): Profile {
  const out: Profile = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const src = raw as Record<string, unknown>;
  for (const field of FIELD_ASK_ORDER) {
    const value = src[field];
    if (value === undefined) continue;
    const check = ProfileSchema.safeParse({ [field]: value });
    if (!check.success) continue;
    const next: unknown = (check.data as Record<string, unknown>)[field];
    if (next !== undefined) Object.assign(out, { [field]: next });
  }
  return out;
}

/** Today in India as "YYYY-MM-DD, Weekday" for the extraction prompt. */
function istToday(now: Date = new Date()): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(now);
  return `${date}, ${weekday}`;
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail(400, "BAD_REQUEST", "Request body must be JSON.");
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return fail(400, "BAD_REQUEST", "Invalid request body.");
  const body = parsed.data;

  const profile = parseProfileLenient(body.profile);
  const message = body.message.trim();

  let updates: Partial<Profile> = {};
  let side_answer: string | null = null;
  let register: Register = body.ui_lang;
  if (message !== "") {
    try {
      const facts = await extractFacts({
        message,
        profile,
        asked_field: body.asked_field ?? null,
        today: istToday(),
      });
      updates = facts.updates;
      side_answer = facts.side_answer;
      register = facts.register;
    } catch (err) {
      if (err instanceof AiError) return fail(503, "AI_UNAVAILABLE", "AI service is unavailable.");
      return fail(500, "INTERNAL", "Could not process the message.");
    }
  }

  const { profile: merged, changed_fields } = mergeProfile(profile, updates);

  let results: ReturnType<typeof evaluateAll>;
  try {
    results = evaluateAll(merged, await getPublished());
  } catch {
    return fail(500, "INTERNAL", "Could not load schemes.");
  }

  const nq = nextQuestion(results);
  let next_question: {
    field: string;
    text: string;
    chips: { label: string; value: unknown }[];
    unlock_count: number;
  } | null = null;
  if (nq) {
    const q = questionFor(nq.field, register, nq.unlock_count);
    next_question = {
      field: nq.field,
      text: q.text,
      // Contract §3.1 shows chip labels as plain strings in the student's language.
      chips: q.chips.map((c) => ({ label: register === "ta" ? c.label.ta : c.label.en, value: c.value })),
      unlock_count: nq.unlock_count,
    };
  }

  const summary: Record<SchemeStatus, number> = { likely_eligible: 0, needs_info: 0, not_eligible: 0 };
  for (const r of results) summary[r.status] += 1;

  return Response.json({
    profile: merged,
    changed_fields,
    side_answer,
    register,
    next_question,
    summary,
  });
}
