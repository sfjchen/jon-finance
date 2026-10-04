import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";
import { resolvePlaidCategory } from "@/lib/categories";
import { displayNameFromNorm } from "@/lib/pipeline/normalize";
import { classifyMerchants, type MerchantToClassify } from "@/lib/llm/gemini";
import type { Tables } from "@/types/database";

type Txn = Pick<
  Tables<"transactions">,
  "id" | "account_id" | "amount" | "raw_description" | "merchant_raw" | "merchant_norm" | "merchant_id" |
  "category_id" | "category_source" | "plaid_pfc_primary" | "plaid_pfc_detailed" | "plaid_pfc_confidence" | "is_transfer"
>;
type Rule = Tables<"category_rules">;
type Merchant = Pick<Tables<"merchants">, "id" | "normalized_name" | "display_name" | "category_id" | "source" | "confidence" | "locked">;

const LLM_REVIEW_THRESHOLD = 0.6;
const LLM_BATCH = 40;

function ruleMatches(rule: Rule, t: Txn): boolean {
  if (!rule.enabled) return false;
  if (rule.account_id && rule.account_id !== t.account_id) return false;
  const amt = Number(t.amount);
  if (rule.amount_min !== null && amt < Number(rule.amount_min)) return false;
  if (rule.amount_max !== null && amt > Number(rule.amount_max)) return false;
  const hay = rule.match_field === "raw_description" ? t.raw_description : t.merchant_norm;
  if (rule.is_regex) {
    try { return new RegExp(rule.pattern, "i").test(hay); } catch { return false; }
  }
  return hay.toUpperCase().includes(rule.pattern.toUpperCase());
}

/**
 * Categorize every transaction whose category_source is 'none' (or all when `force`).
 * Order: user-locked merchant → rule → merchant cache → Plaid PFC (high confidence) → LLM → review.
 */
