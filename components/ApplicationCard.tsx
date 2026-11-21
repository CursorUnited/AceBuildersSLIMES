"use client";

// One tracked scheme on /applications. Parent owns storage: every change comes back through onChange / onRemove.
// Also exports the reminder helpers used by /applications and /results (reminders are shown on screen only; nothing is sent).
import Link from "next/link";
import DeadlineChip from "@/components/DeadlineChip";
import { filterDocuments, type Scheme } from "@/lib/engine";
import { t, type StringKey } from "@/lib/i18n/strings";
import type { Application, Lang, Profile } from "@/lib/storage";

type Status = Application["status"];

export const STATUSES: readonly Status[] = ["not_started", "docs_ready", "applied", "approved", "rejected"];
export const FINISHED: readonly Status[] = ["applied", "approved", "rejected"];

const STATUS_KEY: Record<Status, StringKey> = {
  not_started: "statusNotStarted",
  docs_ready: "statusDocsReady",
  applied: "statusApplied",
  approved: "statusApproved",
  rejected: "statusRejected",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Today's date in IST as YYYY-MM-DD. */
export function istToday(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole days from one YYYY-MM-DD date to another (to - from). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export type Reminder = {
  app: Application;
  scheme: Scheme;
  kind: "closing" | "due";
  days: number;
};

/** Reminders for the banner: closing within 7 days (deadline open) or reminder date reached and not finished. Soonest first. */
export function buildReminders(apps: Application[], schemes: Scheme[]): Reminder[] {
  const today = istToday();
  const byId = new Map(schemes.map((s) => [s.id, s]));
  const out: Reminder[] = [];
  for (const app of apps) {
    const scheme = byId.get(app.scheme_id);
    if (!scheme) continue;
    const closesOn = scheme.deadline?.closes_on ?? null;
    if (scheme.deadline?.status === "open" && closesOn !== null) {
      const days = daysBetween(today, closesOn);
      if (days >= 0 && days <= 7) {
        out.push({ app, scheme, kind: "closing", days });
        continue;
      }
    }
    if (app.reminder_on !== null && app.reminder_on <= today && !FINISHED.includes(app.status)) {
      out.push({ app, scheme, kind: "due", days: 0 });
    }
  }
  const key = (r: Reminder) => r.scheme.deadline?.closes_on ?? "9999-12-31";
  return out.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

/** Sort: unfinished first by nearest deadline (no date last), finished at the bottom. */
export function sortApplications<T extends { app: Application; scheme: Scheme }>(items: T[]): T[] {
  const key = (x: T) => x.scheme.deadline?.closes_on ?? "9999-12-31";
  return [...items].sort((a, b) => {
    const fa = FINISHED.includes(a.app.status) ? 1 : 0;
    const fb = FINISHED.includes(b.app.status) ? 1 : 0;
    if (fa !== fb) return fa - fb;
    return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
  });
}

type Props = {
  app: Application;
  scheme: Scheme;
  profile: Profile;
  lang: Lang;
  onChange: (patch: Partial<Pick<Application, "status" | "reminder_on" | "docs_checked">>) => void;
  onRemove: () => void;
};

const TAP = "min-h-[44px] inline-flex items-center rounded-lg border border-accent-teal/30 bg-white px-3 text-base text-foreground";

export default function ApplicationCard({ app, scheme, profile, lang, onChange, onRemove }: Props) {
  const total = filterDocuments(scheme, profile).length;
  const done = app.docs_checked.length;
  const progress = t("docsProgress", lang).replace("{done}", String(done)).replace("{total}", String(total));

  function handleRemove() {
    if (window.confirm(t("removeConfirm", lang))) onRemove();
  }

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-accent-teal/30 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <DeadlineChip deadline={scheme.deadline} lang={lang} />
      </div>

      <h2 className="text-lg font-semibold text-accent-teal">{scheme.name[lang]}</h2>

      <p className="text-base text-gray-700">{progress}</p>

      <label className="flex flex-col gap-1 text-base text-gray-800">
        {t("statusLabel", lang)}
        <select
          value={app.status}
          onChange={(e) => onChange({ status: e.target.value as Status })}
          className="min-h-[44px] w-full rounded-lg border border-accent-teal/30 bg-white px-3 text-base text-foreground"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(STATUS_KEY[s], lang)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1 text-base text-gray-800">
        <label htmlFor={`reminder-${app.scheme_id}`}>{t("reminderDateLabel", lang)}</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`reminder-${app.scheme_id}`}
            type="date"
            value={app.reminder_on ?? ""}
            onChange={(e) => onChange({ reminder_on: e.target.value === "" ? null : e.target.value })}
            className="min-h-[44px] min-w-0 max-w-full rounded-lg border border-accent-teal/30 bg-white px-3 text-base text-foreground"
          />
          {app.reminder_on !== null && (
            <button type="button" onClick={() => onChange({ reminder_on: null })} className={`${TAP} btn-outline cursor-pointer`}>
              {t("clearDate", lang)}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/scheme/${scheme.id}`} className="link inline-flex min-h-[44px] cursor-pointer items-center text-base font-medium">
          {t("openScheme", lang)}
        </Link>
        <button type="button" onClick={handleRemove} className={`${TAP} ml-auto cursor-pointer text-red-700`}>
          {t("removeApp", lang)}
        </button>
      </div>
    </article>
  );
}
