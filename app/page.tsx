"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { evaluateAll, nextQuestion, mergeProfile } from "@/lib/engine";
import { questionFor, ANYWAY } from "@/lib/i18n/questions";
import { describeFact } from "@/lib/i18n/describe";
import type { ProfileField } from "@/lib/engine/types";
import {
  getProfile,
  setProfile,
  getChat,
  setChat,
  CHAT_KEEP_LAST,
  type Profile,
} from "@/lib/storage";
import { useLang } from "@/components/LangProvider";
import { STRINGS } from "@/lib/i18n/strings";
import ChatBubble from "@/components/ChatBubble";
import ChipRow from "@/components/ChipRow";
import ConfirmCard from "@/components/ConfirmCard";
import MicButton from "@/components/MicButton";
import ProfilePanel from "@/components/ProfilePanel";

type Txt = { en: string; ta: string };
type Chip = { value: string; label: string | Txt };
type Schemes = Parameters<typeof evaluateAll>[1];
type Register = Parameters<typeof questionFor>[1];
type MergeUpdates = Parameters<typeof mergeProfile>[1];
type LocalQ = { text: Txt; chips: Chip[] };

type ChatMsg = {
  id: string;
  from: "bot" | "student";
  text: string;
  kind?: "question";
  field?: string;
  unlock_count?: number;
  chips?: Chip[];
};

type ChatOk = {
  profile: Profile;
  changed_fields: string[];
  side_answer: string | null;
  register: Register;
  next_question: { field: string; text: string; chips: Chip[]; unlock_count: number } | null;
};
type ChatErr = { error: { code: string; message: string } };


const DEFAULT_REGISTER = "casual" as Register;
const NOT_UNDERSTOOD: Record<"tanglish" | "ta" | "en", string> = {
  en: "Sorry, I didn't catch that. Please tap one of these.",
  tanglish: "Sorry, puriyala. Keela ulla option-la onna tap pannunga.",
  ta: "மன்னிக்கவும், புரியவில்லை. கீழே உள்ளவற்றில் ஒன்றைத் தட்டுங்கள்.",
};
const COULDNT_USE: Record<"tanglish" | "ta" | "en", string> = {
  en: "I couldn't use that. Please answer the question above.",
  tanglish: "Puriyala. Mela irukkira kelviku badhil sollunga.",
  ta: "அதை என்னால் பயன்படுத்த முடியவில்லை. மேலே உள்ள கேள்விக்கு பதில் சொல்லுங்கள்.",
};

let seq = 0;
function mk(from: "bot" | "student", text: string, extra?: Partial<ChatMsg>): ChatMsg {
  seq += 1;
  return { id: `${Date.now()}-${seq}`, from, text, ...extra };
}