export async function categorizePending(db: AdminClient, opts: { force?: boolean; accountKinds?: Record<string, string> } = {}) {
  const query = db
    .from("transactions")
    .select("id, account_id, amount, raw_description, merchant_raw, merchant_norm, merchant_id, category_id, category_source, plaid_pfc_primary, plaid_pfc_detailed, plaid_pfc_confidence, is_transfer")
    .is("superseded_by", null)
    .order("posted_date", { ascending: false })
    .limit(2000);
  const { data: txns, error } = opts.force ? await query : await query.eq("category_source", "none");
  if (error) throw error;
  if (!txns || txns.length === 0) return { categorized: 0, llm: 0, review: 0 };

  const [{ data: rules }, { data: merchants }] = await Promise.all([
    db.from("category_rules").select("*").eq("enabled", true).order("priority", { ascending: true }),
    db.from("merchants").select("id, normalized_name, display_name, category_id, source, confidence, locked"),
  ]);
  const merchantByNorm = new Map<string, Merchant>((merchants ?? []).map((m) => [m.normalized_name, m]));

  const accountKinds = opts.accountKinds ?? await loadAccountKinds(db);

  type Update = { id: string; category_id: string | null; category_source: Txn["category_source"]; category_confidence: number | null; merchant_id: string | null; needs_review: boolean; is_transfer?: boolean; is_excluded?: boolean };
  const updates: Update[] = [];
  const unresolved = new Map<string, { txns: Txn[]; }>();
  const ruleHits = new Map<string, number>();

  for (const t of txns) {
    if (t.is_transfer) {
      updates.push({ id: t.id, category_id: t.category_id, category_source: "transfer", category_confidence: 1, merchant_id: t.merchant_id, needs_review: false });
      continue;
    }
    const m = merchantByNorm.get(t.merchant_norm);

    // 1. user-locked merchant
    if (m?.locked && m.category_id) {
      updates.push({ id: t.id, category_id: m.category_id, category_source: "user", category_confidence: 1, merchant_id: m.id, needs_review: false });
      continue;
    }
    // 2. rules
    const rule = (rules ?? []).find((r) => ruleMatches(r, t));
    if (rule) {
      ruleHits.set(rule.id, (ruleHits.get(rule.id) ?? 0) + 1);
      updates.push({
        id: t.id, category_id: rule.category_id, category_source: "rule", category_confidence: 1, merchant_id: m?.id ?? null, needs_review: false,
        ...(rule.mark_transfer ? { is_transfer: true } : {}), ...(rule.mark_excluded ? { is_excluded: true } : {}),
      });
      continue;
    }
    // 3. merchant cache
    if (m?.category_id && m.source !== "none") {
      const conf = Number(m.confidence ?? 0.8);
      updates.push({ id: t.id, category_id: m.category_id, category_source: "merchant", category_confidence: conf, merchant_id: m.id, needs_review: conf < LLM_REVIEW_THRESHOLD });
      continue;
    }
    // 4. Plaid PFC with high confidence
    const plaidCat = resolvePlaidCategory(t.plaid_pfc_primary, t.plaid_pfc_detailed);
    const plaidConf = t.plaid_pfc_confidence;
    if (plaidCat && (plaidConf === "VERY_HIGH" || plaidConf === "HIGH")) {
      updates.push({ id: t.id, category_id: plaidCat, category_source: "plaid", category_confidence: plaidConf === "VERY_HIGH" ? 0.95 : 0.85, merchant_id: m?.id ?? null, needs_review: false });
      continue;
    }
    // 5. collect for LLM
    const bucket = unresolved.get(t.merchant_norm) ?? { txns: [] };
    bucket.txns.push(t);
    unresolved.set(t.merchant_norm, bucket);
  }

  // LLM pass, one call per batch of unique merchants.
  let llmCount = 0;
  const unresolvedList = Array.from(unresolved.entries());
  for (let i = 0; i < unresolvedList.length; i += LLM_BATCH) {
    const slice = unresolvedList.slice(i, i + LLM_BATCH);
    const items: MerchantToClassify[] = slice.map(([norm, { txns: ts }]) => {
      const t0 = ts[0]!;
      const median = ts.map((x) => Number(x.amount)).sort((a, b) => a - b)[Math.floor(ts.length / 2)] ?? Number(t0.amount);
      return {
        merchant_norm: norm,
        sample_description: t0.merchant_raw || t0.raw_description,
        typical_amount: median,
        account_kind: accountKinds[t0.account_id] ?? "unknown",
        plaid_hint: t0.plaid_pfc_detailed ?? t0.plaid_pfc_primary ?? null,
      };
    });
    let results: Awaited<ReturnType<typeof classifyMerchants>> = [];
    try {
      results = await classifyMerchants(db, items);
    } catch (e) {
      // LLM failure is non-fatal: fall through to Plaid low-confidence or review.
      results = [];
      console.error("[categorize] LLM error", e instanceof Error ? e.message : e);
    }
    const byNorm = new Map(results.map((r) => [r.merchant_norm, r]));

    for (const [norm, { txns: ts }] of slice) {
      const r = byNorm.get(norm);
      const t0 = ts[0]!;
      const fallbackCat = resolvePlaidCategory(t0.plaid_pfc_primary, t0.plaid_pfc_detailed);
      const category = r?.category ?? fallbackCat;
      const confidence = r ? r.confidence : fallbackCat ? 0.5 : 0;
      const source: Txn["category_source"] = r ? "llm" : fallbackCat ? "plaid" : "none";

      // Upsert merchant cache so this merchant never hits the LLM again.
      const existing = merchantByNorm.get(norm);
      let merchantId = existing?.id ?? null;
      if (!existing || !existing.locked) {
        const { data: mrow } = await db
          .from("merchants")
          .upsert(
            {
              normalized_name: norm,
              display_name: r?.display_name ?? existing?.display_name ?? displayNameFromNorm(norm),
              category_id: category,
              source,
              confidence,
              reason: r?.reason ?? null,
              txn_count: ts.length,
            },
            { onConflict: "normalized_name" },
          )
          .select("id")
          .single();
        merchantId = mrow?.id ?? merchantId;
      }
      if (r) llmCount += 1;
      for (const t of ts) {
        updates.push({ id: t.id, category_id: category, category_source: source, category_confidence: confidence, merchant_id: merchantId, needs_review: confidence < LLM_REVIEW_THRESHOLD });
      }
    }
  }

  // Apply updates in chunks.
  let review = 0;
  for (let i = 0; i < updates.length; i += 200) {
    const chunk = updates.slice(i, i + 200);
    await Promise.all(
      chunk.map((u) => {
        const { id, ...rest } = u;
        if (rest.needs_review) review += 1;
        return db.from("transactions").update(rest).eq("id", id);
      }),
    );
  }
  for (const [ruleId, hits] of ruleHits) {
    const { data } = await db.from("category_rules").select("hit_count").eq("id", ruleId).single();
    await db.from("category_rules").update({ hit_count: (data?.hit_count ?? 0) + hits }).eq("id", ruleId);
  }

  return { categorized: updates.length, llm: llmCount, review };
}

async function loadAccountKinds(db: AdminClient): Promise<Record<string, string>> {
  const { data } = await db.from("accounts").select("id, kind");
  return Object.fromEntries((data ?? []).map((a) => [a.id, a.kind]));
}
