/** Print row counts and samples for a quick health check. Usage: npm run db:stats */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
async function main() {
  type CountQuery = ReturnType<ReturnType<typeof db.from>["select"]>;
  const c = async (t: string, f?: (q: CountQuery) => CountQuery) => {
    let q = db.from(t).select("id", { count: "exact", head: true }) as CountQuery;
    if (f) q = f(q);
    const { count, error } = await q;
    return error ? `ERR ${error.message}` : count;
  };
  console.log("accounts", await c("accounts"));
  console.log("transactions", await c("transactions"));
  console.log("  pending", await c("transactions", q => q.eq("pending", true)));
  console.log("  transfers", await c("transactions", q => q.eq("is_transfer", true)));
  console.log("  needs_review", await c("transactions", q => q.eq("needs_review", true)));
  for (const s of ["none","rule","merchant","plaid","llm","user","transfer"]) console.log("  source", s, await c("transactions", q => q.eq("category_source", s)));
  console.log("merchants", await c("merchants"));
  console.log("holdings", await c("holdings"));
  console.log("securities", await c("securities"));
  console.log("investment_transactions", await c("investment_transactions"));
  console.log("credit_statements", await c("credit_statements"));
  console.log("balance_snapshots", await c("balance_snapshots"));
  console.log("llm_cache", await c("llm_cache"));
  const { data: runs } = await db.from("sync_runs").select("status, added, modified, removed, categorized, error, trigger").order("started_at", { ascending: false }).limit(3);
  console.log("sync_runs", JSON.stringify(runs));
  const { data: sample } = await db.from("transactions").select("posted_date, amount, merchant_norm, category_id, category_source, category_confidence, plaid_pfc_confidence").order("posted_date", { ascending: false }).limit(12);
  console.table(sample);
  const { data: m } = await db.from("merchants").select("normalized_name, display_name, category_id, source, confidence, reason").limit(12);
  console.table(m);
  const { data: cf } = await db.from("v_monthly_cash_flow").select("*").order("month", { ascending: false }).limit(4);
  console.table(cf);
}
main();
