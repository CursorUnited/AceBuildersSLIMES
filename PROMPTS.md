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

prompt-fix-3[21:35]: /caveman ultra STEP P3-fix: timeouts and eval output.

Read only: lib/llm/gemini.ts, eval/run-eval.ts.
Modify only those two files.
1. gemini.ts: replace the hard-coded TIMEOUT_MS = 8000 with a value read from process.env.GEMINI_TIMEOUT_MS (number, default 10000). Nothing else changes in that file.
2. run-eval.ts, runCase: retry ONCE on TIMEOUT as well as on UNAVAILABLE. For TIMEOUT wait 3 seconds before the retry; for UNAVAILABLE keep the 60 s wait.
3. run-eval.ts: after each case finishes, print one line immediately: "<id> PASS" or "<id> FAIL <problems joined by ;>". Never print the message body.
4. run-eval.ts: at the end of main(), after the summary, call process.exit(0) if field accuracy >= 90% and never-guess violations is 0, otherwise process.exit(1).
Run npx tsc --noEmit and npx vitest run. Reply in 3 lines.

prompt-P3b[22:20]: /caveman ultra STEP P3b: improve extraction of course/institution/level words.

Read only: lib/llm/prompts.ts, and `lib/engine/fields.ts` lines 30-50 (enum values).
Modify only lib/llm/prompts.ts. Do not change any other file.

Add a rule to the system prompt, plus one more few-shot example, covering these mappings (use only enum values that exist in fields.ts):
- "diploma", "polytechnic", "poly" → education_level "diploma" AND course_type "polytechnic".
- "engineering", "BE", "B.E", "BTech", "பொறியியல்" → education_level "ug" AND course_type "engineering".
- "ITI", "electrician/fitter/welder trade" → education_level "iti" AND course_type "iti_trade".
- "MSc", "MA", "MCom", "PG" at a university → education_level "pg"; BSc/BA/BCom/"arts college" → education_level "ug" AND course_type "arts_science".
- "central university", "IIT", "NIT", "IISER" → institution_type "central_institute".
- "private", "self financing", "pvt" college/ITI → institution_type "private_self_financing". "govt college/ITI" → "govt". "aided" → "govt_aided".
- When the course word is stated, always set education_level AND course_type together; never set one without the other.
Keep every existing rule. Keep the prompt compact. Do not add examples that copy test messages from eval/slang_testset.json (write new ones).
Run: npx vitest run tests/extract.test.ts. Reply in 3 lines.

prompt-p4[22:51]: /caveman ultra STEP P4: /api/chat and question templates.

Read only: docs/CONTRACTS.md sections 3.1 and 4 (errors); lib/engine/index.ts exports; lib/llm/extract.ts exports; lib/data/schemesRepo.ts exports; lib/engine/fields.ts.
Create only: lib/i18n/questions.ts, app/api/chat/route.ts, tests/questions.test.ts.
No installs.

1. lib/i18n/questions.ts exports QUESTIONS: Record<ProfileField, { ta: string; en: string; tanglish: string; chips: { label: { en: string; ta: string }; value: unknown }[] }>, one entry for EVERY field in FIELD_ASK_ORDER.
   - Friendly, short, Class-9 reading level. Tanglish example for income: "Unga family-oda varusha varumanam evlo? (approx podhum)". Tamil example: "உங்க குடும்பத்தோட வருஷ வருமானம் எவ்வளவு? (தோராயமா சொன்னா போதும்)".
   - Chips: every enum value (labels in en + ta); income uses INCOME_BANDS; booleans use Yes/No (ஆமா/இல்ல); numbers (year_of_study 1-5, disability "None"=0 / "40% or more"=40 / "Below 40%"=20) .
   - Also export ANYWAY = { ta: "சரி, ", en: "Anyway, ", tanglish: "Sari, " } and UNLOCK_LINE(n) in 3 registers ("Idhu sonna innum {n} schemes theriyum").
   - Export questionFor(field, register, unlock_count) → { text, chips }.
2. app/api/chat/route.ts POST (do NOT export runtime/dynamic/any segment config):
   - Validate body with zod: { message: string max 1000, profile: unknown, asked_field: ProfileField | null optional, ui_lang: "ta" | "en" }.
   - profile = ProfileSchema.parse-lenient (drop bad keys) of body.profile.
   - If message is non-empty: extractFacts({ message, profile, asked_field, today: IST date "YYYY-MM-DD, Weekday" }). On AiError → 503 { error: { code: "AI_UNAVAILABLE", ... } }.
   - mergeProfile → { profile, changed_fields }.
   - schemes = await getPublished() (it is async); results = evaluateAll(profile, schemes); nq = nextQuestion(results).
   - register = extraction register, else ui_lang.
   - next_question = nq ? { field, ...questionFor(field, register, unlock_count), unlock_count } : null.
   - summary = counts per status.
   - Respond exactly per CONTRACTS 3.1. Never log the message text.
3. tests/questions.test.ts: every field in FIELD_ASK_ORDER has non-empty ta/en/tanglish; every enum field's chips cover all its enum values; income chips equal INCOME_BANDS values.

Run: npx vitest run tests/questions.test.ts until green. Then run `npm run build` and fix only errors in the files you created.
Then start nothing; I will test the route myself.
Reply: files changed + test summary, max 5 lines.

prompt-P5a[23:10]: /caveman ultra STEP P5a: storage, UI strings, language provider, layout, header.

Read only: docs/CONTRACTS.md section 5; exports of lib/engine/index.ts and lib/engine/fields.ts.
Create only: lib/storage.ts, lib/i18n/strings.ts, components/LangProvider.tsx, components/Header.tsx. Modify only: app/layout.tsx, app/globals.css. Do not touch app/page.tsx.
No installs. Tailwind only. Mobile first (360 px). Client components where needed ("use client").

- layout.tsx: load Noto Sans Tamil + Inter via next/font/google; <html lang="en"> (LangProvider updates document.documentElement.lang after mount); body bg #FAF7F2, text #1F2937; accent teal #0F4C5C and turmeric #E9A23B (define as CSS variables in globals.css and use them). Wrap children in LangProvider, render Header above them. Metadata title "Urimai: scholarships you can claim".
- lib/storage.ts: get/set for urimai.profile, urimai.lang, urimai.chat (keep last 30), urimai.applications; every access in try/catch; on failure keep an in-memory fallback. Validate reads with zod (ProfileSchema for profile; bad data → reset that key). Export clearAll() that removes every key starting with "urimai.".
- lib/i18n/strings.ts: t(key, lang) for all fixed UI text: welcome, input placeholder, send, "See my schemes now", "Looks right → show schemes", "Here's what I understood", "My applications", "Forget me on this phone", confirm-dialog text, "AI is busy right now. Tap your answer below.", typing, and the phrase "likely eligible" = "தகுதி இருக்க வாய்ப்பு உள்ளது". Keys typed so a missing key is a compile error.
- components/LangProvider.tsx: context with { lang: "ta" | "en", setLang } and a useLang() hook. Default "ta"; read urimai.lang after mount; setLang saves it and updates document.documentElement.lang.
- components/Header.tsx: "உரிமை Urimai" title, தமிழ்/EN toggle, link "My applications" (/applications), menu item "Forget me on this phone" (confirm dialog → clearAll() → reload). Sticky, small, 44 px tap targets.

Run: npm run build. Fix type errors until it builds.
Reply: files changed + build result, max 5 lines.

prompt-P5B[23:23]: /caveman ultra STEP P5b: chat screen and confirm card.

Read only: docs/CONTRACTS.md section 3.1; the UI spec below; exports of lib/engine/index.ts, lib/i18n/questions.ts, lib/i18n/strings.ts, lib/storage.ts, components/LangProvider.tsx.
Create only: components/ChatBubble.tsx, components/ChipRow.tsx, components/ConfirmCard.tsx, app/page.tsx (replace the scaffold page). Do not modify other files.
No installs. Tailwind only. Mobile first (360 px). "use client" where needed. No raw enum codes ever shown to the student.

UI spec:
- app/page.tsx (chat):
  - Bubbles: bot left (white card), student right (teal, white text). Auto-scroll to bottom.
  - First visit: welcome bubble ("Vanakkam! Unga situation-a unga style-la sollunga…" in the chosen language) + 3 example chips that send a message.
  - Send: POST /api/chat with { message, profile, asked_field, ui_lang }. While waiting: typing dots, input disabled.
  - On success: save profile; if changed_fields non-empty show a small "Purinjudhu ✔ …" line listing the changed facts in human words; if side_answer show it as its own bubble; then question bubble = (side_answer ? ANYWAY + text : text); chips under it. (The API text already includes the unlock line.)
  - Chip tap: set that field locally (mergeProfile), re-evaluate in the browser with evaluateAll + nextQuestion using schemes fetched once from /api/schemes, show the next question from questionFor. No network call to /api/chat.
  - 503 AI_UNAVAILABLE: bubble "AI is busy right now. Tap your answer below." and show chips for the browser-computed next question.
  - When next_question is null: open ConfirmCard.
  - Sticky bar above input: "See my schemes now (N likely) →" once any field is known → opens ConfirmCard.
  - Input: textarea (1-4 rows) + send button; leave a placeholder <button> for the mic (wired in P7).
  - Persist chat (last 30) with lib/storage; restore on load.
- ConfirmCard (bottom sheet): "Here's what I understood" rows for every known field, human labels in the current language (reuse chip labels from QUESTIONS to turn values into words), fields changed by the last message marked with a dot; tapping a row opens ChipRow for that field; button "Looks right → show schemes" navigates to /results (page comes in P6; a 404 for now is fine).

