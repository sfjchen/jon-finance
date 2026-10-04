import { requireOwner } from "@/lib/auth";
import { TransactionsTable, type TxnRow } from "./transactions-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Transactions" };

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const params = await searchParams;
  const reviewOnly = params.review === "1";
  const { supabase } = await requireOwner();

  let q = supabase
    .from("transactions")
    .select("id, posted_date, amount, raw_description, merchant_raw, merchant_norm, category_id, category_source, category_confidence, needs_review, is_transfer, pending, logo_url, account_id, accounts!inner(name, institution_name, mask, kind)")
    .is("superseded_by", null)
    .order("posted_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);
  if (reviewOnly) q = q.eq("needs_review", true);

  const [{ data: txns, error }, { data: categories }, { data: accounts }] = await Promise.all([
    q,
    supabase.from("categories").select("id, parent_id, name, color, kind").order("sort"),
    supabase.from("accounts").select("id, name, institution_name, mask").order("institution_name"),
  ]);
  if (error) throw new Error(error.message);

  const rows: TxnRow[] = (txns ?? []).map((t) => ({
    id: t.id,
    posted_date: String(t.posted_date),
    amount: Number(t.amount),
    raw_description: t.raw_description,
    merchant_raw: t.merchant_raw,
    merchant_norm: t.merchant_norm,
    category_id: t.category_id,
    category_source: t.category_source,
    category_confidence: t.category_confidence === null ? null : Number(t.category_confidence),
    needs_review: t.needs_review,
    is_transfer: t.is_transfer,
    pending: t.pending,
    logo_url: t.logo_url,
    account_id: t.account_id,
    account_label: `${t.accounts.institution_name} · ${t.accounts.name}${t.accounts.mask ? ` ••${t.accounts.mask}` : ""}`,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-xs text-muted-foreground tabular-nums">{rows.length}{rows.length === 1000 ? "+" : ""} rows{reviewOnly ? " · review queue" : ""}</p>
      </div>
      <TransactionsTable rows={rows} categories={categories ?? []} accounts={accounts ?? []} reviewOnly={reviewOnly} />
    </div>
  );
}
