import type { Importer, NormalizedInvestmentTxn } from "./types";
import { parseCsvRows, findHeaderRow, columnIndex, toIsoDate, toAmount, emptyResult, finalize, pushTxn, pushInv, cleanTicker, round2 } from "./util";

/**
 * Robinhood "Account activity report": Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount.
 * Amounts use parentheses for negatives. Cash movements (ACH, interest, Gold fee) also become ledger transactions.
 */
export const robinhood: Importer = {
  id: "robinhood",
  label: "Robinhood (activity report)",
  institution: "Robinhood",
  kind: "investment",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 4000));
    return findHeaderRow(rows, ["Activity Date", "Process Date", "Instrument", "Trans Code", "Amount"]) === 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "Robinhood", kind: "investment", name: "Brokerage" });
    const rows = parseCsvRows(text);
    const h = rows[0]!;
    const iAct = columnIndex(h, "Activity Date"), iProc = columnIndex(h, "Process Date"), iSet = columnIndex(h, "Settle Date"), iIns = columnIndex(h, "Instrument"),
      iDesc = columnIndex(h, "Description"), iCode = columnIndex(h, "Trans Code"), iQty = columnIndex(h, "Quantity"), iPx = columnIndex(h, "Price"), iAmt = columnIndex(h, "Amount");
    rows.slice(1).forEach((r, idx) => {
      const date = toIsoDate(r[iProc]) ?? toIsoDate(r[iAct]);
      if (!date) return; // disclaimer rows
      const code = (r[iCode] ?? "").trim().toUpperCase();
      const amount = toAmount(r[iAmt]);
      const amt = Number.isNaN(amount) ? 0 : amount;
      const ticker = cleanTicker(r[iIns]);
      const desc = (r[iDesc] ?? "").trim();
      const qty = toAmount(r[iQty]);
      const price = toAmount(r[iPx]);
      const key = `rh:${date}:${code}:${ticker ?? ""}:${amt.toFixed(2)}:${idx}`;

      const inv = (type: NormalizedInvestmentTxn["type"], subtype?: string): NormalizedInvestmentTxn => ({
        date, type, subtype: subtype ?? code, name: desc || code, ticker, security_name: desc || null,
        quantity: Number.isNaN(qty) ? null : (type === "sell" ? -Math.abs(qty) : Math.abs(qty)),
        price: Number.isNaN(price) ? null : price, fees: null, amount: amt, source_id: key,
        raw: { activity_date: r[iAct], settle_date: r[iSet], code },
      });

      switch (code) {
        case "BUY": pushInv(res, inv("buy")); break;
        case "SELL": pushInv(res, inv("sell")); break;
        case "CDIV": case "DIV": pushInv(res, inv("dividend", "dividend")); break;
        case "INT": pushInv(res, inv("dividend", "interest")); pushTxn(res, { posted_date: date, amount: amt, raw_description: desc || "Interest", source_id: key, category_hint: "INCOME_INTEREST_EARNED" }); break;
        case "SLIP": pushInv(res, inv("dividend", "stock_lending")); break;
        case "ACH": case "RTP": case "WIRE": case "DCF":
          pushInv(res, inv("cash", "deposit_withdrawal"));
          pushTxn(res, { posted_date: date, amount: amt, raw_description: desc || "ACH transfer", source_id: key, is_transfer: true, category_hint: amt > 0 ? "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS" : "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS" });
          break;
        case "GOLD": case "DFEE": case "AFEE": case "MINT": case "DTAX":
          pushInv(res, inv("fee")); pushTxn(res, { posted_date: date, amount: amt, raw_description: desc || code, source_id: key, category_hint: "BANK_FEES_OTHER_BANK_FEES" }); break;
        case "REC": case "SPL": case "SPR": case "CONV": case "OCA": case "SXCH": case "MRGS": case "MRGC":
          pushInv(res, inv("transfer", "corporate_action")); break;
        default:
          if (ticker) pushInv(res, inv(amt < 0 ? "buy" : "sell", code));
          else if (amt !== 0) pushTxn(res, { posted_date: date, amount: amt, raw_description: desc || code, source_id: key });
      }
    });
    return finalize(res);
  },
};

