// Fixed UI text. Every entry is { en, ta }. Add a key here before using it; t() rejects unknown keys at compile time.
import type { Lang } from "@/lib/storage";
import type { ProfileField } from "@/lib/engine/types";

export const STRINGS = {
  appTitle: { en: "உரிமை Urimai", ta: "உரிமை Urimai" },
  welcome: {
    en: "Hi! Tell me about yourself in Tamil, Tanglish or English, and I'll show the scholarships you are likely eligible for.",
    ta: "வணக்கம்! உங்களைப் பற்றி தமிழ், தங்கிலிஷ் அல்லது ஆங்கிலத்தில் சொல்லுங்கள். நீங்கள் தகுதி இருக்க வாய்ப்புள்ள உதவித்தொகைகளைக் காட்டுகிறேன்.",
  },
  inputPlaceholder: {
    en: "Type or speak here…",
    ta: "இங்கே தட்டச்சு செய்யவும் அல்லது பேசவும்…",
  },
  send: { en: "Send", ta: "அனுப்பு" },
  seeSchemesNow: { en: "See my schemes now", ta: "என் திட்டங்களை இப்போதே பார்" },
  looksRight: { en: "Looks right → show schemes", ta: "சரியாக உள்ளது → திட்டங்களைக் காட்டு" },
  understood: { en: "Here's what I understood", ta: "நான் புரிந்துகொண்டது" },
  myApplications: { en: "My applications", ta: "என் விண்ணப்பங்கள்" },
  menu: { en: "Menu", ta: "மெனு" },
  forgetMe: { en: "Forget me on this phone", ta: "இந்த போனில் என்னை மறந்துவிடு" },
  forgetConfirmBody: {
    en: "Delete everything you told us on this phone? This cannot be undone.",
    ta: "இந்த போனில் நீங்கள் சொன்ன எல்லாவற்றையும் அழிக்கவா? இதை மீட்க முடியாது.",
  },
  forgetConfirmYes: { en: "Yes, forget me", ta: "ஆம், அழித்துவிடு" },
  cancel: { en: "Cancel", ta: "ரத்து செய்" },
  aiBusy: {
    en: "AI is busy right now. Tap your answer below.",
    ta: "AI இப்போது பிஸியாக உள்ளது. கீழே உங்கள் பதிலைத் தட்டுங்கள்.",
  },
  typing: { en: "Typing…", ta: "தட்டச்சு ஆகிறது…" },
  likelyEligible: { en: "likely eligible", ta: "தகுதி இருக்க வாய்ப்பு உள்ளது" },
  resultsTitle: { en: "Your scholarships", ta: "உங்கள் உதவித்தொகைகள்" },
  loadingResults: { en: "Loading your results…", ta: "உங்கள் முடிவுகள் ஏற்றப்படுகின்றன…" },
  loadFailed: { en: "Could not load schemes. Please try again.", ta: "திட்டங்களை ஏற்ற முடியவில்லை. மீண்டும் முயலவும்." },
  noSchemes: { en: "No schemes to show right now.", ta: "இப்போது காட்ட திட்டங்கள் இல்லை." },
  editAnswers: { en: "← Edit my answers", ta: "← என் பதில்களை மாற்று" },
  sectionLikely: { en: "Likely eligible", ta: "தகுதி இருக்க வாய்ப்பு உள்ளது" },
  sectionOneAway: { en: "One detail away", ta: "ஒரு விவரம் மட்டும் குறைவு" },
  sectionNotEligible: { en: "Doesn't match your answers", ta: "உங்கள் பதில்களுக்குப் பொருந்தவில்லை" },
  showNotEligible: { en: "Show these", ta: "காட்டு" },
  hideNotEligible: { en: "Hide these", ta: "மறை" },
  resultsFooter: {
    en: "'Likely eligible' means the rules match what you told us. The office makes the final decision.",
    ta: "'தகுதி இருக்க வாய்ப்பு உள்ளது' என்றால் நீங்கள் சொன்ன விவரங்கள் விதிகளுடன் பொருந்துகின்றன என்று அர்த்தம். இறுதி முடிவு அலுவலகத்தால் எடுக்கப்படும்.",
  },
  levelCentral: { en: "CENTRAL", ta: "மத்திய அரசு" },
  levelState: { en: "STATE", ta: "மாநில அரசு" },
  levelShared: { en: "CENTRAL + STATE", ta: "மத்திய + மாநில அரசு" },
  track: { en: "Track", ta: "கண்காணி" },
  tracked: { en: "Tracking", ta: "கண்காணிக்கிறது" },
  tellUsToCheck: { en: "Tell us this to check:", ta: "சரிபார்க்க இதைச் சொல்லுங்கள்:" },
  confirmThis: { en: "confirm this", ta: "இதை உறுதிப்படுத்தவும்" },
  deadlineOpenNoDate: { en: "Open now", ta: "இப்போது திறந்துள்ளது" },
  deadlineClosesOn: { en: "Closes", ta: "முடிவு தேதி" },
  deadlineClosed: { en: "Closed for this year", ta: "இந்த ஆண்டுக்கு முடிந்தது" },
  deadlineClosedNote: {
    en: "Next window: check the official page for dates.",
    ta: "அடுத்த கால அவகாசம்: தேதிகளுக்கு அதிகாரப்பூர்வ பக்கத்தைப் பாருங்கள்.",
  },
  deadlineRolling: { en: "Apply any time", ta: "எப்போது வேண்டுமானாலும் விண்ணப்பிக்கலாம்" },
  deadlineUnknown: { en: "Check official page", ta: "அதிகாரப்பூர்வ பக்கத்தில் சரிபார்க்கவும்" },
  backToResults: { en: "← Back to results", ta: "← முடிவுகளுக்குத் திரும்பு" },
  schemeLoading: { en: "Loading scheme…", ta: "திட்டம் ஏற்றப்படுகிறது…" },
  schemeNotFound: {
    en: "We could not find this scheme. It may have been removed.",
    ta: "இந்த திட்டத்தைக் கண்டுபிடிக்க முடியவில்லை. இது நீக்கப்பட்டிருக்கலாம்.",
  },
  statusLikely: {
    en: "Likely eligible: the rules match what you told us.",
    ta: "தகுதி இருக்க வாய்ப்பு உள்ளது: நீங்கள் சொன்ன விவரங்கள் விதிகளுடன் பொருந்துகின்றன.",
  },
  reasonsTitle: { en: "Why", ta: "ஏன்" },
  pleaseConfirm: { en: "(please confirm)", ta: "(தயவுசெய்து உறுதிப்படுத்தவும்)" },
  docsTitle: { en: "Documents to keep ready", ta: "தயாராக வைத்திருக்க வேண்டிய ஆவணங்கள்" },
  ifApplicable: { en: "(if it applies to you)", ta: "(இது உங்களுக்குப் பொருந்தினால்)" },
  howToApply: { en: "How to apply", ta: "விண்ணப்பிப்பது எப்படி" },
  applyOnline: { en: "You apply online.", ta: "ஆன்லைனில் விண்ணப்பிக்கவும்." },
  applyOffline: {
    en: "You apply at the school or college office.",
    ta: "பள்ளி அல்லது கல்லூரி அலுவலகத்தில் விண்ணப்பிக்கவும்.",
  },
  applyAutomatic: {
    en: "This is applied automatically. No separate application is needed.",
    ta: "இது தானாகவே விண்ணப்பிக்கப்படும். தனியாக விண்ணப்பிக்க வேண்டியதில்லை.",
  },
  openPortal: { en: "Open official portal", ta: "அதிகாரப்பூர்வ இணையதளத்தைத் திற" },
  sourcesTitle: { en: "Sources", ta: "ஆதாரங்கள்" },
  lastChecked: { en: "Last checked", ta: "கடைசியாகச் சரிபார்க்கப்பட்டது" },
  officeDecides: {
    en: "The office makes the final decision. Check the official page before applying.",
    ta: "இறுதி முடிவு அலுவலகத்தால் எடுக்கப்படும். விண்ணப்பிப்பதற்கு முன் அதிகாரப்பூர்வ பக்கத்தைச் சரிபார்க்கவும்.",
  },
  lowConfidence: { en: "Details may have changed; please verify.", ta: "விவரங்கள் மாறியிருக்கலாம்; தயவுசெய்து சரிபார்க்கவும்." },
} as const satisfies Record<string, { en: string; ta: string }>;

