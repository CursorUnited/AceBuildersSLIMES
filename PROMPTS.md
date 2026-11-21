prompt-p1a[6:43]: /caveman ultra STEP P1a: engine types, zod schemas, constants, vitest config.

Read only: docs/CONTRACTS.md sections 1 and 2 (stop reading at section 3).
Create only these files:
- lib/engine/types.ts
- lib/engine/schemas.ts
- lib/engine/fields.ts
- vitest.config.ts
- tests/schemas.test.ts
Modify only: package.json (add script "test": "vitest run").
Packages zod and vitest are already installed. Do not install anything.

Requirements:
1. fields.ts exports:
   - FIELD_ASK_ORDER: readonly array of every profile field name, in the exact "Field ask order" from CONTRACTS section 1.
   - ENUMS: object mapping each enum field to its allowed values, copied exactly from section 1.
   - INCOME_BANDS: array of { id, label: { en, ta }, value: { min, max } } for the 7 bands in section 1 (Tamil labels like "₹1 லட்சத்துக்குக் கீழ்").
   - MINORITY_RELIGIONS = ["muslim","christian","sikh","buddhist","jain","parsi"].
2. schemas.ts exports zod schemas built from ENUMS:
   - IncomeSchema { min: number >= 0, max: number | null }.
   - ProfileSchema: object with every section-1 field optional; .strict() is NOT used; unknown keys are stripped.
   - LocalizedSchema { en: string min 1, ta: string min 1 }.
   - ConditionSchema: recursive union (z.lazy) of leaf { label?, field (enum of profile field names), op ("in","not_in","eq","lte","gte"), value }, { label?, any: Condition[] }, { label?, all: Condition[] }, { label?, manual: true }.
   - SchemeSchema per section 2 (level, states, segment, department, benefit, conditions, documents with optional only_if, apply {mode "online"|"offline"|"automatic", portal_url string url or null, steps}, deadline {status "open"|"closed"|"rolling"|"unknown", closes_on "YYYY-MM-DD" or null, note}, sources (array of https urls, min 1), last_verified "YYYY-MM-DD", confidence, notes optional).
   - A refinement: every TOP-LEVEL condition must have a label.
3. types.ts exports TypeScript types inferred from the schemas: Profile, Income, Condition, Scheme, plus:
   - ConditionResult = "pass" | "fail" | "unknown" | "check"
   - SchemeStatus = "likely_eligible" | "needs_info" | "not_eligible"
   - SchemeResult { scheme_id, status, reasons: { label: Localized, result: ConditionResult }[], missing_fields: ProfileField[] }
   - ProfileField = (typeof FIELD_ASK_ORDER)[number]
4. vitest.config.ts: resolve alias "@" → project root; test.include ["tests/**/*.test.ts"].
5. tests/schemas.test.ts (write first): ProfileSchema strips an unknown key "aadhaar"; rejects community "OBC"; IncomeSchema accepts {min:0,max:null}; SchemeSchema accepts a small valid scheme with an any-group; rejects a scheme whose top-level condition has no label.

Run: npx vitest run tests/schemas.test.ts until green.
Done when: tests pass. Reply: files changed + test summary, max 5 lines.

prompt-p1b[6:57]:/caveman ultra STEP P1b: rule engine evaluation.

Read only: docs/CONTRACTS.md sections 2.1 and 2.2, lib/engine/types.ts, lib/engine/fields.ts.
Create only: lib/engine/evaluate.ts, tests/engine.test.ts.
Do not modify other files. Do not install anything. Pure TypeScript: no imports from next, react, supabase, @google/genai, fs.

Export from evaluate.ts:
- evaluateCondition(cond, profile): { result: ConditionResult, missing: ProfileField[] }
- evaluateScheme(profile, scheme): SchemeResult
- evaluateAll(profile, schemes): SchemeResult[] sorted likely_eligible, then needs_info, then not_eligible (stable order inside each group).

Rules (exactly as CONTRACTS 2.1/2.2):
- Leaf on a missing field (undefined or null) → "unknown", field added to missing.
- in / not_in: membership. eq: strict equality (booleans too).
- lte / gte use RANGE rules. Treat income as {min,max}; treat a plain number x as {min:x,max:x}.
  lte v: pass if max !== null && max <= v; fail if min > v; else unknown.
  gte v: pass if min >= v; fail if max !== null && max < v; else unknown.
