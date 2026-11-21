// One-off seed: upserts data/schemes.seed.json into Supabase table "schemes" as status "published".
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Run from project root with a TS runner (e.g. npx tsx).
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SchemeSchema } from "../lib/engine/schemas";

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    process.exit(1);
  }

  const raw: unknown = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "schemes.seed.json"), "utf8"),
  );
  if (!Array.isArray(raw)) throw new Error("schemes.seed.json must be a JSON array");

  const rows = raw.map((item) => {
    const parsed = SchemeSchema.safeParse(item);
    if (!parsed.success) {
      const id = typeof item === "object" && item !== null && "id" in item ? String(item.id) : "?";
      throw new Error(`invalid scheme "${id}": ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    return {
      id: parsed.data.id,
      status: "published" as const,
      data: parsed.data,
      updated_at: new Date().toISOString(),
    };
  });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("schemes").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`upsert failed: ${error.message}`);

  console.log(`Seeded ${rows.length} scheme(s) into "schemes" as published.`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
