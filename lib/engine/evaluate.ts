// Pure rule engine: three-valued evaluation of scheme conditions.
// Spec: docs/CONTRACTS.md §2.1 (conditions) and §2.2 (evaluation). No next/react/supabase/genai/fs imports.
import { FIELD_ASK_ORDER } from "./fields";
import type { ConditionResult, Localized, Profile, ProfileField, Scheme, SchemeResult, SchemeStatus, Condition } from "./types";

/** Loose view of a condition node (already validated by zod upstream). */
interface RawCond {
  label?: Localized;
  field?: string;
  op?: string;
  value?: unknown;
  any?: RawCond[];
  all?: RawCond[];
  manual?: boolean;
}

interface Eval {
  result: ConditionResult;
  missing: ProfileField[];
}

const STATE_NAMES: Record<string, Localized> = {
  TN: { en: "Tamil Nadu", ta: "தமிழ்நாடு" },
};

const STATUS_RANK: Record<SchemeStatus, number> = {
  likely_eligible: 0,
  needs_info: 1,
  not_eligible: 2,
};

const isPassing = (r: ConditionResult): boolean => r === "pass" || r === "check";

/** Income-style range. A plain number x is {min: x, max: x}. */
function toRange(v: unknown): { min: number; max: number | null } | null {
  if (typeof v === "number") return { min: v, max: v };
  if (typeof v === "object" && v !== null && "min" in v) {
    const o = v as { min: unknown; max?: unknown };
    if (typeof o.min !== "number") return null;
    return { min: o.min, max: typeof o.max === "number" ? o.max : null };
  }
  return null;
}

function evalLeaf(field: ProfileField, op: string, value: unknown, profile: Profile): Eval {
  const actual = (profile as unknown as Record<string, unknown>)[field];
  if (actual === undefined || actual === null) return { result: "unknown", missing: [field] };

  switch (op) {
    case "in": {
      const list = Array.isArray(value) ? (value as unknown[]) : [];
      return { result: list.some((v) => v === actual) ? "pass" : "fail", missing: [] };
    }
    case "not_in": {
      const list = Array.isArray(value) ? (value as unknown[]) : [];
      return { result: list.some((v) => v === actual) ? "fail" : "pass", missing: [] };
    }
    case "eq":
      return { result: actual === value ? "pass" : "fail", missing: [] };
    case "lte": {
      const r = toRange(actual);
      if (r === null || typeof value !== "number") return { result: "unknown", missing: [] };
      if (r.max !== null && r.max <= value) return { result: "pass", missing: [] };
      if (r.min > value) return { result: "fail", missing: [] };
      return { result: "unknown", missing: [] };
    }
    case "gte": {
      const r = toRange(actual);
      if (r === null || typeof value !== "number") return { result: "unknown", missing: [] };
      if (r.min >= value) return { result: "pass", missing: [] };
      if (r.max !== null && r.max < value) return { result: "fail", missing: [] };
      return { result: "unknown", missing: [] };
    }
    default:
      // Unknown operator: never claim eligibility on it.
      return { result: "fail", missing: [] };
  }
}

function evalGroup(items: RawCond[], profile: Profile, mode: "any" | "all"): Eval {
  const evals = items.map((i) => evalRaw(i, profile));
  let result: ConditionResult;
  if (mode === "any") {
    if (evals.some((e) => isPassing(e.result))) result = "pass";
    else if (evals.some((e) => e.result === "unknown")) result = "unknown";
    else result = "fail";
  } else {
    if (evals.some((e) => e.result === "fail")) result = "fail";
    else if (evals.some((e) => e.result === "unknown")) result = "unknown";
    else result = "pass";
  }
  if (result !== "unknown") return { result, missing: [] };
  const missing = new Set<ProfileField>();
  for (const e of evals) if (e.result === "unknown") e.missing.forEach((f) => missing.add(f));
  return { result, missing: [...missing] };
}

function evalRaw(c: RawCond, profile: Profile): Eval {
  if (c.manual === true) return { result: "check", missing: [] };
  if (c.any) return evalGroup(c.any, profile, "any");
  if (c.all) return evalGroup(c.all, profile, "all");
  if (c.field !== undefined && c.op !== undefined) {
    return evalLeaf(c.field as ProfileField, c.op, c.value, profile);
  }
  // Malformed node: schema should prevent this. Never claim eligibility.
  return { result: "fail", missing: [] };
}

/** Evaluates one condition. `missing` lists fields behind an unknown result only. */
export function evaluateCondition(cond: Condition, profile: Profile): { result: ConditionResult; missing: ProfileField[] } {
  const e = evalRaw(cond as unknown as RawCond, profile);
  return { result: e.result, missing: e.missing };
}

function stateLabel(states: readonly string[]): Localized {
  const names = states.map((code) => STATE_NAMES[code] ?? { en: code, ta: code });
  return {
    en: "Lives in " + names.map((n) => n.en).join(", "),
    ta: "வசிப்பிடம்: " + names.map((n) => n.ta).join(", "),
  };
}

/** Evaluates one scheme: implicit state filter first, then each top-level condition (AND). */
export function evaluateScheme(profile: Profile, scheme: Scheme): SchemeResult {
  const states: readonly string[] = scheme.states;
  const top: { label: Localized; node: RawCond }[] = [];

  if (!(states.length === 1 && states[0] === "ALL")) {
    top.push({ label: stateLabel(states), node: { field: "state", op: "in", value: states } });
  }
  for (const c of scheme.conditions) {
    const node = c as unknown as RawCond;
    top.push({ label: node.label ?? { en: "", ta: "" }, node });
  }

  const reasons: SchemeResult["reasons"] = [];
  const missing = new Set<ProfileField>();
  let anyFail = false;
  let anyUnknown = false;

  for (const { label, node } of top) {
    const e = evalRaw(node, profile);
    reasons.push({ label, result: e.result });
    if (e.result === "fail") anyFail = true;
    if (e.result === "unknown") {
      anyUnknown = true;
      e.missing.forEach((f) => missing.add(f));
    }
  }

  const status: SchemeStatus = anyFail ? "not_eligible" : anyUnknown ? "needs_info" : "likely_eligible";
  const missing_fields = FIELD_ASK_ORDER.filter((f) => missing.has(f));
  return { scheme_id: scheme.id, status, reasons, missing_fields };
}

/** Evaluates all schemes. Sorted by status group; original order kept inside each group. */
export function evaluateAll(profile: Profile, schemes: readonly Scheme[]): SchemeResult[] {
  return schemes
    .map((s, index) => ({ index, result: evaluateScheme(profile, s) }))
    .sort((a, b) => STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status] || a.index - b.index)
    .map((x) => x.result);
}