Run: npm run build. Fix type errors until it builds.
Reply: files changed + build result, max 5 lines.

prompt-P5c[23:46]: /caveman ultra STEP P5c: natural side answers, correct language, capitalisation.

Read only: lib/llm/prompts.ts and app/page.tsx.
Modify only those two files.
1. prompts.ts: add a rule: "side_answer must be in the same register as the student's message (ta = Tamil script, en = English, tanglish = Tamil in Latin letters). Write it in your own words, one or two short sentences. If the question needs live data (weather, news, sports, prices, anything after today's date) or is unrelated to scholarships, say briefly and politely that you can't help with that here. Never invent facts. Never reuse a fixed phrase."
2. prompts.ts: in the existing few-shot example that shows a declined side question, replace the literal side_answer sentence with a different natural phrasing, and do not add any new decline example sentences. Do not copy test messages from eval/slang_testset.json.
3. app/page.tsx: when the question bubble is built as ANYWAY + text and the register is "en", lowercase the first character of text ("Anyway, what are you studying…"). Do not change tanglish or ta.
Run npx vitest run tests/extract.test.ts and npm run build. Reply in 3 lines.
prompt-P5D[23:52]: /caveman ultra STEP P5d: the "understood" note must list the facts, in the right language.

Read only: app/page.tsx (the addChangedNote function and where it is called), lib/i18n/questions.ts exports, lib/i18n/strings.ts, lib/engine/fields.ts.
Create only: lib/i18n/describe.ts. Modify only: app/page.tsx and lib/i18n/strings.ts.
No installs.
1. describe.ts exports describeFact(field, value, lang: "ta" | "en"): string, giving a short human phrase such as "Year: 1st year", "Community: SC", "Gender: Female", "Income: ₹1–2 lakh". Field names come from a map you add to strings.ts (en + ta for EVERY ProfileField). Values come from the chip labels in QUESTIONS (match by deep equality of value); numbers and booleans get sensible phrases (year_of_study 1 → "1st year", true → Yes/ஆமா). Never show raw enum codes.
2. page.tsx addChangedNote: build the note as the lead word + the described facts joined by " · ". Lead word by register: tanglish "Purinjudhu ✔", ta "புரிந்தது ✔", en "Got it ✔". Use the register returned by /api/chat for server replies; for chip taps use the current UI language (ta → Tamil lead, en → English lead). Facts are described in Tamil when the register is ta or tanglish, in English when en. If changed_fields is empty, show no note.
3. The language of the note must follow the student's message, not the header toggle.
Run npm run build. Reply in 3 lines.

prompt-P5e[00:00]: /caveman ultra STEP P5e: chat scroll, focus, and bad-parse handling.

Read only: app/page.tsx, lib/llm/prompts.ts.
Modify only those two files.
1. page.tsx auto-scroll: keep a sentinel element at the end of the message list and call scrollIntoView({ behavior: "smooth", block: "end" }) in an effect that runs whenever the messages, the loading state or the chips change. It must also scroll after chips render.
2. page.tsx focus: keep a ref to the textarea. When loading goes from true to false, focus the textarea (preventScroll: true). Also focus it after a chip tap.
3. page.tsx no-understanding case: if /api/chat succeeds but changed_fields is empty AND there is no side_answer, show a short bot line before the repeated question, in the reply's register: en "Sorry, I didn't catch that. Please tap one of these.", tanglish "Sorry, puriyala. Keela ulla option-la onna tap pannunga.", ta "மன்னிக்கவும், புரியவில்லை. கீழே உள்ளவற்றில் ஒன்றைத் தட்டுங்கள்." Show no "Got it ✔" note in that case.
4. prompts.ts: add rules: (a) current_school_type and medium describe the CURRENT school; set them only when education_level is class_8 to class_12 (or becomes class_8..class_12 in the same message). A college, diploma or ITI student never gets current_school_type. (b) When asked_field is given and the reply does not clearly match that field's options, return empty updates and set nothing else from a guess; for example "govt school" answering a question about how the college seat was obtained must not set anything. Keep all existing rules. Do not copy test messages from eval/slang_testset.json.
Run npx vitest run tests/extract.test.ts and npm run build. Reply in 3 lines.

prompt-P6a[00:09]: /caveman ultra STEP P6a: results page.

Read only: docs/CONTRACTS.md section 2 (result statuses, deadline, apply); exports of lib/engine/index.ts, lib/storage.ts, lib/i18n/strings.ts, lib/i18n/questions.ts, lib/i18n/describe.ts, components/ChipRow.tsx.
Create only: app/results/page.tsx, components/SchemeCard.tsx, components/DeadlineChip.tsx. Modify only: lib/i18n/strings.ts (add keys).
No installs. Tailwind only, mobile first (360 px), "use client" where needed. Never show raw enum codes.

Results (/results, client): load profile from storage, schemes from /api/schemes, evaluateAll.
- Sections: "Likely eligible (n)", "One detail away (n)", "Not eligible (n)" (collapsed by default).
- SchemeCard: name (current language), level badge (CENTRAL / STATE / CENTRAL + STATE for shared), benefit line, up to 3 reason ticks (reuse labels from the engine results), DeadlineChip, "Track ☆" (adds { scheme_id, status: "not_started", docs_checked: [], reminder_on: null } to urimai.applications if absent; the star fills once tracked), and the whole card links to /scheme/<id> (page comes in P6b).
- needs_info cards show the first missing field's question with its chips inline; tapping a chip merges it into the profile, saves it and re-evaluates in place.
- not_eligible cards show the first failing reason with ✗.
- Footer note: "'Likely eligible' means the rules match what you told us. The office makes the final decision." (both languages, in strings.ts).
- Empty profile → redirect to /. A "← Edit my answers" link back to /.
DeadlineChip: open → green "Closes 25 Nov" (orange if ≤ 7 days); closed → grey "Closed for this year" + note; rolling → grey "Apply any time"; unknown → grey "Check official page".

Run: npm run build until it builds.
Reply: files changed + build result, max 5 lines.

prompt-p6b[2:43]: /caveman ultra
STEP P6b: scheme detail page + wording fix.

Read only: lib/engine/schemas.ts (SchemeSchema), lib/engine/documents.ts, lib/storage.ts, lib/i18n/strings.ts, components/SchemeCard.tsx, components/DeadlineChip.tsx, app/results/page.tsx.
Create only: app/scheme/[id]/page.tsx, components/ReasonList.tsx, components/DocChecklist.tsx.
Modify only: lib/i18n/strings.ts (add keys, and the wording fix below).
No installs. No `export const runtime/dynamic`, no "use cache".

Wording fix (strings.ts only): sectionNotEligible → en "Doesn't match your answers", ta "உங்கள் பதில்களுக்குப் பொருந்தவில்லை"; showNotEligible → en "Show these", ta "காட்டு"; hideNotEligible → en "Hide these", ta "மறை". Keep every other string.

