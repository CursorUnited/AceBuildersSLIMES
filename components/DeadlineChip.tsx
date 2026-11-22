// Deadline pill for a scheme card. Shape per docs/CONTRACTS.md §2 (deadline.status / closes_on / note).
import type { Scheme } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import type { Lang } from "@/lib/storage";

type Props = {
  deadline?: Scheme["deadline"];
  lang: Lang;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PILL =
  "inline-flex max-w-full items-center whitespace-normal break-words text-left rounded-[1.375rem] px-2.5 py-0.5 text-sm font-medium";

function daysLeft(closesOn: string): number {
  return Math.ceil((Date.parse(`${closesOn}T23:59:59`) - Date.now()) / DAY_MS);
}

function formatDate(closesOn: string, lang: Lang): string {
  const locale = lang === "ta" ? "ta-IN" : "en-IN";
  return new Date(`${closesOn}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export default function DeadlineChip({ deadline, lang }: Props) {
  const status = deadline?.status ?? "unknown";
  const closesOn = deadline?.closes_on ?? null;

  if (status === "rolling") {
    return <span className={`${PILL} bg-gray-200 text-gray-700`}>{t("deadlineRolling", lang)}</span>;
  }

  if (status === "open" && closesOn === null) {
    return <span className={`${PILL} bg-green-100 text-green-800`}>{t("deadlineOpenNoDate", lang)}</span>;
  }

  if (status === "open" && closesOn !== null && daysLeft(closesOn) >= 0) {
    const days = daysLeft(closesOn);
    const tone = days <= 7 ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800";
    return (
      <span className={`${PILL} ${tone}`}>
        {t("deadlineClosesOn", lang)} {formatDate(closesOn, lang)}
      </span>
    );
  }

  if (status === "closed" || status === "open") {
    const note = deadline?.note?.[lang] ?? t("deadlineClosedNote", lang);
    return (
      <div className="flex flex-col gap-1">
        <span className={`${PILL} bg-gray-200 text-gray-700`}>{t("deadlineClosed", lang)}</span>
        <p className="text-base text-gray-600">{note}</p>
      </div>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1 whitespace-normal break-words text-left text-sm text-gray-600">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      {t("deadlineUnknown", lang)}
    </span>
  );
}
