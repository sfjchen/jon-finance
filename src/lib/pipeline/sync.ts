import "server-only";

import type { AccountBase, Transaction as PlaidTransaction, Holding, Security, InvestmentTransaction, CreditCardLiability } from "plaid";
import { plaidClient } from "@/lib/plaid";
import type { AdminClient } from "@/lib/supabase/admin";
import { normalizeMerchant } from "@/lib/pipeline/normalize";
import { categorizePending } from "@/lib/pipeline/categorize";
import { detectTransfers } from "@/lib/pipeline/transfers";
import { isoDate } from "@/lib/format";
import type { Tables, TablesInsert, Enums, Json } from "@/types/database";

type Item = Tables<"plaid_items">;

export interface SyncResult {
  item_id: string;
  institution: string | null;
  added: number;
  modified: number;
  removed: number;
  holdings: number;
  categorized: number;
  transfers: number;
  error?: string;
}

function accountKind(type: AccountBase["type"]): Enums<"account_kind"> {
  switch (type) {
    case "depository": return "depository";
    case "credit": return "credit";
    case "investment": case "brokerage": return "investment";
    case "loan": return "loan";
    default: return "other";
  }
}

/** Upsert accounts from a Plaid accounts array and write today's balance snapshot. Returns plaid_account_id → uuid. */
export async function upsertAccounts(db: AdminClient, item: Item, accounts: AccountBase[]): Promise<Map<string, string>> {
  const today = isoDate();
  const rows: TablesInsert<"accounts">[] = accounts.map((a) => ({
    source: "plaid",
    plaid_item_id: item.id,
    plaid_account_id: a.account_id,
    institution_name: item.institution_name ?? "Unknown",
    name: a.name,
    official_name: a.official_name ?? null,
    mask: a.mask ?? null,
    kind: accountKind(a.type),
    subtype: a.subtype ?? null,
    currency: a.balances.iso_currency_code ?? "USD",
    current_balance: a.balances.current ?? null,
    available_balance: a.balances.available ?? null,
    credit_limit: a.balances.limit ?? null,
    balance_as_of: new Date().toISOString(),
  }));
  const { data, error } = await db
    .from("accounts")
    .upsert(rows, { onConflict: "plaid_account_id", ignoreDuplicates: false })
    .select("id, plaid_account_id");
  if (error) throw error;
  const map = new Map<string, string>();
  for (const r of data ?? []) if (r.plaid_account_id) map.set(r.plaid_account_id, r.id);

  const snapshots: TablesInsert<"balance_snapshots">[] = accounts
    .filter((a) => map.has(a.account_id))
    .map((a) => ({
      account_id: map.get(a.account_id)!,
      as_of: today,
      current: a.balances.current ?? null,
      available: a.balances.available ?? null,
      credit_limit: a.balances.limit ?? null,
      source: "plaid",
    }));
  if (snapshots.length) {
    const { error: sErr } = await db.from("balance_snapshots").upsert(snapshots, { onConflict: "account_id,as_of" });
    if (sErr) throw sErr;
  }
  return map;
}

function toTxnRow(t: PlaidTransaction, accountId: string): TablesInsert<"transactions"> {
  const merchantNorm = normalizeMerchant(t.name, t.merchant_name);
  return {
    account_id: accountId,
    source: "plaid",
    source_id: t.transaction_id,
    posted_date: t.date,
    authorized_date: t.authorized_date ?? null,
    amount: -Number(t.amount), // Plaid: positive = outflow. Ours: negative = outflow.
    currency: t.iso_currency_code ?? "USD",
    raw_description: t.name,
    merchant_raw: t.merchant_name ?? null,
    merchant_norm: merchantNorm,
    plaid_pfc_primary: t.personal_finance_category?.primary ?? null,
    plaid_pfc_detailed: t.personal_finance_category?.detailed ?? null,
    plaid_pfc_confidence: t.personal_finance_category?.confidence_level ?? null,
    payment_channel: t.payment_channel ?? null,
    pending: t.pending,
    pending_source_id: t.pending_transaction_id ?? null,
    logo_url: t.logo_url ?? null,
    website: t.website ?? null,
    location: t.location ? (t.location as unknown as Json) : null,
    raw: t as unknown as Json,
  };
}

