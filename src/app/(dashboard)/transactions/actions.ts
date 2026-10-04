"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { displayNameFromNorm } from "@/lib/pipeline/normalize";

/**
 * Owner sets a category on one transaction. With applyToMerchant, the merchant is locked to that
 * category and every non-user-categorized transaction for the same merchant_norm is updated too.
 */
export async function setTransactionCategory(input: { transactionId: string; categoryId: string | null; applyToMerchant: boolean }) {
  const { supabase } = await requireOwner();
  const { data: txn, error } = await supabase.from("transactions").select("id, merchant_norm, merchant_id").eq("id", input.transactionId).single();
  if (error || !txn) return { ok: false as const, error: error?.message ?? "not found" };

  const { error: uErr } = await supabase
    .from("transactions")
    .update({ category_id: input.categoryId, category_source: "user", category_confidence: 1, needs_review: false })
    .eq("id", txn.id);
  if (uErr) return { ok: false as const, error: uErr.message };

  let merchantUpdated = 0;
  if (input.applyToMerchant && input.categoryId) {
    const { data: m, error: mErr } = await supabase
      .from("merchants")
      .upsert(
        { normalized_name: txn.merchant_norm, display_name: displayNameFromNorm(txn.merchant_norm), category_id: input.categoryId, source: "user", confidence: 1, locked: true },
        { onConflict: "normalized_name" },
      )
      .select("id")
      .single();
    if (mErr) return { ok: false as const, error: mErr.message };
    const { data: updated } = await supabase
      .from("transactions")
      .update({ category_id: input.categoryId, category_source: "user", category_confidence: 1, needs_review: false, merchant_id: m.id })
      .eq("merchant_norm", txn.merchant_norm)
      .neq("category_source", "user")
      .eq("is_transfer", false)
      .select("id");
    merchantUpdated = updated?.length ?? 0;
  }
  revalidatePath("/transactions");
  revalidatePath("/");
  return { ok: true as const, merchantUpdated };
}

export async function toggleTransfer(input: { transactionId: string; isTransfer: boolean }) {
  const { supabase } = await requireOwner();
  const { error } = await supabase
    .from("transactions")
    .update({ is_transfer: input.isTransfer, category_source: input.isTransfer ? "transfer" : "user", needs_review: false })
    .eq("id", input.transactionId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/transactions");
  revalidatePath("/");
  return { ok: true as const };
}