Detail page (/scheme/[id], client component; params is a Promise in Next 16: use React `use(params)`):
1. Load profile from storage, lang from storage. Fetch /api/schemes/{id} and validate with SchemeSchema. 404 or invalid → friendly message + link back to /results. Loading state in both languages.
2. Header: back link to /results, scheme name (current language), level badge (same labels as SchemeCard), DeadlineChip, benefit line.
3. Status banner from evaluate(profile, scheme) (use the engine's single-scheme function if it exists, else evaluateAll(...).find): likely_eligible → "Likely eligible: the rules match what you told us."; needs_info → "One detail away"; not_eligible → "Doesn't match your answers". Never say "you are eligible".
4. ReasonList: every reason with a symbol: pass ✓, fail ✗, check "?" (label + "(please confirm)"), unknown "?" (label only). Labels from reason.label[lang].
5. DocChecklist: filterDocuments(scheme, profile); each as a checkbox (min 44px tap target). if_applicable items get a small "(if it applies to you)" suffix. Checked state is stored in the matching entry of urimai.applications under docs_checked (store the English text as the key); if no entry exists, create one with status "not_started", reminder_on null, updated_at now. Update updated_at on every change.
6. "How to apply": apply.mode as a plain sentence (online / at the school or college office / automatic), apply.steps as a numbered list, and if portal_url is set an "Open official portal" link (target _blank, rel noopener noreferrer).
7. Track button: same behaviour as SchemeCard (add to urimai.applications if absent; show "Tracked ★").
8. Footer: sources as links (hostname as link text), "Last checked: <last_verified>", and the line "The office makes the final decision. Check the official page before applying." in both languages. If confidence is "low" show a small note "Details may have changed; please verify."
All text via t(key, lang) from strings.ts, both en and ta. Mobile first, one column, text ≥16px, tap targets ≥44px, Tailwind only.

Run: npm run build until it builds.
Reply: files changed + build result, max 5 lines.

prompt-p6c[2:42]: /caveman ultra
STEP P6c: bug fix + UI consistency pass. No new features, no new packages.

Read only: components/*.tsx, app/page.tsx, app/results/page.tsx, app/scheme/[id]/page.tsx, app/globals.css, app/layout.tsx, lib/i18n/describe.ts, lib/i18n/questions.ts, lib/i18n/strings.ts.
Modify only: components/ChipRow.tsx, components/ConfirmCard.tsx, components/Header.tsx, components/SchemeCard.tsx, components/DocChecklist.tsx, components/ChatBubble.tsx, app/page.tsx, app/results/page.tsx, app/scheme/[id]/page.tsx, app/globals.css, lib/i18n/questions.ts.
Do NOT touch lib/engine/*, lib/llm/*, app/api/*, tests/*.

Fixes, in order:
1. ChipRow: key={index}, not chip.value (values can be objects, so keys collided). Selected check: compare chip.value with selectedValue using JSON.stringify so object values work. Keep the Props API unchanged.
2. ConfirmCard value text: when the stored value matches no chip, use the value part of describeFact(field, value, lang) (the text after "Name: "). Never show a blank value. Every row shows its value.
3. ConfirmCard layout: wrap in a backdrop (fixed inset-0 z-50 bg-black/40, click closes) and make the sheet centred: mx-auto w-full max-w-xl rounded-t-2xl, bottom-aligned, safe-area bottom padding. Esc closes it. Move focus to the sheet when it opens.
4. Layout width: use ONE content width everywhere: `mx-auto w-full max-w-xl`. Header inner container, chat main (remove max-w-[360px]), results and detail pages all use it.
5. Header: the "forget me" confirmation must not be inside the element that has backdrop-blur. Render the dialog as a sibling after </header> (wrap both in a fragment), or drop backdrop-blur. Verify it covers the whole viewport.
6. Colours: one teal. Use the theme token accent-teal (#0F4C5C) for primary buttons, selected chips, headings and links. Replace teal-700/800/900/600/200/50 usages with accent-teal or accent-teal/<opacity> variants. Turmeric (accent-turmeric) only for small highlights: the "changed" dot and warning chips. Keep green/orange/grey for deadline status chips.
7. Interaction states, in globals.css under @layer components, define and then use these classes instead of repeating utilities:
   - .btn-primary: bg accent-teal, white text, rounded-full, min-h-[44px], px-4, font-medium, hover:brightness-110, active:scale-[0.98], transition, disabled:opacity-50 disabled:cursor-not-allowed
   - .btn-outline: border accent-teal, text accent-teal, bg white, rounded-full, min-h-[44px], hover:bg-accent-teal/10, active:scale-[0.98], transition
   - .chip: like btn-outline, plus [aria-pressed=true] selected style (bg accent-teal, white text)
   - .link: underline underline-offset-4 text-accent-teal hover:opacity-80
   And one global rule: :focus-visible { outline: 2px solid var(--accent-turmeric); outline-offset: 2px }. cursor-pointer on all buttons.
   Apply them to every button and link in the components and pages listed above (chips, Looks right, Track, language toggle, menu, links).
8. questions.ts questionFor: when unlock_count > 0 join with a newline ("\n") instead of a space. ChatBubble must render newlines (whitespace-pre-line). Then update tests/questions.test.ts expectation only if it asserts the space-join: allowed exception, change just that assertion.
9. Chat page: when the ConfirmCard is open, the input bar stays hidden behind the backdrop (fine); when it closes, focus returns to the text input.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 6 lines.

prompt-p6d[3:29]: /caveman ultra
STEP P6d: header must fit a 360px phone. No horizontal scroll anywhere.

Read only: components/Header.tsx, lib/i18n/strings.ts.
Modify only: components/Header.tsx (and strings.ts only if a key is needed).

1. Below the `sm` breakpoint (<640px): show only the logo, the language toggle, and a Menu button. Move the "My applications" link INTO the menu dropdown (first item, above "Forget me"; same tap size, closes the menu on click). At `sm` and up, keep the link inline as now (hidden in the dropdown there).
2. Make the toggle compact on phones: px-3 instead of the wide padding, text-sm for the logo subtitle. Logo text must not wrap onto three lines.
3. The row must never exceed the viewport: container `flex items-center justify-between gap-2`, children `shrink-0` except the logo, which may `min-w-0 truncate`.
4. Menu dropdown: `right-0`, `max-w-[calc(100vw-1.5rem)]`, closes on outside click and on Escape.
5. Keep the btn-*/focus classes from P6c.

Check with the build only: npx tsc --noEmit; npm run build.
Reply: files changed + results, max 3 lines.

prompt-p8[3:40]: /caveman ultra
STEP P8: My applications page + reminders. Client-only, localStorage, no new packages.

Read only: lib/storage.ts, lib/engine/index.ts (exports), components/DeadlineChip.tsx, components/SchemeCard.tsx, components/Header.tsx, app/results/page.tsx, app/globals.css, lib/i18n/strings.ts.
Create only: app/applications/page.tsx, components/ApplicationCard.tsx.
Modify only: lib/i18n/strings.ts (add keys, en + ta), components/Header.tsx (only if the "My applications" link target is wrong), app/results/page.tsx (only to add the reminder banner in point 3).
Do NOT touch lib/engine/*, lib/llm/*, app/api/*, tests/*. No `export const runtime/dynamic`, no "use cache".

/applications (client page, max-w-xl like the other pages):
1. Load urimai.applications, urimai.profile and lang from storage; fetch /api/schemes and validate with SchemeSchema (same pattern as app/results/page.tsx). Join each application to its scheme by scheme_id; skip any whose scheme no longer exists.
2. Empty state: a friendly sentence + a button to /results ("Track a scheme from the results page"), both languages.
3. Reminder banner at the top: for each tracked application whose scheme deadline.status is "open" and closes_on is within 7 days (IST date, compare YYYY-MM-DD strings), or whose reminder_on is today or earlier and whose status is not applied/approved/rejected, show "Closes in N days: <name>" or "Reminder: <name>" in turmeric (bg accent-turmeric/20). Sorted by soonest. Nothing is sent anywhere: it only shows when the page opens. Add the same one-line banner at the top of the results page ONLY when there is at least one reminder, with a link to /applications.
4. ApplicationCard: scheme name (lang), DeadlineChip, docs progress "3 of 5 documents ready" (docs_checked.length vs the number of documents returned by filterDocuments(scheme, profile)), a status <select> with the 5 statuses (not_started, docs_ready, applied, approved, rejected) in plain words in both languages, a date input for reminder_on (clearable), a link "Open scheme" to /scheme/{id}, and a "Remove" button with a confirm (window.confirm is fine). Every change writes back with setApplications and updates updated_at.
5. Sort: unfinished first by nearest deadline, then applied/approved/rejected at the bottom.
6. Use the shared btn-primary / btn-outline / link classes and accent-teal colours from globals.css. Tap targets ≥44px, text ≥16px, no horizontal scroll at 360px.
7. Never say "eligible" without "likely". No Aadhaar or personal data is stored.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 5 lines.

prompt-p6e[3:51]: /caveman ultra
STEP P6e: header responsive classes are overridden. One-file fix.

Modify only: components/Header.tsx.
Bug: the TAP constant contains "inline-flex", which beats `hidden` and `sm:hidden` on the same element, so "My applications" shows on phones and overflows.
Fix: remove "inline-flex" and "items-center justify-center" from TAP. Instead give every element that uses TAP its display explicitly:
- the inline "My applications" link: `max-sm:hidden sm:inline-flex items-center justify-center`
- the dropdown "My applications" item: `inline-flex sm:hidden items-center justify-start`
- all other TAP users (language buttons, Menu, Forget me, dialog buttons): `inline-flex items-center justify-center`
Never put two display utilities (hidden/inline-flex/flex/block) on one element at the same breakpoint.
Then check the logo: at 360px the logo text must be visible (not truncated to nothing): reduce the toggle's px so logo + toggle + Menu fit in 336px.
Run: npx tsc --noEmit; npm run build. Reply max 3 lines.

prompt-p9[3:58]: /caveman ultra

STEP P9: admin API and admin screen (list + editor).

Read only: docs/CONTRACTS.md sections 2 and 4; exports of lib/data/schemesRepo.ts, lib/engine/schemas.ts, lib/engine/index.ts, lib/http.ts; app/globals.css; components/DeadlineChip.tsx.
Create only: lib/adminAuth.ts, app/api/admin/schemes/route.ts, app/api/admin/schemes/[id]/route.ts, app/admin/page.tsx, components/admin/SchemeList.tsx, components/admin/SchemeEditor.tsx, tests/adminAuth.test.ts.
Modify only: lib/i18n/strings.ts is NOT needed: the admin screen is English only, plain strings are fine.
No installs. Do NOT add `export const runtime`, `dynamic` or "use cache" to any file.

1. adminAuth.ts: isAdmin(req: Request): boolean. Compares header x-admin-passcode with process.env.ADMIN_PASSCODE using crypto.timingSafeEqual on equal-length Buffers (false if lengths differ or env unset or empty).
2. GET /api/admin/schemes → getAllForAdmin(). PUT /api/admin/schemes/[id] body { status: "draft"|"published", data } → validate data with SchemeSchema (400 BAD_REQUEST with the zod issues as a short string list), path id must equal data.id, then upsertScheme. Not admin → 401 { error: { code: "UNAUTHORIZED", ... } } via lib/http.ts. Dynamic params are a Promise (await params). Never log request bodies or the passcode.
3. /admin page (client): passcode form; keep the passcode in sessionStorage only and send it as x-admin-passcode. Wrong passcode (401) → show "Wrong passcode" and clear it. Once in: SchemeList with name, level, states, status, last_verified, a red "needs re-check" chip if last_verified is older than 90 days, confidence; filters All / Drafts / Stale; click a row opens SchemeEditor. A "New scheme" button starts from an empty template.
4. SchemeEditor: text inputs for name (en, ta), benefit (en, ta), department, deadline (status select, closes_on, note en/ta), sources (one per line), last_verified, confidence select, notes; JSON textareas (monospace, 12 rows) for conditions, documents, apply with live SchemeSchema validation (rebuild the whole object, safeParse, show zod messages next to the form). Right panel "Preview as student": persona select (Kavya, Arun, Fathima; profiles below) → runs evaluateScheme(profile, scheme) and shows status + each reason with ✓/✗/?. Buttons: Save draft, Publish, Mark verified today (sets last_verified to today's IST date). Publish and Save are disabled while the object is invalid. After a save show "Saved" and refresh the list.
   Kavya {state:"TN",education_level:"ug",year_of_study:1,course_type:"engineering",aicte_approved:true,institution_type:"govt",gender:"female",community:"SC",religion:"hindu",income:{min:0,max:100000},school_6_to_12:"govt_all",first_graduate:true,admission_route:"govt_school_7_5_quota",disability_percent:0}
   Arun {state:"TN",education_level:"class_8",current_school_type:"govt",medium:"tamil",gender:"male",community:"MBC",religion:"hindu",income:{min:100001,max:200000},rural:true,last_exam_percent:72}
   Fathima {state:"TN",education_level:"class_12",current_school_type:"govt_aided",medium:"english",gender:"female",community:"BCM",religion:"muslim",income:{min:100001,max:200000},last_exam_percent:78}
5. tests/adminAuth.test.ts: correct passcode true; wrong false; env unset false; different length false.
6. Styling: use btn-primary / btn-outline / link classes and accent-teal; max-w-5xl two-column layout on desktop (editor left, preview right), one column on phones, no horizontal scroll at 360px. Add a link-free page: the admin page is NOT linked from the header or anywhere else.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 5 lines.

prompt-p9b[4:08]: /caveman ultra
STEP P9b: admin screen UI only. The admin API (lib/adminAuth.ts, app/api/admin/schemes/*) is DONE: do not touch it. Creating the folders components/admin and app/admin is approved.

Read only: app/api/admin/schemes/route.ts and [id]/route.ts (to see request/response shape), lib/engine/schemas.ts, lib/engine/index.ts, app/globals.css, components/DeadlineChip.tsx.
Create only: app/admin/page.tsx, components/admin/SchemeList.tsx, components/admin/SchemeEditor.tsx.
No installs. Do NOT add `export const runtime`, `dynamic` or "use cache". English only, plain strings.

1. /admin page (client): passcode form; keep the passcode in sessionStorage only and send it as header x-admin-passcode on every call. 401 → show "Wrong passcode" and clear it. Once in: fetch GET /api/admin/schemes and show SchemeList; "Log out" button clears the passcode; "New scheme" starts the editor from an empty template that passes nothing but is editable (id empty, level "state", states ["TN"], segment "school", confidence "medium", status draft, today's date as last_verified).
2. SchemeList: rows with name (en), level, states, status (draft/published), last_verified, a red "needs re-check" chip when last_verified is older than 90 days, confidence; filter buttons All / Drafts / Stale. Click a row opens SchemeEditor.
3. SchemeEditor: text inputs for id (read-only for existing schemes), name en/ta, benefit en/ta, department, deadline (status select, closes_on, note en/ta), sources (one per line), last_verified, confidence select, level select, segment select, states (comma list), notes. Monospace JSON textareas (12 rows) for conditions, documents, apply. Rebuild the whole object on every change and safeParse it with SchemeSchema; show every zod message in a red list near the buttons; invalid JSON shows "Invalid JSON in <field>".
   Right panel "Preview as student": persona select with these three profiles, then evaluateScheme(profile, scheme) from lib/engine when the object is valid, showing the status and each reason with ✓ / ✗ / ?:
   Kavya {state:"TN",education_level:"ug",year_of_study:1,course_type:"engineering",aicte_approved:true,institution_type:"govt",gender:"female",community:"SC",religion:"hindu",income:{min:0,max:100000},school_6_to_12:"govt_all",first_graduate:true,admission_route:"govt_school_7_5_quota",disability_percent:0}
   Arun {state:"TN",education_level:"class_8",current_school_type:"govt",medium:"tamil",gender:"male",community:"MBC",religion:"hindu",income:{min:100001,max:200000},rural:true,last_exam_percent:72}
   Fathima {state:"TN",education_level:"class_12",current_school_type:"govt_aided",medium:"english",gender:"female",community:"BCM",religion:"muslim",income:{min:100001,max:200000},last_exam_percent:78}
   Buttons: "Save draft" (PUT status draft), "Publish" (PUT status published), "Mark verified today" (sets last_verified to today's IST date). Save and Publish are disabled while invalid. After a save show "Saved" and refresh the list. Show the API error message if the PUT fails.
4. Styling: btn-primary / btn-outline / link classes and accent-teal; max-w-5xl, two columns on desktop (editor left, preview right), one column on phones, no horizontal scroll at 360px. The admin page is NOT linked from anywhere.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 5 lines.

prompt-p7[4:24]: /caveman ultra
STEP P7: voice input.

Read only: docs/CONTRACTS.md section 3.3; lib/llm/gemini.ts; app/page.tsx (only the input area); app/globals.css; lib/http.ts; lib/i18n/strings.ts.
Create only: lib/llm/vocabulary.ts, lib/llm/transcribe.ts, app/api/transcribe/route.ts, components/MicButton.tsx. Modify only: app/page.tsx (replace the mic placeholder), lib/llm/gemini.ts (add an audio helper only if needed), lib/i18n/strings.ts (add keys). Creating the new files is approved.
No installs. Do NOT add `export const runtime`, `dynamic`, or "use cache" to any file (Next 16 build fails). Node is the default runtime.

1. vocabulary.ts: exported string array: NMMSS, Pudhumai Penn, புதுமைப் பெண், Tamizh Pudhalvan, தமிழ்ப் புதல்வன், Post-Matric, Pre-Matric, PM-USP, AICTE Pragati, Saksham, first graduate, polytechnic, ITI, SC, ST, SCC, BC, BCM, MBC, DNC, FC, B.E., B.Tech, MBBS, plus two, SSLC, lakh, லட்சம்.
2. transcribe.ts (server only): transcribeAudio(buffer: Buffer, mimeType: string): Promise<string>. Use ai.models.generateContent (NOT the Live API / WebSocket). Models from process.env.GEMINI_TRANSCRIBE_MODELS (comma-separated, trimmed, empty ones dropped), tried in order; move to the next on 429 / 5xx / timeout; all fail → throw AiError("UNAVAILABLE"). Per-model timeout 8 s (race with a timer, same pattern as gemini.ts). Contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: buffer.toString("base64") } }, { text: INSTRUCTIONS }] }]. INSTRUCTIONS: "Transcribe exactly what is said. The speaker is a student in Tamil Nadu speaking Tamil, English, or Tanglish (Tamil words mixed with English). Write Tamil words in Tamil script only if spoken as pure Tamil sentences; keep Tanglish in Latin letters as spoken. Do not translate. Remove only filler sounds (umm, aah). Prefer these spellings: <vocabulary joined by comma>. Output the transcript text only." Trim the result; if empty, throw AiError("UNAVAILABLE"). Never log audio or transcript text.
3. /api/transcribe POST, multipart field "audio": missing / not audio/* / larger than 1.5 MB → 400 BAD_REQUEST (use lib/http.ts jsonError); success → { text }; AiError → 503 AI_UNAVAILABLE; anything else → 500 INTERNAL. Strip codec params from the mime type before sending (audio/webm;codecs=opus → audio/webm).
4. MicButton (client): props { onText(text: string): void; disabled?: boolean; lang }. Tap to start, tap to stop, auto-stop at 30 s. MediaRecorder with "audio/webm;codecs=opus", fallback "audio/mp4" (Safari). While recording: red pulsing dot + seconds counter + the button reads "Stop". On stop: POST to /api/transcribe, show a "Listening…" state, then onText(text) puts the text INTO the input box (never auto-sends). On 503 or MediaRecorder missing: fall back to window.SpeechRecognition || window.webkitSpeechRecognition with lang "ta-IN" (en-IN if ui lang is en), interimResults true, streaming into the input via onText. Mic permission denied: hide the button and show a toast "Mic blocked. Type instead." (both languages, in strings.ts). Release the stream tracks after every recording. 44px tap target, use btn-outline and focus classes from globals.css.
5. app/page.tsx: replace the mic placeholder with <MicButton>; onText sets the input value and focuses the input. Keep everything else.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 5 lines.

prompt-p5f[4:39]: /caveman ultra
STEP P5f: stop the model guessing community from "OBC"; tighten register on short Tanglish. Prompt text only.

Read only: lib/llm/prompts.ts.
Modify only: lib/llm/prompts.ts. Do not touch any other file. Do not add or change any example (EXAMPLES) and never copy test messages from eval/ into the prompt.

1. FIELD_HINTS.community: append: 'OBC / "other backward class" is NOT one of these values. Never turn OBC into BC or MBC.'
2. FIELD_HINTS.central_obc_certificate: replace with: 'boolean. true when they say they hold a central / Government of India OBC certificate. This is a separate fact: it NEVER sets community, in either direction.'
3. Add rule 11 to RULES: "11. community is set only when the student names one of SC, SCC, ST, BC, BCM, MBC, DNC, FC (or its Tamil / Tanglish name). A caste-certificate type, a reservation word or a scheme name alone does not give a community. When the student mentions a central OBC certificate, set central_obc_certificate and leave community out."
4. Add rule 12 to RULES: "12. register: a message that mixes Tamil words written in Latin letters (illa, aama, ponnu, padikkiren, naan ...) with English or community codes is tanglish even when it is very short. Use en only when the whole message is plain English."
5. Rule 3 and rule 10 stay as they are.

Run: npx tsc --noEmit; npx vitest run.
Reply: files changed + results, max 3 lines.

prompt-p10[11:32]: /caveman ultra
STEP P10: draft a scheme from pasted official text. Creating the new files is approved.

Read only: docs/CONTRACTS.md sections 1 and 2; lib/llm/gemini.ts (generateJson signature); lib/engine/schemas.ts; lib/engine/fields.ts; lib/adminAuth.ts; lib/http.ts; app/admin/page.tsx; components/admin/SchemeEditor.tsx (Props only: initial, isNew, passcode, onSaved, onClose).
Create only: lib/llm/draftScheme.ts, app/api/admin/import/route.ts, components/admin/ImportPanel.tsx, tests/draftScheme.test.ts.
Modify only: app/admin/page.tsx (add an "Import" button/tab next to "New scheme"), lib/llm/gemini.ts (ONLY to let generateJson take an optional timeoutMs that overrides the default; every existing caller must behave exactly as before).
No installs. No `export const runtime`, `dynamic` or "use cache". Never log pasted text, model output or the passcode.

1. draftScheme({ text, source_url, today }) → Promise<{ draft: unknown-validated Scheme-shaped object, warnings: string[] }>.
   Call generateJson with timeoutMs 30000. System prompt: "Turn this official government scheme text into JSON matching the schema below. Use ONLY facts in the text; never invent amounts, dates or rules. Conditions may only use these fields and enum values: <ENUMS and numeric fields from fields.ts>. Anything the app cannot check becomes { label: {en, ta}, manual: true }. Unknown amounts or dates: leave them out and explain in notes; set confidence to 'low' if unsure. Write simple Tamil (ta) for every label, benefit and step that a Class 9 student can read. sources = [source_url]. last_verified = today. id = a short lowercase-hyphen slug of the English name." Include the scheme JSON example from CONTRACTS section 2 in the prompt.
   After generateJson: SchemeSchema.safeParse. If it fails, drop invalid conditions / documents one by one (re-validating), add one warning per dropped item, and if it still fails return the best-effort object with a warning "needs manual fixing" (the editor shows the zod errors). Extra warnings for: missing ta text, deadline status unknown, confidence low, no conditions left.
2. POST /api/admin/import (admin only, 401 otherwise) body { text: string 50..20000 chars, source_url: https url } validated with zod → 200 { draft, warnings }. Not saved to the database. AiError → 503 AI_UNAVAILABLE, bad body → 400.
3. ImportPanel (client): textarea "Paste the official page text", URL input, "Draft with AI" button with a loading state (the call can take up to 30 s: say "This can take about 20 seconds"). On success show the warnings in an amber list and open SchemeEditor prefilled (isNew true, status draft) with the pasted text shown in a scrollable box beside it. Errors show a plain message.
4. tests/draftScheme.test.ts (mock generateJson with vi.mock): an invalid condition field is dropped with a warning; a valid draft passes through with no warnings except none expected; missing Tamil text gives a warning.
5. Use btn-primary / btn-outline / accent-teal classes; phone width 360px with no horizontal scroll.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 5 lines.

prompt-p11[11:53]: /caveman ultra
STEP P11: UI polish. Do ONLY the items below, one file at a time, run `npx tsc --noEmit` after each file. Tailwind only, no new packages, do not touch lib/engine, lib/llm, app/api, tests. No `export const runtime/dynamic`.

Read only: app/page.tsx, components/ChatBubble.tsx, components/DeadlineChip.tsx, components/SchemeCard.tsx, app/globals.css, lib/i18n/strings.ts.
Modify only: app/page.tsx, components/DeadlineChip.tsx, components/SchemeCard.tsx, lib/i18n/strings.ts, app/globals.css.

1. Chat welcome + example chips follow the UI language (useLang): "ta" → Tamil script text, "en" → English text. Keep the tone friendly and say "Tell me in Tamil, Tanglish or English". Example chips: Class 12 student / first-year college student / farming family (Tamil and English versions). Add the strings to strings.ts (en + ta). Typing Tanglish still works: only the starter text changes.
2. Under the welcome bubble add one small muted line with a lock icon (inline SVG or emoji): "Your answers stay on this phone. No login, no Aadhaar." (ta version too).
3. Send button: when the input has text it uses the btn-primary style; when empty it stays muted/disabled-looking. Mic button next to it keeps btn-outline. Both min 44px.
4. DeadlineChip: make it compact. text-sm, py-0.5 px-2.5, rounded-full. For unknown ("Check official page") use plain muted text with no background pill and no button look (text-gray-600 text-sm, small clock or info glyph). Open (green/orange), closed and rolling keep their coloured chips but also compact. Put the level badge and the deadline chip on the same row (flex-wrap gap-2 items-center, nowrap when they fit on 360px).
5. SchemeCard: benefit line gets font-medium and slightly larger (text-base text-foreground); reasons stay as they are. The "Track ☆" button stays btn-outline. When tracked it becomes a filled accent-teal/10 background with accent-teal border and text "Tracked ★" (not plain text).
6. Do not change any behaviour, routes or storage. No new features.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results, max 5 lines.

prompt-p11b[14:49]: /caveman ultra
STEP P11b: admin list rows are ovals and outline buttons have no padding. CSS/class fix only.

Read only: app/globals.css, components/admin/SchemeList.tsx.
Modify only: app/globals.css, components/admin/SchemeList.tsx.
Do not change behaviour.

1. globals.css: in the shared .btn-outline / .chip rule add `padding-inline: 1rem;` (same as .btn-primary) and `padding-block: 0.5rem;`. Utility classes like px-3 must still override it (keep the rule inside @layer components).
2. SchemeList.tsx: each row button must NOT use btn-outline. Make it a card: `block w-full text-left rounded-xl border border-accent-teal/30 bg-white px-4 py-3 text-base hover:bg-accent-teal/5 active:scale-[0.99] cursor-pointer transition` and keep the inner layout (name, level, status, chips) unchanged. Add the focus-visible outline from globals.css (already global). Rows keep a 44px minimum height.
3. Check other uses of btn-outline on long multi-line content in app/ and components/ (grep). Any that wrap multi-line text must switch to the same card style. Report which ones.

Run: npx tsc --noEmit; npm run build. Reply max 3 lines.

prompt-p11c[14:55]: /caveman ultra
STEP P11c: wrapped chips/buttons look like ovals. CSS/class fix only.

Read only: app/globals.css, app/results/page.tsx.
Modify only: app/globals.css, app/results/page.tsx.
Do not change behaviour.

1. globals.css: .btn-outline, .chip and .btn-primary use `border-radius: 1.375rem` instead of 9999px. A 44px single-line button stays a full pill (radius = half the height); two-line labels become rounded rectangles instead of ovals. Keep everything else in those rules.
2. results/page.tsx: the "Doesn't match / Show these" toggle (the button with aria-expanded, currently class btn-outline flex w-full ... justify-between) becomes a card-style row: `flex w-full items-center justify-between gap-3 rounded-xl border border-accent-teal/30 bg-white px-4 py-3 text-left hover:bg-accent-teal/5 cursor-pointer`. Keep the label and "Show these / Hide these" text and the aria-expanded behaviour.

Run: npx tsc --noEmit; npm run build. Reply max 3 lines.

prompt-p11d[15:04]: /caveman ultra
STEP P11d: admin list rows lost their line breaks. Class fix only.

Read only: components/admin/SchemeList.tsx.
Modify only: components/admin/SchemeList.tsx.
Not a render question: confirmed in a real browser, the row text runs together as "central · ALLStatus: published · Last verified: ..." because the card button is `block` and the three inner spans are inline.

1. The row button class `block w-full text-left ...` becomes `flex w-full flex-col items-start gap-1 text-left ...` (keep the same border, radius, padding, hover and cursor classes). The three inner spans (title row, "level · states", "Status: ... · Last verified: ... · Confidence: ...") each stay on their own line. Do not use `block`.
2. Do not touch behaviour, props or any other file.

Run: npx tsc --noEmit; npm run build. Reply max 3 lines.

prompt-p11e[15:09]: /caveman ultra
STEP P11e: explicit `rounded-full` on buttons overrides the shared radius, so wrapped chips stay ovals. Class fix only.

Read only: components/ChipRow.tsx, and a grep for "rounded-full" across app/ and components/.
Modify only: components/ChipRow.tsx, plus any other button (NOT badges, dots, avatars, language toggle group or status chips) whose className contains rounded-full together with btn-outline / btn-primary / chip, e.g. the Track button in components/SchemeCard.tsx.
Confirmed in a real browser: chip "Govt-aided, Tamil medium, all years" is 66px tall with border-radius calc(infinity*1px) because ChipRow's className contains `rounded-full`, which beats the .chip/.btn-outline rule in globals.css.

1. Remove `rounded-full` from those buttons. The shared classes in globals.css (border-radius 1.375rem) now do the rounding. If a button has no shared class (plain utilities only), replace rounded-full with rounded-[1.375rem].
2. Leave small decorative pills alone (level badge, deadline chip, red "needs re-check" chip, the pulsing mic dot).
3. Do not change behaviour or any other file. Report the list of files you changed.

Run: npx tsc --noEmit; npm run build. Reply max 3 lines.

prompt-p12[15:20]: /caveman ultra
STEP P12: MCP server exposing the engine. Installing the two packages and creating the new files is approved.

Read only: docs/CONTRACTS.md section 4.1; exports of lib/engine/index.ts, lib/data/schemesRepo.ts, lib/engine/schemas.ts, lib/i18n/questions.ts; package.json (zod version).
Install exactly: npm i mcp-handler @modelcontextprotocol/sdk   (if it fails with a zod or peer-dependency error, tell me the exact error first; do NOT switch packages or add --force/--legacy-peer-deps unless I say so).
Create only: app/api/[transport]/route.ts (mcp-handler convention, basePath "/api"), lib/mcpTools.ts, tests/mcpTools.test.ts.
Do NOT add `export const runtime`, `dynamic`, `maxDuration` or "use cache" to the route (Next 16 build fails). Never log the student profile or any tool input.

1. lib/mcpTools.ts: plain async functions, testable without MCP:
   - matchSchemes(profile) → for every published scheme { id, name_en, name_ta, status, benefit_en, deadline_status, reasons: [{ label_en, result }] } (status is likely_eligible | needs_info | not_eligible, from evaluateAll).
   - nextQuestionTool(profile) → { field, question_en, unlock_count } | null (nextQuestion + QUESTIONS[field].en).
   - getScheme(id, lang) → the scheme with text in the chosen language, apply steps, documents, deadline, sources, last_verified, or null if not found.
   - documentChecklist(scheme_id, profile) → filterDocuments(...) as [{ text_en, text_ta, if_applicable }].
   Validate every profile with a lenient ProfileSchema parse (drop invalid keys; never throw on bad input). Use getPublished().
2. route.ts: createMcpHandler registering tools match_schemes, next_question, get_scheme, document_checklist with zod input schemas and short descriptions. match_schemes description: "Find Indian government scholarships a student is likely eligible for. Results are 'likely eligible', never guaranteed." Return JSON text content. Export GET, POST and DELETE as the package docs show. Serves /api/mcp.
3. tests/mcpTools.test.ts: Kavya profile {state:"TN",education_level:"ug",year_of_study:1,course_type:"engineering",aicte_approved:true,institution_type:"govt",gender:"female",community:"SC",religion:"hindu",income:{min:0,max:100000},school_6_to_12:"govt_all",first_graduate:true,admission_route:"govt_school_7_5_quota",disability_percent:0} → matchSchemes includes pudhumai-penn as likely_eligible; empty profile → nextQuestionTool returns a field; getScheme("pudhumai-penn","ta") returns Tamil name; unknown id → null.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply: files changed + the three results + the MCP URL path, max 5 lines.

promp-p12b[15:29]: /caveman ultra
STEP P12b: tell MCP clients what a profile looks like. Description text only.

Read only: app/api/[transport]/route.ts, lib/engine/fields.ts, lib/engine/schemas.ts.
Modify only: app/api/[transport]/route.ts. Do not change behaviour or any other file.

1. Add one shared constant PROFILE_HELP (a string) and use it as the .describe(...) text on the `profile` input of match_schemes, next_question and document_checklist. Content: "Student profile as a JSON object. Only include facts the student actually said; leave unknown fields out. Fields: state (2-letter code, e.g. TN); education_level (class_8..class_12, iti, diploma, ug, pg, phd); course_type (arts_science, engineering, medical, other_professional, polytechnic, iti_trade); institution_type (govt, govt_aided, private_self_financing, central_institute); year_of_study (1-6); gender (female, male, transgender); community (SC, SCC, ST, BC, BCM, MBC, DNC, FC); religion (hindu, muslim, christian, sikh, buddhist, jain, parsi, other); income {min, max} in rupees per YEAR (max null = no upper bound); first_graduate (boolean); school_6_to_12 (govt_all, govt_aided_tamil_all, govt_aided_english_all, private_or_mixed); current_school_type (govt, govt_aided, local_body, private); medium (tamil, english, other); admission_route (govt_counselling, govt_school_7_5_quota, management); aicte_approved, central_obc_certificate, lateral_entry, rural (booleans); disability_percent, last_exam_percent (0-100); age (integer)." Build the enum lists from ENUMS in lib/engine/fields.ts where possible so they never drift.
2. get_scheme's `id` gets .describe("Scheme id from match_schemes, e.g. pudhumai-penn") and document_checklist's scheme_id the same.
3. Tool descriptions stay as they are.

Run: npx tsc --noEmit; npx vitest run; npm run build. Reply max 3 lines.

prompt-p14[16:40]: /caveman ultra
STEP P14: desktop layout for the home page and results. Mobile (<1024px) must look EXACTLY as it does now. No behaviour changes. Creating the new component is approved.

Read only: app/page.tsx, app/results/page.tsx, components/Header.tsx, components/ConfirmCard.tsx, components/SchemeCard.tsx, lib/i18n/describe.ts, lib/i18n/questions.ts, lib/i18n/strings.ts, app/globals.css.
Create only: components/ProfilePanel.tsx.
Modify only: app/page.tsx, app/results/page.tsx, components/Header.tsx, lib/i18n/strings.ts (new keys, en + ta).
Do not touch lib/engine, lib/llm, app/api, tests.

1. Home layout at `lg` (≥1024px) only: wrapper `mx-auto grid w-full max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]`. Left column = the existing chat, now a card: `lg:rounded-2xl lg:border lg:border-black/10 lg:bg-white lg:shadow-sm lg:overflow-hidden`, fixed height `lg:h-[calc(100dvh-6rem)]` with the message list scrolling inside (flex-1 overflow-y-auto) and the input bar pinned at the bottom of the card (not sticky to the viewport). Below lg keep the current single-column full-height white layout unchanged. The page background outside the card stays cream.
2. components/ProfilePanel.tsx (client, `hidden lg:flex`, sticky top-24, self-start, w-full, card style rounded-2xl border bg-white p-5): props { profile, changedFields, results (SchemeResult[]), lang, onReview }.
   - Empty profile: heading "How Urimai works" with 3 short numbered lines: 1 Tell us about yourself in Tamil, Tanglish or English (type or speak). 2 We match only what the official rules say and never guess. 3 Check your documents and track deadlines. Then the privacy line with the lock icon (reuse the existing string) and, if results.length > 0, "{n} schemes checked: central and Tamil Nadu".
   - Known facts: heading "What I understood"; one row per known field, in the existing field order, label = question short name from QUESTIONS (en/ta) and value = value part of describeFact(field, value, lang) (never blank); changed fields get the turmeric dot. Below: two counters as chips: "{x} likely" (success tint) and "{y} one detail away" (turmeric tint); then up to 3 names of likely schemes (name in current language) as plain text list; then primary button "See my schemes" (router push to /results) and an outline button "Review answers" (calls onReview, which opens the existing ConfirmCard sheet).
   - All text via strings.ts (en + ta). Use the existing classes (btn-primary, btn-outline, accent-teal, rounded-2xl, text-base). Rows are not interactive.
3. page.tsx: render <ProfilePanel/> next to the chat using the profile, lastChanged, results and lang that page.tsx already has. Hide the bottom "See my schemes now" bar from lg up (`lg:hidden`) because the panel has that button. ConfirmCard (the bottom sheet) stays and opens via onReview or the mobile bar; on desktop it should render as a centred dialog (max-w-xl) which it already is.
4. Header.tsx: inner container uses `max-w-6xl` from lg up (`max-w-xl lg:max-w-6xl`) so the logo and nav line up with the new layout; mobile unchanged.
5. results/page.tsx: container `max-w-xl lg:max-w-5xl`; each section's card list becomes `grid gap-3 lg:grid-cols-2`. Section headings, the reminder banner and the footer stay full-width. Mobile unchanged.
6. Do not make the scheme detail, applications or admin pages wider in this step.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply max 6 lines: files changed + results.

prompt-p14b[16:54]: /caveman ultra
STEP P14b: four small copy/layout nits. No behaviour changes.

Read only: components/ProfilePanel.tsx, app/page.tsx, app/results/page.tsx, lib/i18n/strings.ts.
Modify only: components/ProfilePanel.tsx, app/page.tsx, app/results/page.tsx, lib/i18n/strings.ts.

1. The "{n} one detail away" counter chip text in the panel becomes "{n} need one more detail" (ta equivalent), via strings.ts. The "likely" chip stays.
2. In page.tsx the privacy line shown inside the chat's welcome block gets `lg:hidden` because the panel shows it on desktop. On mobile it stays.
3. results/page.tsx container uses `lg:max-w-6xl` instead of lg:max-w-5xl so its left edge matches the header; the card grid stays 2 columns at lg and becomes 3 columns from xl (`xl:grid-cols-3`).
4. Copy: student-facing text should only say "Tamil or English", never "Tanglish". In lib/i18n/strings.ts change the three strings that mention it (lines ~8-9, ~120-121 and ~134-135, en + ta):
   - en: "…in Tamil or English…" (remove ", Tanglish").
   - ta: replace "தமிழ், தங்கிலிஷ் அல்லது ஆங்கிலத்தில்" with "தமிழ் அல்லது ஆங்கிலத்தில்".
   Do not change any logic: the app still understands Tanglish, we just do not advertise it. Do not touch lib/llm or the "tanglish" register code anywhere.
   Afterwards grep app/, components/ and lib/i18n for "Tanglish" and "தங்கிலிஷ்": the only remaining hits may be code identifiers like register names (e.g. "tanglish" lowercase in types and question templates), never visible text.

Run: npx tsc --noEmit; npx vitest run; npm run build. Reply max 4 lines.

prompt-p5g[17:45]: /caveman ultra
STEP P5g: never guess the medium. Bundled enum answers need both facts.

Read only: lib/llm/prompts.ts, eval/slang_testset.json (shape of one case).
Modify only: lib/llm/prompts.ts, eval/slang_testset.json. No other file. Do not add examples (EXAMPLES) and never put a test message into the prompt.

Bug (reproduced 2 of 3 times against /api/chat): asked_field = school_6_to_12, the student says only that they studied in a "govt aided school" without saying Tamil or English medium. The model sets school_6_to_12 = govt_aided_tamil_all. That value bundles school type AND medium, so the medium was guessed. Another run set current_school_type for a college student.

1. FIELD_HINTS.school_6_to_12: append: "Each govt_aided value includes the medium. If the student does not say Tamil or English medium for govt-aided, do NOT set this field. Likewise do not set it if they do not say ALL of class 6 to 12."
2. Add rule 13 to RULES: "13. Some values bundle two facts (for example a school type together with a medium). Set such a field only when the student gave BOTH facts. If only one is given, leave the field out and add it to ambiguous with a short reason."
3. Rule 9 stays, but append: "When asked_field is school_6_to_12 the answer is about the past (classes 6 to 12), so it never sets current_school_type."
4. eval/slang_testset.json: add case T41 (same shape as the others): message "govt aided school", asked_field "school_6_to_12", profile_before {"education_level":"ug","state":"TN"}, expect { updates: {}, must_not_set: ["school_6_to_12","current_school_type"] }, why: "govt-aided without a medium bundles two facts; never guess the medium". Add T42: message "govt aided tamil medium, all years", asked_field "school_6_to_12", expect updates { school_6_to_12: "govt_aided_tamil_all" }, must_not_set ["current_school_type"].

Run: npx tsc --noEmit; npx vitest run. Reply max 3 lines.

prompt-p17[18:06]: /caveman ultra
STEP P17: real reminders via calendar. Creating the new files is approved.

Read only: components/ApplicationCard.tsx, lib/i18n/strings.ts, lib/engine/types.ts (Scheme deadline fields).
Create only: lib/calendar.ts, tests/calendar.test.ts. Modify only: components/ApplicationCard.tsx, lib/i18n/strings.ts.

1. lib/calendar.ts (pure, no DOM): makeIcs(events: { uid, title, description, date /* YYYY-MM-DD */, alarmHoursAfterStart: number }[]) → string. VCALENDAR 2.0, PRODID "-//Urimai//EN", CRLF line endings, each event a VEVENT with UID, DTSTAMP (now UTC), DTSTART;VALUE=DATE, DTEND;VALUE=DATE (next day), SUMMARY, DESCRIPTION, and a VALARM (ACTION:DISPLAY, DESCRIPTION, TRIGGER:PT{h}H after start for positive h, or TRIGGER:-PT{h}H before for negative). Escape commas, semicolons, backslashes and newlines per RFC 5545. googleCalendarUrl({ title, description, date }) → https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&details=...&dates=YYYYMMDD/YYYYMMDD(next day), all values URL-encoded.
2. tests/calendar.test.ts: ics contains BEGIN:VEVENT, the right DTSTART, a VALARM, CRLF; commas in a title are escaped; google URL has the encoded title and the next-day end date.
3. ApplicationCard: when reminder_on is set (or the scheme has an open deadline with closes_on) show a button "Add to calendar" (downloads urimai-reminder.ics via a Blob + temporary link, no new packages) and a link "Google Calendar". Events: the reminder date at 9 am (alarm +9 h), and the deadline day with an alarm the morning before (-15 h) when closes_on exists. Title "Urimai: <scheme name>", description with the scheme page URL (window.location.origin + /scheme/id). Texts en + ta in strings.ts. Existing in-page reminder banner stays.

