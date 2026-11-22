// Eval runner for eval/slang_testset.json. Server-side tooling only.
// Run: npx tsx --env-file=.env.local eval/run-eval.ts [--only=T01,T07]
// Never prints message bodies or raw model output.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { extractFacts, type ExtractResult } from "../lib/llm/extract";
import { AiError } from "../lib/llm/gemini";
import type { Profile } from "../lib/engine/types";

const CaseSchema = z.object({
  id: z.string(),
  message: z.string(),
  asked_field: z.string().nullable().optional(),
  expect: z.object({
    updates: z.record(z.string(), z.unknown()).optional(),
    must_not_set: z.array(z.string()).optional(),
    side_answer: z.boolean().optional(),
    register: z.string().optional(),
  }),
  profile_before: z.record(z.string(), z.unknown()).optional(),
});
type Case = z.infer<typeof CaseSchema>;

interface CaseResult {
  id: string;
  pass: boolean;
  problems: string[];
  model: string;
}

interface Score {
  problems: string[];
  matched: number;
  violations: number;
}

const TESTSET = path.resolve(process.cwd(), "eval", "slang_testset.json");
const LAST_RUN = path.resolve(process.cwd(), "eval", "last-run.json");
const RATE_LIMIT_WAIT_MS = 60_000;
const TIMEOUT_RETRY_WAIT_MS = 3_000;
const DEFAULT_DELAY_MS = 13_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Current IST calendar date as YYYY-MM-DD.
function istToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(
    (k) =>
      hasOwn(b, k) &&
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

type Outcome = { ok: true; result: ExtractResult } | { ok: false; code: string };

// One case, with a single retry on TIMEOUT (3 s wait) or UNAVAILABLE (60 s wait, rate limit). Error message bodies are never read.
async function runCase(c: Case, model: string): Promise<Outcome> {
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await extractFacts({
        message: c.message,
        profile: (c.profile_before ?? {}) as Profile, // from the case's profile_before (empty when absent)
        asked_field: c.asked_field ?? null,
        today: istToday(),
        model,
      });
      return { ok: true, result };
    } catch (err) {
      const code = err instanceof AiError ? err.code : "UNKNOWN";
      if (code === "UNAVAILABLE" && attempt === 1) {
        await sleep(RATE_LIMIT_WAIT_MS);
        continue;
      }
      if (code === "TIMEOUT" && attempt === 1) {
        await sleep(TIMEOUT_RETRY_WAIT_MS);
        continue;
      }
      return { ok: false, code };
    }
  }
}

function scoreCase(c: Case, res: ExtractResult): Score {
  const problems: string[] = [];
  let matched = 0;
  let violations = 0;
  const updates = res.updates as Record<string, unknown>;

  for (const [key, want] of Object.entries(c.expect.updates ?? {})) {
    if (!hasOwn(updates, key)) problems.push(`${key}:missing`);
    else if (!deepEqual(updates[key], want)) problems.push(`${key}:wrong`);
    else matched++;
  }

  for (const key of c.expect.must_not_set ?? []) {
    if (hasOwn(updates, key)) {
      violations++;
      problems.push(`never_guess:${key}`);
    }
  }

  if (c.expect.side_answer !== undefined && (res.side_answer !== null) !== c.expect.side_answer) {
    problems.push("side_answer:mismatch");
  }

  if (c.expect.register !== undefined && res.register !== c.expect.register) {
    problems.push(`register:got_${res.register}_want_${c.expect.register}`);
  }

  return { problems, matched, violations };
}

function pct(num: number, den: number): string {
  return den === 0 ? "n/a" : `${((num / den) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const model = (process.env.EVAL_MODEL || process.env.GEMINI_MODEL || "").trim();
  if (!model) {
    console.error("EVAL_MODEL or GEMINI_MODEL must be set (no fallback model is used in eval).");
    process.exit(1);
  }

  const delayRaw = Number(process.env.EVAL_DELAY_MS ?? DEFAULT_DELAY_MS);
  const delayMs = Number.isFinite(delayRaw) && delayRaw >= 0 ? delayRaw : DEFAULT_DELAY_MS;

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg
    ? onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const raw: unknown = JSON.parse(await readFile(TESTSET, "utf8"));
  const all = z.array(CaseSchema).parse(raw);
  const cases = only.length > 0 ? all.filter((c) => only.includes(c.id)) : all;

  const results: CaseResult[] = [];
  let expectedTotal = 0;
  let matchedTotal = 0;
  let violationTotal = 0;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    if (i > 0) await sleep(delayMs);

    const outcome = await runCase(c, model);
    const expected = Object.keys(c.expect.updates ?? {}).length;
    let problems: string[];
    let matched = 0;
    let violations = 0;

    if (outcome.ok) {
      const s = scoreCase(c, outcome.result);
      problems = s.problems;
      matched = s.matched;
      violations = s.violations;
    } else {
      problems = [`call_failed:${outcome.code}`];
    }

    expectedTotal += expected;
    matchedTotal += matched;
    violationTotal += violations;

    results.push({ id: c.id, pass: problems.length === 0, problems, model });
    console.log(
      problems.length === 0 ? `${c.id} PASS` : `${c.id} FAIL ${problems.join("; ")}`,
    );
    // Written after every case so a crash keeps partial results.
    await writeFile(LAST_RUN, JSON.stringify(results, null, 2), "utf8");
  }

  const passed = results.filter((r) => r.pass).length;
  const idWidth = Math.max(2, ...results.map((r) => r.id.length));

  console.log(`${"id".padEnd(idWidth)}  result  problems`);
  for (const r of results) {
    console.log(
      `${r.id.padEnd(idWidth)}  ${(r.pass ? "PASS" : "FAIL").padEnd(6)}  ${r.problems.join("; ")}`,
    );
  }
  console.log("");
  console.log(`model: ${model}`);
  console.log(`field accuracy: ${pct(matchedTotal, expectedTotal)} (${matchedTotal}/${expectedTotal})`);
  console.log(`never-guess violations: ${violationTotal}`);
  console.log(`case pass: ${pct(passed, results.length)} (${passed}/${results.length})`);

  const accuracyOk = expectedTotal > 0 && matchedTotal / expectedTotal >= 0.9;
  process.exit(accuracyOk && violationTotal === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  // Only the error class/code is printed; message bodies are never echoed.
  const label = err instanceof AiError ? err.code : err instanceof Error ? err.name : "UNKNOWN";
  console.error(`run-eval failed: ${label}`);
  process.exit(1);
});
