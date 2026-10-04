/**
 * Upsert the category taxonomy into Postgres.
 * Usage: npm run seed:categories   (reads .env.local)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { flattenCategories } from "../src/lib/categories";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const rows = flattenCategories();
  // Parents first so FK constraints hold.
  const parents = rows.filter((r) => r.parent_id === null);
  const children = rows.filter((r) => r.parent_id !== null);

  for (const batch of [parents, children]) {
    const { error } = await db.from("categories").upsert(batch, { onConflict: "id" });
    if (error) throw error;
  }
  process.stdout.write(`Seeded ${parents.length} primary + ${children.length} detailed categories\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.message ?? e) + "\n");
  process.exit(1);
});