Run: npx tsc --noEmit; npx vitest run; npm run build. Reply max 4 lines.

prompt-p5h[18:34]: /caveman ultra
STEP P5h: finish P5g. Three more model fixes. Prompt text and eval cases only.

Read only: lib/llm/prompts.ts, eval/slang_testset.json (shape of one case).
Modify only: lib/llm/prompts.ts, eval/slang_testset.json. Do not put test messages into the prompt. Rule 13 and the school_6_to_12 hint already exist: leave them.

1. Rule 8: replace "Always set education_level and course_type together, never one without the other." with "When education_level is NOT yet known, set education_level and course_type together. When education_level is already known in the current profile, an answer about the course sets ONLY course_type (and year_of_study if given) and never changes education_level unless the student says they changed level (e.g. 'actually I am in college')."
2. EXAMPLES: delete the example whose side_answer is "Athu pathi ippo enakku solla theriyaadhu." (the model copies it verbatim). Do not add another side-question example.
3. Rule 5: append: "side_answer is always in the language of the student's CURRENT message: an English message gets an English answer, Tamil script gets Tamil, Tanglish gets Tanglish. A general how-to question (where to get a certificate) may get one short, common-knowledge sentence; if unsure, say you are not sure."
4. eval/slang_testset.json add (T41 and T42 already exist): T43 message "medical", asked_field "course_type", profile_before {"education_level":"class_10","state":"TN"}, expect { updates: { course_type: "medical" }, must_not_set: ["education_level"] }. T44 message "where do i get income certificate", expect { register: "en", side_answer: true, updates: {} }.

