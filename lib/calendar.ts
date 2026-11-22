// Pure calendar helpers: iCalendar (RFC 5545) text and Google Calendar template URLs. No DOM, no framework imports.

export type IcsEvent = {
  uid: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  /** Positive = alarm fires this many hours after the start; negative = before. */
  alarmHoursAfterStart: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string): void {
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`Invalid date: ${date}`);
  }
}

/** YYYY-MM-DD -> YYYYMMDD. */
function compactDate(date: string): string {
  return date.replace(/-/g, "");
}

/** The day after a YYYY-MM-DD date, as YYYY-MM-DD (UTC arithmetic, safe across month/year ends). */
function nextDay(date: string): string {
  assertDate(date);
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

/** RFC 5545 TEXT escaping: backslash, semicolon, comma, newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Current time as YYYYMMDDTHHMMSSZ (UTC). */
function dtstamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function alarmTrigger(hours: number): string {
  const sign = hours < 0 ? "-" : "";
  return `TRIGGER:${sign}PT${Math.abs(hours)}H`;
}

/** Builds a VCALENDAR with one all-day VEVENT (plus a VALARM) per event. Lines are CRLF-terminated. */
export function makeIcs(events: IcsEvent[], now: Date = new Date()): string {
  const stamp = dtstamp(now);
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Urimai//EN", "CALSCALE:GREGORIAN"];
  for (const ev of events) {
    assertDate(ev.date);
    const title = escapeIcsText(ev.title);
    const description = escapeIcsText(ev.description);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(ev.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(ev.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(ev.date))}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${title}`,
      alarmTrigger(ev.alarmHoursAfterStart),
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map((line) => `${line}\r\n`).join("");
}

/** Google Calendar "add event" URL for an all-day event on `date`. */
export function googleCalendarUrl({ title, description, date }: { title: string; description: string; date: string }): string {
  const dates = `${compactDate(date)}/${compactDate(nextDay(date))}`;
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&details=${encodeURIComponent(description)}` +
    `&dates=${dates}`
  );
}
