import { getPublishedById } from "../../../../lib/data/schemesRepo";
import { jsonError } from "../../../../lib/http";



export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const scheme = await getPublishedById(id);
  if (!scheme) return jsonError(404, "NOT_FOUND", `No published scheme with id "${id}"`);
  return Response.json(scheme);
}
