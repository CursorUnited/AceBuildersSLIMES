// Phone storage: the only module that touches localStorage. Keys per docs/CONTRACTS.md §5.
// Every access is try/caught; if localStorage is unavailable we keep an in-memory copy.
import { z } from "zod";
import { ProfileSchema } from "@/lib/engine";

export type Profile = z.infer<typeof ProfileSchema>;

export const LangSchema = z.enum(["ta", "en"]);
export type Lang = z.infer<typeof LangSchema>;

// CONTRACTS §5 does not fix the chat bubble shape, so accept any object. Never log bodies.
export const ChatBubbleSchema = z.record(z.string(), z.unknown());
export type ChatBubble = z.infer<typeof ChatBubbleSchema>;

export const ApplicationStatusSchema = z.enum(["not_started", "docs_ready", "applied", "approved", "rejected"]);

export const ApplicationSchema = z.object({
  scheme_id: z.string().min(1),
  status: ApplicationStatusSchema,
  docs_checked: z.array(z.number().int().nonnegative()),
  reminder_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  updated_at: z.string(),
});
export type Application = z.infer<typeof ApplicationSchema>;
const ApplicationsSchema = z.array(ApplicationSchema);

/** Chat keeps only the most recent bubbles. */
export const CHAT_KEEP_LAST = 30;

const PREFIX = "urimai.";

export const KEYS = {
  profile: "urimai.profile",
  lang: "urimai.lang",
  chat: "urimai.chat",
  applications: "urimai.applications",
} as const;

/** Fallback when localStorage throws (blocked, private mode, quota). */
const memory = new Map<string, string>();

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readRaw(key: string): string | null {
  if (!hasWindow()) return memory.get(key) ?? null;
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // storage blocked: fall through to memory
  }
  return memory.get(key) ?? null;
}

function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // keep the in-memory copy
  }
}

function removeRaw(key: string): void {
  memory.delete(key);
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing else to do
  }
}

/** Reads a key, validates it with zod, and resets the key to the fallback when the data is bad. */
function readValid<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeRaw(key);
    return fallback;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    removeRaw(key);
    return fallback;
  }
  return result.data;
}

function writeJson(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

export function getProfile(): Profile {
  return readValid<Profile>(KEYS.profile, ProfileSchema, {});
}

export function setProfile(profile: Profile): void {
  const parsed = ProfileSchema.safeParse(profile);
  if (parsed.success) writeJson(KEYS.profile, parsed.data);
}

export function getLang(): Lang {
  return readValid<Lang>(KEYS.lang, LangSchema, "ta");
}

export function setLang(lang: Lang): void {
  const parsed = LangSchema.safeParse(lang);
  if (parsed.success) writeJson(KEYS.lang, parsed.data);
}

export function getChat(): ChatBubble[] {
  return readValid<ChatBubble[]>(KEYS.chat, z.array(ChatBubbleSchema), []);
}

export function setChat(messages: ChatBubble[]): void {
  writeJson(KEYS.chat, messages.slice(-CHAT_KEEP_LAST));
}

export function getApplications(): Application[] {
  return readValid<Application[]>(KEYS.applications, ApplicationsSchema, []);
}

export function setApplications(applications: Application[]): void {
  const parsed = ApplicationsSchema.safeParse(applications);
  if (parsed.success) writeJson(KEYS.applications, parsed.data);
}

/** "Forget me on this phone": removes every localStorage key that starts with "urimai.". */
export function clearAll(): void {
  for (const key of Array.from(memory.keys())) {
    if (key.startsWith(PREFIX)) memory.delete(key);
  }
  if (!hasWindow()) return;
  try {
    const storage = window.localStorage;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key !== null && key.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // storage unavailable: memory already cleared
  }
}
