# Getting Your Own Data Out: Per-Institution Findings (researched 2026-10-04)

**TL;DR:** For the nine institutions, the only universally reliable path is **manual CSV export + a PDF-statement fallback**. Automated aggregation is feasible for 7 of 9 via **SimpleFIN Bridge ($15/yr, MX-backed)** or **Plaid's free Trial plan (10 Items)**, but Fidelity is gated behind Akoya/Plaid-Growth, Venmo/PayPal are absent from SimpleFIN, and the Venmo Credit Card has no CSV at all. Section 1033 will not help in 2026.

---

## 1. Robinhood (brokerage)

- **Export:** Account → Reports and statements → *Account activity report* → pick account + custom start/end dates → Generate. CSV ready in ~2h (up to 24h). Covers brokerage + retirement only; **excludes crypto, futures, spending-account activity**. Realized gain/loss CSV only via chat support. Monthly statements and trade confirms are **PDF only**. Tax center: consolidated 1099 PDF; CSV transaction files posted after 1099s each February. ([reports](https://robinhood.com/us/en/support/articles/finding-your-reports-and-statements/), [tax docs](https://robinhood.com/us/en/support/articles/how-to-access-your-tax-documents/)). Settings → Privacy & Security → *Download my data* for bulk export. Columns (unverified): `Activity Date, Process Date, Settle Date, Instrument, Description, Trans Code, Quantity, Price, Amount`. No lot/cost-basis data in activity CSV.
- **API:** Official **Crypto Trading API only**. No stocks/options/account API ([docs](https://docs.robinhood.com/)).
- **Aggregators:** Plaid supports Robinhood incl. Investments. SimpleFIN/MX lists Robinhood. Teller: no (depository/credit only).
- **Community:** [`robin_stocks`](https://github.com/jmfernandes/robin_stocks) (unofficial, breaks periodically); [Robinhood-1099-Parser](https://github.com/kevinpark1217/Robinhood-1099-Parser).

## 2. Fidelity (Roth IRA)

- **Export:** Activity & Orders → History → filter → Download CSV. ~5 years of history; **per-download window ~90 days (some say 366; test it)**. Columns (unverified): `Run Date, Action, Symbol, Description, Type, Price, Quantity, Commission, Fees, Accrued Interest, Amount, Settlement Date`. Positions → Download gives cost basis per share etc. **OFX/Direct Connect shut off ~Dec 1, 2025**; CSV only ([early-retirement.org](https://www.early-retirement.org/threads/fidelity-ofx-downloads-are-gone.127570/)).
- **API:** None for individuals. "Fidelity Access" = Akoya, onboarded recipients only.
- **Aggregators:** Fidelity blocks scraping; routes through Akoya. Plaid offers Fidelity but **access granted only to Growth/Custom plans ~4 weeks after production approval**, i.e. effectively not on Trial ([Plaid Investments](https://plaid.com/docs/investments/)). SimpleFIN/MX lists Fidelity but community reports FDP-2505 errors (Sept 2026), 24–48h lag, CUSIPs instead of tickers.
- **Community:** `ofxtools` Fidelity profile dead post-Dec 2025. CSV→OFX converters exist.

## 3. Wells Fargo (checking/savings/debit)

- **Export:** Account Activity → *Download Account Activity* → CSV, QFX, QBO. Default 90 days; **up to 18 months for deposit accounts** ([WF FAQ](https://www.wellsfargo.com/help/online-banking/activity-faqs/)). CSV has **no header row**: `Date, Amount, *, (blank), Description`, single signed amount column.
- **API:** None for individuals; Akoya + bilateral agreements only.
- **Aggregators:** Plaid via OAuth; must enable sharing in WF **Control Tower** and pick accounts; frequent reauth complaints. SimpleFIN lists WF. Teller lists WF.

## 4. Venmo (payments) + Venmo Credit Card (Synchrony)

- **Venmo balance/payments:** venmo.com → Statements → month/year → **Download CSV** (one month per file; ~3 years). Columns: `ID, Datetime, Type, Status, Note, From, To, Amount (total), Amount (tip), Amount (tax), Amount (fee), Tax Rate, Tax Exempt, Funding Source, Destination, Beginning/Ending Balance…` with title rows above the header ([Venmo help](https://help.venmo.com/cs/articles/transaction-history-vhel281)). Settings → Privacy → *Request Your Data* gives bulk CSV/JSON. **Venmo Credit Card: PDF statements only**; no CSV/QFX.
- **API:** None for consumers.
- **Aggregators:** Plaid supports "Venmo – Personal" and the **credit card surfaces through that same Plaid connection** ([Copilot FAQ](https://help.copilot.money/en/articles/3971255-venmo-integration-faq)). **SimpleFIN/MX: Venmo not found**; "Synchrony – Credit Cards" listed but unclear if Venmo card reachable.

## 5. PayPal

- **Export:** Activity → Statements → Custom → Transactions → CSV/TAB/PDF/QIF; or Reports → *Activity download* ("Balance affecting" filter). **Up to 7 years back, max 12 months per request** ([PayPal help](https://www.paypal.com/us/cshelp/article/how-do-i-view-and-download-statements-and-reports-help145)).
- **API:** Transaction Search API requires a **Business** account. Not recommended just for data.
- **Aggregators:** Plaid supports PayPal. **SimpleFIN/MX: not found.**

## 6. Zelle

Not an account; payments post to WF checking/savings as ordinary debits/credits with descriptions like `ZELLE TO <NAME> ON MM/DD REF #…`. **They appear in the WF export**; filter on "ZELLE" in Description. No separate export/API/aggregator feed.

## 7. U.S. Bank Smartly Visa

- **Export:** usbank.com → account → Transactions tile download icon → CSV/QFX/QBO; **up to 18 months**; desktop site only ([KB](https://www.usbank.com/customer-service/knowledge-base/KB0069323.html)).
- **API:** None for individuals.
- **Aggregators:** Plaid via OAuth. SimpleFIN lists U.S. Bank. Teller lists US Bank.

## 8. Chase Amazon Prime Visa + Freedom Unlimited

- **Export:** Activity → download icon → CSV/QFX/QBO per card. **~24 months back, ~1,000 rows per file** (silently truncated). Columns: `Transaction Date, Post Date, Description, Category, Type, Amount, Memo`. PDFs 7 years.
- **API:** None for individuals.
- **Aggregators:** Chase eliminated screen scraping (2022); OAuth only. On Plaid, **Chase requires a Security Questionnaire for production, waived on Trial** ([Plaid OAuth](https://plaid.com/docs/link/oauth/)); consent expires at 6mo/1yr/"always." Since Nov 2025 **Chase charges aggregators for data pulls** ([CNBC](https://www.cnbc.com/2025/11/14/jpmorgan-chase-fintech-fees.html)). SimpleFIN lists Chase (MX OAuth). Teller lists Chase.

## 9. Discover it Student

- **Export:** Activity & Statements → *Download Activity* → CSV/Excel (QFX removed Oct 2022). Columns: `Trans. Date, Post Date, Description, Amount, Category` (purchases positive). Window ~12–24 months. **Capital One migration began July 27, 2026** through 2027; expect export UI and aggregator entry to change ([Capital One](https://www.capitalone.com/help-center/discover-faqs/)).
- **Aggregators:** Plaid lists Discover; SimpleFIN lists "Discover Credit Card."

---

## Cross-cutting

### CFPB Section 1033: does not help in 2026
Final rule Oct 2024; **Oct 29, 2025: E.D. Ky. enjoined enforcement**; Aug 2026 new NPRM at OIRA expected to permit data-access fees. No enforceable individual API right. Direct access remains CSV + aggregators.

### SimpleFIN Bridge
$1.50/mo or $15/yr, up to 25 institutions; MX-backed; daily refresh; ≤24 API calls/day; 90-day max per query window ([dev guide](https://beta-bridge.simplefin.org/info/developers)). Verified: Robinhood, Fidelity, Wells Fargo, Chase, U.S. Bank, Discover, Synchrony. **Not found: Venmo, PayPal.** MX had a May 2026 cross-account data-mixing incident.

### Plaid for a personal project
**Trial plan (teams created on/after Apr 15, 2026): free, real production data, hard cap of 10 Items; deleting Items does not free slots; Chase questionnaire waived.** Products: Transactions, Investments, Liabilities, Balance ([billing](https://plaid.com/docs/account/billing/), [help](https://support.plaid.com/hc/en-us/articles/16194695660311-Can-I-use-Plaid-for-free)). Our 9 institutions = ~7–8 Items (Chase cards share one Item; Zelle none). **Fidelity likely unavailable on Trial.**

### Teller
Free dev environment, 100 enrollments; production $0.30/enrollment/month. **Depository and credit only; no brokerage.**

### Others
Akoya, Finicity/Mastercard, Yodlee, MX direct: enterprise only.

## Recommended pipeline shape (from this research)
1. **Automated daily:** Plaid Trial for WF, Chase, US Bank, Discover, Robinhood, Venmo (+CC), PayPal.
2. **Fidelity:** monthly manual Activity CSV + Positions CSV; or SimpleFIN best-effort.
3. **Archive raw CSV/PDF monthly** since every institution caps structured history.

**Key uncertainties:** Fidelity per-download window; Discover CSV depth; Venmo CC via MX/Synchrony; whether Plaid Trial permits Fidelity at all.
