import Papa from "papaparse";
import type { NormalizedTxn, NormalizedInvestmentTxn, ParseResult } from "./types";

export function parseCsvRows(text: string): string[][] {
  const res = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  return res.data.map((r) => r.map((c) => (c ?? "").toString()));
}

/** Find the first row that contains all `needles` (case-insensitive, trimmed); returns its index or -1. */
export function findHeaderRow(rows: string[][], needles: string[]): number {
  const want = needles.map((n) => n.toLowerCase());
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = rows[i]!.map((c) => c.trim().toLowerCase());
    if (want.every((n) => cells.some((c) => c === n || c.startsWith(n)))) return i;
  }
  return -1;
}

/** Map header cells to indexes; lookup by exact or prefix match (case-insensitive). */
export function columnIndex(header: string[], name: string): number {
  const n = name.toLowerCase();
  const cells = header.map((c) => c.trim().toLowerCase());
  let i = cells.indexOf(n);
  if (i === -1) i = cells.findIndex((c) => c.startsWith(n));
  return i;
}

/** Accepts MM/DD/YYYY, M/D/YY, YYYY-MM-DD, ISO datetimes, "Oct-04-2026". Returns YYYY-MM-DD or null. */
export function toIsoDate(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    return `${y}-${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
  }
  m = t.match(/^([A-Za-z]{3})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const mi = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1]!.toLowerCase());
    if (mi >= 0) return `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[2]!.padStart(2, "0")}`;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** "$1,234.56", "-$12.00", "($12.00)", "+ $5.00", "1,234.56-" → number. Returns NaN when not numeric. */
export function toAmount(s: string | undefined | null): number {
  if (s === undefined || s === null) return NaN;
  let t = s.trim();
  if (!t || t === "--") return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (/-$/.test(t)) { neg = true; t = t.slice(0, -1); }
  if (/^[-−]/.test(t)) { neg = true; t = t.slice(1); }
  if (/^\+/.test(t)) t = t.slice(1);
  t = t.replace(/[$,\s]/g, "");
  if (/^[-−]/.test(t)) { neg = !neg; t = t.slice(1); }
  const v = Number(t);
  if (Number.isNaN(v)) return NaN;
  return neg ? -v : v;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function emptyResult(accountHints: ParseResult["accountHints"]): ParseResult {
  return { transactions: [], investmentTransactions: [], holdings: [], accountHints, warnings: [], dateRange: null };
}

export function finalize(res: ParseResult): ParseResult {
  const dates = [
    ...res.transactions.map((t) => t.posted_date),
    ...res.investmentTransactions.map((t) => t.date),
    ...res.holdings.map((h) => h.as_of),
  ].filter(Boolean).sort();
  res.dateRange = dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : null;
  return res;
}

export function pushTxn(res: ParseResult, t: NormalizedTxn | null) {
  if (t && t.posted_date && Number.isFinite(t.amount)) res.transactions.push(t);
}

export function pushInv(res: ParseResult, t: NormalizedInvestmentTxn | null) {
  if (t && t.date && Number.isFinite(t.amount)) res.investmentTransactions.push(t);
}

export function cleanTicker(s: string | undefined | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(/\*+$/, "").toUpperCase();
  return t && /^[A-Z0-9.\-]{1,10}$/.test(t) ? t : null;
}