/**
 * Fidelity "Activity & Orders" history CSV. A few preamble lines, then a header containing "Run Date" and "Action".
 * Action text drives the type: "YOU BOUGHT", "YOU SOLD", "DIVIDEND RECEIVED", "REINVESTMENT", "ELECTRONIC FUNDS TRANSFER", …
 */
export const fidelityActivity: Importer = {
  id: "fidelity-activity",
  label: "Fidelity (Activity & Orders history)",
  institution: "Fidelity",
  kind: "investment",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 6000));
    return findHeaderRow(rows, ["Run Date", "Action", "Symbol", "Amount"]) >= 0;
  },
  parse(text) {
    const res = emptyResult({ institution: "Fidelity", kind: "investment", name: "Roth IRA" });
    const rows = parseCsvRows(text);
    const hi = findHeaderRow(rows, ["Run Date", "Action", "Symbol", "Amount"]);
    if (hi < 0) { res.warnings.push("Header not found"); return finalize(res); }
    const h = rows[hi]!;
    const iRun = columnIndex(h, "Run Date"), iAcct = columnIndex(h, "Account"), iAct = columnIndex(h, "Action"), iSym = columnIndex(h, "Symbol"), iDesc = columnIndex(h, "Description"),
      iQty = columnIndex(h, "Quantity"), iPx = columnIndex(h, "Price"), iComm = columnIndex(h, "Commission"), iFees = columnIndex(h, "Fees"), iAmt = columnIndex(h, "Amount"), iSettle = columnIndex(h, "Settlement Date");
    rows.slice(hi + 1).forEach((r, idx) => {
      const date = toIsoDate(r[iRun]);
      if (!date) return;
      const action = (r[iAct] ?? "").trim();
      if (!action) return;
      const A = action.toUpperCase();
      const amount = toAmount(r[iAmt]);
      const amt = Number.isNaN(amount) ? 0 : amount;
      const ticker = cleanTicker(r[iSym]);
      const desc = (r[iDesc] ?? "").trim();
      const qty = toAmount(r[iQty]);
      const price = toAmount(r[iPx]);
      const fees = round2((Number.isNaN(toAmount(r[iComm])) ? 0 : toAmount(r[iComm])) + (Number.isNaN(toAmount(r[iFees])) ? 0 : toAmount(r[iFees])));
      const key = `fid:${date}:${A.slice(0, 24)}:${ticker ?? ""}:${amt.toFixed(2)}:${idx}`;
      if (iAcct >= 0 && r[iAcct] && !res.accountHints.mask) {
        const m = r[iAcct]!.match(/(\d{4})\D*$/);
        if (m) res.accountHints.mask = m[1];
      }
      const inv = (type: NormalizedInvestmentTxn["type"], subtype: string): NormalizedInvestmentTxn => ({
        date, type, subtype, name: action, ticker, security_name: desc || null,
        quantity: Number.isNaN(qty) ? null : qty, price: Number.isNaN(price) ? null : price, fees: fees || null,
        amount: amt, source_id: key, raw: { settlement_date: r[iSettle], symbol: r[iSym] },
      });

      if (A.startsWith("YOU BOUGHT") || A.startsWith("PURCHASE")) pushInv(res, inv("buy", A.includes("REINVEST") ? "reinvest" : "buy"));
      else if (A.startsWith("REINVESTMENT")) pushInv(res, inv("buy", "reinvest"));
      else if (A.startsWith("YOU SOLD") || A.startsWith("REDEMPTION")) pushInv(res, inv("sell", "sell"));
      else if (A.startsWith("DIVIDEND") || A.includes("LONG-TERM CAP GAIN") || A.includes("SHORT-TERM CAP GAIN")) pushInv(res, inv("dividend", A.includes("GAIN") ? "capital_gain" : "dividend"));
      else if (A.startsWith("INTEREST")) { pushInv(res, inv("dividend", "interest")); pushTxn(res, { posted_date: date, amount: amt, raw_description: action, source_id: key, category_hint: "INCOME_INTEREST_EARNED" }); }
      else if (A.includes("ELECTRONIC FUNDS TRANSFER") || A.startsWith("TRANSFERRED") || A.includes("CONTRIBUTION") || A.includes("DIRECT DEPOSIT") || A.includes("WIRE")) {
        pushInv(res, inv("cash", A.includes("CONTRIBUTION") ? "contribution" : "transfer"));
        pushTxn(res, { posted_date: date, amount: amt, raw_description: action, source_id: key, is_transfer: true, category_hint: amt > 0 ? "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS" : "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS" });
      }
      else if (A.includes("FEE") || A.includes("ADVISORY")) { pushInv(res, inv("fee", "fee")); }
      else if (A.includes("IN LIEU") || A.includes("ADJUSTMENT") || A.includes("JOURNALED") || A.includes("CONVERSION")) pushInv(res, inv("transfer", "adjustment"));
      else if (ticker && !Number.isNaN(qty) && qty !== 0) pushInv(res, inv(qty > 0 ? "buy" : "sell", "other"));
      else if (amt !== 0) pushInv(res, inv("cash", "other"));
    });
    return finalize(res);
  },
};

