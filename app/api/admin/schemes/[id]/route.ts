import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "../../../../../lib/adminAuth";
import { jsonError } from "../../../../../lib/http";
import { getAllForAdmin, upsertScheme } from "../../../../../lib/data/schemesRepo";
import { SchemeSchema, isValidSchemeId } from "../../../../../lib/engine/schemas";

const BodySchema = z.object({
  status: z.enum(["draft", "published"]),
  data: z.unknown(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  if (!isAdmin(req)) return jsonError(401, "UNAUTHORIZED", "Unauthorized");
  if (!isValidSchemeId(id)) return jsonError(400, "BAD_REQUEST", "Invalid scheme id");

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const body = BodySchema.safeParse(raw);
  if (!body.success) {
    const issues = body.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return jsonError(400, "BAD_REQUEST", issues);
  }

  const scheme = SchemeSchema.safeParse(body.data.data);
  if (!scheme.success) {
    const issues = scheme.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return jsonError(400, "BAD_REQUEST", issues);
  }

  if (scheme.data.id !== id) return jsonError(400, "BAD_REQUEST", "Path id must match data.id");

  // Creating a new scheme must not overwrite an existing id. CONTRACTS §4 has no
  // conflict code, so 409 is paired with the closest existing code, BAD_REQUEST.
  if (req.headers.get("x-create") === "1") {
    const existing = await getAllForAdmin();
    if (existing.some((row) => row.data.id === id)) {
      return jsonError(409, "BAD_REQUEST", "A scheme with this id already exists.");
    }
  }

  await upsertScheme(id, body.data.status, scheme.data);
  return NextResponse.json({ ok: true });
}
