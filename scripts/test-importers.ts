/**
 * Parser tests with synthetic fixtures that mirror each institution's documented CSV layout.
 * Usage: npm run test:importers
 */
import assert from "node:assert/strict";
import { detectImporter, importerById } from "../src/lib/importers";

const cases: Array<{ id: string; filename?: string; text: string; check: (r: ReturnType<NonNullable<ReturnType<typeof importerById>>["parse"]>) => void }> = [
  {
    id: "wells-fargo",
    text: `"09/28/2026","-42.17","*","","PURCHASE AUTHORIZED ON 09/27 TRADER JOE S #123 PALO ALTO CA S381234567890123 CARD 1234"
"09/26/2026","-25.00","*","","ZELLE TO JANE DOE ON 09/26 REF #PP0ABCDEFG"
"09/25/2026","1500.00","*","","STANFORD UNIVERSITY PAYROLL 260925 XXXXX1234 CHEN,JON"
"09/24/2026","-120.00","*","","VENMO PAYMENT 260924 1234567890 JON CHEN"`,
    check: (r) => {
      assert.equal(r.transactions.length, 4);
      assert.equal(r.transactions[0]!.amount, -42.17);
      assert.equal(r.transactions[0]!.posted_date, "2026-09-28");
      assert.equal(r.transactions[1]!.merchant_raw, "JANE DOE");
      assert.equal(r.transactions[2]!.amount, 1500);
    },
  },
  {
    id: "chase",
    text: `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
09/27/2026,09/28/2026,AMAZON.COM*AB12CD34E,Shopping,Sale,-31.99,
09/20/2026,09/20/2026,Payment Thank You-Mobile,,Payment,250.00,
09/18/2026,09/19/2026,CHIPOTLE 1234,Food & Drink,Sale,-12.85,`,
    check: (r) => {
      assert.equal(r.transactions.length, 3);
      assert.equal(r.transactions[0]!.posted_date, "2026-09-28");
      assert.equal(r.transactions[0]!.authorized_date, "2026-09-27");
      assert.equal(r.transactions[1]!.is_transfer, true);
      assert.equal(r.transactions[1]!.amount, 250);
    },
  },
  {
    id: "usbank",
    text: `"Date","Transaction","Name","Memo","Amount"
"2026-09-27","DEBIT","WHOLE FOODS MKT 10123","PALO ALTO CA","-58.40"
"2026-09-15","CREDIT","PAYMENT THANK YOU","","300.00"`,
    check: (r) => {
      assert.equal(r.transactions.length, 2);
      assert.equal(r.transactions[0]!.amount, -58.4);
      assert.equal(r.transactions[1]!.is_transfer, true);
    },
  },
  {
    id: "discover",
    text: `Trans. Date,Post Date,Description,Amount,Category
09/26/2026,09/27/2026,NETFLIX.COM,15.49,Services
09/10/2026,09/10/2026,INTERNET PAYMENT - THANK YOU,-200.00,Payments and Credits`,
    check: (r) => {
      assert.equal(r.transactions.length, 2);
      assert.equal(r.transactions[0]!.amount, -15.49, "purchases are negated");
      assert.equal(r.transactions[1]!.amount, 200);
      assert.equal(r.transactions[1]!.is_transfer, true);
    },
  },
  {
    id: "venmo",
    text: `Account Statement - (@jon-chen) - September 1st to September 30th 2026 ,,,,,,,,,,,,,,,,,,,,,
Account Activity,,,,,,,,,,,,,,,,,,,,,
,ID,Datetime,Type,Status,Note,From,To,Amount (total),Amount (tip),Amount (tax),Amount (fee),Tax Rate,Tax Exempt,Funding Source,Destination,Beginning Balance,Ending Balance,Statement Period Venmo Fees,Terminal Location,Year to Date Venmo Fees,Disclaimer
,,,,,,,,,,,,,,,,$10.00,,,,,
,4201234567890123456,2026-09-03T18:22:10,Payment,Complete,Dinner 🍜,Jon Chen,Alex Kim,- $23.50,,,,,,Venmo balance,,,,,Venmo,,
,4201234567890123457,2026-09-05T09:01:00,Payment,Complete,Rent split,Sam Lee,Jon Chen,+ $600.00,,,,,,,Venmo balance,,,,Venmo,,
,4201234567890123458,2026-09-06T10:00:00,Standard Transfer,Issued,,,,- $586.50,,,,,,Venmo balance,Wells Fargo Checking,,,,Venmo,,
,,,,,,,,,,,,,,,,,$0.00,,,,In case of errors…`,
    check: (r) => {
      assert.equal(r.transactions.length, 3);
      assert.equal(r.transactions[0]!.amount, -23.5);
      assert.equal(r.transactions[0]!.merchant_raw, "Alex Kim");
      assert.equal(r.transactions[0]!.source_id, "venmo:4201234567890123456");
      assert.equal(r.transactions[1]!.amount, 600);
      assert.equal(r.transactions[2]!.is_transfer, true);
    },
  },
  {
    id: "paypal",
    text: `"Date","Time","TimeZone","Name","Type","Status","Currency","Gross","Fee","Net","From Email Address","To Email Address","Transaction ID","Shipping Address","Address Status","Item Title","Item ID","Shipping and Handling Amount","Insurance Amount","Sales Tax","Option 1 Name","Option 1 Value","Option 2 Name","Option 2 Value","Reference Txn ID","Invoice Number","Custom Number","Quantity","Receipt ID","Balance","Address Line 1","Address Line 2/District/Neighborhood","Town/City","State/Province/Region/County/Territory/Prefecture/Republic","Zip/Postal Code","Country","Contact Phone Number","Subject","Note","Country Code","Balance Impact"
"09/12/2026","14:03:11","PDT","Spotify USA","PreApproved Payment Bill User Payment","Completed","USD","-11.99","0.00","-11.99","jon@example.com","billing@spotify.com","1AB23456CD789012E","","","Premium","","0.00","0.00","0.00","","","","","","","","1","","0.00","","","","","","","","","","US","Debit"
"09/12/2026","14:03:12","PDT","Bank Account","Bank Deposit to PP Account ","Completed","USD","11.99","0.00","11.99","","","2CD34567EF890123F","","","","","0.00","0.00","0.00","","","","","1AB23456CD789012E","","","1","","0.00","","","","","","","","","","US","Credit"
"09/13/2026","10:00:00","PDT","Hold","Hold on Balance for Dispute Investigation","Pending","USD","-5.00","0.00","-5.00","","","3EF45678GH901234G","","","","","0.00","0.00","0.00","","","","","","","","1","","0.00","","","","","","","","","","US","Memo"`,
    check: (r) => {
      assert.equal(r.transactions.length, 2, "memo row skipped");
      assert.equal(r.transactions[0]!.amount, -11.99);
      assert.equal(r.transactions[0]!.merchant_raw, "Spotify USA");
      assert.equal(r.transactions[1]!.is_transfer, true);
    },
  },
  {
    id: "robinhood",
    text: `Activity Date,Process Date,Settle Date,Instrument,Description,Trans Code,Quantity,Price,Amount
9/26/2026,9/26/2026,9/29/2026,VTI,Vanguard Total Stock Market ETF,Buy,2,$285.10,($570.20)
9/15/2026,9/15/2026,9/15/2026,,ACH Deposit,ACH,,,$600.00
9/10/2026,9/10/2026,9/10/2026,AAPL,Apple CDIV,CDIV,,,$1.24
9/01/2026,9/01/2026,9/01/2026,,Robinhood Gold,GOLD,,,($5.00)
"The data provided is for informational purposes only."`,
    check: (r) => {
      assert.equal(r.investmentTransactions.length, 4);
      assert.equal(r.investmentTransactions[0]!.type, "buy");
      assert.equal(r.investmentTransactions[0]!.amount, -570.2);
      assert.equal(r.investmentTransactions[0]!.ticker, "VTI");
      assert.equal(r.transactions.length, 2, "ACH and GOLD become ledger rows");
      assert.equal(r.transactions[0]!.is_transfer, true);
    },
  },
  {
    id: "fidelity-activity",
    text: `

Brokerage

Run Date,Account,Action,Symbol,Description,Type,Quantity,Price ($),Commission ($),Fees ($),Accrued Interest ($),Amount ($),Cash Balance ($),Settlement Date
 09/25/2026, ROTH IRA 123456789, YOU BOUGHT FIDELITY 500 INDEX FUND (FXAIX) (Cash), FXAIX, FIDELITY 500 INDEX FUND, Cash, 2.345, 213.21,,,, -500.00, 12.34, 09/26/2026
 09/24/2026, ROTH IRA 123456789, ELECTRONIC FUNDS TRANSFER RECEIVED (Cash), , No Description, Cash, , ,,,, 500.00, 512.34,
 09/12/2026, ROTH IRA 123456789, DIVIDEND RECEIVED FIDELITY 500 INDEX FUND (FXAIX) (Cash), FXAIX, FIDELITY 500 INDEX FUND, Cash, , ,,,, 3.21, 12.34,
 09/12/2026, ROTH IRA 123456789, REINVESTMENT FIDELITY 500 INDEX FUND (FXAIX) (Cash), FXAIX, FIDELITY 500 INDEX FUND, Cash, 0.015, 214.00,,,, -3.21, 9.13,

"Date downloaded 10/04/2026 1:00 PM ET"
"Brokerage services are provided by Fidelity Brokerage Services LLC (FBS)"`,
    check: (r) => {
      assert.equal(r.investmentTransactions.length, 4);
      assert.equal(r.investmentTransactions[0]!.type, "buy");
      assert.equal(r.investmentTransactions[0]!.ticker, "FXAIX");
      assert.equal(r.investmentTransactions[0]!.quantity, 2.345);
      assert.equal(r.investmentTransactions[1]!.type, "cash");
      assert.equal(r.investmentTransactions[2]!.type, "dividend");
      assert.equal(r.investmentTransactions[3]!.subtype, "reinvest");
      assert.equal(r.transactions.length, 1, "EFT becomes a transfer ledger row");
      assert.equal(r.accountHints.mask, "6789");
    },
  },
  {
    id: "fidelity-positions",
    filename: "Portfolio_Positions_Oct-04-2026.csv",
    text: `Account Number,Account Name,Symbol,Description,Quantity,Last Price,Last Price Change,Current Value,Today's Gain/Loss Dollar,Today's Gain/Loss Percent,Total Gain/Loss Dollar,Total Gain/Loss Percent,Percent Of Account,Cost Basis Total,Average Cost Basis,Type
123456789,ROTH IRA,FXAIX,FIDELITY 500 INDEX FUND,10.123,$213.21,+$1.02,"$2,158.33",+$10.33,+0.48%,+$158.33,+7.92%,95.00%,"$2,000.00",$197.57,Cash
123456789,ROTH IRA,SPAXX**,HELD IN MONEY MARKET,,,,$113.60,,,,,5.00%,,,Cash
123456789,ROTH IRA,Pending Activity,,,,,$0.00,,,,,,,,

"The data and information in this spreadsheet is provided to you solely for your use"`,
    check: (r) => {
      assert.equal(r.holdings.length, 2);
      assert.equal(r.holdings[0]!.ticker, "FXAIX");
      assert.equal(r.holdings[0]!.value, 2158.33);
      assert.equal(r.holdings[0]!.cost_basis, 2000);
      assert.equal(r.holdings[0]!.as_of, "2026-10-04");
      assert.equal(r.holdings[1]!.is_cash, true);
      assert.equal(r.holdings[1]!.ticker, "SPAXX");
    },
  },
];

let failed = 0;
for (const c of cases) {
  try {
    const det = detectImporter(c.text);
    assert.equal(det?.id, c.id, `detect() should pick ${c.id}, got ${det?.id}`);
    const r = importerById(c.id)!.parse(c.text, c.filename);
    c.check(r);
    process.stdout.write(`ok   ${c.id}\n`);
  } catch (e) {
    failed += 1;
    process.stdout.write(`FAIL ${c.id}: ${e instanceof Error ? e.message : String(e)}\n`);
  }
}
if (failed) process.exit(1);