/**
 * Fidelity "Positions" download: Account Number,Account Name,Symbol,Description,Quantity,Last Price,…,Current Value,…,Cost Basis Total,Average Cost Basis,Type.
 * as_of comes from the filename (Portfolio_Positions_Oct-04-2026.csv) or today.
 */
export const fidelityPositions: Importer = {
  id: "fidelity-positions",
  label: "Fidelity (Positions snapshot)",
  institution: "Fidelity",
  kind: "investment",
  detect(text) {
    const rows = parseCsvRows(text.slice(0, 6000));
    return findHeaderRow(rows, ["Account Number", "Symbol", "Quantity", "Current Value"]) >= 0;
  },
  parse(text, filename) {
    const res = emptyResult({ institution: "Fidelity", kind: "investment", name: "Roth IRA" });
    const rows = parseCsvRows(text);
    const hi = findHeaderRow(rows, ["Account Number", "Symbol", "Quantity", "Current Value"]);
    if (hi < 0) { res.warnings.push("Header not found"); return finalize(res); }
    const h = rows[hi]!;
    const iAcct = columnIndex(h, "Account Number"), iAName = columnIndex(h, "Account Name"), iSym = columnIndex(h, "Symbol"), iDesc = columnIndex(h, "Description"),
      iQty = columnIndex(h, "Quantity"), iPx = columnIndex(h, "Last Price"), iVal = columnIndex(h, "Current Value"), iCost = columnIndex(h, "Cost Basis Total"), iType = columnIndex(h, "Type");
    const m = (filename ?? "").match(/([A-Za-z]{3}-\d{1,2}-\d{4})/);
    const asOf = (m && toIsoDate(m[1])) || new Date().toISOString().slice(0, 10);
    for (const r of rows.slice(hi + 1)) {
      const symRaw = (r[iSym] ?? "").trim();
      const desc = (r[iDesc] ?? "").trim();
      if (!symRaw && !desc) continue;
      if (/pending activity/i.test(symRaw) || /pending activity/i.test(desc)) continue;
      const value = toAmount(r[iVal]);
      const qty = toAmount(r[iQty]);
      const isCash = /\*\*$/.test(symRaw) || /money market|core|cash/i.test(desc) || /cash/i.test(r[iType] ?? "");
      if (Number.isNaN(value) && Number.isNaN(qty)) continue;
      if (!res.accountHints.mask && r[iAcct]) {
        const mm = r[iAcct]!.match(/(\d{4})\D*$/);
        if (mm) res.accountHints.mask = mm[1];
        if (r[iAName]) res.accountHints.name = r[iAName]!.trim();
      }
      res.holdings.push({
        ticker: isCash ? cleanTicker(symRaw) ?? "CASH" : cleanTicker(symRaw),
        name: desc || symRaw,
        quantity: Number.isNaN(qty) ? (isCash && !Number.isNaN(value) ? value : 0) : qty,
        cost_basis: Number.isNaN(toAmount(r[iCost])) ? null : toAmount(r[iCost]),
        price: Number.isNaN(toAmount(r[iPx])) ? (isCash ? 1 : null) : toAmount(r[iPx]),
        value: Number.isNaN(value) ? null : value,
        is_cash: isCash,
        as_of: asOf,
      });
    }
    return finalize(res);
  },
};
