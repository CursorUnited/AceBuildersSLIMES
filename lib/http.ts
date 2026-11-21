// Shared HTTP helpers. Error codes: docs/CONTRACTS.md §4.
export type ErrorCode = "BAD_REQUEST" | "UNAUTHORIZED" | "NOT_FOUND" | "AI_UNAVAILABLE" | "INTERNAL";

export function jsonError(status: number, code: ErrorCode, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
