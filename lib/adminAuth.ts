import { timingSafeEqual } from "crypto";

export function isAdmin(req: Request): boolean {
  const header = req.headers.get("x-admin-passcode");
  const expected = process.env.ADMIN_PASSCODE;
  if (!header || !expected) return false;

  const provided = Buffer.from(header);
  const actual = Buffer.from(expected);
  if (provided.length !== actual.length) return false;

  return timingSafeEqual(provided, actual);
}
