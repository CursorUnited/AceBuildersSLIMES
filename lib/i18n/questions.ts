// Question templates for the chat. Source: docs/CONTRACTS.md §1 (enums, bands) and §3.1 (next_question).
// Pure data + one helper. Student-facing text is { en, ta } or the three registers below.
import { INCOME_BANDS } from "../engine/fields";
import type { ProfileField } from "../engine/types";

export type QuestionRegister = "ta" | "en" | "tanglish";

export interface Chip {
  label: { en: string; ta: string };
  value: unknown;
}

export interface QuestionTemplate {
  ta: string;
  en: string;
  tanglish: string;
  chips: Chip[];
}

function chip(en: string, ta: string, value: unknown): Chip {
  return { label: { en, ta }, value };
}

const YES_NO: Chip[] = [chip("Yes", "ஆமா", true), chip("No", "இல்ல", false)];

export const QUESTIONS: Record<ProfileField, QuestionTemplate> = {
  education_level: {
    ta: "இப்போ நீங்க எந்த வகுப்பு அல்லது படிப்பு படிக்கிறீங்க?",
    en: "What are you studying now?",
    tanglish: "Ippo neenga enna padikkireenga?",
    chips: [
      chip("Class 8", "8ம் வகுப்பு", "class_8"),
      chip("Class 9", "9ம் வகுப்பு", "class_9"),
      chip("Class 10", "10ம் வகுப்பு", "class_10"),
      chip("Class 11", "11ம் வகுப்பு", "class_11"),
      chip("Class 12", "12ம் வகுப்பு", "class_12"),
      chip("ITI", "ஐடிஐ", "iti"),
      chip("Diploma", "டிப்ளோமா", "diploma"),
      chip("Degree (UG)", "டிகிரி (UG)", "ug"),
      chip("PG", "முதுநிலை (PG)", "pg"),
      chip("PhD", "பிஎச்.டி", "phd"),
    ],
  },
  state: {
    ta: "நீங்க எந்த மாநிலத்தில் இருக்கீங்க?",
    en: "Which state do you live in?",
    tanglish: "Neenga entha state-la irukkeenga?",
    chips: [chip("Tamil Nadu", "தமிழ்நாடு", "TN")],
  },
  income: {
    ta: "உங்க குடும்பத்தோட வருஷ வருமானம் எவ்வளவு? (தோராயமா சொன்னா போதும்)",
    en: "What is your family's yearly income? (rough is fine)",
    tanglish: "Unga family-oda varusha varumanam evlo? (approx podhum)",
    // Chips are the real income bands (CONTRACTS §1), so label and value match engine data.
    chips: INCOME_BANDS.map((b) => ({ label: { en: b.label.en, ta: b.label.ta }, value: b.value })),
  },
  community: {
    ta: "உங்க சமூகப் பிரிவு (community) என்ன?",
    en: "What is your community category?",
    tanglish: "Unga community category enna?",
    chips: [
      chip("SC", "SC (பட்டியல் சாதி)", "SC"),
      chip("SCC (SC converted to Christianity)", "SCC (கிறிஸ்தவ மதம் மாறிய SC)", "SCC"),
      chip("ST", "ST (பழங்குடியினர்)", "ST"),
      chip("BC", "BC (பிற்படுத்தப்பட்டோர்)", "BC"),
      chip("BC Muslim (BCM)", "BCM (BC முஸ்லிம்)", "BCM"),
      chip("MBC", "MBC (மிகவும் பிற்படுத்தப்பட்டோர்)", "MBC"),
      chip("DNC", "DNC (குற்றப்பரம்பரையினர்)", "DNC"),
      chip("FC (Forward caste)", "FC (முன்னேறிய வகுப்பு)", "FC"),
    ],
  },
  gender: {
    ta: "நீங்க ஆணா, பெண்ணா?",
    en: "What is your gender?",
    tanglish: "Neenga aana, pennaa?",
    chips: [
      chip("Female", "பெண்", "female"),
      chip("Male", "ஆண்", "male"),
      chip("Transgender", "திருநங்கை", "transgender"),
    ],
  },
  school_6_to_12: {
    ta: "6 முதல் 12ம் வகுப்பு வரை எங்க படிச்சீங்க?",
    en: "Where did you study from Class 6 to 12?",
    tanglish: "Class 6 to 12 vaira enga padichinga?",
    chips: [
      chip("All government school", "முழுவதும் அரசுப் பள்ளி", "govt_all"),
      chip("Govt-aided, Tamil medium, all years", "அரசு உதவி பெறும் தமிழ் பள்ளி (முழுவதும்)", "govt_aided_tamil_all"),
      chip("Govt-aided, English medium, all years", "அரசு உதவி பெறும் ஆங்கிலப் பள்ளி (முழுவதும்)", "govt_aided_english_all"),
      chip("Private or mixed", "தனியார் அல்லது கலவை", "private_or_mixed"),
    ],
  },
  religion: {
    ta: "உங்க மதம் என்ன?",
    en: "What is your religion?",
    tanglish: "Unga matham enna?",
    chips: [
      chip("Hindu", "இந்து", "hindu"),
      chip("Muslim", "முஸ்லிம்", "muslim"),
      chip("Christian", "கிறிஸ்தவர்", "christian"),
      chip("Sikh", "சீக்கியர்", "sikh"),
      chip("Buddhist", "பௌத்தர்", "buddhist"),
      chip("Jain", "சமணர்", "jain"),
      chip("Parsi", "பார்சி", "parsi"),
      chip("Other", "மற்றவை", "other"),
    ],
  },
  first_graduate: {
    ta: "குடும்பத்தில் யாருக்கும் இதுவரை டிகிரி இல்லையா?",
    en: "Is nobody in your family a graduate yet?",
    tanglish: "Kudumbathula yaarukkum degree illaya?",
    chips: YES_NO,
  },
  institution_type: {
    ta: "நீங்க படிக்கிற கல்லூரி எந்த வகை?",
    en: "What type of college are you in?",
    tanglish: "Neenga padikkira college entha vagai?",
    chips: [
      chip("Government college", "அரசுக் கல்லூரி", "govt"),
      chip("Govt-aided college", "அரசு உதவி பெறும் கல்லூரி", "govt_aided"),
      chip("Private self-financing", "தனியார் சுயநிதிக் கல்லூரி", "private_self_financing"),
      chip("Central institute", "மத்திய அரசு நிறுவனம்", "central_institute"),
    ],
  },
  course_type: {
    ta: "நீங்க என்ன படிப்பு படிக்கிறீங்க?",
    en: "What course are you studying?",
    tanglish: "Enna course padikkireenga?",
    chips: [
      chip("Arts & Science", "கலை அறிவியல்", "arts_science"),
      chip("Engineering", "பொறியியல்", "engineering"),
      chip("Medical", "மருத்துவம்", "medical"),
      chip("Other professional", "மற்ற தொழில்முறை படிப்பு", "other_professional"),
      chip("Polytechnic", "பாலிடெக்னிக்", "polytechnic"),
      chip("ITI trade", "ஐடிஐ தொழிற்பயிற்சி", "iti_trade"),
    ],
  },
  year_of_study: {
    ta: "நீங்க எந்த ஆண்டு படிக்கிறீங்க?",
    en: "Which year of study are you in?",
    tanglish: "Entha year padikkireenga?",
    chips: [
      chip("Year 1", "1ம் ஆண்டு", 1),
      chip("Year 2", "2ம் ஆண்டு", 2),
      chip("Year 3", "3ம் ஆண்டு", 3),
      chip("Year 4", "4ம் ஆண்டு", 4),
      chip("Year 5", "5ம் ஆண்டு", 5),
    ],
  },
  current_school_type: {
    ta: "நீங்க படிக்கிற பள்ளி எந்த வகை?",
    en: "What type of school are you in now?",
    tanglish: "Ippo padikkira school entha vagai?",
    chips: [
      chip("Government school", "அரசுப் பள்ளி", "govt"),
      chip("Govt-aided school", "அரசு உதவி பெறும் பள்ளி", "govt_aided"),
      chip("Local body school", "உள்ளாட்சிப் பள்ளி", "local_body"),
      chip("Private school", "தனியார் பள்ளி", "private"),
    ],
  },
  medium: {
    ta: "நீங்க எந்த மொழியில் படிக்கிறீங்க?",
    en: "What is your medium of instruction now?",
    tanglish: "Entha medium-la padikkireenga?",
    chips: [chip("Tamil", "தமிழ்", "tamil"), chip("English", "ஆங்கிலம்", "english"), chip("Other", "மற்றவை", "other")],
  },
  // Chip values are the percent the engine uses: "None" 0, "40% or more" 40, "Below 40%" 20.
  disability_percent: {
    ta: "உங்களுக்கு மாற்றுத்திறன் இருக்கா? இருந்தா எவ்வளவு சதவீதம்?",
    en: "Do you have a disability? If yes, what percent?",
    tanglish: "Ungalukku maatruthiran irukka? Irundha evlo percent?",
    chips: [chip("None", "இல்லை", 0), chip("40% or more", "40% அல்லது அதற்கு மேல்", 40), chip("Below 40%", "40%க்கு கீழ்", 20)],
  },
  last_exam_percent: {
    ta: "உங்க கடைசி தேர்வில் எத்தனை சதவீதம் வாங்கினீங்க?",
    en: "What percent did you get in your last exam?",
    tanglish: "Last exam-la evlo percent vaangineenga?",
    chips: [],
  },
  admission_route: {
    ta: "கல்லூரி சீட் எப்படி கிடைச்சுது?",
    en: "How did you get your college seat?",
    tanglish: "College seat eppadi kidaichathu?",
    chips: [
      chip("Government counselling", "அரசு கலந்தாய்வு", "govt_counselling"),
      chip("7.5% quota (govt school)", "7.5% இட ஒதுக்கீடு (அரசுப் பள்ளி)", "govt_school_7_5_quota"),
      chip("Management quota", "நிர்வாக ஒதுக்கீடு", "management"),
    ],
  },
  aicte_approved: {
    ta: "உங்க கல்லூரி படிப்புக்கு AICTE அங்கீகாரம் இருக்கா?",
    en: "Is your course AICTE approved?",
    tanglish: "Unga course-ku AICTE approval irukka?",
    chips: YES_NO,
  },
  central_obc_certificate: {
    ta: "உங்ககிட்ட மத்திய அரசு OBC சான்றிதழ் இருக்கா?",
    en: "Do you have a central-format OBC certificate?",
    tanglish: "Unga kitta central OBC certificate irukka?",
    chips: YES_NO,
  },
  lateral_entry: {
    ta: "நீங்க நேரடியா 2ம் ஆண்டில் சேர்ந்தீங்களா? (lateral entry)",
    en: "Did you join directly in 2nd year (lateral entry)?",
    tanglish: "Neenga direct-aa 2nd year-la serndheengala? (lateral entry)",
    chips: YES_NO,
  },
  rural: {
    ta: "உங்க பள்ளி கிராமப் பகுதியில் இருக்கா?",
    en: "Is your school in a rural (village) area?",
    tanglish: "Unga school gramapuram-la irukka?",
    chips: YES_NO,
  },
  age: {
    ta: "உங்க வயசு என்ன?",
    en: "How old are you?",
    tanglish: "Unga vayasu enna?",
    chips: [],
  },
};


