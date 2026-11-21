// Types inferred from the zod schemas (lib/engine/schemas.ts) plus engine result types.
import { z } from "zod";
import { FIELD_ASK_ORDER } from "./fields";
import { ConditionSchema, IncomeSchema, LocalizedSchema, ProfileSchema, SchemeSchema } from "./schemas";

export type Profile = z.infer<typeof ProfileSchema>;
export type Income = z.infer<typeof IncomeSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Scheme = z.infer<typeof SchemeSchema>;
export type Localized = z.infer<typeof LocalizedSchema>;

export type ProfileField = (typeof FIELD_ASK_ORDER)[number];

export type ConditionResult = "pass" | "fail" | "unknown" | "check";

export type SchemeStatus = "likely_eligible" | "needs_info" | "not_eligible";

export interface SchemeResult {
  scheme_id: string;
  status: SchemeStatus;
  reasons: { label: Localized; result: ConditionResult }[];
  missing_fields: ProfileField[];
}
