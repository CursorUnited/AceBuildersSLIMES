"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { z } from "zod";
import SchemeList from "../../components/admin/SchemeList";
import SchemeEditor from "../../components/admin/SchemeEditor";
import ImportPanel from "../../components/admin/ImportPanel";
import { SchemeSchema } from "../../lib/engine/schemas";

type SchemeData = z.infer<typeof SchemeSchema>;

const STORAGE_KEY = "admin_passcode";

// zod validates the API boundary (CONTRACTS: every boundary is parsed).
const ListItemSchema = z.object({
  status: z.enum(["draft", "published"]),
  data: SchemeSchema,
  updated_at: z.string(),
});
const ListSchema = z.array(ListItemSchema);
type ListItem = z.infer<typeof ListItemSchema>;

type View = { kind: "list" } | { kind: "edit"; data: SchemeData; isNew: boolean } | { kind: "import" };

function readStoredPasscode(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredPasscode(value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable: keep passcode in component state only.
  }
}

function todayInKolkata(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function newSchemeTemplate(): SchemeData {
  return {
    id: "",
    name: { en: "", ta: "" },
    level: "state",
    states: ["TN"],
    segment: "school",
    department: "",
    benefit: { en: "", ta: "" },
    conditions: [],
    documents: [],
    apply: { mode: "online", portal_url: null, steps: [] },
    deadline: { status: "unknown", closes_on: null, note: { en: "", ta: "" } },
    sources: [],
    last_verified: todayInKolkata(),
    confidence: "medium",
  };
}

export default function AdminPage() {
  const [passcode, setPasscode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });

  const loadList = useCallback(async (pc: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schemes", {
        headers: { "x-admin-passcode": pc },
        cache: "no-store",
      });
      if (res.status === 401) {
        writeStoredPasscode(null);
        setPasscode(null);
        setItems([]);
        setError("Wrong passcode");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = ListSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("Unexpected response");
      setItems(parsed.data);
    } catch {
      setError("Could not load schemes. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore passcode from this browser session on mount.
  useEffect(() => {
    const stored = readStoredPasscode();
    if (stored) setPasscode(stored);
  }, []);

  // Load the list whenever a passcode becomes active.
  useEffect(() => {
    if (passcode) void loadList(passcode);
  }, [passcode, loadList]);

  function handleEnter(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = input.trim();
    if (!value) {
      setError("Enter the passcode");
      return;
    }
    writeStoredPasscode(value);
    setError(null);
    setPasscode(value);
  }

  function handleLogout(): void {
    writeStoredPasscode(null);
    setPasscode(null);
    setItems([]);
    setInput("");
    setView({ kind: "list" });
    setError(null);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 text-base">
      <h1 className="text-2xl font-semibold">Scheme admin</h1>

      {error && (
        <p role="alert" className="mt-3 text-base text-red-700">
          {error}
        </p>
      )}

      {passcode === null ? (
        <form onSubmit={handleEnter} className="mt-4 flex w-full max-w-sm flex-col gap-3">
          <label htmlFor="admin-passcode" className="text-base">
            Passcode
          </label>
          <input
            id="admin-passcode"
            type="password"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[44px] w-full rounded border border-gray-400 px-3 text-base"
          />
          <button type="submit" className="btn-primary min-h-[44px]">
            Enter
          </button>
        </form>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            {view.kind === "list" && (
              <button
                type="button"
                className="btn-primary min-h-[44px]"
                onClick={() => setView({ kind: "edit", data: newSchemeTemplate(), isNew: true })}
              >
                New scheme
              </button>
            )}
            {view.kind === "list" && (
              <button
                type="button"
                className="btn-outline min-h-[44px]"
                onClick={() => setView({ kind: "import" })}
              >
                Import
              </button>
            )}
            <button type="button" className="btn-outline min-h-[44px]" onClick={handleLogout}>
              Log out
            </button>
          </div>

          {view.kind === "import" ? (
            <div className="mt-6">
              <ImportPanel
                passcode={passcode}
                onSaved={() => {
                  void loadList(passcode);
                }}
                onClose={() => setView({ kind: "list" })}
              />
            </div>
          ) : view.kind === "edit" ? (
            <div className="mt-6">
              <SchemeEditor
                key={view.isNew ? "new" : view.data.id}
                initial={view.data}
                isNew={view.isNew}
                passcode={passcode}
                onSaved={() => {
                  void loadList(passcode);
                }}
                onClose={() => setView({ kind: "list" })}
              />
            </div>
          ) : (
            <div className="mt-6">
              {loading && <p className="text-base">Loading schemes…</p>}
              <SchemeList
                items={items}
                onSelect={(data) => setView({ kind: "edit", data, isNew: false })}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
