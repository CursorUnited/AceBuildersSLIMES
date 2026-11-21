"use client";

// My applications: tracked schemes from phone storage, joined to /api/schemes. Changes are written back to storage here.
import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import ApplicationCard, { buildReminders, sortApplications } from "@/components/ApplicationCard";
import { SchemeSchema, type Scheme } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import {
  getApplications,
  getLang,
  getProfile,
  setApplications,
  type Application,
  type Lang,
  type Profile,
} from "@/lib/storage";

const SchemesSchema = z.array(SchemeSchema);

export default function ApplicationsPage() {
  const [lang, setLang] = useState<Lang>("ta");
  const [profile, setProfileState] = useState<Profile>({});
  const [apps, setApps] = useState<Application[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLang(getLang());
    setProfileState(getProfile());
    setApps(getApplications());

    let cancelled = false;
    fetch("/api/schemes")
      .then((res) => {
        if (!res.ok) throw new Error("schemes request failed");
        return res.json();
      })
      .then((json: unknown) => {
        const parsed = SchemesSchema.safeParse(json);
        if (!parsed.success) throw new Error("schemes response invalid");
        if (!cancelled) setSchemes(parsed.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Writes the full list back (keeps applications whose scheme is gone, so nothing is lost).
  function writeApps(next: Application[]) {
    setApplications(next);
    setApps(next);
  }

  function updateApp(schemeId: string, patch: Partial<Pick<Application, "status" | "reminder_on" | "docs_checked">>) {
    const now = new Date().toISOString();
    writeApps(apps.map((a) => (a.scheme_id === schemeId ? { ...a, ...patch, updated_at: now } : a)));
  }

  function removeApp(schemeId: string) {
    writeApps(apps.filter((a) => a.scheme_id !== schemeId));
  }

  const ready = !loading && !failed;
  const byId = new Map(schemes.map((s) => [s.id, s]));
  const joined = apps
    .map((app) => ({ app, scheme: byId.get(app.scheme_id) }))
    .filter((x): x is { app: Application; scheme: Scheme } => x.scheme !== undefined);
  const list = sortApplications(joined);
  const reminders = ready ? buildReminders(apps, schemes) : [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-accent-teal">{t("myApplications", lang)}</h1>
        <Link href="/results" className="link inline-flex min-h-[44px] w-fit cursor-pointer items-center text-base font-medium">
          {t("resultsTitle", lang)}
        </Link>
      </header>

      {reminders.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg bg-accent-turmeric/20 p-3 text-base text-foreground">
          {reminders.map((r) => {
            const label =
              r.kind === "closing"
                ? r.days === 0
                  ? t("reminderClosesToday", lang)
                  : t("reminderCloses", lang).replace("{n}", String(r.days))
                : t("reminderDue", lang);
            return (
              <p key={r.app.scheme_id}>
                {label}: {r.scheme.name[lang]}
              </p>
            );
          })}
        </section>
      )}

      {!ready && !failed && <p className="text-base text-gray-700">{t("loadingApplications", lang)}</p>}
      {failed && <p className="text-base text-red-700">{t("loadFailed", lang)}</p>}

      {ready && list.length === 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-base text-gray-700">{t("applicationsEmpty", lang)}</p>
          <Link href="/results" className="link inline-flex min-h-[44px] w-fit cursor-pointer items-center text-base font-medium">
            {t("trackFromResults", lang)}
          </Link>
        </div>
      )}

      {ready && list.length > 0 && (
        <section className="flex flex-col gap-3">
          {list.map(({ app, scheme }) => (
            <ApplicationCard
              key={app.scheme_id}
              app={app}
              scheme={scheme}
              profile={profile}
              lang={lang}
              onChange={(patch) => updateApp(app.scheme_id, patch)}
              onRemove={() => removeApp(app.scheme_id)}
            />
          ))}
        </section>
      )}
    </main>
  );
}