Run: npx tsc --noEmit; npx vitest run. Reply max 3 lines.

prompt-p16[18:41]: /caveman ultra
STEP P16: layout and copy fixes. No logic changes.

Read only: components/SchemeCard.tsx, components/ProfilePanel.tsx, components/ApplicationCard.tsx, components/admin/SchemeEditor.tsx, app/page.tsx, app/results/page.tsx, app/scheme/[id]/page.tsx, lib/i18n/questions.ts, lib/i18n/strings.ts, tests/questions.test.ts, data/schemes.seed.json (the two schemes below).
Modify only those files. Do not touch lib/engine, lib/llm, app/api, lib/calendar.ts.

1. SchemeCard: the <article> becomes `flex h-full flex-col`; the Track button wrapper gets `mt-auto pt-3` so Track sits at the bottom of every card and lines up across a grid row. The results grids stretch items (default) and keep 1/2/3 columns.
2. Desktop panel (ProfilePanel at lg): same height as the chat card (`lg:h-[calc(100dvh-6rem)]`, flex-col, no sticky). Heading fixed at the top; the facts rows, counters and likely-scheme names go in a `flex-1 overflow-y-auto` area; the "See my schemes" and "Review answers" buttons are pinned at the bottom of the card (not scrolling). Both cards top-aligned in the grid (`lg:items-start`).
3. ApplicationCard: replace "{n} of {m} documents ready" with "Documents ticked off: {n} of {m}" (ta equivalent) plus a link "Open checklist" to /scheme/{id}#documents; give the documents section on the scheme page `id="documents"`. Strings in strings.ts, en + ta. KEEP the "Add to calendar" button, the "Google Calendar" link and the reminder logic exactly as they are.
4. The reply "Sorry, I didn't catch that. Please tap one of these." must only appear when the current question has chips. When it has none, show "I couldn't use that. Please answer the question above." (en + ta + tanglish equivalents in the same place the old text lives).
5. questions.ts: first_graduate question wording in ta, en and tanglish becomes "Will you be the first graduate in your family?" (ta: "உங்கள் குடும்பத்தில் பட்டம் பெறும் முதல் ஆள் நீங்களா?"; tanglish: "Ungal kudumbathula degree vaanga pora mudhal aal neenga thaana?"). Chip meaning is unchanged (Yes = first_graduate true). Update tests/questions.test.ts only if it asserts the old text.
6. data/schemes.seed.json: for ids first-graduate-concession and govt-school-7-5-quota insert as the FIRST item of "conditions" {"label":{"en":"Now in a college degree course","ta":"இப்போது கல்லூரிப் பட்டப்படிப்பில் உள்ளீர்கள்"},"field":"education_level","op":"in","value":["ug"]}. Keep all other fields. (The live database already has this rule; this keeps the seed file in sync.)
7. components/admin/SchemeEditor.tsx header row: the Close button gets `shrink-0` (it must never be squeezed); the title keeps `min-w-0` and shows the scheme's English name when editing an existing scheme (fallback to the id) with `break-words`, not the raw id with `break-all`. "New scheme" stays as is.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass.
Reply max 5 lines: files changed + results.

