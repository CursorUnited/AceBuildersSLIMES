<div align="center">

<img src="docs/urimai-banner.svg" alt="Urimai: claim what's yours" width="100%">

<br>

**Tell us about yourself in Tamil or English. We find the government scholarships you can claim.** 🎓

### 🌐 Live app: **[https://urimai-sigma.vercel.app](https://urimai-sigma.vercel.app)**

[![Live demo](https://img.shields.io/badge/live%20demo-urimai--sigma.vercel.app-0F4C5C?style=for-the-badge)](https://urimai-sigma.vercel.app)
[![MCP](https://img.shields.io/badge/MCP-server-E9A23B?style=for-the-badge)](#-one-engine-two-doors)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash%20Lite-4285F4?logo=googlegemini&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)
![Vitest](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)

*Codebenders ACE Builders' Hackathon 2026 · Problem statement 5: "Claim What's Yours"*

</div>

---

## ⚡ Try it in 30 seconds

1. Open **[urimai-sigma.vercel.app](https://urimai-sigma.vercel.app)** on a phone or laptop.
2. Type (or tap 🎤 and say): `naan 10th padikren, ponnu, SC, govt school`
3. Watch the **What I understood** panel fill in, answer the next question, then press **See my schemes**.
4. Open a scheme, tick your documents, press **Track**, and add the deadline to your calendar.
5. Using an AI agent? Connect the MCP server: `https://urimai-sigma.vercel.app/api/mcp` ([details](#-one-engine-two-doors)).

## 🎯 The problem

Thousands of Tamil Nadu students (Class 8 to college) qualify for scholarships and fee concessions they never claim. The rules sit in long English notices, they change every year, and nobody tells a Class 10 student which three of fifteen schemes apply to *her*.

**Urimai** (உரிமை, "the right to claim") lets a student just talk. She types or speaks in Tamil, English or Tanglish ("naan 10th padikren, SC, appa coolie"), and Urimai answers with the schemes she is **likely eligible** for, the one question that would unlock the most schemes next, the documents to bring, and the deadline.

## ⚙️ How it works

```
 student message ──► Gemini ──► facts (JSON) ──► rule engine ──► likely / one detail away / no match
 "naan 10th padikren"  extracts      validated       pure TypeScript     + next best question
  SC, ponnu"           only facts    with zod        no I/O, no AI        + documents + deadline
```

**Gemini is a translator, not a judge.** It turns messy language into fixed fields and never decides eligibility. A pure, tested rule engine decides. The same engine runs on the server and in the browser, so changing an answer re-checks every scheme instantly.

| Layer | What it does | Where |
| --- | --- | --- |
| 🗣️ Extraction | Tamil / Tanglish / English → profile fields | `lib/llm/` |
| ⚖️ Rule engine | Three-valued eligibility (pass / fail / unknown), next-best question, document filter | `lib/engine/` |
| 🗄️ Scheme rules | 15 central and Tamil Nadu schemes as data, editable without code | Supabase + `data/schemes.seed.json` |
| 💬 Chat + results | Mobile-first chat, live "What I understood" panel on desktop, scheme pages | `app/`, `components/` |

## ✨ What you can do

| | Feature |
| --- | --- |
| 💬 | Chat in Tamil, English or Tanglish. Fix yourself any time ("actually I'm in class 11"). |
| 🎙️ | Speak instead of type. Gemini transcribes, the browser's speech API is the fallback. |
| ❓ | Smart next question: always the one that unlocks the most schemes ("Tell me this and I can show 4 more"). |
| ✅ | Results in three honest groups: **Likely eligible**, **One detail away**, **Doesn't match your answers**. Every ✓ or ✗ shows its reason. |
| 📄 | Per-scheme document checklist, filtered to *your* situation. |
| ⏰ | Track schemes, tick documents, set a reminder and add it to your phone's calendar (`.ics` or Google Calendar). |
| 🛠️ | Admin screen: edit rules, **preview as a student** (3 personas), publish, mark verified. |
| 🤖 | **AI import**: paste an official page, get a drafted scheme with Tamil text and warnings, review, publish. |
| 🔌 | MCP server: any AI agent can ask Urimai what a student can claim. |

## 🛡️ The "never guess" rules

A wrong "you qualify" is worse than "tell me more", so the app is built to under-claim:

- Eligibility wording is always **"likely eligible"**. The office makes the final decision, and every scheme shows its source and *last verified* date.
- Gemini only **extracts stated facts**. "Appa coolie" never becomes an income. "OBC" never becomes a Tamil Nadu community. A value that bundles two facts (like govt-aided *and* Tamil medium) is only set when both are stated.
- Unknown stays unknown. The engine is three-valued, so a missing fact makes a scheme **"one detail away"**, never a quiet "no".
- No Aadhaar or ID number is ever asked for or stored. If a student types one, it is ignored.
- Questions and chips are fixed templates in Tamil, English and Tanglish, so the question wording never depends on an AI.

## 📊 Honest evaluation

We keep a 44-case slang test set (`eval/slang_testset.json`): Tanglish, Tamil script, typos, corrections, side questions, and traps that tempt a model to guess.

| Latest full run | Result |
| --- | --- |
| Expected facts extracted correctly | **98.2%** (110 / 112) |
| Facts the model invented (never-guess violations) | **0** |
| Cases passing end to end | **42 / 44** |

> Read this honestly: the cases were written by us, and the prompt was tuned against them, so this is a **development set, not an independent benchmark**. Several cases exist because manual testing found a real bug first (a guessed school medium, a course answer overwriting the grade, "9th" read as class 10). The set grows from real failures.
>
> Two consecutive full runs both scored 110/112 facts and 0 inventions, but a *different* pair of cases missed each time. The model occasionally leaves a stated fact out (a safe failure: the student is simply asked again) and never made one up.

```bash
npx tsx --env-file=.env.local eval/run-eval.ts            # all cases
npx tsx --env-file=.env.local eval/run-eval.ts --only=T07,T23
```

## 🔌 One engine, two doors

The same engine that powers the web app is exposed as an **MCP server** (Streamable HTTP, stateless, no login):

```
https://urimai-sigma.vercel.app/api/mcp
```

| Tool | Does |
| --- | --- |
| `match_schemes` | Every scheme with status (likely / needs info / not eligible), reasons, benefit, deadline |
| `next_question` | The next profile field to ask, and how many schemes it unlocks |
| `get_scheme` | One scheme in English or Tamil: apply steps, documents, deadline, sources |
| `document_checklist` | Documents for a scheme, filtered to the student's profile |

Add it to an MCP client (Zed, Claude, Antigravity, MCP Inspector):

```json
{ "context_servers": { "urimai": { "url": "https://urimai-sigma.vercel.app/api/mcp" } } }
```

Then ask: *"Use the urimai tools: I'm a first-year B.E. girl from a govt school in Tamil Nadu, SC, income 90k, first graduate. What can I apply for?"*

## 🗂️ Rules live in a database, not in code

Each scheme is a JSON document in Supabase (`schemes` table): conditions, documents, apply steps, deadline, sources, `last_verified`, confidence. A non-developer can fix a rule at `/admin` (passcode-protected; ask the team for a demo passcode), check it with **Preview as student**, and publish. No deploy. `data/schemes.seed.json` seeds the table (`scripts/seed-supabase.ts`).

15 schemes today: NMMSS, Pre-Matric (SC and Minorities), Public Exam Fee, Free Bicycle, Pudhumai Penn, Tamizh Pudhalvan, Post-Matric (SC/ST/SCC, BC/MBC/DNC, Minorities), First Graduate Concession, 7.5% Govt School Quota, PM-USP, AICTE Pragati and Saksham.

## 🔒 Privacy

- The student's profile, chat and tracked schemes live **only in the phone's own storage** (`localStorage`). No account, no login. "Forget me" wipes it.
- The server holds no student data. Message text is sent to the Gemini API for extraction and is never logged by us.
- Admin routes need a passcode header and fail closed when it is unset.

## 🚀 Run it yourself

```bash
git clone https://github.com/CursorUnited/AceBuildersSLIMES.git
cd AceBuildersSLIMES
npm install
# create .env.local with the variables below, then:
npm run dev                    # http://localhost:3000
```

| Variable | Needed for |
| --- | --- |
| `GEMINI_API_KEY` | extraction, voice, AI import (free tier is enough) |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS` | fast text models, tried in order on 429 / timeout |
| `GEMINI_TRANSCRIBE_MODELS` | voice transcription models |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | scheme rules (without them the app falls back to the seed file) |
| `ADMIN_PASSCODE` | the `/admin` screen |

```bash
npm test           # engine, schemas, API contracts, calendar, MCP tools (vitest)
npm run build      # production build
npx tsx --env-file=.env.local scripts/seed-supabase.ts   # load the seed schemes
```

## 🧱 Project map

```
app/
  page.tsx                chat + live "What I understood" panel (desktop)
  results/  scheme/[id]/  applications/  admin/
  api/  chat  schemes  transcribe  admin/*  [transport] (MCP)
lib/
  engine/                 pure rule engine: evaluate, nextQuestion, documents, mergeProfile
  llm/                    Gemini client, extraction prompt, voice, AI import
  i18n/                   question templates (ta / en / tanglish), UI strings
eval/                     44-case slang test set + runner
data/schemes.seed.json    the 15 schemes
```

## ⚠️ Known limits

- **Rules are a snapshot.** Verified from public sources on 21 Nov 2026. Always check the official page (every scheme links it). Amounts and dates change yearly.
- **Free-tier Gemini.** Fine for a demo; rate limits apply, and free-tier terms may allow Google to use prompts. Use a paid key for real students.
- **Voice** is tested with English clips. Tamil and Tanglish speech quality depends on the Gemini model and the phone.
- **Reminders** are calendar entries, not push notifications. A website cannot ring a closed phone.
- **Coverage:** 15 schemes, Tamil Nadu plus central. Other states are a data job, not a code job.
- **Next:** a WhatsApp channel on the same engine.

## 🙌 Built with

Next.js 16 · TypeScript · Tailwind CSS 4 · Zod · Gemini · Supabase · Vercel · Model Context Protocol

<div align="center">

<br>

**[urimai-sigma.vercel.app](https://urimai-sigma.vercel.app)** · *claim what's yours*

</div>