export const FIELD_NAMES: Record<ProfileField, { en: string; ta: string }> = {
  education_level: { en: "Education level", ta: "கல்வி நிலை" },
  state: { en: "State", ta: "மாநிலம்" },
  income: { en: "Annual family income", ta: "ஆண்டு குடும்ப வருமானம்" },
  community: { en: "Community", ta: "சமூகம்" },
  gender: { en: "Gender", ta: "பாலினம்" },
  school_6_to_12: { en: "School type (6–12)", ta: "பள்ளி வகை (6–12)" },
  religion: { en: "Religion", ta: "மதம்" },
  first_graduate: { en: "First graduate in family", ta: "குடும்பத்தில் முதல் பட்டதாரி" },
  institution_type: { en: "Institution type", ta: "கல்வி நிறுவன வகை" },
  course_type: { en: "Course type", ta: "படிப்பு வகை" },
  year_of_study: { en: "Year of study", ta: "படிப்பு ஆண்டு" },
  current_school_type: { en: "Current school type", ta: "தற்போதைய பள்ளி வகை" },
  medium: { en: "Medium of instruction", ta: "பயிற்று மொழி" },
  disability_percent: { en: "Disability percentage", ta: "ஊனமுற்ற சதவீதம்" },
  last_exam_percent: { en: "Last exam percentage", ta: "கடைசி தேர்வு சதவீதம்" },
  admission_route: { en: "Admission route", ta: "சேர்க்கை வழி" },
  aicte_approved: { en: "AICTE approved college", ta: "AICTE அங்கீகரிக்கப்பட்ட கல்லூரி" },
  central_obc_certificate: { en: "Central OBC certificate", ta: "மத்திய OBC சான்றிதழ்" },
  lateral_entry: { en: "Lateral entry", ta: "நேரடி இரண்டாம் ஆண்டு சேர்க்கை" },
  rural: { en: "Rural area", ta: "கிராமப்புறம்" },
  age: { en: "Age", ta: "வயது" },
};

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
