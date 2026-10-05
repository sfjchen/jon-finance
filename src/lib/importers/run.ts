import "server-only";

import type { AdminClient } from "@/lib/supabase/admin";
import type { TablesInsert, Json } from "@/types/database";
import { importerById, detectImporter, type ParseResult } from "@/lib/importers";
import type { AccountKind } from "@/lib/importers/types";
import { normalizeMerchant, sha256 } from "@/lib/pipeline/normalize";
import { categorizePending } from "@/lib/pipeline/categorize";
import { detectTransfers } from "@/lib/pipeline/transfers";

export interface ImportRequest {
  filename: string;
  text: string;
  importerId?: string | null; // "auto" or undefined → detect
  accountId?: string | null;
  newAccount?: { name: string; institution?: string; kind?: AccountKind; mask?: string | null } | null;
}

export interface ImportResult {
  filename: string;
  importer: string;
  account_id: string;
  account_label: string;
  rows: number;
  inserted: number;
  skipped_duplicates: number;
  investment_rows: number;
  holdings: number;
  superseded: number;
  transfers: number;
  categorized: number;
  dateRange: ParseResult["dateRange"];
  warnings: string[];
  alreadyImported?: boolean;
}

export async function runImport(db: AdminClient, req: ImportRequest): Promise<ImportResult> {
  const importer = req.importerId && req.importerId !== "auto" ? importerById(req.importerId) : detectImporter(req.text);
  if (!importer) throw new Error(`Could not detect the file format for ${req.filename}. Pick an importer explicitly.`);

  const fileHash = await sha256(importer.id + "|" + req.text);
  const { data: prior } = await db.from("csv_imports").select("id, account_id, inserted").eq("file_hash", fileHash).maybeSingle();

  const parsed = importer.parse(req.text, req.filename);

  // Resolve account.
  let accountId = req.accountId ?? null;
  if (!accountId && prior?.account_id) accountId = prior.account_id;
  if (!accountId) {
    const na = req.newAccount;
    const name = na?.name?.trim() || parsed.accountHints.name || importer.label;
    const institution = na?.institution?.trim() || parsed.accountHints.institution;
    const kind = na?.kind ?? parsed.accountHints.kind;
    const mask = na?.mask ?? parsed.accountHints.mask ?? null;
    const { data: existing } = await db.from("accounts").select("id").eq("source", "csv").eq("institution_name", institution).eq("name", name).maybeSingle();
    if (existing) accountId = existing.id;
    else {
      const { data: created, error } = await db.from("accounts").insert({ source: "csv", institution_name: institution, name, kind, mask }).select("id").single();
      if (error) throw error;
      accountId = created.id;
    }
  }
  const { data: account } = await db.from("accounts").select("id, name, institution_name, source").eq("id", accountId).single();
  if (!account) throw new Error("Account not found");
  const label = `${account.institution_name} · ${account.name}`;

  const result: ImportResult = {
    filename: req.filename, importer: importer.id, account_id: accountId, account_label: label,
    rows: parsed.transactions.length + parsed.investmentTransactions.length + parsed.holdings.length,
    inserted: 0, skipped_duplicates: 0, investment_rows: 0, holdings: 0, superseded: 0, transfers: 0, categorized: 0,
    dateRange: parsed.dateRange, warnings: parsed.warnings,
  };
  if (prior) { result.alreadyImported = true; result.skipped_duplicates = result.rows; return result; }

  // ---- Ledger transactions -------------------------------------------------
  if (parsed.transactions.length) {
    const seen = new Map<string, number>();
    const rows: TablesInsert<"transactions">[] = [];
    for (const t of parsed.transactions) {
      let sourceId = t.source_id ?? null;
      if (!sourceId) {
        const base = `${accountId}|${t.posted_date}|${t.amount.toFixed(2)}|${t.raw_description.trim().toUpperCase()}`;
        const n = (seen.get(base) ?? 0) + 1;
        seen.set(base, n);
        sourceId = "csv:" + (await sha256(`${base}|${n}`)).slice(0, 32);
      }
      rows.push({
        account_id: accountId,
        source: "csv",
        source_id: sourceId,
        posted_date: t.posted_date,
        authorized_date: t.authorized_date ?? null,
        amount: Math.round(t.amount * 100) / 100,
        raw_description: t.raw_description.slice(0, 500),
        merchant_raw: t.merchant_raw ?? null,
        merchant_norm: normalizeMerchant(t.raw_description, t.merchant_raw ?? null),
        pending: !!t.pending,
        is_transfer: !!t.is_transfer,
        category_id: t.category_hint ?? null,
        category_source: t.is_transfer ? "transfer" : t.category_hint ? "rule" : "none",
        category_confidence: t.category_hint ? 0.9 : null,
        raw: (t.raw ?? null) as Json,
      });
    }
    const { count: before } = await db.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", accountId).eq("source", "csv");
    for (let i = 0; i < rows.length; i += 300) {
      const { error } = await db.from("transactions").upsert(rows.slice(i, i + 300), { onConflict: "account_id,source_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const { count: after } = await db.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", accountId).eq("source", "csv");
    result.inserted = (after ?? 0) - (before ?? 0);
    result.skipped_duplicates = rows.length - result.inserted;
  }

  // ---- Investment transactions ---------------------------------------------
  if (parsed.investmentTransactions.length) {
    const tickers = Array.from(new Set(parsed.investmentTransactions.map((t) => t.ticker).filter((x): x is string => !!x)));
    const secMap = await ensureSecurities(db, tickers.map((t) => ({ ticker: t, name: parsed.investmentTransactions.find((x) => x.ticker === t)?.security_name ?? null })));
    const rows: TablesInsert<"investment_transactions">[] = parsed.investmentTransactions.map((t) => ({
      account_id: accountId!,
      security_id: t.ticker ? secMap.get(t.ticker) ?? null : null,
      source: "csv",
      source_id: t.source_id ?? `csv:${t.date}:${t.type}:${t.ticker ?? ""}:${t.amount.toFixed(2)}`,
      date: t.date,
      type: t.type,
      subtype: t.subtype ?? null,
      name: t.name,
      quantity: t.quantity ?? null,
      price: t.price ?? null,
      fees: t.fees ?? null,
      amount: Math.round(t.amount * 100) / 100,
      raw: (t.raw ?? null) as Json,
    }));
    for (let i = 0; i < rows.length; i += 300) {
      const { error } = await db.from("investment_transactions").upsert(rows.slice(i, i + 300), { onConflict: "account_id,source_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    result.investment_rows = rows.length;
  }

  // ---- Holdings snapshot ----------------------------------------------------
  if (parsed.holdings.length) {
    const secMap = await ensureSecurities(db, parsed.holdings.map((h) => ({ ticker: h.ticker ?? "CASH", name: h.name, isCash: h.is_cash, price: h.price, asOf: h.as_of })));
    const rows: TablesInsert<"holdings">[] = parsed.holdings.map((h) => ({
      account_id: accountId!,
      security_id: secMap.get(h.ticker ?? "CASH")!,
      as_of: h.as_of,
      quantity: h.quantity,
      cost_basis: h.cost_basis,
      institution_price: h.price,
      institution_value: h.value,
      source: "csv",
    }));
    const { error } = await db.from("holdings").upsert(rows, { onConflict: "account_id,security_id,as_of" });
    if (error) throw error;
    result.holdings = rows.length;
    const total = Math.round(parsed.holdings.reduce((s, h) => s + (h.value ?? 0), 0) * 100) / 100;
    const asOf = parsed.holdings[0]!.as_of;
    await db.from("balance_snapshots").upsert({ account_id: accountId, as_of: asOf, current: total, source: "csv" }, { onConflict: "account_id,as_of" });
    await db.from("accounts").update({ current_balance: total, balance_as_of: new Date(asOf + "T23:59:59Z").toISOString() }).eq("id", accountId);
  }

  // ---- Post-processing -------------------------------------------------------
  if (parsed.transactions.length) {
    result.superseded = await reconcileOverlap(db, accountId);
    const since = parsed.dateRange?.from ?? new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    result.transfers = (await detectTransfers(db, since)).paired;
    result.categorized = (await categorizePending(db)).categorized;
  }

  await db.from("csv_imports").insert({
    filename: req.filename, importer: importer.id, account_id: accountId, file_hash: fileHash,
    row_count: result.rows, inserted: result.inserted + result.investment_rows + result.holdings, skipped: result.skipped_duplicates,
  });
  return result;
}

/** Find or create securities by ticker. Plaid-sourced securities are matched by ticker too. */
async function ensureSecurities(db: AdminClient, items: Array<{ ticker: string; name: string | null; isCash?: boolean; price?: number | null; asOf?: string }>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const tickers = Array.from(new Set(items.map((i) => i.ticker)));
  if (!tickers.length) return map;
  const { data: existing } = await db.from("securities").select("id, ticker").in("ticker", tickers);
  for (const s of existing ?? []) if (s.ticker && !map.has(s.ticker)) map.set(s.ticker, s.id);
  const missing = items.filter((i) => !map.has(i.ticker));
  const dedup = new Map<string, (typeof missing)[number]>();
  for (const m of missing) if (!dedup.has(m.ticker)) dedup.set(m.ticker, m);
  if (dedup.size) {
    const { data: created, error } = await db
      .from("securities")
      .insert(Array.from(dedup.values()).map((m) => ({
        ticker: m.ticker, name: m.name, type: m.isCash ? "cash" : null, is_cash_equivalent: !!m.isCash,
        close_price: m.price ?? null, close_price_as_of: m.asOf ?? null,
      })))
      .select("id, ticker");
    if (error) throw error;
    for (const s of created ?? []) if (s.ticker) map.set(s.ticker, s.id);
  }
  return map;
}

/**
 * When an account has both Plaid and CSV rows, mark CSV rows that match a Plaid row
 * (same amount, posted within ±3 days) as superseded so analytics count each transaction once.
 */
export async function reconcileOverlap(db: AdminClient, accountId: string): Promise<number> {
  const { data: plaidRows } = await db.from("transactions").select("id, posted_date, amount").eq("account_id", accountId).eq("source", "plaid").eq("pending", false);
  if (!plaidRows || plaidRows.length === 0) return 0;
  const { data: csvRows } = await db.from("transactions").select("id, posted_date, amount").eq("account_id", accountId).eq("source", "csv").is("superseded_by", null);
  if (!csvRows || csvRows.length === 0) return 0;

  const byAmount = new Map<string, Array<{ id: string; posted_date: string; used: boolean }>>();
  for (const p of plaidRows) {
    const k = Number(p.amount).toFixed(2);
    byAmount.set(k, [...(byAmount.get(k) ?? []), { id: p.id, posted_date: String(p.posted_date), used: false }]);
  }
  let count = 0;
  for (const c of csvRows) {
    const cands = byAmount.get(Number(c.amount).toFixed(2));
    if (!cands) continue;
    let best: (typeof cands)[number] | null = null;
    let bestGap = Infinity;
    for (const p of cands) {
      if (p.used) continue;
      const gap = Math.abs((Date.parse(p.posted_date) - Date.parse(String(c.posted_date))) / 86_400_000);
      if (gap <= 3 && gap < bestGap) { best = p; bestGap = gap; }
    }
    if (best) {
      best.used = true;
      await db.from("transactions").update({ superseded_by: best.id }).eq("id", c.id);
      count += 1;
    }
  }
  return count;
}
