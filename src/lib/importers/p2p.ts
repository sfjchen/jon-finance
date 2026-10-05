import type { Importer } from "./types";
import { parseCsvRows, findHeaderRow, columnIndex, toIsoDate, toAmount, emptyResult, finalize, pushTxn } from "./util";

/**
 * Venmo statement CSV: a few title rows, then a header starting with ",ID,Datetime,Type,Status,Note,From,To,Amount (total),…".
 * Amounts look like "+ $12.00" / "- $5.00". Rows without an ID are balance summaries.
 */
export const venmo: Importer = {
  id: "venmo",
  label: "Venmo (payments)",
  institution: "Venmo",
  kind: "depository",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 6000));
    return findHeaderRow(rows, ["ID", "Datetime", "Type", "Status", "Amount (total)"]) >= 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "Venmo", kind: "depository", name: "Venmo balance" });
    const rows = parseCsvRows(text);
    const hi = findHeaderRow(rows, ["ID", "Datetime", "Type", "Status", "Amount (total)"]);
    if (hi < 0) { res.warnings.push("Header not found"); return finalize(res); }
    const h = rows[hi]!;
    const iId = columnIndex(h, "ID"), iDt = columnIndex(h, "Datetime"), iTy = columnIndex(h, "Type"), iSt = columnIndex(h, "Status"),
      iNote = columnIndex(h, "Note"), iFrom = columnIndex(h, "From"), iTo = columnIndex(h, "To"), iAmt = columnIndex(h, "Amount (total)"),
      iFund = columnIndex(h, "Funding Source"), iDest = columnIndex(h, "Destination");
    for (const r of rows.slice(hi + 1)) {
      const id = (r[iId] ?? "").trim();
      if (!id || !/^\d+$/.test(id)) continue;
      const date = toIsoDate(r[iDt]);
      const amount = toAmount(r[iAmt]);
      if (!date || Number.isNaN(amount)) continue;
      const type = (r[iTy] ?? "").trim();
      const status = (r[iSt] ?? "").trim();
      if (status && !/complete|issued|pending/i.test(status)) continue;
      const from = (r[iFrom] ?? "").trim(), to = (r[iTo] ?? "").trim(), note = (r[iNote] ?? "").trim();
      const counterparty = amount >= 0 ? from : to;
      const isTransfer = /standard transfer|instant transfer|cashout|cash out|transfer/i.test(type) && !counterparty;
      const desc = [type, counterparty ? (amount >= 0 ? `from ${counterparty}` : `to ${counterparty}`) : null, note ? `“${note}”` : null].filter(Boolean).join(" ");
      pushTxn(res, {
        posted_date: date, amount, raw_description: desc || type, merchant_raw: counterparty || null, source_id: `venmo:${id}`,
        is_transfer: isTransfer,
        category_hint: isTransfer ? (amount < 0 ? "TRANSFER_OUT_ACCOUNT_TRANSFER" : "TRANSFER_IN_ACCOUNT_TRANSFER") : null,
        raw: { type, status, from, to, note, funding_source: r[iFund], destination: r[iDest] },
      });
    }
    return finalize(res);
  },
};

/**
 * PayPal activity download: "Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net",…,"Transaction ID",…,"Balance Impact".
 * Uses Net (signed). Skips rows that don't affect the balance (Balance Impact = Memo) and non-completed rows.
 */
export const paypal: Importer = {
  id: "paypal",
  label: "PayPal",
  institution: "PayPal",
  kind: "depository",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 6000));
    const hi = findHeaderRow(rows, ["Date", "Name", "Type", "Status", "Gross", "Net"]);
    return hi >= 0 && columnIndex(rows[hi]!, "Transaction ID") >= 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "PayPal", kind: "depository", name: "PayPal balance" });
    const rows = parseCsvRows(text);
    const hi = findHeaderRow(rows, ["Date", "Name", "Type", "Status", "Gross", "Net"]);
    if (hi < 0) { res.warnings.push("Header not found"); return finalize(res); }
    const h = rows[hi]!;
    const iD = columnIndex(h, "Date"), iN = columnIndex(h, "Name"), iTy = columnIndex(h, "Type"), iSt = columnIndex(h, "Status"),
      iNet = columnIndex(h, "Net"), iGross = columnIndex(h, "Gross"), iId = columnIndex(h, "Transaction ID"), iCur = columnIndex(h, "Currency"),
      iImpact = columnIndex(h, "Balance Impact"), iItem = columnIndex(h, "Item Title");
    for (const r of rows.slice(hi + 1)) {
      const date = toIsoDate(r[iD]);
      const amount = toAmount(r[iNet] ?? r[iGross]);
      if (!date || Number.isNaN(amount)) continue;
      const status = (r[iSt] ?? "").trim();
      const impact = iImpact >= 0 ? (r[iImpact] ?? "").trim() : "";
      if (impact && /memo/i.test(impact)) continue;
      if (status && !/completed|pending/i.test(status)) continue;
      if (iCur >= 0 && r[iCur] && r[iCur]!.trim() !== "USD") continue;
      const name = (r[iN] ?? "").trim();
      const type = (r[iTy] ?? "").trim();
      const item = iItem >= 0 ? (r[iItem] ?? "").trim() : "";
      const isTransfer = /bank deposit|general withdrawal|transfer to bank|transfer from bank|add funds|instant transfer/i.test(type);
      const desc = [name || type, item ? `“${item}”` : null, name && type ? `(${type})` : null].filter(Boolean).join(" ");
      pushTxn(res, {
        posted_date: date, amount, raw_description: desc, merchant_raw: name || null,
        source_id: r[iId] ? `paypal:${r[iId]!.trim()}` : null,
        is_transfer: isTransfer,
        category_hint: isTransfer ? (amount < 0 ? "TRANSFER_OUT_ACCOUNT_TRANSFER" : "TRANSFER_IN_ACCOUNT_TRANSFER") : null,
        raw: { type, status, impact },
      });
    }
    return finalize(res);
  },
};
