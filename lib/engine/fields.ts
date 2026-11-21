// Pure constants. Source: docs/CONTRACTS.md §1. Keep in sync; never invent values.

/** Every profile field, in the tie-breaker order used by nextQuestion. */
export const FIELD_ASK_ORDER = [
  "education_level",
  "state",
  "income",
  "community",
  "gender",
  "school_6_to_12",
  "religion",
  "first_graduate",
  "institution_type",
  "course_type",
  "year_of_study",
  "current_school_type",
  "medium",
  "disability_percent",
  "last_exam_percent",
  "admission_route",
  "aicte_approved",
  "central_obc_certificate",
  "lateral_entry",
  "rural",
  "age",
] as const;

/** Allowed values for each enum-typed profile field. */
export const ENUMS = {
  education_level: [
    "class_8",
    "class_9",
    "class_10",
    "class_11",
    "class_12",
    "iti",
    "diploma",
    "ug",
    "pg",
    "phd",
  ],
  course_type: ["arts_science", "engineering", "medical", "other_professional", "polytechnic", "iti_trade"],
  institution_type: ["govt", "govt_aided", "private_self_financing", "central_institute"],
  current_school_type: ["govt", "govt_aided", "local_body", "private"],
  medium: ["tamil", "english", "other"],
  school_6_to_12: ["govt_all", "govt_aided_tamil_all", "govt_aided_english_all", "private_or_mixed"],
  admission_route: ["govt_counselling", "govt_school_7_5_quota", "management"],
  gender: ["female", "male", "transgender"],
  community: ["SC", "SCC", "ST", "BC", "BCM", "MBC", "DNC", "FC"],
  religion: ["hindu", "muslim", "christian", "sikh", "buddhist", "jain", "parsi", "other"],
} as const;

export interface IncomeBand {
  id: string;
  label: { en: string; ta: string };
  value: { min: number; max: number | null };
}

/** Income chips. Edges are the real scheme cut-offs. */
export const INCOME_BANDS: readonly IncomeBand[] = [
  { id: "below_1_lakh", label: { en: "Below ₹1 lakh", ta: "₹1 லட்சத்துக்குக் கீழ்" }, value: { min: 0, max: 100000 } },
  { id: "1_to_2_lakh", label: { en: "₹1–2 lakh", ta: "₹1–2 லட்சம்" }, value: { min: 100001, max: 200000 } },
  { id: "2_to_2_5_lakh", label: { en: "₹2–2.5 lakh", ta: "₹2–2.5 லட்சம்" }, value: { min: 200001, max: 250000 } },
  { id: "2_5_to_3_5_lakh", label: { en: "₹2.5–3.5 lakh", ta: "₹2.5–3.5 லட்சம்" }, value: { min: 250001, max: 350000 } },
  { id: "3_5_to_4_5_lakh", label: { en: "₹3.5–4.5 lakh", ta: "₹3.5–4.5 லட்சம்" }, value: { min: 350001, max: 450000 } },
  { id: "4_5_to_8_lakh", label: { en: "₹4.5–8 lakh", ta: "₹4.5–8 லட்சம்" }, value: { min: 450001, max: 800000 } },
  { id: "above_8_lakh", label: { en: "Above ₹8 lakh", ta: "₹8 லட்சத்துக்கு மேல்" }, value: { min: 800001, max: null } },
];

/** Religions counted as minority. */
export const MINORITY_RELIGIONS = ["muslim", "christian", "sikh", "buddhist", "jain", "parsi"] as const;
