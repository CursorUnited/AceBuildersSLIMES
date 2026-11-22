"use client";

import { useState } from "react";
import type { z } from "zod";
import type { SchemeSchema } from "../../lib/engine/schemas";

export type SchemeData = z.infer<typeof SchemeSchema>;

type Filter = "all" | "drafts" | "stale";

const STALE_AFTER_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isStale(lastVerified: string, now: number): boolean {
  const verifiedAt = Date.parse(`${lastVerified}T00:00:00Z`);
  if (Number.isNaN(verifiedAt)) return false;
  return now - verifiedAt > STALE_AFTER_DAYS * MS_PER_DAY;
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "stale", label: "Stale" },
];

export default function SchemeList(props: {
  items: { status: string; data: SchemeData; updated_at: string }[];
  onSelect: (data: SchemeData) => void;
}) {
  const { items, onSelect } = props;
  const [filter, setFilter] = useState<Filter>("all");
  const now = Date.now();

  const rows = items
    .map((item) => ({
      item,
      stale: isStale(item.data.last_verified, now),
    }))
    .filter(({ item, stale }) => {
      if (filter === "drafts") return item.status === "draft";
      if (filter === "stale") return stale;
      return true;
    });

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div role="group" aria-label="Filter schemes" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className="chip min-h-[44px] px-4 text-base"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-base">No schemes match this filter.</p>
      ) : (
        <ul className="flex w-full flex-col gap-2">
          {rows.map(({ item, stale }) => (
            <li key={item.data.id} className="w-full min-w-0">
              <button
                type="button"
                onClick={() => onSelect(item.data)}
                className="flex w-full flex-col items-start gap-1 text-left rounded-xl border border-accent-teal/30 bg-white px-4 py-3 text-base hover:bg-accent-teal/5 active:scale-[0.99] cursor-pointer transition min-h-[44px]"
              >
                <span className="flex w-full min-w-0 flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words font-medium">{item.data.name.en}</span>
                  {stale ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-sm text-white">
                      needs re-check
                    </span>
                  ) : null}
                </span>
                <span className="w-full min-w-0 break-words text-base">
                  {item.data.level} · {item.data.states.join(", ")}
                </span>
                <span className="w-full min-w-0 break-words text-base">
                  Status: {item.status} · Last verified: {item.data.last_verified} · Confidence:{" "}
                  {item.data.confidence}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
