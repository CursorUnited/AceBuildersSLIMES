// Server only. Gemini JSON client with model fallback, 8s timeout and one JSON retry.
import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_TIMEOUT_MS = 10000;
const TIMEOUT_MS = (() => {
  const raw = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
})();
const JSON_RETRY_SUFFIX = "\nReturn valid JSON only.";

export function modelChain(): string[] {
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? "").split(",");
  return [process.env.GEMINI_MODEL, ...fallbacks]
    .filter((m): m is string => m !== undefined)
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

export class AiError extends Error {
  code: "BAD_JSON" | "TIMEOUT" | "UNAVAILABLE";

  constructor(code: "BAD_JSON" | "TIMEOUT" | "UNAVAILABLE") {
    super(code);
    this.name = "AiError";
    this.code = code;
  }
}

// One model call raced against the timeout. HTTP 429/5xx/4xx all surface as
// thrown errors from the SDK; the caller moves on to the next model for any of them.
async function callModel(model: string, system: string, userText: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userText }] }],
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          temperature: 0,
        },
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AiError("TIMEOUT")), TIMEOUT_MS);
      }),
    ]);
    return res.text ?? "";
  } finally {
    clearTimeout(timer);
  }
}

// Calls one model; parses JSON, retrying once on the same model if parsing fails.
async function runOnModel(model: string, system: string, userText: string): Promise<unknown> {
  const first = await callModel(model, system, userText);
  try {
    return JSON.parse(first) as unknown;
  } catch {
    // fall through to the single retry
  }

  const second = await callModel(model, system, userText + JSON_RETRY_SUFFIX);
  try {
    return JSON.parse(second) as unknown;
  } catch {
    throw new AiError("BAD_JSON");
  }
}

export async function generateJson(opts: {
  system: string;
  user: string;
  model?: string;
}): Promise<unknown> {
  const models = opts.model ? [opts.model] : modelChain();
  const failures: Array<"TIMEOUT" | "UNAVAILABLE"> = [];

  for (const model of models) {
    try {
      return await runOnModel(model, opts.system, opts.user);
    } catch (err) {
      if (err instanceof AiError && err.code === "BAD_JSON") throw err;
      failures.push(err instanceof AiError && err.code === "TIMEOUT" ? "TIMEOUT" : "UNAVAILABLE");
    }
  }

  const allTimeouts = failures.length > 0 && failures.every((f) => f === "TIMEOUT");
  throw new AiError(allTimeouts ? "TIMEOUT" : "UNAVAILABLE");
}
