"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { SchemeSchema } from "../../lib/engine/schemas";
import { evaluateScheme } from "../../lib/engine/evaluate";
import type { ConditionResult, Profile, Scheme, SchemeStatus } from "../../lib/engine/types";

export type SchemeData = Scheme;

interface Props {
  initial: SchemeData;
  isNew: boolean;
  passcode: string;
  onSaved: () => void;
  onClose: () => void;
}

/** Flat string state for every input. JSON blocks stay as text until parsed. */
interface Form {
  id: string;
  nameEn: string;
  nameTa: string;
  level: string;
  states: string;
  segment: string;
  department: string;
  benefitEn: string;
  benefitTa: string;
  conditions: string;
  documents: string;
  apply: string;
  deadlineStatus: string;
  closesOn: string;
  deadlineNoteEn: string;
  deadlineNoteTa: string;
  sources: string;
  lastVerified: string;
  confidence: string;
  notes: string;
}

interface Built {
  data: SchemeData | null;
  errors: string[];
}

const PERSONA_NAMES = ["Kavya", "Arun", "Fathima"] as const;
type PersonaName = (typeof PERSONA_NAMES)[number];

const PERSONAS: Record<PersonaName, Profile> = {
  Kavya: {
    state: "TN",
    education_level: "ug",
    year_of_study: 1,
    course_type: "engineering",
    aicte_approved: true,
    institution_type: "govt",
    gender: "female",
    community: "SC",
    religion: "hindu",
    income: { min: 0, max: 100000 },
    school_6_to_12: "govt_all",
    first_graduate: true,
    admission_route: "govt_school_7_5_quota",
    disability_percent: 0,
  },
  Arun: {
    state: "TN",
    education_level: "class_8",
    current_school_type: "govt",
    medium: "tamil",
    gender: "male",
    community: "MBC",
    religion: "hindu",
    income: { min: 100001, max: 200000 },
    rural: true,
    last_exam_percent: 72,
  },
  Fathima: {
    state: "TN",
    education_level: "class_12",
    current_school_type: "govt_aided",
    medium: "english",
    gender: "female",
    community: "BCM",
    religion: "muslim",
    income: { min: 100001, max: 200000 },
    last_exam_percent: 78,
  },
};

const STATUS_LABEL: Record<SchemeStatus, string> = {
  likely_eligible: "Likely eligible",
  needs_info: "Needs more info",
  not_eligible: "Does not match",
};

const RESULT_ICON: Record<ConditionResult, string> = {
  pass: "✓",
  fail: "✗",
  unknown: "?",
  check: "?",
};

const INPUT =
  "min-h-[44px] w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-base text-foreground";
const TEXTAREA = `${INPUT} font-mono`;
const BUTTON = "btn-outline px-4 text-base disabled:opacity-50 disabled:cursor-not-allowed";

function toForm(s: SchemeData): Form {
  return {
    id: s.id,
    nameEn: s.name.en,
    nameTa: s.name.ta,
    level: s.level,
    states: s.states.join(", "),
    segment: s.segment,
    department: s.department,
    benefitEn: s.benefit.en,
    benefitTa: s.benefit.ta,
    conditions: JSON.stringify(s.conditions, null, 2),
    documents: JSON.stringify(s.documents, null, 2),
    apply: JSON.stringify(s.apply, null, 2),
    deadlineStatus: s.deadline.status,
    closesOn: s.deadline.closes_on ?? "",
    deadlineNoteEn: s.deadline.note.en,
    deadlineNoteTa: s.deadline.note.ta,
    sources: s.sources.join("\n"),
    lastVerified: s.last_verified,
    confidence: s.confidence,
    notes: s.notes ?? "",
  };
}

function parseJson(text: string, label: string, errors: string[]): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    errors.push(`Invalid JSON in ${label}`);
    return undefined;
  }
}