async function syncTransactions(db: AdminClient, item: Item, accountMap: Map<string, string>) {
  const plaid = plaidClient();
  let cursor = item.transactions_cursor ?? undefined;
  let added = 0, modified = 0, removed = 0;
  let hasMore = true;
  let earliest: string | null = null;

  while (hasMore) {
    const { data } = await plaid.transactionsSync({
      access_token: item.access_token,
      cursor,
      count: 500,
      options: { include_personal_finance_category: true, include_original_description: true },
    });

    // Accounts may appear mid-stream (new accounts on the item).
    for (const a of data.accounts) if (!accountMap.has(a.account_id)) {
      const m = await upsertAccounts(db, item, [a as unknown as AccountBase]);
      for (const [k, v] of m) accountMap.set(k, v);
    }

    const upserts = [...data.added, ...data.modified]
      .filter((t) => accountMap.has(t.account_id))
      .map((t) => toTxnRow(t, accountMap.get(t.account_id)!));
    for (let i = 0; i < upserts.length; i += 200) {
      const chunk = upserts.slice(i, i + 200);
      const { error } = await db.from("transactions").upsert(chunk, { onConflict: "account_id,source_id" });
      if (error) throw error;
    }
    for (const t of data.added) if (!earliest || t.date < earliest) earliest = t.date;
    added += data.added.length;
    modified += data.modified.length;

    if (data.removed.length) {
      const ids = data.removed.map((r) => r.transaction_id);
      const { error } = await db.from("transactions").delete().in("source_id", ids).eq("source", "plaid");
      if (error) throw error;
      removed += data.removed.length;
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
    // Persist cursor after each page so a crash mid-way is resumable.
    await db.from("plaid_items").update({ transactions_cursor: cursor }).eq("id", item.id);
  }
  return { added, modified, removed, earliest };
}

async function upsertSecurities(db: AdminClient, securities: Security[]): Promise<Map<string, string>> {
  if (!securities.length) return new Map();
  const rows: TablesInsert<"securities">[] = securities.map((s) => ({
    plaid_security_id: s.security_id,
    ticker: s.ticker_symbol ?? null,
    name: s.name ?? null,
    type: s.type ?? null,
    cusip: s.cusip ?? null,
    isin: s.isin ?? null,
    is_cash_equivalent: !!s.is_cash_equivalent,
    close_price: s.close_price ?? null,
    close_price_as_of: s.close_price_as_of ?? null,
  }));
  const { data, error } = await db.from("securities").upsert(rows, { onConflict: "plaid_security_id" }).select("id, plaid_security_id");
  if (error) throw error;
  const map = new Map<string, string>();
  for (const r of data ?? []) if (r.plaid_security_id) map.set(r.plaid_security_id, r.id);
  return map;
}

async function syncInvestments(db: AdminClient, item: Item, accountMap: Map<string, string>): Promise<number> {
  const plaid = plaidClient();
  let holdings: Holding[] = [];
  let securities: Security[] = [];
  try {
    const { data } = await plaid.investmentsHoldingsGet({ access_token: item.access_token });
    holdings = data.holdings;
    securities = data.securities;
    for (const a of data.accounts) if (!accountMap.has(a.account_id)) {
      const m = await upsertAccounts(db, item, [a as unknown as AccountBase]);
      for (const [k, v] of m) accountMap.set(k, v);
    }
  } catch {
    return 0; // Item has no investment accounts or product not enabled.
  }
  const secMap = await upsertSecurities(db, securities);
  const today = isoDate();
  const rows: TablesInsert<"holdings">[] = holdings
    .filter((h) => accountMap.has(h.account_id) && secMap.has(h.security_id))
    .map((h) => ({
      account_id: accountMap.get(h.account_id)!,
      security_id: secMap.get(h.security_id)!,
      as_of: today,
      quantity: h.quantity,
      cost_basis: h.cost_basis ?? null,
      institution_price: h.institution_price ?? null,
      institution_value: h.institution_value ?? null,
      source: "plaid",
    }));
  if (rows.length) {
    const { error } = await db.from("holdings").upsert(rows, { onConflict: "account_id,security_id,as_of" });
    if (error) throw error;
  }

  // Investment transactions: pull 24 months on first sync, 30 days after.
  const start = item.last_synced_at ? daysAgo(30) : daysAgo(730);
  try {
    let offset = 0;
    const count = 500;
    let total = Infinity;
    while (offset < total) {
      const { data } = await plaid.investmentsTransactionsGet({
        access_token: item.access_token,
        start_date: start,
        end_date: today,
        options: { count, offset },
      });
      total = data.total_investment_transactions;
      const extraSec = await upsertSecurities(db, data.securities);
      for (const [k, v] of extraSec) secMap.set(k, v);
      const itRows: TablesInsert<"investment_transactions">[] = data.investment_transactions
        .filter((t: InvestmentTransaction) => accountMap.has(t.account_id))
        .map((t: InvestmentTransaction) => ({
          account_id: accountMap.get(t.account_id)!,
          security_id: t.security_id ? secMap.get(t.security_id) ?? null : null,
          source: "plaid",
          source_id: t.investment_transaction_id,
          date: t.date,
          type: t.type,
          subtype: t.subtype ?? null,
          name: t.name ?? null,
          quantity: t.quantity ?? null,
          price: t.price ?? null,
          fees: t.fees ?? null,
          amount: -Number(t.amount), // Plaid: positive = cash out of account.
          currency: t.iso_currency_code ?? "USD",
          raw: t as unknown as Json,
        }));
      if (itRows.length) {
        const { error } = await db.from("investment_transactions").upsert(itRows, { onConflict: "account_id,source_id" });
        if (error) throw error;
      }
      offset += data.investment_transactions.length;
      if (data.investment_transactions.length === 0) break;
    }
  } catch {
    // Non-fatal.
  }
  return rows.length;
}

async function syncLiabilities(db: AdminClient, item: Item, accountMap: Map<string, string>) {
  const plaid = plaidClient();
  try {
    const { data } = await plaid.liabilitiesGet({ access_token: item.access_token });
    const credit: CreditCardLiability[] = data.liabilities.credit ?? [];
    const today = isoDate();
    const rows: TablesInsert<"credit_statements">[] = credit
      .filter((c) => c.account_id && accountMap.has(c.account_id))
      .map((c) => ({
        account_id: accountMap.get(c.account_id!)!,
        as_of: today,
        last_statement_balance: c.last_statement_balance ?? null,
        last_statement_issue_date: c.last_statement_issue_date ?? null,
        next_payment_due_date: c.next_payment_due_date ?? null,
        minimum_payment_amount: c.minimum_payment_amount ?? null,
        last_payment_amount: c.last_payment_amount ?? null,
        last_payment_date: c.last_payment_date ?? null,
        is_overdue: c.is_overdue ?? null,
        purchase_apr: c.aprs?.find((a) => a.apr_type === "purchase_apr")?.apr_percentage ?? null,
        raw: c as unknown as Json,
      }));
    if (rows.length) await db.from("credit_statements").upsert(rows, { onConflict: "account_id,as_of" });
  } catch {
    // No liabilities on this item.
  }
}

/** Sync one Item end to end: accounts, transactions, investments, liabilities, transfers, categorization. */
export async function syncItem(db: AdminClient, item: Item, trigger: "manual" | "cron" | "link" = "manual"): Promise<SyncResult> {
  const { data: run } = await db.from("sync_runs").insert({ plaid_item_id: item.id, trigger }).select("id").single();
  const result: SyncResult = { item_id: item.item_id, institution: item.institution_name, added: 0, modified: 0, removed: 0, holdings: 0, categorized: 0, transfers: 0 };
  try {
    const { data: acct } = await plaidClient().accountsGet({ access_token: item.access_token });
    const accountMap = await upsertAccounts(db, item, acct.accounts);

    const tx = await syncTransactions(db, item, accountMap);
    result.added = tx.added; result.modified = tx.modified; result.removed = tx.removed;

    result.holdings = await syncInvestments(db, item, accountMap);
    await syncLiabilities(db, item, accountMap);

    const since = tx.earliest ?? daysAgo(45);
    const tr = await detectTransfers(db, since);
    result.transfers = tr.paired;

    const cat = await categorizePending(db);
    result.categorized = cat.categorized;

    await db.from("plaid_items").update({ last_synced_at: new Date().toISOString(), status: "active", error_code: null, error_message: null }).eq("id", item.id);
    if (run) await db.from("sync_runs").update({ finished_at: new Date().toISOString(), status: "ok", added: tx.added, modified: tx.modified, removed: tx.removed, categorized: cat.categorized }).eq("id", run.id);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error_code?: string; error_message?: string } }; message?: string };
    const code = err.response?.data?.error_code ?? null;
    const msg = err.response?.data?.error_message ?? err.message ?? "Unknown error";
    result.error = code ? `${code}: ${msg}` : msg;
    await db.from("plaid_items").update({
      status: code === "ITEM_LOGIN_REQUIRED" ? "login_required" : "error",
      error_code: code, error_message: msg,
    }).eq("id", item.id);
    if (run) await db.from("sync_runs").update({ finished_at: new Date().toISOString(), status: "error", error: result.error }).eq("id", run.id);
  }
  return result;
}

export async function syncAllItems(db: AdminClient, trigger: "manual" | "cron" = "manual"): Promise<SyncResult[]> {
  const { data: items, error } = await db.from("plaid_items").select("*").neq("status", "removed");
  if (error) throw error;
  const out: SyncResult[] = [];
  for (const item of items ?? []) out.push(await syncItem(db, item, trigger));
  return out;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
