import { describe, expect, it } from "vitest";
import { googleCalendarUrl, makeIcs } from "../lib/calendar";

const NOW = new Date("2025-01-01T10:00:00Z");

describe("makeIcs", () => {
  const events = [
    {
      uid: "abc-reminder@urimai",
      title: "Urimai: Scholarship, Tamil Nadu; a\\b",
      description: "Line one\nhttps://example.test/scheme/abc",
      date: "2025-01-15",
      alarmHoursAfterStart: 9,
    },
    {
      uid: "abc-deadline@urimai",
      title: "Urimai: Deadline",
      description: "Deadline day",
      date: "2025-01-31",
      alarmHoursAfterStart: -15,
    },
  ];
  const ics = makeIcs(events, NOW);

  it("contains a VEVENT block with the date-only DTSTART", () => {
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20250115");
    expect(ics).toContain("UID:abc-reminder@urimai");
  });

  it("computes DTEND as the next day using UTC arithmetic (month rollover)", () => {
    expect(ics).toContain("DTEND;VALUE=DATE:20250116");
    expect(ics).toContain("DTEND;VALUE=DATE:20250201");
  });

  it("writes DTSTAMP in YYYYMMDDTHHMMSSZ form", () => {
    expect(ics).toContain("DTSTAMP:20250101T100000Z");
  });

  it("contains a VALARM with positive and negative triggers", () => {
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("ACTION:DISPLAY");
    expect(ics).toContain("TRIGGER:PT9H");
    expect(ics).toContain("TRIGGER:-PT15H");
  });

  it("uses CRLF line endings on every line and no bare LF", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    expect(ics.replace(/\r\n/g, "")).not.toContain("\r");
  });

  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(ics).toContain("SUMMARY:Urimai: Scholarship\\, Tamil Nadu\\; a\\\\b");
    expect(ics).toContain("DESCRIPTION:Line one\\nhttps://example.test/scheme/abc");
  });

  it("declares the Urimai product id", () => {
    expect(ics).toContain("PRODID:-//Urimai//EN");
  });
});

describe("googleCalendarUrl", () => {
  const url = googleCalendarUrl({
    title: "Urimai: Scholarship, Tamil Nadu",
    description: "Check & apply",
    date: "2025-01-31",
  });

  it("uses the Google render template with the encoded title", () => {
    expect(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE&")).toBe(true);
    expect(url).toContain(`text=${encodeURIComponent("Urimai: Scholarship, Tamil Nadu")}`);
  });

  it("encodes the description", () => {
    expect(url).toContain(`details=${encodeURIComponent("Check & apply")}`);
  });

  it("uses the next day as the end date", () => {
    expect(url).toContain("dates=20250131/20250201");
  });
});
