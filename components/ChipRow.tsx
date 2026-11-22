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
      {chips.map((chip, index) => {
        const selected = JSON.stringify(chip.value) === JSON.stringify(selectedValue);
        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onPick(chip.value)}
            aria-pressed={selected}
            className={`chip min-h-[44px] cursor-pointer border px-4 py-2 text-base disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? "border-accent-teal bg-accent-teal text-white"
                : "border-accent-teal/60 bg-white text-accent-teal"
            }`}
          >
            {resolveLabel(chip.label, lang)}
          </button>
        );
      })}
    </div>
  );
}
