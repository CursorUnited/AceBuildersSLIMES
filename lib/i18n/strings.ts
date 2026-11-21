// Fixed UI text. Every entry is { en, ta }. Add a key here before using it; t() rejects unknown keys at compile time.
import type { Lang } from "@/lib/storage";

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
} as const satisfies Record<string, { en: string; ta: string }>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
