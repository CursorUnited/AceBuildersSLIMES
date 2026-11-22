// Admin only. Drafts a scheme from pasted official text. Nothing is saved.
import { z } from "zod";
import { isAdmin } from "../../../../lib/adminAuth";
import { jsonError } from "../../../../lib/http";
import { AiError } from "../../../../lib/llm/gemini";
import { draftScheme } from "../../../../lib/llm/draftScheme";

const ImportBodySchema = z.object({
  text: z.string().min(50).max(20000),
  source_url: z.url({ protocol: /^https$/ }),
});

/** Today's date in Asia/Kolkata as YYYY-MM-DD. */
function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(req: Request): Promise<Response> {
  if (!isAdmin(req)) return jsonError(401, "UNAUTHORIZED", "Wrong passcode.");

  const body: unknown = await req.json().catch(() => null);
  const parsed = ImportBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "BAD_REQUEST", "Paste 50 to 20000 characters of official text and an https source URL.");
  }

  try {
    const result = await draftScheme({
      text: parsed.data.text,
      source_url: parsed.data.source_url,
      today: todayIST(),
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof AiError) {
      return jsonError(503, "AI_UNAVAILABLE", "The AI is busy right now. Try again in a minute.");
    }
    return jsonError(500, "INTERNAL", "Import failed. Try again.");
  }
}
