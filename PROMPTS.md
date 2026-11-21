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
