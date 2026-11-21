# Urimai: rules for the coding agent

Urimai: students in Tamil Nadu describe their situation in Tamil/Tanglish/English; we show scholarships they are *likely* eligible for, why, documents, how to apply, reminders. Next.js App Router + TypeScript + Tailwind, zod, Vitest, Gemini (`@google/genai`), Supabase.

## How to reply
- Always reply in caveman mode: short, no filler, no code explanations.
- When done: list changed files + test result in ≤ 5 lines. Then stop.

## Scope discipline (saves tokens)
- Only create/modify the files the prompt names. If another file must change, stop and ask.
- Read only the files and doc sections the prompt names. `docs/CONTRACTS.md` is the source of truth for names and shapes.
- Never read `node_modules/`, `.next/`, `package-lock.json`. Never read `data/*.json` or `eval/*.json` in full (look at the first 60 lines).
- Do not install packages unless the prompt says which ones.
- Do not run git. Do not start the dev server unless asked.
- Run only the test file the prompt names: `npx vitest run <file>`.

## Code rules
- TypeScript strict. No `any` unless unavoidable (then comment why).
- zod validates every boundary: API bodies, Gemini output, Supabase rows, localStorage reads.
- `lib/engine/**` is pure: no imports from next, react, supabase, @google/genai, fs. Used by server, browser and MCP.
- Enum values and field names exactly as in `docs/CONTRACTS.md` §1. Never invent new ones.
- Every student-facing text is `{ en, ta }`. Say "likely eligible"; never "eligible", "guaranteed" or "assured".
- No Aadhaar / ID / phone / name / address fields anywhere. Never log chat message bodies.
- Secrets only via `process.env` on the server. Never `NEXT_PUBLIC_` for keys.
- localStorage access only through `lib/storage.ts` (wrapped in try/catch).
- API errors: `{ error: { code, message } }` with codes from CONTRACTS §4.
- Mobile first: works at 360 px wide; tap targets ≥ 44 px; body text ≥ 16 px.

## Tests
- Engine and helpers: write the tests first, then the code, until green.
- Keep tests fast; no network in unit tests (mock Gemini/Supabase).