prompt-p5i[19:13]: /caveman ultra
STEP P5i: fix T23 regression and make the eval honour profile_before.

Read only: lib/llm/prompts.ts, eval/run-eval.ts.
Modify only: lib/llm/prompts.ts, eval/run-eval.ts. Do not put test messages into the prompt.

1. prompts.ts rule 8: keep the current text and append: "Postgraduate degrees also set course_type: MSc, MA, MCom = pg + arts_science; ME, MTech = pg + engineering; MBA, MCA, LLM = pg + other_professional; MD, MS (medical) = pg + medical. So 'msc physics' sets education_level pg AND course_type arts_science even when the student does not say 'arts'."
2. run-eval.ts: CaseSchema gets `profile_before: z.record(z.string(), z.unknown()).optional()`, and runCase passes `profile: (c.profile_before ?? {}) as Profile` to extractFacts instead of the hard-coded empty profile. Update the comment next to it. Nothing else in the runner changes.

Run: npx tsc --noEmit; npx vitest run. Reply max 3 lines.

prompt-p5j[20:15]: /caveman ultra
STEP P5j: pin grade numbers; stop course answer changing education level. Prompt text only.

Read only: lib/llm/prompts.ts.
Modify only: lib/llm/prompts.ts. Do not add examples. Do not put test messages into the prompt.

