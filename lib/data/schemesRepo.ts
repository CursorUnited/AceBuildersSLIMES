// Scheme data access. SERVER ONLY.
// Uses Supabase table "schemes" (docs/CONTRACTS.md §2) when SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set; otherwise reads data/schemes.seed.json (read-only, all published).
// Every row's data is validated with SchemeSchema before use (zod at the boundary).
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SchemeSchema } from "../engine/schemas";

export type Scheme = z.infer<typeof SchemeSchema>;
export type SchemeStatus = "draft" | "published";

const StatusSchema = z.enum(["draft", "published"]);

const RowSchema = z.object({
  id: z.string(),
  status: StatusSchema,
  data: z.unknown(),
  updated_at: z.string().nullable(),
});
type Row = z.infer<typeof RowSchema>;

const CACHE_MS = 60_000;
let cache: { at: number; schemes: Scheme[] } | null = null;
let client: SupabaseClient | null = null;

/** Returns a Supabase client when env is configured, otherwise null (seed mode). */
function db(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

function readSeed(): Row[] {
  const file = path.join(process.cwd(), "data", "schemes.seed.json");
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error("schemes.seed.json must be a JSON array");
  const rows: Row[] = [];
  for (const item of raw) {
    const id = typeof item === "object" && item !== null && "id" in item ? String(item.id) : "";
    rows.push({ id, status: "published", data: item, updated_at: null });
  }
  return rows;
}

async function loadRows(): Promise<Row[]> {
  const c = db();
  if (!c) return readSeed();
  const { data, error } = await c.from("schemes").select("id,status,data,updated_at");
  if (error) throw new Error(`schemes query failed: ${error.message}`);
  const rows: Row[] = [];
  for (const r of data ?? []) {
    const parsed = RowSchema.safeParse(r);
    if (parsed.success) rows.push(parsed.data);
    else console.warn("[schemesRepo] skipping malformed row");
  }
  return rows;
}

function parseScheme(raw: unknown, id: string): Scheme | null {
  const parsed = SchemeSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.warn(`[schemesRepo] skipping invalid scheme "${id}": ${issues}`);
    return null;
  }
  return parsed.data;
}

/** Published schemes only. Cached in memory for 60 s. */
export async function getPublished(): Promise<Scheme[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.schemes;
  const schemes: Scheme[] = [];
  for (const row of await loadRows()) {
    if (row.status !== "published") continue;
    const s = parseScheme(row.data, row.id);
    if (s) schemes.push(s);
  }
  cache = { at: now, schemes };
  return schemes;
}

export async function getPublishedById(id: string): Promise<Scheme | null> {
  const all = await getPublished();
  return all.find((s) => s.id === id) ?? null;
}

/** All rows incl. drafts, for admin. Not cached. */
export async function getAllForAdmin(): Promise<
  { status: SchemeStatus; data: Scheme; updated_at: string | null }[]
> {
  const out: { status: SchemeStatus; data: Scheme; updated_at: string | null }[] = [];
  for (const row of await loadRows()) {
    const s = parseScheme(row.data, row.id);
    if (s) out.push({ status: row.status, data: s, updated_at: row.updated_at });
  }
  return out;
}

/** Validates with SchemeSchema, saves to Supabase, clears the cache. Throws on invalid input or no DB. */
export async function upsertScheme(id: string, status: SchemeStatus, data: unknown): Promise<void> {
  const st = StatusSchema.parse(status);
  const parsed = SchemeSchema.parse(data);
  if (parsed.id !== id) throw new Error(`scheme id mismatch: path "${id}" vs data "${parsed.id}"`);
  const c = db();
  if (!c) throw new Error("Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  const { error } = await c.from("schemes").upsert(
    { id, status: st, data: parsed, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) throw new Error(`schemes upsert failed: ${error.message}`);
  cache = null;
}