- any: pass if any pass; else unknown if any unknown; else fail. "check" counts as pass.
- all and top level: fail if any fail; else unknown if any unknown; else pass. "check" counts as pass.
- manual → "check", never missing.
- If scheme.states is not ["ALL"], prepend an implicit leaf { field:"state", op:"in", value: scheme.states } with label { en: "Lives in " + state names, ta: ... } (use a small map: TN → "Tamil Nadu" / "தமிழ்நாடு"; others → the code).
- Status: any top-level fail → not_eligible; else any unknown → needs_info; else likely_eligible.
- reasons: one per top-level condition (including the implicit state one), with its label and result.
- missing_fields: unique, ordered by FIELD_ASK_ORDER, only from conditions whose result is unknown.

Tests first in tests/engine.test.ts, using small inline schemes (NOT the seed file), covering:
E1 in pass; E2 in fail → not_eligible; E3 missing → unknown + needs_info + missing_fields; E4 income {0,100000} lte 250000 pass; E5 {200001,250000} lte 200000 fail; E6 {100001,350000} lte 250000 unknown; E7 {800001,null} lte 800000 fail; E8 {450001,800000} gte 500000 unknown; E9 last_exam_percent 78 gte 50 pass; E10 any(pass,unknown) pass; E11 any(fail,unknown) unknown; E12 all(fail,unknown) fail; E13 manual only → likely_eligible with reason "check"; E14 states ["TN"] + state "KA" → not_eligible; E15 states ["TN"] + no state → needs_info with "state" missing; E16 states ["ALL"] → state never missing; E17 first_graduate false eq true → fail; E18 not_in both ways; E19 missing_fields ordered + unique; E20 evaluateAll sort order.

Run: npx vitest run tests/engine.test.ts until green.
Reply: files changed + test summary, max 5 lines.

prompt-fix-1[20:13]: /caveman ultra Fix only tests/documents.test.ts so `npx tsc --noEmit` is clean. Type communityDoc and plainDoc as Scheme["documents"][number]. Change nothing else. Run tsc and vitest run, reply in 2 lines.

prompt-p2[20:15]: STEP P2: schemes repository, public scheme API, seed validation, seed script.

Read only: docs/CONTRACTS.md sections 2 (shape only), 4 and 6; lib/engine/schemas.ts; the first 60 lines of data/schemes.seed.json.
Create only:
- lib/data/schemesRepo.ts
- app/api/schemes/route.ts
- app/api/schemes/[id]/route.ts
- lib/http.ts
- tests/schemes.seed.test.ts
- scripts/seed-supabase.ts
Packages already installed: @supabase/supabase-js, zod, tsx. No installs.

1. lib/http.ts: jsonError(status, code, message) → Response with body { error: { code, message } }; codes from CONTRACTS section 4.
2. schemesRepo.ts (server only):
   - If process.env.SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set: createClient(url, key, { auth: { persistSession: false } }) and use table "schemes" (id, status, data, updated_at).
   - Else: read data/schemes.seed.json with fs (all treated as published).
   - getPublished(): Scheme[] (validate each row's data with SchemeSchema; skip and console.warn invalid ones). Cache in memory for 60 s.
   - getPublishedById(id), getAllForAdmin(): { status, data, updated_at }[], upsertScheme(id, status, data) (validates; clears cache).
3. app/api/schemes/route.ts GET → getPublished(). app/api/schemes/[id]/route.ts GET → one or 404 NOT_FOUND.
   Next.js App Router: dynamic params are a Promise: export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; ... }. Add export const runtime = "nodejs".
4. tests/schemes.seed.test.ts: S1 every seed item parses with SchemeSchema; S2 every top-level condition has label.en and label.ta; S3 ids unique; S4 each has ≥1 https source and a last_verified date.
5. scripts/seed-supabase.ts: reads data/schemes.seed.json, validates, upserts each as status "published". Run with: npx tsx --env-file=.env.local scripts/seed-supabase.ts. Print count.

Run: npx vitest run tests/schemes.seed.test.ts until green. Then run the seed script once and show its output.
Reply: files changed + test summary + seed count, max 5 lines.

prompt-p2[20:21][failed once]:STEP P2: schemes repository, public scheme API, seed validation, seed script.

