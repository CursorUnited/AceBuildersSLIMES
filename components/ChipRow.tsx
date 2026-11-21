"use client";

import type { ReactNode } from "react";

export type ChipLabel = string | { en: string; ta: string };
export type Chip = { value: string; label: ChipLabel };

type Props = {
  chips: Chip[];
  onPick: (value: string) => void;
  disabled?: boolean;
  selectedValue?: string;
  lang?: "en" | "ta";
};

function resolveLabel(label: ChipLabel, lang: "en" | "ta" | undefined): string {
  return typeof label === "string" ? label : label[lang ?? "en"];
}

export default function ChipRow({ chips, onPick, disabled = false, selectedValue, lang }: Props): ReactNode {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(chip.value)}
          aria-pressed={selectedValue === chip.value}
          className={`min-h-[44px] rounded-full border px-4 py-2 text-base disabled:opacity-50 ${
            selectedValue === chip.value
              ? "border-teal-700 bg-teal-700 text-white"
              : "border-teal-600 bg-white text-teal-800"
          }`}
        >
          {resolveLabel(chip.label, lang)}
        </button>
      ))}
    </div>
  );
}
