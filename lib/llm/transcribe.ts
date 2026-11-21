// Server only. Voice clip -> transcript via Gemini generateContent with audio input.
// Live API (WebSocket) is not used. Contract: docs/CONTRACTS.md §3.3.
import { ai, AiError } from "@/lib/llm/gemini";
import { VOCABULARY } from "@/lib/llm/vocabulary";

const TIMEOUT_MS = 8000;

const INSTRUCTIONS =
  "Transcribe exactly what is said. The speaker is a student in Tamil Nadu speaking Tamil, English, or Tanglish (Tamil words mixed with English). " +
  "Write Tamil words in Tamil script only if spoken as pure Tamil sentences; keep Tanglish in Latin letters as spoken. " +
  "Do not translate. Remove only filler sounds (umm, aah). " +
  "Prefer these spellings: " +
  VOCABULARY.join(", ") +
  ". Output the transcript text only.";

function transcribeModels(): string[] {
  return (process.env.GEMINI_TRANSCRIBE_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

// One model call raced against the timeout (same pattern as gemini.ts).
async function callModel(model: string, buffer: Buffer, mimeType: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: buffer.toString("base64") } },
              { text: INSTRUCTIONS },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AiError("TIMEOUT")), TIMEOUT_MS);
      }),
    ]);
    return (res.text ?? "").trim();
  } finally {
    clearTimeout(timer);
  }
}

// Tries each model in order; any failure (429, 5xx, timeout, empty text) moves to the next.
export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  for (const model of transcribeModels()) {
    try {
      const text = await callModel(model, buffer, mimeType);
      if (text.length === 0) throw new AiError("UNAVAILABLE");
      return text;
    } catch {
      // move on to the next model
    }
  }
  throw new AiError("UNAVAILABLE");
}
