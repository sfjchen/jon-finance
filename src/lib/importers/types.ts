import type { Enums } from "@/types/database";

export type AccountKind = Enums<"account_kind">;

/** A bank/card transaction in our sign convention: negative = money leaves the account. */
export interface NormalizedTxn {
  posted_date: string; // YYYY-MM-DD
  authorized_date?: string | null;
  amount: number;
  raw_description: string;
  merchant_raw?: string | null;
  /** Stable id from the institution when available (Venmo ID, PayPal Transaction ID). */
  source_id?: string | null;
  pending?: boolean;
  /** Set when the row is clearly a transfer between the user's own accounts. */
  is_transfer?: boolean;
  category_hint?: string | null; // our category id, when the format makes it obvious
  raw?: Record<string, unknown>;
}

export interface NormalizedInvestmentTxn {
  date: string;
  type: "buy" | "sell" | "dividend" | "fee" | "transfer" | "cash" | "cancel";
  subtype?: string | null;
  name: string;
  ticker?: string | null;
  security_name?: string | null;
  quantity?: number | null;
  price?: number | null;
  fees?: number | null;
  amount: number; // signed from the account's point of view
  source_id?: string | null;
  raw?: Record<string, unknown>;
}

export interface NormalizedHolding {
  ticker: string | null;
  name: string | null;
  quantity: number;
  cost_basis: number | null;
  price: number | null;
  value: number | null;
  is_cash: boolean;
  as_of: string;
}

export interface ParseResult {
  transactions: NormalizedTxn[];
  investmentTransactions: NormalizedInvestmentTxn[];
  holdings: NormalizedHolding[];
  /** Hints for creating a manual account when none is selected. */
  accountHints: { institution: string; name?: string; mask?: string; kind: AccountKind };
  warnings: string[];
  dateRange: { from: string; to: string } | null;
}

export interface Importer {
  id: string;
  label: string;
  institution: string;
  kind: AccountKind;
  /** Pure sniff on the raw file text (first few KB is enough). */
  detect(text: string): boolean;
  parse(text: string, filename?: string): ParseResult;
}
