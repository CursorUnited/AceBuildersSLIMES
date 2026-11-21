import { getPublished } from "../../../lib/data/schemesRepo";



export async function GET(): Promise<Response> {
  return Response.json(await getPublished());
}
