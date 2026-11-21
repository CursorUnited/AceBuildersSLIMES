import { getPublished } from "../../../lib/data/schemesRepo";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json(await getPublished());
}