Read only: docs/CONTRACTS.md sections 2 (shape only), 4 and 6; lib/engine/schemas.ts; the first 60 lines of data/schemes.seed.json.
Create only:
- lib/data/schemesRepo.ts
- app/api/schemes/route.ts
- app/api/schemes/[id]/route.ts
- lib/http.ts
- tests/schemes.seed.test.ts
- scripts/seed-supabase.ts
Packages already installed: @supabase/supabase-js, zod, tsx. No installs.

1. lib/http.ts: jsonError(status, code, message) → Response with body { error: { code, message } }; codes from CONTRACTS section 4.
2. schemesRepo.ts (server only):
   - If process.env.SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set: createClient(url, key, { auth: { persistSession: false } }) and use table "schemes" (id, status, data, updated_at).
   - Else: read data/schemes.seed.json with fs (all treated as published).
   - getPublished(): Scheme[] (validate each row's data with SchemeSchema; skip and console.warn invalid ones). Cache in memory for 60 s.
   - getPublishedById(id), getAllForAdmin(): { status, data, updated_at }[], upsertScheme(id, status, data) (validates; clears cache).
3. app/api/schemes/route.ts GET → getPublished(). app/api/schemes/[id]/route.ts GET → one or 404 NOT_FOUND.
   Next.js App Router: dynamic params are a Promise: export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; ... }. Add export const runtime = "nodejs".
4. tests/schemes.seed.test.ts: S1 every seed item parses with SchemeSchema; S2 every top-level condition has label.en and label.ta; S3 ids unique; S4 each has ≥1 https source and a last_verified date.
5. scripts/seed-supabase.ts: reads data/schemes.seed.json, validates, upserts each as status "published". Run with: npx tsx --env-file=.env.local scripts/seed-supabase.ts. Print count.

Run: npx vitest run tests/schemes.seed.test.ts until green. Then run the seed script once and show its output.
Reply: files changed + test summary + seed count, max 5 lines.

prompt-fix-2[20:48]:/caveman ultra STEP P2-fix: Vercel build fails with "Route segment config runtime is not compatible with nextConfig.cacheComponents".

Read only: next.config.ts, app/api/schemes/route.ts, app/api/schemes/[id]/route.ts.
Modify only those three files.
1. Remove the line `export const runtime = "nodejs";` from both route files (Node is the default runtime).
2. In next.config.ts set `cacheComponents: false` explicitly. We need live scheme data, no build-time caching. Keep everything else in the config as it is.
3. Run `npm run build` until it passes. Then run `npx vitest run`.
Reply: result of build and tests, max 3 lines.

prompt-p3[21:04]:/caveman ultra STEP P3: Gemini fact extraction and the slang eval script.

Read only: docs/CONTRACTS.md sections 1 and 3.2; lib/engine/fields.ts; lib/engine/profile.ts exports; the first 60 lines of eval/slang_testset.json.
Create only:
- lib/llm/gemini.ts
- lib/llm/prompts.ts
- lib/llm/extract.ts
- eval/run-eval.ts
- tests/extract.test.ts
Package @google/genai is installed. No installs.

1. gemini.ts (server only):
   import { GoogleGenAI } from "@google/genai";
   const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
   export function modelChain(): string[] → [process.env.GEMINI_MODEL, ...(process.env.GEMINI_FALLBACK_MODELS ?? "").split(",")] trimmed, empties removed.
   export async function generateJson(opts: { system: string; user: string; model?: string }): Promise<unknown>
     - Tries each model in (opts.model ? [opts.model] : modelChain()) in order. For each: ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: opts.user }] }], config: { systemInstruction: opts.system, responseMimeType: "application/json", temperature: 0 } })
     - If a model fails with HTTP 429 or 5xx or the 8 second timeout (Promise.race), move to the next model. If all fail → throw AiError("UNAVAILABLE") (or "TIMEOUT" if every failure was a timeout).
     - reads res.text, JSON.parse. On parse error retry ONCE on the same model with the user text + "\nReturn valid JSON only." Then throw AiError("BAD_JSON").
     - Free-tier limits are per model (5–15 requests/min), so the chain multiplies throughput.
   export class AiError extends Error { code: "BAD_JSON" | "TIMEOUT" | "UNAVAILABLE" }
