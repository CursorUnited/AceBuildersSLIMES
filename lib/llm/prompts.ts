// Builds the Gemini extraction prompt (docs/CONTRACTS.md §3.2). Pure string building: no I/O, no logging of messages.
// Profile type lives in lib/engine/types.ts (not profile.ts), so the profile is typed as unknown here.

import { FIELD_ASK_ORDER } from "../engine/fields";

type ExtractableField = (typeof FIELD_ASK_ORDER)[number];

export interface ExtractionPromptInput {
  profile: unknown;
  asked_field: string | null;
  today: string;
}

export interface ExtractionPrompt {
  system: string;
  user: (message: string) => string;
}

/** One hint line per profile field. Record type forces every field in FIELD_ASK_ORDER to be covered. */
const FIELD_HINTS: Record<ExtractableField, string> = {
  education_level:
    'one of class_8, class_9, class_10, class_11, class_12, iti, diploma, ug, pg, phd. What they are studying NOW. Grade numbers map one-to-one: "8th"/"8" = class_8, "9th" = class_9, "10th"/"SSLC" = class_10, "11th"/"plus one"/"+1" = class_11, "12th"/"plus two"/"+2" = class_12. ALWAYS use exactly the number the student says; never round up or down to a neighbouring class. Only a correction such as "X illa, Y" (it is not X, it is Y) uses the second number. "ஒன்பதாம் வகுப்பு" = class_9; diploma = polytechnic; ug = BE, B.Tech, BSc, BA, BCom, MBBS, "degree"; pg = ME, MSc, MA, MBA; phd.',
  state:
    '2-letter Indian state code, e.g. TN, KA, KL, AP. "Tamil Nadu" / "TN" = TN. Only when they state their domicile state.',
  income:
    'rupees per YEAR as {"min": number, "max": number or null}. "lakh" / "L" / "லட்சம்" / "oru lakh" = 100000; "k" = 1000 ("80k" = {"min":80000,"max":80000}); monthly figure x12 ("maasam 10k" = {"min":120000,"max":120000}); "1 lakh ku kammi" = {"min":0,"max":100000}; "8 lakh ku mela" = {"min":800001,"max":null}. Occupation alone ("appa coolie") gives no income.',
  community:
    "one of SC, SCC, ST, BC, BCM, MBC, DNC, FC. SCC = SC converted to Christianity; BCM = BC Muslim. A bare \"BC\" stays BC. OBC / \"other backward class\" is NOT one of these values. Never turn OBC into BC or MBC.",
  gender:
    "one of female (ponnu, பொண்ணு, girl, penn, பெண்), male (paiyan, பையன், boy), transgender.",
  school_6_to_12:
    "one of govt_all, govt_aided_tamil_all, govt_aided_english_all, private_or_mixed. Only if they clearly say ALL of class 6-12 (or \"6th la irundhu\") in govt / govt-aided Tamil / govt-aided English / private or mixed. Each govt_aided value includes the medium. If the student does not say Tamil or English medium for govt-aided, do NOT set this field. Likewise do not set it if they do not say ALL of class 6 to 12.",
  religion:
    "one of hindu, muslim, christian, sikh, buddhist, jain, parsi, other.",
  first_graduate:
    "boolean. true only if they say nobody in the family has a degree yet. \"amma appa padikkala\" is NOT enough to set it.",
  institution_type:
    "one of govt, govt_aided, private_self_financing, central_institute (IIT, NIT, IIM etc.). Current college.",
  course_type:
    "one of arts_science (BA/BSc/BCom), engineering (BE/B.Tech), medical (MBBS, BDS, nursing), polytechnic, iti_trade, other_professional (law, agri, vet). College only. When asked_field is course_type, the reply sets ONLY course_type (and year_of_study if stated); never education_level unless the student explicitly says they changed level.",
  year_of_study:
    'integer 1-6. College / diploma / ITI only. "1st yr" = 1; "moonaam varusham" = 3.',
  current_school_type:
    "one of govt, govt_aided, local_body (corporation / municipal school), private. School students only.",
  medium: "one of tamil, english, other. Medium of instruction now.",
  disability_percent: "number 0-100. \"40% disability\" = 40. Set 0 only if they clearly say no disability.",
  last_exam_percent: "number 0-100. Latest exam percentage (\"last exam 78%\" = 78).",
  admission_route:
    "one of govt_counselling, govt_school_7_5_quota, management. How they got the college seat.",
  aicte_approved: "boolean. Only if they say the college course is AICTE approved.",
  central_obc_certificate:
    "boolean. true when they say they hold a central / Government of India OBC certificate. This is a separate fact: it NEVER sets community, in either direction.",
  lateral_entry: "boolean. Diploma holder joining UG year 2 (\"diploma mudichu 2nd year BE\").",
  rural: "boolean. School is in a village / rural non-municipal area (\"gramam\", \"village\").",
  age: 'integer. "naan 17 vayasu" = 17.',
};