function isKnown(profile: Profile): boolean {
  const rec = profile as unknown as Record<string, unknown>;
  return Object.values(rec).some(
    (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
}

export default function Home() {
  const { lang } = useLang();
  const pick = (t: Txt) => (lang === "ta" ? t.ta : t.en);
  const examples: Chip[] = [
    { value: pick(STRINGS.exampleClass12), label: pick(STRINGS.exampleClass12) },
    { value: pick(STRINGS.exampleFirstYear), label: pick(STRINGS.exampleFirstYear) },
    { value: pick(STRINGS.exampleFarmer), label: pick(STRINGS.exampleFarmer) },
  ];

  const [profile, setProfileState] = useState<Profile>({} as Profile);
  const [schemes, setSchemes] = useState<Schemes | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [register, setRegister] = useState<Register>(DEFAULT_REGISTER);
  const [lastChanged, setLastChanged] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevBusyRef = useRef(busy);

  // Restore profile + chat, fetch schemes once.
  useEffect(() => {
    setProfileState((getProfile() ?? {}) as Profile);
    const saved = getChat() as unknown as ChatMsg[] | null;
    setMsgs(Array.isArray(saved) ? saved.slice(-CHAT_KEEP_LAST) : []);
    setHydrated(true);
    fetch("/api/schemes")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Schemes | null) => {
        if (d) setSchemes(d);
      })
      .catch(() => {});
  }, []);

  // Persist last N messages.
  useEffect(() => {
    if (!hydrated) return;
    setChat(msgs.slice(-CHAT_KEEP_LAST) as unknown as Parameters<typeof setChat>[0]);
  }, [msgs, hydrated]);


  const results = useMemo(
    () => (schemes ? evaluateAll(profile, schemes) : []),
    [profile, schemes],
  );
  const likelyCount = results.filter((r) => r.status === "likely_eligible").length;
  const known = isKnown(profile);
  const hasText = input.trim().length > 0;
  const lastQ = useMemo(() => [...msgs].reverse().find((m) => m.kind === "question"), [msgs]);
  const lastChips = lastQ?.chips;

  // Auto-scroll to the sentinel at the end of the list.
  useEffect(() => {
    sentinelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, lastChips]);

  // Refocus the input once a reply has finished loading.
  useEffect(() => {
    if (prevBusyRef.current && !busy) inputRef.current?.focus({ preventScroll: true });
    prevBusyRef.current = busy;
  }, [busy]);

  function focusInput() {
    inputRef.current?.focus({ preventScroll: true });
  }

  function addChangedNote(
    changed: string[],
    profileAfter: Profile,
    register: "tanglish" | "ta" | "en",
  ) {
    if (changed.length === 0) return;
    setLastChanged(changed);
    const factLang = register === "en" ? "en" : "ta";
    const rec = profileAfter as unknown as Record<string, unknown>;
    const facts = changed
      .map((f) => describeFact(f as ProfileField, rec[f], factLang))
      .join(" · ");
    const lead = register === "ta" ? "புரிந்தது ✔" : register === "en" ? "Got it ✔" : "Purinjudhu ✔";
    setMsgs((m) => [...m, mk("bot", `${lead} ${facts}`)]);
  }

  // Browser-only next step, used for chip taps and the AI-unavailable fallback.
  function advanceLocal(np: Profile) {
    const next = nextQuestion(schemes ? evaluateAll(np, schemes) : []);
    if (!next) {
      setConfirmOpen(true);
      return;
    }
    const q = questionFor(next.field, register, next.unlock_count) as unknown as LocalQ;
    setMsgs((m) => [
      ...m,
      mk("bot", pick(q.text), {
        kind: "question",
        field: next.field,
        unlock_count: next.unlock_count,
        chips: q.chips,
      }),
    ]);
  }

  function handleChip(value: string) {
    if (busy || !lastQ?.field) return;
    const chip = lastQ.chips?.find((c) => c.value === value);
    const label = chip ? (typeof chip.label === "string" ? chip.label : pick(chip.label)) : value;
    const field = lastQ.field;
    const { profile: np, changed_fields } = mergeProfile(
      profile,
      { [field]: value } as MergeUpdates,
    );
    setProfileState(np);
    setProfile(np);
    setMsgs((m) => [...m, mk("student", label)]);
    addChangedNote(
      changed_fields as string[],
      np as Profile,
      lang === "ta" ? "ta" : "en",
    );
    focusInput();
    advanceLocal(np as Profile);
  }

  function fallback() {
    setMsgs((m) => [...m, mk("bot", "AI is busy right now. Tap your answer below.")]);
    advanceLocal(profile);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setMsgs((m) => [...m, mk("student", trimmed)]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          profile,
          asked_field: lastQ?.field ?? null,
          ui_lang: lang,
        }),
      });
      const data = (await res.json().catch(() => null)) as unknown as ChatOk | ChatErr | null;
      if (!res.ok || !data || "error" in data) {
        const code = data && "error" in data ? data.error.code : "";
        if (code === "AI_UNAVAILABLE") fallback();
        else setMsgs((m) => [...m, mk("bot", "Something went wrong. Please try again.")]);
        return;
      }
      setProfileState(data.profile);
      setProfile(data.profile);
      if (data.register) setRegister(data.register);
      const reg = (data.register ?? (lang === "ta" ? "ta" : "en")) as "tanglish" | "ta" | "en";
      const changed = data.changed_fields ?? [];
      addChangedNote(changed, data.profile, reg);
      if (changed.length === 0 && !data.side_answer) {
        const askedWithChips = (lastQ?.chips?.length ?? 0) > 0;
        setMsgs((m) => [...m, mk("bot", askedWithChips ? NOT_UNDERSTOOD[reg] : COULDNT_USE[reg])]);
      }
      if (data.side_answer) setMsgs((m) => [...m, mk("bot", data.side_answer as string)]);
      const nq = data.next_question;
      if (nq) {
        const lowerFirst = data.register === "en" ? nq.text.charAt(0).toLowerCase() + nq.text.slice(1) : nq.text;
        const body = data.side_answer ? `${pick(ANYWAY)} ${lowerFirst}` : nq.text;
        setMsgs((m) => [
          ...m,
          mk("bot", body, {
            kind: "question",
            field: nq.field,
            unlock_count: nq.unlock_count,
            chips: nq.chips,
          }),
        ]);
      } else {
        setConfirmOpen(true);
      }
    } catch {
      fallback();
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="mx-auto w-full lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6 lg:px-6 lg:py-6">
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-white text-base lg:h-[calc(100dvh-6rem)] lg:min-h-0 lg:max-w-none lg:overflow-hidden lg:rounded-2xl lg:border lg:border-black/10 lg:shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {msgs.length === 0 && (
          <div className="flex flex-col gap-2">
            <ChatBubble from="bot">{pick(STRINGS.welcomeTitle)}</ChatBubble>
            <p className="flex items-start gap-1.5 text-sm text-gray-600 lg:hidden">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span>{pick(STRINGS.privacyNote)}</span>
            </p>
            <ChipRow
              chips={examples}
              onPick={(v) => {
                focusInput();
                void send(v);
              }}
              disabled={busy}
              lang={lang}
            />
          </div>
        )}

        {msgs.map((m) => (
          <div key={m.id} className="flex flex-col gap-2">
            <ChatBubble from={m.from}>{m.text}</ChatBubble>
            {m.kind === "question" && m.id === lastQ?.id && m.chips && m.chips.length > 0 && (
              <ChipRow
                chips={m.chips}
                onPick={(v) => handleChip(v)}
                disabled={busy}
                lang={lang}
              />
            )}
          </div>
        ))}

        {busy && (
          <ChatBubble from="bot">
            <span className="inline-flex gap-1" aria-label="Typing">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-current"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </ChatBubble>
        )}
        <div ref={sentinelRef} />
      </div>

      {confirmOpen && (
        <ConfirmCard
          profile={profile}
          changedFields={lastChanged}
          onProfileChange={(p) => {
            setProfileState(p);
            setProfile(p);
          }}
          onClose={() => {
            setConfirmOpen(false);
            focusInput();
          }}
        />
      )}

      <div className="sticky bottom-0 border-t bg-white p-2 lg:static">
        {known && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="btn-primary mb-2 min-h-11 w-full cursor-pointer rounded-lg px-3 py-2 font-medium lg:hidden"
          >
            See my schemes now ({likelyCount} likely) -&gt;
          </button>
        )}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={busy}
            placeholder="Type here..."
            className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border px-3 py-2 text-base disabled:opacity-60"
          />
          <MicButton
            lang={lang}
            disabled={busy}
            onText={(text) => {
              setInput(text);
              focusInput();
            }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className={`min-h-[44px] min-w-[44px] rounded-lg px-4 py-2 font-medium ${
              hasText && !busy
                ? "btn-primary cursor-pointer"
                : "border border-gray-300 text-gray-500 opacity-50 cursor-not-allowed"
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </main>
    <ProfilePanel
      profile={profile}
      changedFields={lastChanged}
      results={results}
      schemes={schemes ?? []}
      lang={lang}
      onReview={() => setConfirmOpen(true)}
    />
    </div>
  );
}
