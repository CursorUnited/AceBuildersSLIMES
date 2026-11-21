import { describe, it, expect, afterEach } from "vitest";
import { isAdmin } from "../lib/adminAuth";

const originalPasscode = process.env.ADMIN_PASSCODE;

function makeRequest(passcode?: string): Request {
  const headers: Record<string, string> = {};
  if (passcode !== undefined) headers["x-admin-passcode"] = passcode;
  return new Request("http://localhost/api/admin/schemes", { headers });
}

afterEach(() => {
  if (originalPasscode === undefined) {
    delete process.env.ADMIN_PASSCODE;
  } else {
    process.env.ADMIN_PASSCODE = originalPasscode;
  }
});

describe("isAdmin", () => {
  it("returns true for the correct passcode", () => {
    process.env.ADMIN_PASSCODE = "correct-pass";
    expect(isAdmin(makeRequest("correct-pass"))).toBe(true);
  });

  it("returns false for a wrong passcode of the same length", () => {
    process.env.ADMIN_PASSCODE = "correct-pass";
    expect(isAdmin(makeRequest("wrong-pass!"))).toBe(false);
  });

  it("returns false when ADMIN_PASSCODE is unset", () => {
    delete process.env.ADMIN_PASSCODE;
    expect(isAdmin(makeRequest("correct-pass"))).toBe(false);
  });

  it("returns false for a passcode of a different length", () => {
    process.env.ADMIN_PASSCODE = "correct-pass";
    expect(isAdmin(makeRequest("correct"))).toBe(false);
  });
});