Bug (reproduced 5 of 5 against /api/chat): "naan 9th padikren, SC, appa coolie" returns education_level class_10. Removing any single rule or example makes it return class_9 again, so the prompt is fragile: pin the digit mapping.

1. FIELD_HINTS.education_level: replace the digit part with an explicit table and an instruction: 'Grade numbers map one-to-one: "8th"/"8" = class_8, "9th" = class_9, "10th"/"SSLC" = class_10, "11th"/"plus one"/"+1" = class_11, "12th"/"plus two"/"+2" = class_12. ALWAYS use exactly the number the student says; never round up or down to a neighbouring class. Only a correction such as "X illa, Y" (it is not X, it is Y) uses the second number.' Keep the rest of that hint (iti, diploma, ug, pg, phd rules).
2. FIELD_HINTS.course_type: append: "When asked_field is course_type, the reply sets ONLY course_type (and year_of_study if stated); never education_level unless the student explicitly says they changed level."
3. Rule 4 (corrections): append: "A correction needs a clear negation or 'actually'/'sorry'. Two numbers in one sentence without a negation (e.g. a grade and an age) are NOT a correction."
4. Do not change any other rule.

Run: npx tsc --noEmit; npx vitest run. Reply max 2 lines.

prompt-p19[20:59]: /caveman ultra
STEP P19: chat and card robustness fixes. No new features.

