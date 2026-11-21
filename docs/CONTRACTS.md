# Urimai: Contracts (source of truth)

**As of:** Sat 21 Nov 2026, 14:40 IST, v1
**Read this before any other design doc.** Every other file (engine, API, prompts, seed data, test set) must match the names and shapes here. If code and this file disagree, fix one of them on purpose; never let them drift.

This file is safe to copy into the build repo as `docs/CONTRACTS.md` so the Nexen agent can read it.

---

## 1. Profile (what we know about the student)

Stored **only on the phone** (`localStorage["urimai.profile"]`). Every field is optional. A missing field means "not told yet", never "no".

| Field | Type / allowed values | Notes |
| --- | --- | --- |
| `state` | 2-letter Indian state code, e.g. `"TN"`, `"KA"` | Domicile. Central schemes ignore it. |
| `education_level` | `"class_8"` `"class_9"` `"class_10"` `"class_11"` `"class_12"` `"iti"` `"diploma"` `"ug"` `"pg"` `"phd"` | What they are studying **now**. |
| `year_of_study` | integer 1–6 | College / diploma / ITI only. |
| `lateral_entry` | boolean | Diploma holder joining UG year 2. |
| `course_type` | `"arts_science"` `"engineering"` `"medical"` `"other_professional"` `"polytechnic"` `"iti_trade"` | College only. |
| `aicte_approved` | boolean | College course approved by AICTE. |
| `institution_type` | `"govt"` `"govt_aided"` `"private_self_financing"` `"central_institute"` | Current college. |
| `current_school_type` | `"govt"` `"govt_aided"` `"local_body"` `"private"` | School students only. |
| `medium` | `"tamil"` `"english"` `"other"` | Medium of instruction now. |
| `school_6_to_12` | `"govt_all"` `"govt_aided_tamil_all"` `"govt_aided_english_all"` `"private_or_mixed"` | Where Class 6–12 were studied. Unlocks Pudhumai Penn / Tamizh Pudhalvan / 7.5% quota. |
| `admission_route` | `"govt_counselling"` `"govt_school_7_5_quota"` `"management"` | How they got the college seat. |
| `gender` | `"female"` `"male"` `"transgender"` | |
| `community` | `"SC"` `"SCC"` `"ST"` `"BC"` `"BCM"` `"MBC"` `"DNC"` `"FC"` | Tamil Nadu community categories. SCC = SC converted to Christianity. BCM = BC Muslim. |
| `central_obc_certificate` | boolean | Central-format OBC certificate. **Not the same as TN BC/MBC.** |
| `religion` | `"hindu"` `"muslim"` `"christian"` `"sikh"` `"buddhist"` `"jain"` `"parsi"` `"other"` | Minority = muslim, christian, sikh, buddhist, jain, parsi. |
| `income` | `{ "min": number, "max": number \| null }` in rupees per year | A range, because students rarely know the exact figure. "80k" → `{min: 80000, max: 80000}`. "under 1 lakh" → `{min: 0, max: 100000}`. "above 8 lakh" → `{min: 800001, max: null}`. |
| `first_graduate` | boolean | Nobody in the family has a degree yet. |
| `disability_percent` | number 0–100 | 0 = no disability. |
| `last_exam_percent` | number 0–100 | Latest exam marks. |
| `rural` | boolean | School is in a rural (non-municipal) area. |
| `age` | integer | |

**Income bands** (chips and Gemini both map to these; edges are the real scheme cut-offs):

| Chip | `income` |
| --- | --- |
| Below ₹1 lakh | `{min: 0, max: 100000}` |
| ₹1–2 lakh | `{min: 100001, max: 200000}` |
| ₹2–2.5 lakh | `{min: 200001, max: 250000}` |
| ₹2.5–3.5 lakh | `{min: 250001, max: 350000}` |
| ₹3.5–4.5 lakh | `{min: 350001, max: 450000}` |
| ₹4.5–8 lakh | `{min: 450001, max: 800000}` |
| Above ₹8 lakh | `{min: 800001, max: null}` |

**Field ask order** (tie-breaker for the next question, first wins):
`education_level`, `state`, `income`, `community`, `gender`, `school_6_to_12`, `religion`, `first_graduate`, `institution_type`, `course_type`, `year_of_study`, `current_school_type`, `medium`, `disability_percent`, `last_exam_percent`, `admission_route`, `aicte_approved`, `central_obc_certificate`, `lateral_entry`, `rural`, `age`.

---

## 2. Scheme (one row of editable data)

Stored in Supabase table `schemes` (`id text primary key, status text check (status in ('draft','published')), data jsonb not null, updated_at timestamptz default now()`). `data` has this shape:

```json
{
  "id": "pudhumai-penn",
  "name": { "en": "Pudhumai Penn", "ta": "புதுமைப் பெண்" },
  "level": "state",
  "states": ["TN"],
  "segment": "college",
  "department": "Social Welfare & Women Empowerment Dept, Govt of Tamil Nadu",
  "benefit": { "en": "₹1,000 every month until you finish your course", "ta": "..." },
  "conditions": [
    {
      "label": { "en": "Girl student", "ta": "மாணவி" },
      "field": "gender", "op": "in", "value": ["female"]
    },
    {
      "label": { "en": "Studied Class 6–12 in a government school", "ta": "..." },
      "field": "school_6_to_12", "op": "in", "value": ["govt_all", "govt_aided_tamil_all"]
    },
    {
      "label": { "en": "Now in a college course", "ta": "..." },
      "any": [
        { "field": "education_level", "op": "in", "value": ["ug", "diploma", "iti"] }
      ]
    },
    {
      "label": { "en": "Confirm your college is on the scheme list", "ta": "..." },
      "manual": true
    }
  ],
  "documents": [
    { "en": "Class 6–12 school records / Transfer Certificate", "ta": "..." },
    { "en": "Community certificate", "ta": "...", "only_if": { "field": "community", "op": "in", "value": ["SC", "ST"] } }
  ],
  "apply": {
    "mode": "online",
    "portal_url": "https://...",
    "steps": [ { "en": "...", "ta": "..." } ]
  },
  "deadline": {
    "status": "open",
    "closes_on": "2026-11-25",
    "note": { "en": "2026-27 applications close 25 Nov 2026", "ta": "..." }
  },
  "sources": ["https://...official page..."],
  "last_verified": "2026-11-21",
  "confidence": "high",
  "notes": "Anything uncertain, in plain English, for the admin only."
}
```

Field rules:

- `level`: `"central"` | `"state"` | `"shared"` (centrally sponsored, run by the state).
- `states`: `["ALL"]` for central schemes open in every state; otherwise state codes. Shared schemes list only the states we have verified (start with `["TN"]`).
- `segment`: `"school"` | `"college"`.
- `apply.mode`: `"online"` | `"offline"` | `"automatic"` (the school/college applies for the student). `apply.portal_url` is a URL or `null` when no official portal is confirmed.
- "Has a disability" is written as `{ "field": "disability_percent", "op": "gte", "value": 1 }`.
- `deadline.status`: `"open"` | `"closed"` (this year's window is over; show "next window" text and still allow a reminder) | `"rolling"` | `"unknown"`. `closes_on` is `YYYY-MM-DD` or `null`.
- `confidence`: `"high"` | `"medium"` | `"low"`. Low-confidence schemes show a small "details may have changed, check the official page" note.
- `last_verified`: `YYYY-MM-DD`. Older than 90 days → "needs re-check" badge in Admin, and "last checked on …" shown to students.
- Every text a student sees is `{ "en": "...", "ta": "..." }`.

### 2.1 Conditions

A scheme's `conditions` list is joined by **AND**. Each item is exactly one of:

| Shape | Meaning |
| --- | --- |
| `{ "field", "op", "value" }` | A leaf test on one profile field. |
| `{ "any": [ ... ] }` | OR group. Items are leaves or nested groups. |
| `{ "all": [ ... ] }` | AND group. |
| `{ "manual": true }` | Something the app cannot check (e.g. "college is on the notified list"). Never fails, never asks. |

Top-level items **must** have a `label` (`{en, ta}`); nested items may.

Leaf operators:

| `op` | `value` | Passes when |
| --- | --- | --- |
| `in` | array | profile value is in the array |
| `not_in` | array | profile value is not in the array |
| `eq` | scalar | equal (booleans included) |
| `lte` | number | value ≤ number (range rules below) |
| `gte` | number | value ≥ number (range rules below) |

**Range rules** for `lte` / `gte` (used by `income`; plain numbers are treated as `{min: x, max: x}`):

- `lte v`: pass if `max !== null && max <= v`; fail if `min > v`; otherwise unknown.
- `gte v`: pass if `min >= v`; fail if `max !== null && max < v`; otherwise unknown.

### 2.2 Three-valued evaluation

Each condition evaluates to `pass`, `fail`, `unknown` or `check` (manual).

- Leaf on a missing field → `unknown`, and the field goes into `missing_fields`.
- `all` / top-level AND: any `fail` → `fail`; else any `unknown` → `unknown`; else `pass` (`check` counts as pass here).
- `any` (OR): any `pass` → `pass`; else any `unknown` → `unknown`; else `fail`.
- State filter: if `states` is not `["ALL"]`, the engine adds an implicit first condition `{field: "state", op: "in", value: states}` labelled "Lives in Tamil Nadu" (or the state name).

Scheme result:

```json
{
  "scheme_id": "pudhumai-penn",
  "status": "likely_eligible",
  "reasons": [ { "label": {"en": "...", "ta": "..."}, "result": "pass" } ],
  "missing_fields": []
}
```

- `status`:
  - `"likely_eligible"`: every condition passes (manual items allowed; UI shows them as "confirm this").
  - `"needs_info"`: nothing fails, at least one unknown.
  - `"not_eligible"`: at least one fail.
- `missing_fields`: unique fields behind `unknown` results, in field ask order.
- Wording rule: the UI says **"likely eligible"**, never "eligible" or "guaranteed".

### 2.3 Next question

`nextQuestion(profile, results)`:

1. Candidates = all `missing_fields` of `needs_info` results.
2. Score each candidate = number of `needs_info` schemes whose `missing_fields` contain it.
3. Highest score wins; tie → earlier in field ask order.
4. Return `{ field, unlock_count: score }`, or `null` when no scheme is `needs_info`.

UI text: "Answering this could unlock up to {unlock_count} more schemes."

---

## 3. Chat turn (Gemini's job)

**Gemini only extracts facts and answers side questions. Code decides eligibility. Code picks the next question.** One Gemini call per user message.

### 3.1 `POST /api/chat`

Request:

```json
{
  "message": "naan 1st yr BE ponnu, govt school la padichen, SC",
  "profile": { },
  "asked_field": "income",
  "ui_lang": "ta"
}
```

Response:

```json
{
  "profile": { "...merged profile..." },
  "changed_fields": ["education_level", "year_of_study", "course_type", "gender", "school_6_to_12", "community"],
  "side_answer": null,
  "register": "tanglish",
  "next_question": {
    "field": "income",
    "text": "Unga family-oda varusha varumanam evlo? (approx podhum)",
    "chips": [ { "label": "Below ₹1 lakh", "value": { "min": 0, "max": 100000 } } ],
    "unlock_count": 4
  },
  "summary": { "likely_eligible": 3, "needs_info": 6, "not_eligible": 6 }
}
```

- `asked_field`: the field the bot asked last, so "80k" alone maps to `income`.
- `changed_fields`: fields whose value is new or **corrected** ("class 10 not 9" → `education_level`). The confirm card highlights these.
- `next_question.text`: from the question templates (`lib/i18n/questions`), in the student's `register`, **not** from Gemini. If `side_answer` is set, the UI shows it first, then "Anyway, …" + the question.
- `next_question` is `null` when nothing is left to ask → UI shows the confirm card → results.

### 3.2 Gemini extraction output (strict JSON, validated with zod)

```json
{
  "updates": { "education_level": "ug", "year_of_study": 1, "course_type": "engineering", "gender": "female", "school_6_to_12": "govt_all", "community": "SC" },
  "evidence": { "education_level": "1st yr BE", "gender": "ponnu", "school_6_to_12": "govt school la padichen", "community": "SC" },
  "ambiguous": [ { "field": "school_6_to_12", "reason": "did not say all of Class 6-12" } ],
  "side_answer": null,
  "register": "tanglish"
}
```

Rules given to Gemini (and checked by the test set):

1. Only fields and enum values listed in §1. Anything else is dropped by validation.
2. Only facts the student **stated or clearly implied**. "appa coolie" says nothing about income → no `income`. Never guess.
3. Ambiguous → leave the field out and add it to `ambiguous` (e.g. "BC" without saying TN or central certificate is still `community: "BC"`, but `central_obc_certificate` stays unknown).
4. A correction ("class 10 not 9", "actually I'm in 2nd year") overrides the old value.
5. A side question ("iniku date enna", "income certificate enga vaanguradhu?") → short answer in `side_answer`, in the student's register. Today's date is passed in the prompt. **Never state scheme facts in `side_answer`**; scheme facts come only from the database.
6. Never ask for or store Aadhaar or any ID number. If the student types one, ignore it.
7. `register`: `"ta"` (Tamil script), `"en"`, or `"tanglish"` (Tamil in Latin letters, often mixed with English).

### 3.3 Voice: `POST /api/transcribe`

Multipart `audio` (webm/opus from `MediaRecorder`) → `{ "text": "..." }`. Server sends the audio to Gemini with: expected languages Tamil + English, keep Tanglish as spoken, and the custom vocabulary list (scheme names, "MBC", "BC", "SC", "NMMSS", "first graduate", "polytechnic", "Pudhumai Penn", "Tamizh Pudhalvan", …). The text goes into the input box **for the student to check** before sending. Fallback when Gemini audio fails: browser Web Speech API with `lang = "ta-IN"`.

---

## 4. Other endpoints

| Method | Path | Body / query | Returns | Auth |
| --- | --- | --- | --- | --- |
| GET | `/api/schemes` | | published `Scheme[]` | public |
| GET | `/api/schemes/[id]` | | one published `Scheme` | public |
| GET | `/api/admin/schemes` | | all schemes incl. drafts, with `status` | admin |
| PUT | `/api/admin/schemes/[id]` | `{ status, data }` | saved row | admin |
| POST | `/api/admin/import` | `{ text, source_url }` | `{ draft: Scheme, warnings: string[] }` (not saved) | admin |
| POST | `/api/mcp` | MCP streamable HTTP | tools below | public |

- **Admin auth:** header `x-admin-passcode` must equal env `ADMIN_PASSCODE`. Wrong → 401.
- **Validation:** every write goes through the zod `SchemeSchema`. Invalid → 400 with the zod issues.
- **Errors:** `{ "error": { "code": "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "AI_UNAVAILABLE" | "INTERNAL", "message": "..." } }`.
- **AI down:** `/api/chat` returns `503 AI_UNAVAILABLE`; the UI switches to tap-only questions (chips), so matching still works.

### 4.1 MCP tools (last, cut first)

| Tool | Input | Output |
| --- | --- | --- |
| `match_schemes` | `{ profile }` | scheme results (§2.2) with scheme names |
| `next_question` | `{ profile }` | `{ field, question_en, unlock_count }` or `null` |
| `get_scheme` | `{ id, lang? }` | the scheme |
| `document_checklist` | `{ scheme_id, profile }` | documents after `only_if` filtering |

---

## 5. Phone storage (no login, no server copy)

| Key | Value |
| --- | --- |
| `urimai.profile` | Profile (§1) |
| `urimai.lang` | `"ta"` \| `"en"` |
| `urimai.chat` | last 30 chat bubbles |
| `urimai.applications` | `[{ scheme_id, status: "not_started" \| "docs_ready" \| "applied" \| "approved" \| "rejected", docs_checked: number[], reminder_on: "YYYY-MM-DD" \| null, updated_at }]` |

A **"Forget me on this phone"** button clears all four keys (shared family phone).

---

## 6. Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | server only | Google AI Studio key (free tier) |
| `GEMINI_MODEL` | server | primary text model for extraction and import: **Gemini 4 Hydrogen** (newest efficient model). Final choice is made by the eval (see below) |
| `GEMINI_FALLBACK_MODELS` | server | comma-separated models tried in order when the previous one returns 429 / 5xx / timeout: **Gemini 3.8 Flash, Gemini 3.5 Flash Lite, Gemini 3.1 Flash Lite**. Free-tier limits are **per model**, so the chain adds up to ~40 requests/min |
| `GEMINI_TRANSCRIBE_MODELS` | server | comma-separated models that receive voice clips through normal `generateContent` with audio input, tried in order: **Gemini 3.6 Flash, Gemini 3 Flash Preview (`gemini-3-flash-preview`), Gemini 2.5 Flash** (their own quota buckets, separate from the chat chain, ~15 requests/min together). Live API models are **not** used (WebSocket streaming is too much work for the build window) |

**Free tier on project AceBuilders** (seen Sat 21 Nov 2026; requests/min · tokens/min):

| Use | Model | RPM · TPM |
| --- | --- | --- |
| Chat primary | Gemini 4 Hydrogen | 5 · 250K |
| Chat fallback 1 | Gemini 3.8 Flash | 5 · 250K |
| Chat fallback 2 / 3 | Gemini 3.5 Flash Lite / 3.1 Flash Lite | 15 · 250K each |
| Voice | Gemini 3.6 Flash → 3 Flash Preview → 2.5 Flash | 5 · 250K each |
| Spare | Gemini 2.5 Flash Lite | 10 · 250K |
| Not worth it | Gemma 4 26B / 31B (30 RPM but only 16K TPM ≈ 3–5 of our calls/min, weaker Tamil) | |
| Not used | Live API models (unlimited RPM but WebSocket streaming), TTS, Lyria, Embedding, Decision, Robotics | |
| Not free | Gemini 4 Argon / Carbon / Neon, all Pro models, 2.0 Flash, Omni, image models | |

**Requests per day (RPD) not checked yet:** the RPD column shows usage only; hover a row or use "Compare tiers" to see the daily cap. Flash models often have a small daily cap, so run repeated evals on a Flash Lite model and the full eval on the primary only once or twice.

**Choosing the primary:** run the full eval pinned to Gemini 4 Hydrogen and to Gemini 3.5 Flash Lite. If Flash Lite's field accuracy is within 2 points and has no extra never-guess violations, make Flash Lite the primary (3× the quota, faster) and move Hydrogen into the fallback chain.

Exact API ids: confirm with the list-models command in nexen/SETUP.md §1.
| `SUPABASE_URL` | server only | |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | never sent to the browser |
| `ADMIN_PASSCODE` | server only | admin screen |

If `SUPABASE_URL` is missing, the schemes repo falls back to reading `data/schemes.seed.json` (local dev and emergencies).
