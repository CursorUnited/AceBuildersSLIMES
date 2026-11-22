"use client";

import type { ReactNode } from "react";

type Props = {
  from: "bot" | "student";
  children: ReactNode;
};

export default function ChatBubble({ from, children }: Props) {
  const isStudent = from === "student";
  return (
    <div className={`flex w-full ${isStudent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-line break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-base leading-relaxed shadow-sm ${
          isStudent
            ? "rounded-br-sm bg-accent-teal text-white"
            : "rounded-bl-sm bg-white text-slate-800"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
