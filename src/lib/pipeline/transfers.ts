import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";

const WINDOW_DAYS = 5;

/**
 * Pair opposite-sign, equal-amount transactions across the user's own accounts within ±WINDOW_DAYS.
 * Both legs get is_transfer = true and a shared transfer_group_id. Candidates are limited to
 * transactions that look like transfers (Plaid TRANSFER_* / LOAN_PAYMENTS or transfer-ish descriptions),
 * which keeps coincidental equal amounts (two $20 lunches) from pairing.
 */
export async function detectTransfers(db: AdminClient, sinceDate: string): Promise<{ paired: number }> {
  const { data: txns, error } = await db
    .from("transactions")
    .select("id, account_id, posted_date, amount, raw_description, merchant_norm, plaid_pfc_primary, is_transfer, transfer_group_id, pending")
    .gte("posted_date", sinceDate)
    .is("superseded_by", null)
    .eq("pending", false)
    .order("posted_date", { ascending: true });
  if (error) throw error;
  if (!txns) return { paired: 0 };

  const transferish = (t: (typeof txns)[number]) => {
    if (t.plaid_pfc_primary && ["TRANSFER_IN", "TRANSFER_OUT", "LOAN_PAYMENTS"].includes(t.plaid_pfc_primary)) return true;
    return /\b(transfer|xfer|payment|pymt|pmt|autopay|deposit|withdrawal|venmo|paypal|zelle|robinhood|fidelity|ach)\b/i.test(t.raw_description + " " + t.merchant_norm);
  };

  const candidates = txns.filter((t) => !t.transfer_group_id && transferish(t));
  const used = new Set<string>();
  const pairs: Array<[string, string]> = [];

  const byAmount = new Map<string, typeof candidates>();
  for (const t of candidates) {
    const key = Math.abs(Number(t.amount)).toFixed(2);
    const arr = byAmount.get(key) ?? [];
    arr.push(t);
    byAmount.set(key, arr);
  }

  for (const group of byAmount.values()) {
    if (group.length < 2) continue;
    for (const a of group) {
      if (used.has(a.id)) continue;
      const aAmt = Number(a.amount);
      let best: (typeof group)[number] | null = null;
      let bestGap = Infinity;
      for (const b of group) {
        if (b.id === a.id || used.has(b.id) || b.account_id === a.account_id) continue;
        if (Math.sign(Number(b.amount)) === Math.sign(aAmt)) continue;
        const gap = Math.abs(daysBetween(a.posted_date, b.posted_date));
        if (gap <= WINDOW_DAYS && gap < bestGap) { best = b; bestGap = gap; }
      }
      if (best) {
        used.add(a.id); used.add(best.id);
        pairs.push([a.id, best.id]);
      }
    }
  }

  for (const [x, y] of pairs) {
    const groupId = crypto.randomUUID();
    await db
      .from("transactions")
      .update({ is_transfer: true, transfer_group_id: groupId, category_source: "transfer", needs_review: false })
      .in("id", [x, y]);
  }
  return { paired: pairs.length };
}

function daysBetween(a: string, b: string): number {
  return (new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) / 86_400_000;
}