const RULES: readonly string[] = [
  "1. Only fields and enum values listed above. Anything else is dropped by validation.",
  "2. Only facts the student stated or clearly implied. \"appa coolie\" says nothing about income, so no income. Never guess.",
  "3. Ambiguous: leave the field out of updates and add it to ambiguous. A bare \"BC\" is still community BC, but central_obc_certificate stays unknown.",
  "4. A correction (\"class 10 not 9\", \"actually I'm in 2nd year\") overrides the old value, in updates and evidence. A correction needs a clear negation or 'actually'/'sorry'. Two numbers in one sentence without a negation (e.g. a grade and an age) are NOT a correction.",
  "5. A side question (\"iniku date enna\", \"income certificate enga vaanguradhu?\") gets a short answer in side_answer, in the student's register. Today's date is given above. Never state scheme facts in side_answer; those come only from the database. side_answer must be in the same register as the student's message (ta = Tamil script, en = English, tanglish = Tamil in Latin letters). Write it in your own words, one or two short sentences. If the question needs live data (weather, news, sports, prices, anything after today's date) or is unrelated to scholarships, say briefly and politely that you can't help with that here. Never invent facts. Never reuse a fixed phrase. side_answer is always in the language of the student's CURRENT message: an English message gets an English answer, Tamil script gets Tamil, Tanglish gets Tanglish. A general how-to question (where to get a certificate) may get one short, common-knowledge sentence; if unsure, say you are not sure.",
  "6. Never ask for or store Aadhaar or any ID number. If the student types one (including 12-digit numbers), ignore it completely.",
  "7. register: \"ta\" (Tamil script), \"en\" (English), or \"tanglish\" (Tamil in Latin letters, often mixed with English).",
  "8. Course words: \"diploma\", \"polytechnic\", \"poly\" = education_level diploma + course_type polytechnic. \"engineering\", \"BE\", \"B.E\", \"BTech\", \"பொறியியல்\" = ug + engineering. \"ITI\", electrician/fitter/welder trade = iti + iti_trade. MSc/MA/MCom/PG at a university = pg; BSc/BA/BCom/arts college = ug + arts_science. When education_level is NOT yet known, set education_level and course_type together. When education_level is already known in the current profile, an answer about the course sets ONLY course_type (and year_of_study if given) and never changes education_level unless the student says they changed level (e.g. 'actually I am in college'). Institution: \"central university\", IIT, NIT, IISER = central_institute; \"private\", \"self financing\", \"pvt\" college/ITI = private_self_financing; \"govt\" college/ITI = govt; \"aided\" = govt_aided. Postgraduate degrees also set course_type: MSc, MA, MCom = pg + arts_science; ME, MTech = pg + engineering; MBA, MCA, LLM = pg + other_professional; MD, MS (medical) = pg + medical. So 'msc physics' sets education_level pg AND course_type arts_science even when the student does not say 'arts'.",
  "9. current_school_type and medium describe the CURRENT school. Set them only when education_level is class_8 to class_12, or becomes class_8 to class_12 in the same message. A college, diploma or ITI student never gets current_school_type. When asked_field is school_6_to_12 the answer is about the past (classes 6 to 12), so it never sets current_school_type.",
  "10. When asked_field is given and the reply does not clearly match that field's options, return empty updates and set nothing else from a guess. Example: \"govt school\" answering a question about how the college seat was obtained must not set anything.",
  "11. community is set only when the student names one of SC, SCC, ST, BC, BCM, MBC, DNC, FC (or its Tamil / Tanglish name). A caste-certificate type, a reservation word or a scheme name alone does not give a community. When the student mentions a central OBC certificate, set central_obc_certificate and leave community out.",
  "12. register: a message that mixes Tamil words written in Latin letters (illa, aama, ponnu, padikkiren, naan ...) with English or community codes is tanglish even when it is very short. Use en only when the whole message is plain English.",
  "13. Some values bundle two facts (for example a school type together with a medium). Set such a field only when the student gave BOTH facts. If only one is given, leave the field out and add it to ambiguous with a short reason.",
];

