import type { Importer } from "./types";
import { parseCsvRows, findHeaderRow, columnIndex, toIsoDate, toAmount, emptyResult, finalize, pushTxn } from "./util";

/** Wells Fargo: no header. "MM/DD/YYYY","-12.34","*","","DESCRIPTION". Debits already negative. */
export const wellsFargo: Importer = {
  id: "wells-fargo",
  label: "Wells Fargo (checking / savings)",
  institution: "Wells Fargo",
  kind: "depository",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 4000));
    const r = rows[0];
    return !!r && r.length >= 5 && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(r[0]!.trim()) && r[2]!.trim() === "*" && !Number.isNaN(toAmount(r[1]));
  },
  parse(text) {
    const res = emptyResult({ institution: "Wells Fargo", kind: "depository", name: "Checking" });
    for (const r of parseCsvRows(text)) {
      const date = toIsoDate(r[0]);
      const amount = toAmount(r[1]);
      const desc = (r[4] ?? "").trim();
      if (!date || Number.isNaN(amount) || !desc) continue;
      const isZelle = /\bZELLE\b/i.test(desc);
      pushTxn(res, {
        posted_date: date, amount, raw_description: desc,
        merchant_raw: isZelle ? desc.replace(/^ZELLE (TO|FROM)\s+/i, "").replace(/\s+ON\s+\d{2}\/\d{2}.*$/i, "") : null,
        raw: { line: r },
      });
    }
    return finalize(res);
  },
};

/** Chase cards: Transaction Date,Post Date,Description,Category,Type,Amount,Memo. Purchases negative. */
export const chase: Importer = {
  id: "chase",
  label: "Chase (Prime Visa / Freedom Unlimited)",
  institution: "Chase",
  kind: "credit",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 4000));
    return findHeaderRow(rows, ["Transaction Date", "Post Date", "Description", "Amount"]) === 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "Chase", kind: "credit" });
    const rows = parseCsvRows(text);
    const h = rows[0]!;
    const iT = columnIndex(h, "Transaction Date"), iP = columnIndex(h, "Post Date"), iD = columnIndex(h, "Description"),
      iC = columnIndex(h, "Category"), iTy = columnIndex(h, "Type"), iA = columnIndex(h, "Amount"), iM = columnIndex(h, "Memo");
    for (const r of rows.slice(1)) {
      const posted = toIsoDate(r[iP]) ?? toIsoDate(r[iT]);
      const amount = toAmount(r[iA]);
      const desc = (r[iD] ?? "").trim();
      if (!posted || Number.isNaN(amount) || !desc) continue;
      const type = (r[iTy] ?? "").trim();
      pushTxn(res, {
        posted_date: posted, authorized_date: toIsoDate(r[iT]), amount, raw_description: desc,
        is_transfer: type === "Payment",
        category_hint: type === "Payment" ? "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" : null,
        raw: { category: r[iC], type, memo: r[iM] },
      });
    }
    return finalize(res);
  },
};

/** U.S. Bank: "Date","Transaction","Name","Memo","Amount". Debits negative. */
export const usBank: Importer = {
  id: "usbank",
  label: "U.S. Bank (Smartly Visa)",
  institution: "U.S. Bank",
  kind: "credit",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 4000));
    return findHeaderRow(rows, ["Date", "Transaction", "Name", "Amount"]) === 0 && columnIndex(rows[0]!, "Memo") >= 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "U.S. Bank", kind: "credit" });
    const rows = parseCsvRows(text);
    const h = rows[0]!;
    const iD = columnIndex(h, "Date"), iTr = columnIndex(h, "Transaction"), iN = columnIndex(h, "Name"), iM = columnIndex(h, "Memo"), iA = columnIndex(h, "Amount");
    for (const r of rows.slice(1)) {
      const date = toIsoDate(r[iD]);
      const amount = toAmount(r[iA]);
      const name = (r[iN] ?? "").trim();
      if (!date || Number.isNaN(amount) || !name) continue;
      const memo = (r[iM] ?? "").trim();
      const isPayment = /PAYMENT|AUTOPAY/i.test(name) && amount > 0;
      pushTxn(res, {
        posted_date: date, amount, raw_description: memo && memo !== name ? `${name} ${memo}` : name, merchant_raw: name,
        is_transfer: isPayment, category_hint: isPayment ? "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" : null,
        raw: { transaction: r[iTr], memo },
      });
    }
    return finalize(res);
  },
};

/** Discover: Trans. Date,Post Date,Description,Amount,Category. Purchases POSITIVE → negate. */
export const discover: Importer = {
  id: "discover",
  label: "Discover it Student",
  institution: "Discover",
  kind: "credit",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 4000));
    return findHeaderRow(rows, ["Trans. Date", "Post Date", "Description", "Amount"]) === 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "Discover", kind: "credit" });
    const rows = parseCsvRows(text);
    const h = rows[0]!;
    const iT = columnIndex(h, "Trans. Date"), iP = columnIndex(h, "Post Date"), iD = columnIndex(h, "Description"), iA = columnIndex(h, "Amount"), iC = columnIndex(h, "Category");
    for (const r of rows.slice(1)) {
      const posted = toIsoDate(r[iP]) ?? toIsoDate(r[iT]);
      const raw = toAmount(r[iA]);
      const desc = (r[iD] ?? "").trim();
      if (!posted || Number.isNaN(raw) || !desc) continue;
      const amount = -raw;
      const cat = (r[iC] ?? "").trim();
      const isPayment = /payments and credits/i.test(cat) && amount > 0 && /PAYMENT|THANK YOU/i.test(desc);
      pushTxn(res, {
        posted_date: posted, authorized_date: toIsoDate(r[iT]), amount, raw_description: desc,
        is_transfer: isPayment, category_hint: isPayment ? "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT" : null,
        raw: { category: cat },
      });
    }
    return finalize(res);
  },
};
