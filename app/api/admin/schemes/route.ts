import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/adminAuth";
import { jsonError } from "../../../../lib/http";
import { getAllForAdmin } from "../../../../lib/data/schemesRepo";

export async function GET(req: Request): Promise<Response> {
  if (!isAdmin(req)) return jsonError(401, "UNAUTHORIZED", "Unauthorized");
  return NextResponse.json(await getAllForAdmin());
}