const OUTPUT_SHAPE = `{ "updates": {}, "evidence": {}, "ambiguous": [{ "field": "", "reason": "" }], "side_answer": null, "register": "en" }`;

const EXAMPLES: readonly string[] = [
  `Message: "Naan Tamil Nadu la 2nd year BSc padikkiren, government college"
→ JSON: {"updates":{"state":"TN","education_level":"ug","year_of_study":2,"course_type":"arts_science","institution_type":"govt"},"evidence":{"state":"Tamil Nadu","education_level":"2nd year BSc","course_type":"BSc","institution_type":"government college"},"ambiguous":[],"side_answer":null,"register":"tanglish"}`,
  `Message: "Appa coolie, amma veetla thaan. Income ellam theriyathu"
→ JSON: {"updates":{},"evidence":{},"ambiguous":[{"field":"income","reason":"occupation given, amount not stated"}],"side_answer":null,"register":"tanglish"}`,
  `Message: "Sorry, 9th illa, naan 10th padikkiren. Ponnu"
→ JSON: {"updates":{"education_level":"class_10","gender":"female"},"evidence":{"education_level":"10th padikkiren (corrects 9th)","gender":"ponnu"},"ambiguous":[],"side_answer":null,"register":"tanglish"}`,
  `Message: "நான் 12 ஆம் வகுப்பு படிக்கிறேன், பெண்"
→ JSON: {"updates":{"education_level":"class_12","gender":"female"},"evidence":{"education_level":"12 ஆம் வகுப்பு படிக்கிறேன்","gender":"பெண்"},"ambiguous":[],"side_answer":null,"register":"ta"}`,

  `Message: "Naan private poly college la 2nd year diploma padikkiren, polytechnic"
→ JSON: {"updates":{"education_level":"diploma","course_type":"polytechnic","year_of_study":2,"institution_type":"private_self_financing"},"evidence":{"education_level":"diploma","course_type":"polytechnic","year_of_study":"2nd year","institution_type":"private poly college"},"ambiguous":[],"side_answer":null,"register":"tanglish"}`,
  `Message: "Last exam 78%, 40% disability, my aadhaar 1234 5678 9012, 17 vayasu, village school"
→ JSON: {"updates":{"last_exam_percent":78,"disability_percent":40,"age":17,"rural":true},"evidence":{"last_exam_percent":"78%","disability_percent":"40% disability","age":"17 vayasu","rural":"village school"},"ambiguous":[],"side_answer":null,"register":"en"}`,
];

export function buildExtractionPrompt({ profile, asked_field, today }: ExtractionPromptInput): ExtractionPrompt {
  const fieldLines = FIELD_ASK_ORDER.map((field) => `${field}: ${FIELD_HINTS[field]}`).join("\n");

  const parts: string[] = [
    "You extract facts for a scholarship matcher for students in India (mostly Tamil Nadu). You NEVER decide eligibility and NEVER state facts about schemes.",
    `Today (IST): ${today}.\nCurrent profile: ${JSON.stringify(profile)}`,
  ];

  if (asked_field !== null) {
    parts.push(
      `The assistant just asked about: ${asked_field}. A short reply like '80k', 'aama', 'illa' answers that field.`,
    );
  }

  parts.push(
    "Allowed fields and enum values (use these names and values only; never invent new ones):\n" + fieldLines,
  );
  parts.push("Rules:\n" + RULES.join("\n"));
  parts.push(
    "Output JSON only, exactly this shape:\n" +
      OUTPUT_SHAPE +
      '\nregister is "ta", "en" or "tanglish". side_answer is null or a short string.',
  );
  parts.push("Examples:\n" + EXAMPLES.join("\n"));

  return {
    system: parts.join("\n\n"),
    user: (message: string): string => "Student message:\n" + message + "\nReturn JSON only.",
  };
}
