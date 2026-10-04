/**
 * Dev helper: mint a one-time sign-in URL for the allowed email without sending an email.
 * Usage: npx tsx scripts/dev-login-link.ts [base_url]
 * Uses the service role; never run against a URL you don't control.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

async function main() {
  const base = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ALLOWED_EMAIL;
  if (!url || !key || !email) throw new Error("Missing env");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("No hashed_token returned");
  process.stdout.write(`${base}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=%2F\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.message ?? e) + "\n");
  process.exit(1);
});
