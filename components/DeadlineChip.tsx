// Deadline pill for a scheme card. Shape per docs/CONTRACTS.md §2 (deadline.status / closes_on / note).
import type { Scheme } from "@/lib/engine";
import { t } from "@/lib/i18n/strings";
import type { Lang } from "@/lib/storage";

type Props = {
  deadline?: Scheme["deadline"];
  lang: Lang;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PILL = "inline-flex min-h-[44px] items-center rounded-full px-3 py-1 text-base font-medium";

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

  return <span className={`${PILL} bg-gray-200 text-gray-700`}>{t("deadlineUnknown", lang)}</span>;
}
