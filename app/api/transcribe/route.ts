// Server only. POST /api/transcribe: multipart "audio" -> { text }. Contract: docs/CONTRACTS.md §3.3, §4.
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { AiError } from "@/lib/llm/gemini";
import { transcribeAudio } from "@/lib/llm/transcribe";

const MAX_BYTES = 1.5 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Send multipart form data with an audio field.");
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return jsonError(400, "BAD_REQUEST", "Missing audio file.");
  }
  if (!audio.type.startsWith("audio/")) {
    return jsonError(400, "BAD_REQUEST", "File must be audio.");
  }
  if (audio.size > MAX_BYTES) {
    return jsonError(400, "BAD_REQUEST", "Audio clip is too large.");
  }

  // Drop codec params: "audio/webm;codecs=opus" -> "audio/webm".
  const mimeType = audio.type.split(";")[0]?.trim() ?? "";

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const text = await transcribeAudio(buffer, mimeType);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof AiError) {
      return jsonError(503, "AI_UNAVAILABLE", "Voice service is busy. Please type instead.");
    }
    return jsonError(500, "INTERNAL", "Something went wrong.");
  }
}