/**
 * Chat prefix used when the bot answers a side question first.
 * questionFor() does NOT add it: per CONTRACTS §3.1 the UI shows side_answer, then prepends
 * this "Anyway, " itself before the question text.
 */
export const ANYWAY: { ta: string; en: string; tanglish: string } = {
  ta: "சரி, ",
  en: "Anyway, ",
  tanglish: "Sari, ",
};

/** Unlock hint appended to a question: how many more schemes the answer could open. */
export function UNLOCK_LINE(n: number): { ta: string; en: string; tanglish: string } {
  return {
    ta: `இதை சொன்னா இன்னும் ${n} திட்டங்கள் தெரியும்`,
    en: `Tell me this and I can show ${n} more schemes`,
    tanglish: `Idhu sonna innum ${n} schemes theriyum`,
  };
}

/**
 * Question text in the given register, plus the template chips.
 * When unlock_count > 0 the UNLOCK_LINE is appended to the text.
 */
export function questionFor(
  field: ProfileField,
  register: QuestionRegister,
  unlock_count: number,
): { text: string; chips: Chip[] } {
  const q = QUESTIONS[field];
  const base = q[register];
  const text = unlock_count > 0 ? [base, UNLOCK_LINE(unlock_count)[register]].join("\n") : base;
  return { text, chips: q.chips };
}