/** Rebuilds the whole scheme from form state and validates it with SchemeSchema. */
function build(f: Form): Built {
  const errors: string[] = [];
  const conditions = parseJson(f.conditions, "conditions", errors);
  const documents = parseJson(f.documents, "documents", errors);
  const apply = parseJson(f.apply, "apply", errors);
  if (errors.length > 0) return { data: null, errors };

  const closesOn = f.closesOn.trim();
  const candidate = {
    id: f.id.trim(),
    name: { en: f.nameEn, ta: f.nameTa },
    level: f.level,
    states: f.states.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
    segment: f.segment,
    department: f.department,
    benefit: { en: f.benefitEn, ta: f.benefitTa },
    conditions,
    documents,
    apply,
    deadline: {
      status: f.deadlineStatus,
      closes_on: closesOn === "" ? null : closesOn,
      note: { en: f.deadlineNoteEn, ta: f.deadlineNoteTa },
    },
    sources: f.sources.split("\n").map((s) => s.trim()).filter((s) => s.length > 0),
    last_verified: f.lastVerified.trim(),
    confidence: f.confidence,
    notes: f.notes.trim() === "" ? undefined : f.notes,
  };

  const parsed = SchemeSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      data: null,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "scheme"}: ${i.message}`),
    };
  }
  return { data: parsed.data, errors: [] };
}

function readErrorMessage(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    const err = body.error;
    if (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string") {
      return err.message;
    }
  }
  return null;
}

/** Today's date in Asia/Kolkata as YYYY-MM-DD. */
function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-base font-medium text-foreground">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

export default function SchemeEditor({ initial, isNew, passcode, onSaved, onClose }: Props) {
  const [form, setForm] = useState<Form>(() => toForm(initial));
  const [persona, setPersona] = useState<PersonaName>("Kavya");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const built = useMemo(() => build(form), [form]);
  const valid = built.data !== null;
  const preview = useMemo(
    () => (built.data ? evaluateScheme(PERSONAS[persona], built.data) : null),
    [built.data, persona],
  );

  function set(key: keyof Form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
    setSaveError(null);
  }

  function bind(key: keyof Form) {
    return {
      value: form[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        set(key, e.target.value),
    };
  }

  async function save(status: "draft" | "published") {
    if (!built.data) return;
    setBusy(true);
    setNotice(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/admin/schemes/${encodeURIComponent(built.data.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({ status, data: built.data }),
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveError(readErrorMessage(body) ?? `Save failed (HTTP ${res.status}).`);
        return;
      }
      setNotice("Saved");
      onSaved();
    } catch {
      setSaveError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const canSave = valid && !busy;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 break-all text-xl font-semibold">{isNew ? "New scheme" : `Edit ${form.id}`}</h2>
        <button type="button" onClick={onClose} className={BUTTON}>
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="min-w-0 space-y-4">
          <Field label="ID">
            <input
              {...bind("id")}
              readOnly={!isNew}
              className={`${INPUT} ${!isNew ? "bg-gray-100" : ""}`}
            />
          </Field>
          <Field label="Name (English)">
            <input {...bind("nameEn")} className={INPUT} />
          </Field>
          <Field label="Name (Tamil)">
            <input {...bind("nameTa")} className={INPUT} />
          </Field>
          <Field label="Level">
            <select {...bind("level")} className={INPUT}>
              <option value="central">central</option>
              <option value="state">state</option>
              <option value="shared">shared</option>
            </select>
          </Field>
          <Field label="States (comma separated, e.g. TN)">
            <input {...bind("states")} className={INPUT} />
          </Field>
          <Field label="Segment">
            <select {...bind("segment")} className={INPUT}>
              <option value="school">school</option>
              <option value="college">college</option>
            </select>
          </Field>
          <Field label="Department">
            <input {...bind("department")} className={INPUT} />
          </Field>
          <Field label="Benefit (English)">
            <input {...bind("benefitEn")} className={INPUT} />
          </Field>
          <Field label="Benefit (Tamil)">
            <input {...bind("benefitTa")} className={INPUT} />
          </Field>
          <Field label="Conditions (JSON)">
            <textarea {...bind("conditions")} rows={12} className={TEXTAREA} />
          </Field>
          <Field label="Documents (JSON)">
            <textarea {...bind("documents")} rows={12} className={TEXTAREA} />
          </Field>
          <Field label="Apply (JSON)">
            <textarea {...bind("apply")} rows={12} className={TEXTAREA} />
          </Field>
          <Field label="Deadline status">
            <select {...bind("deadlineStatus")} className={INPUT}>
              <option value="open">open</option>
              <option value="closed">closed</option>
              <option value="rolling">rolling</option>
              <option value="unknown">unknown</option>
            </select>
          </Field>
          <Field label="Closes on (YYYY-MM-DD, empty if none)">
            <input {...bind("closesOn")} placeholder="2025-12-31" className={INPUT} />
          </Field>
          <Field label="Deadline note (English)">
            <input {...bind("deadlineNoteEn")} className={INPUT} />
          </Field>
          <Field label="Deadline note (Tamil)">
            <input {...bind("deadlineNoteTa")} className={INPUT} />
          </Field>
          <Field label="Sources (one https URL per line)">
            <textarea {...bind("sources")} rows={4} className={TEXTAREA} />
          </Field>
          <Field label="Last verified (YYYY-MM-DD)">
            <input {...bind("lastVerified")} placeholder="2025-01-01" className={INPUT} />
          </Field>
          <Field label="Confidence">
            <select {...bind("confidence")} className={INPUT}>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea {...bind("notes")} rows={3} className={INPUT} />
          </Field>

          {built.errors.length > 0 && (
            <ul
              role="alert"
              className="list-disc space-y-1 rounded border border-red-300 bg-red-50 p-3 pl-6 text-base text-red-700"
            >
              {built.errors.map((msg, i) => (
                <li key={i} className="break-words">
                  {msg}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" className={BUTTON} disabled={!canSave} onClick={() => save("draft")}>
              Save draft
            </button>
            <button
              type="button"
              className="btn-primary px-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSave}
              onClick={() => save("published")}
            >
              Publish
            </button>
            <button
              type="button"
              className={BUTTON}
              onClick={() => set("lastVerified", todayIST())}
            >
              Mark verified today
            </button>
          </div>
          {saveError && (
            <p role="alert" className="text-base text-red-700">
              {saveError}
            </p>
          )}
          {notice && (
            <p role="status" className="text-base text-accent-teal">
              {notice}
            </p>
          )}
        </section>

        <aside className="min-w-0 space-y-4 rounded border border-gray-200 bg-white p-4">
          <h3 className="text-lg font-semibold">Preview as student</h3>
          <Field label="Persona">
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as PersonaName)}
              className={INPUT}
            >
              {PERSONA_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          {preview === null ? (
            <p className="text-base text-gray-600">Fix the errors on the left to see the preview.</p>
          ) : (
            <div className="space-y-3 text-base">
              <p>
                Status: <strong>{STATUS_LABEL[preview.status]}</strong>
              </p>
              <ul className="space-y-2">
                {preview.reasons.map((r, i) => (
                  <li key={i} className="flex min-w-0 gap-2">
                    <span aria-label={r.result} className="w-5 shrink-0 text-center font-semibold">
                      {RESULT_ICON[r.result]}
                    </span>
                    <span className="min-w-0 break-words">{r.label.en || "(no label)"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
