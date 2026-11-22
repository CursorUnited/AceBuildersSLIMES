"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import SchemeEditor from "./SchemeEditor";
import { SchemeSchema } from "../../lib/engine/schemas";

type SchemeData = z.infer<typeof SchemeSchema>;

const MIN_TEXT = 50;
const MAX_TEXT = 20000;

// zod validates the API boundary.
const ImportResponseSchema = z.object({
  draft: SchemeSchema.nullable(),
  warnings: z.array(z.string()),
});

const BUTTON_TEXT = "btn-primary min-h-[44px] px-4 text-base disabled:opacity-50 disabled:cursor-not-allowed";
const BUTTON_OUTLINE = "btn-outline min-h-[44px] px-4 text-base";
const INPUT =
  "min-h-[44px] w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-base text-foreground";

function readErrorMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    const err = body.error;
    if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
      return err.message;
    }
  }
  return null;
}

interface Props {
  passcode: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function ImportPanel({ passcode, onSaved, onClose }: Props) {
  const [pasted, setPasted] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<SchemeData | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [sourceText, setSourceText] = useState("");

  async function handleDraft(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = pasted.trim();
    const url = sourceUrl.trim();
    if (text.length < MIN_TEXT || text.length > MAX_TEXT) {
      setError(`Paste between ${MIN_TEXT} and ${MAX_TEXT} characters.`);
      return;
    }
    if (!url.startsWith("https://")) {
      setError("Enter the official page address (https://).");
      return;
    }

    setLoading(true);
    setError(null);
    setWarnings([]);
    setDraft(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({ text, source_url: url }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(readErrorMessage(body) ?? `Import failed (HTTP ${res.status}).`);
        return;
      }
      const parsed = ImportResponseSchema.safeParse(body);
      if (!parsed.success) {
        setError("Unexpected response from the server.");
        return;
      }
      setWarnings(parsed.data.warnings);
      if (parsed.data.draft === null) {
        setError("The draft could not be fixed automatically. Read the warnings, then try again or create the scheme by hand.");
        return;
      }
      setDraft(parsed.data.draft);
      setSourceText(text);
      setDraftKey((k) => k + 1);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleDraft} className="w-full max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold">Import from official text</h2>

        <label className="block text-base font-medium text-foreground">
          <span className="mb-1 block">Paste the official page text</span>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={10}
            maxLength={MAX_TEXT}
            className={`${INPUT} font-mono`}
          />
        </label>

        <label className="block text-base font-medium text-foreground">
          <span className="mb-1 block">Official page address (https)</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://"
            className={INPUT}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={BUTTON_TEXT} disabled={loading}>
            {loading ? "Drafting…" : "Draft with AI"}
          </button>
          <button type="button" className={BUTTON_OUTLINE} onClick={onClose}>
            Back to list
          </button>
        </div>
        {loading && <p className="text-base text-accent-teal">This can take about 20 seconds.</p>}
        {error && (
          <p role="alert" className="text-base text-red-700">
            {error}
          </p>
        )}
      </form>

      {warnings.length > 0 && (
        <ul
          role="status"
          className="list-disc space-y-1 rounded border border-amber-400 bg-amber-50 p-3 pl-6 text-base text-amber-900"
        >
          {warnings.map((msg, i) => (
            <li key={i} className="break-words">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {draft !== null && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <SchemeEditor
            key={draftKey}
            initial={draft}
            isNew
            passcode={passcode}
            onSaved={onSaved}
            onClose={onClose}
          />
          <section className="min-w-0 space-y-2 rounded border border-gray-200 bg-white p-4">
            <h3 className="text-lg font-semibold">Pasted source text</h3>
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words text-base">
              {sourceText}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