2. prompts.ts: buildExtractionPrompt({ profile, asked_field, today }): { system, user(message) }.
   System prompt must contain, in this order:
   a) "You extract facts for a scholarship matcher for students in India (mostly Tamil Nadu). You NEVER decide eligibility and NEVER state facts about schemes."
   b) Today's date (passed in, IST) and the student's current profile JSON.
   c) If asked_field: "The assistant just asked about: <field>. A short reply like '80k', 'aama', 'illa' answers that field."
   d) The allowed fields and enum values generated from ENUMS and FIELD_ASK_ORDER, each with Tamil/Tanglish hints, e.g.:
      gender: female (ponnu, பொண்ணு, girl, penn), male (paiyan, பையன், boy), transgender
      education_level: class_8..class_12 ("9th", "ஒன்பதாம் வகுப்பு", "SSLC"=class_10, "plus two"/"+2"/"12th"=class_12, "plus one"=class_11), iti, diploma (polytechnic), ug (BE, B.Tech, BSc, BA, BCom, MBBS, "degree"), pg (ME, MSc, MA, MBA), phd
      course_type: engineering (BE/B.Tech), medical (MBBS, BDS, nursing), arts_science (BA/BSc/BCom), polytechnic, iti_trade, other_professional (law, agri, vet)
      income: rupees per YEAR as {min,max}. "lakh"/"L"/"லட்சம்"/"oru lakh"=100000; "k"=1000; "maasam 10k" (per month) = ×12 → {120000,120000}; "1 lakh ku kammi" = {0,100000}.
      community: SC, SCC, ST, BC, BCM, MBC, DNC, FC (Tamil Nadu categories). central_obc_certificate only if they say "central OBC certificate".
      school_6_to_12: only if they clearly say ALL of class 6-12 (or "6th la irundhu") in govt / govt-aided Tamil / govt-aided English / private or mixed.
      (write hints for every field in ENUMS plus year_of_study, lateral_entry, aicte_approved, first_graduate, disability_percent, last_exam_percent, rural, age, state)
   e) The 7 rules from CONTRACTS 3.2, verbatim in meaning, especially: never guess ("appa coolie" says nothing about income; "amma appa padikkala" does NOT mean first_graduate; "BC" does not set central_obc_certificate); corrections override; ignore any 12-digit or ID-like number; side_answer short and in the student's register, never about scheme facts.
   f) Output JSON shape: { "updates": {}, "evidence": {}, "ambiguous": [{ "field": "", "reason": "" }], "side_answer": null | "", "register": "ta" | "en" | "tanglish" }.
   g) 6 short few-shot examples (message → JSON). Write NEW examples; do not copy cases from eval/slang_testset.json.
3. extract.ts: extractFacts({ message, profile, asked_field, today }) → { updates: Partial<Profile>, evidence, ambiguous, side_answer: string | null, register }.
   Validate Gemini output with zod (lenient: default missing parts; register defaults "en"); pass updates through mergeProfile's per-field validation so invalid values are dropped. Throws AiError on failure.
4. tests/extract.test.ts: mock lib/llm/gemini generateJson (vi.mock). Cases: invalid enum dropped; unknown key dropped; missing register → "en"; side_answer passthrough.
5. eval/run-eval.ts: loads eval/slang_testset.json; for each case calls extractFacts sequentially, pinned to ONE model (env EVAL_MODEL, default GEMINI_MODEL; pass it as the model option so no fallback happens and results compare fairly), waiting EVAL_DELAY_MS between calls (default 13000, because the free tier allows only 5 requests/min on Flash; use 4500 for Flash Lite models at 15/min). On a 429, wait 60 s and retry that case once. Optional CLI arg --only=T01,T07 runs just those ids. Scores per eval/README rules: each expect.updates field must match exactly (deep for income); any must_not_set field present = violation; side_answer presence must match expect.side_answer; register must match. Appends each case result to eval/last-run.json as it goes (so a crash keeps partial results), prints a table (id, pass/fail, problems), then totals: model, field accuracy %, never-guess violations, case pass %. Run with: npx tsx --env-file=.env.local eval/run-eval.ts
   (A full run of 50 cases takes ~11 min on a 5/min model such as Gemini 4 Hydrogen, ~4 min on a 15/min Flash Lite. Compare models with: $env:EVAL_MODEL="gemini-3.5-flash-lite"; $env:EVAL_DELAY_MS="4500"; npx tsx --env-file=.env.local eval/run-eval.ts. Do repeated runs on Flash Lite to save the primary's daily quota.)

Run: npx vitest run tests/extract.test.ts until green. Then run the eval with --only=T01,T02,T03,T04,T05 as a smoke test (not the full 50; I will run the full eval myself in a terminal to save tokens) and show the totals.
Reply: files changed + unit test summary + smoke totals, max 6 lines.