Read only: app/page.tsx, components/MicButton.tsx, components/ChatBubble.tsx, components/DeadlineChip.tsx, components/SchemeCard.tsx, lib/i18n/strings.ts, lib/i18n/questions.ts.
Modify only those files.

1. MicButton "Mic blocked. Type instead." must NOT sit inside the input row. Render it as a small red line ABOVE the input row (role="status", auto-hides after 6 s), and keep the mic button visible but disabled. The textarea must keep `min-w-0 flex-1` and at least 160px width at 360px viewport. Same for the "sending/Listening" state.
2. DeadlineChip: the text must wrap on narrow screens: `max-w-full whitespace-normal break-words text-left` (keep pill shape via rounded-[1.375rem] and compact padding). No horizontal page overflow in Tamil at 320px on /results, /applications and /scheme/[id].
3. SchemeCard: when a needs_info question has no chips (numeric fields such as last_exam_percent, age, disability_percent, year_of_study), show a small number input with an OK button that sets the value (validated 0-100 for percents, integers for year/age) via the existing onAnswer, instead of nothing.
4. app/page.tsx: when the AI call fails, the fallback question bubble must have text: use the local template question text (questionFor / QUESTIONS[field]) so the bubble is never empty; chips only for the field being asked.
5. Chat textarea: maxLength 1000. When a message is over 1000 chars (paste), show "Message too long. Please keep it under 1000 characters." (en/ta) instead of the generic error. ChatBubble text gets `break-words [overflow-wrap:anywhere]` so long words wrap.
6. Double-send guard: a useRef flag set synchronously at the start of send() and cleared when the request ends; a second call while set is ignored.

Run: npx tsc --noEmit; npx vitest run; npm run build. Reply max 5 lines.

prompt-p20[21:08]:/caveman ultra
STEP P20: header title, default language, metadata. No logic changes outside what is listed.

Read only: components/Header.tsx, components/LangProvider.tsx, app/layout.tsx, app/page.tsx, lib/i18n/strings.ts, lib/i18n/describe.ts, lib/storage.ts.
Create only: app/icon.svg. Modify only: components/ConfirmCard.tsx,components/Header.tsx, components/LangProvider.tsx, app/layout.tsx, app/page.tsx, lib/i18n/strings.ts, lib/storage.ts.

1. Header title: show only "Urimai" (English, bold, accent-teal) in BOTH languages. Remove the Tamil word from the logo text everywhere (appTitle string and Header). Keep the document <title>.
2. Default language: when no saved language exists, use ta if navigator.language starts with "ta", otherwise en. Saved choice still wins. Avoid the flash: read the saved/derived language in the layout via a tiny inline script that sets <html lang> and a data attribute before paint, or render language-dependent text only after LangProvider has resolved it (no Tamil flash for English users). Keep SSR hydration warning-free.
3. Confirmation note after a message ("Purinjudhu ✔ ..."): for register tanglish, build the labels with the UI language's labels (English labels when UI is en, Tamil when ta). The "Purinjudhu ✔" prefix may stay for tanglish. Never mix Tamil-script labels into an English UI.
4. app/layout.tsx metadata: title "Urimai: scholarships you can claim", description "Tell us about yourself in Tamil or English. We find the Tamil Nadu and central government scholarships you are likely eligible for.", openGraph (title, description, type website, siteName Urimai, locale en_IN), twitter card summary, themeColor #0F4C5C (via the viewport export), icons from app/icon.svg.
5. app/icon.svg: 64x64, rounded square #0F4C5C with a cream (#FAF7F2) bold "U" and a small turmeric (#E9A23B) dot, no external fonts (draw the U with a path).
6. components/ConfirmCard.tsx: the row buttons use the `link` class, which underlines every row label and value. Remove `link` from the rows. Style rows as plain tappable cards (text-foreground, no underline, hover:bg-accent-teal/5, rounded-lg, border), keep the expand/collapse behaviour. Only the Close button keeps an underline if it had one.

Run: npx tsc --noEmit; npx vitest run; npm run build. Reply max 5 lines.

prompt-p21[21:16]: /caveman ultra
STEP P21: admin guardrails. Validation and warnings only; no new features.

Read only: lib/engine/schemas.ts, components/admin/SchemeEditor.tsx, components/admin/SchemeList.tsx, app/admin/page.tsx, app/api/admin/schemes/[id]/route.ts, tests/schemas.test.ts, tests/schemes.seed.test.ts, data/schemes.seed.json.
Modify only: lib/engine/schemas.ts, components/admin/SchemeEditor.tsx, app/admin/page.tsx, app/api/admin/schemes/[id]/route.ts, tests/schemas.test.ts. All 15 seed schemes must still parse (tests/schemes.seed.test.ts unchanged and green).

1. schemas.ts (SchemeSchema):
   - id: lowercase slug `^[a-z0-9]+(-[a-z0-9]+)*$`, max 60.
   - states: each item must be exactly 2 uppercase letters or "ALL" (check the seed for the value used for all states and allow exactly that).
   - date strings (last_verified, deadline.closes_on): must be a real calendar date YYYY-MM-DD (reject 2026-13-45, 2026-02-30).
   - refine: deadline.status "open" requires closes_on to be set; closes_on must be null for unknown/rolling.
   - notes max 2000 chars; name, benefit, department, deadline note, each document and step text max 500 chars.
   - Friendlier zod messages where easy (e.g. conditions item invalid: "Condition N uses an unknown field, operator or value").
2. SchemeEditor: when creating a NEW scheme, if the id matches an existing scheme id (from the list passed down by app/admin/page.tsx), show a red error "A scheme with this id already exists. Pick another id." and disable Save and Publish. Existing schemes keep id read-only. Show the first 3 validation messages as a plain list with the field name in bold.
3. SchemeEditor Close: if the form differs from the initial scheme, window.confirm("Discard your changes?") before closing; Save success resets the dirty state.
4. Server: PUT /api/admin/schemes/[id] additionally rejects (400) an id that is not a valid slug and a non-existing id when the request carries header x-create: "1" only if the id already exists (409 "exists") — creating via the editor sends x-create: 1 and must get 409 if the id is taken. Updating an existing scheme (no x-create) behaves as now.
5. tests/schemas.test.ts: add cases: bad id rejected ("My Scheme!", "a/b", 70 chars), good id accepted; states "tn" and "Tamil Nadu" rejected, "TN" and the ALL value accepted; "2026-13-45" and "2026-02-30" rejected, "2026-02-28" accepted; open deadline without closes_on rejected; closes_on with status unknown rejected.

Run: npx tsc --noEmit; npx vitest run; npm run build. All must pass. Reply max 5 lines.

prompt-p22[21:24]:/caveman ultra
STEP P22: favicon duplicate and share-preview image.

Read only: app/layout.tsx, app/icon.svg, app/favicon.ico (exists).
Create only: app/opengraph-image.tsx. Modify only: app/layout.tsx. Delete: app/favicon.ico.

1. Delete app/favicon.ico (the default Next icon) so only app/icon.svg is used. Remove any explicit `icons` entry in layout.tsx metadata that duplicates the auto-detected icon.
2. Create app/opengraph-image.tsx using next/og ImageResponse (size 1200x630, contentType image/png, alt "Urimai: claim what's yours"): background #0F4C5C, big cream (#FAF7F2) text "Urimai", below it "Tell us about yourself. We find the scholarships you can claim." in cream, and a turmeric (#E9A23B) pill "Tamil · English · Tanglish". English text only (no Tamil glyphs, no custom font files). Do not set `runtime` or `dynamic` exports.
3. layout.tsx: twitter card becomes "summary_large_image" (the opengraph image is picked up automatically).

Run: npx tsc --noEmit; npm run build. Reply max 3 lines.

prompt-22b[21:29]: /caveman ultra
STEP P22b: pin metadataBase. One line.

Read only: app/layout.tsx. Modify only: app/layout.tsx.
Add `metadataBase: new URL("https://urimai-sigma.vercel.app")` to the exported metadata object. Nothing else.

Run: npx tsc --noEmit; npm run build. The metadataBase warning must be gone. Reply max 2 lines.
