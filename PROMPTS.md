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

prompt-p1b[6:57]:STEP P1b: rule engine evaluation.

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