// Pure zod schemas. Source: docs/CONTRACTS.md §1 and §2. zod validates every boundary.
import { z } from "zod";
import { ENUMS, FIELD_ASK_ORDER } from "./fields";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_URL = z.url({ protocol: /^https$/ });

export const LocalizedSchema = z.object({
  en: z.string().min(1),
  ta: z.string().min(1),
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
  z.union([
    LeafSchema,
    z.object({ label: LocalizedSchema.optional(), any: z.array(ConditionSchema) }),
    z.object({ label: LocalizedSchema.optional(), all: z.array(ConditionSchema) }),
    z.object({ label: LocalizedSchema.optional(), manual: z.literal(true) }),
  ]),
);

const DocumentSchema = LocalizedSchema.extend({
  only_if: LeafSchema.optional(),
});

export const SchemeSchema = z
  .object({
    id: z.string().min(1),
    name: LocalizedSchema,
    level: z.enum(["central", "state", "shared"]),
    states: z.array(z.string().min(1)).min(1),
    segment: z.enum(["school", "college"]),
    department: z.string().min(1),
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
      closes_on: z.string().regex(DATE_RE).nullable(),
      note: LocalizedSchema,
    }),
    sources: z.array(HTTPS_URL).min(1),
    last_verified: z.string().regex(DATE_RE),
    confidence: z.enum(["high", "medium", "low"]),
    notes: z.string().optional(),
  })
  .refine((s) => s.conditions.every((c) => c.label !== undefined), {
    message: "Every top-level condition must have a label",
    path: ["conditions"],
  });
