// Pure zod schemas. Source: docs/CONTRACTS.md §1 and §2. zod validates every boundary.
import { z } from "zod";
import { ENUMS, FIELD_ASK_ORDER } from "./fields";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_URL = z.url({ protocol: /^https$/ });
const SCHEME_ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Two-letter state code, or the all-states value used in data/schemes.seed.json.
const STATE_RE = /^(?:[A-Z]{2}|ALL)$/;

/** Scheme id slug: lowercase letters, digits and single hyphens, max 60 chars. */
export function isValidSchemeId(id: string): boolean {
  return id.length <= 60 && SCHEME_ID_RE.test(id);
}

/** True when a YYYY-MM-DD string is a real calendar date (rejects 2026-02-30). */
function isRealDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const CalendarDateSchema = z
  .string()
  .regex(DATE_RE, { message: "Use the date format YYYY-MM-DD" })
  .refine((v) => !DATE_RE.test(v) || isRealDate(v), { message: "Not a real calendar date" });

// Text is capped at 500 chars; labels are short so the same cap is harmless there.
export const LocalizedSchema = z.object({
  en: z.string().min(1).max(500),
  ta: z.string().min(1).max(500),
});

export const IncomeSchema = z.object({
  min: z.number().min(0),
  max: z.number().nullable(),
});

/** Every field optional. Unknown keys are stripped (no .strict()). */
export const ProfileSchema = z.object({
  state: z.string().regex(/^[A-Z]{2}$/).optional(),
  education_level: z.enum(ENUMS.education_level).optional(),
  year_of_study: z.number().int().min(1).max(6).optional(),
  lateral_entry: z.boolean().optional(),
  course_type: z.enum(ENUMS.course_type).optional(),
  aicte_approved: z.boolean().optional(),
  institution_type: z.enum(ENUMS.institution_type).optional(),
  current_school_type: z.enum(ENUMS.current_school_type).optional(),
  medium: z.enum(ENUMS.medium).optional(),
  school_6_to_12: z.enum(ENUMS.school_6_to_12).optional(),
  admission_route: z.enum(ENUMS.admission_route).optional(),
  gender: z.enum(ENUMS.gender).optional(),
  community: z.enum(ENUMS.community).optional(),
  central_obc_certificate: z.boolean().optional(),
  religion: z.enum(ENUMS.religion).optional(),
  income: IncomeSchema.optional(),
  first_graduate: z.boolean().optional(),
  disability_percent: z.number().min(0).max(100).optional(),
  last_exam_percent: z.number().min(0).max(100).optional(),
  rural: z.boolean().optional(),
  age: z.number().int().optional(),
});

const LeafSchema = z.object({
  label: LocalizedSchema.optional(),
  field: z.enum(FIELD_ASK_ORDER),
  op: z.enum(["in", "not_in", "eq", "lte", "gte"]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
});

/** Recursive condition type. Explicit because z.lazy cannot infer self-references. */
export type Condition =
  | z.infer<typeof LeafSchema>
  | { label?: z.infer<typeof LocalizedSchema>; any: Condition[] }
  | { label?: z.infer<typeof LocalizedSchema>; all: Condition[] }
  | { label?: z.infer<typeof LocalizedSchema>; manual: true };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union(
    [
      LeafSchema,
      z.object({ label: LocalizedSchema.optional(), any: z.array(ConditionSchema) }),
      z.object({ label: LocalizedSchema.optional(), all: z.array(ConditionSchema) }),
      z.object({ label: LocalizedSchema.optional(), manual: z.literal(true) }),
    ],
    { message: "Condition uses an unknown field, operator or value" },
  ),
);

const DocumentSchema = LocalizedSchema.extend({
  only_if: LeafSchema.optional(),
});

export const SchemeSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(60)
      .regex(SCHEME_ID_RE, {
        message: "Use lowercase letters, digits and single hyphens (e.g. tn-scholarship-2026)",
      }),
    name: LocalizedSchema,
    level: z.enum(["central", "state", "shared"]),
    states: z
      .array(z.string().regex(STATE_RE, { message: "Use a 2-letter state code like TN, or ALL" }))
      .min(1),
    segment: z.enum(["school", "college"]),
    department: z.string().min(1).max(500),
    benefit: LocalizedSchema,
    conditions: z.array(ConditionSchema),
    documents: z.array(DocumentSchema),
    apply: z.object({
      mode: z.enum(["online", "offline", "automatic"]),
      portal_url: HTTPS_URL.nullable(),
      steps: z.array(LocalizedSchema),
    }),
    deadline: z.object({
      status: z.enum(["open", "closed", "rolling", "unknown"]),
      closes_on: CalendarDateSchema.nullable(),
      note: LocalizedSchema,
    }),
    sources: z.array(HTTPS_URL).min(1),
    last_verified: CalendarDateSchema,
    confidence: z.enum(["high", "medium", "low"]),
    notes: z.string().max(2000).optional(),
  })
  .refine((s) => s.conditions.every((c) => c.label !== undefined), {
    message: "Every top-level condition must have a label",
    path: ["conditions"],
  })
  .refine((s) => s.deadline?.status !== "open" || s.deadline?.closes_on != null, {
    message: "Status open needs a closes_on date",
    path: ["deadline", "closes_on"],
  })
  .refine(
    (s) =>
      !(s.deadline?.status === "unknown" || s.deadline?.status === "rolling") ||
      s.deadline?.closes_on == null,
    {
      message: "closes_on must be empty when status is unknown or rolling",
      path: ["deadline", "closes_on"],
    },
  );
