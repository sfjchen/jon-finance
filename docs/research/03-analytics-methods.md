# Personal Finance Analytics Methods: What To Compute (researched 2026-10-04)

*Scope: a graduating senior with a Roth IRA, taxable brokerage, checking/savings, five credit cards. Figures current as of October 2026. Not tax or investment advice.*

---

## 1. Cash Flow & Budgeting

**Category taxonomy.** Use Plaid's Personal Finance Categories (PFC) as the canonical schema: 16 primary categories (INCOME, TRANSFER_IN, TRANSFER_OUT, LOAN_PAYMENTS, BANK_FEES, ENTERTAINMENT, FOOD_AND_DRINK, GENERAL_MERCHANDISE, HOME_IMPROVEMENT, MEDICAL, PERSONAL_CARE, GENERAL_SERVICES, GOVERNMENT_AND_NON_PROFIT, TRANSPORTATION, TRAVEL, RENT_AND_UTILITIES) and 104 detailed subcategories, with `confidence_level` ([taxonomy CSV](https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv)). **TRANSFER_IN/OUT and LOAN_PAYMENTS (card payments) must be excluded from spending** or every card purchase double-counts.

**Budget frameworks as lenses.** Tag each category need/want/save; report actual vs 50/30/20 alongside budget-vs-actual per category.

**Savings rate.** No consensus definition. Recommended: `(Roth + brokerage + 401k + cash savings increase + employer match) / (gross income + employer match)`. Be consistent.

**Rolling windows.** 3-month and 12-month trailing averages per category. Flag categories where 3-mo exceeds 12-mo by >25%.

**Recurring/subscription detection** (deterministic):
1. Normalize merchant strings (strip store numbers, dates, "SQ *", "TST*").
2. Group by normalized merchant; require ≥3 occurrences.
3. Classify cadence when intervals cluster: weekly 7±2, monthly 30±5, quarterly 90±10, annual 365±15 days.
4. Amount stability: CV ≤0.15 or within ±5% of median.
5. Fixed amount + cadence = subscription; variable + cadence = bill. Surface "price crept up" (latest > median × 1.1) and "zombie" subscriptions.

**Anomaly detection.** Per-category robust z-score `z = 0.6745 × (x − median) / MAD`, flag |z| > 3. Plus rules: "new merchant over $X", "duplicate charge within 48h". Flag by review capacity (top N per week).

---

## 2. Credit Card Optimization

### Current reward structures (verify against issuer terms before encoding)

| Card | Earning structure | Source |
|---|---|---|
| **Venmo Credit Card** (approved before Sep 25, 2026) | 3% top monthly spend category, 2% second, 1% else. Categories: dining & nightlife, travel, bills & utilities, health & beauty, grocery, gas, transportation, entertainment. Auto-assigned per statement. New applicants after Sep 25, 2026: fixed 3% dining/entertainment/streaming/Pay-with-Venmo, 1% else. | [DoC](https://www.doctorofcredit.com/venmo-credit-card-changes-3-adds-possible-4-category/), [Venmo terms](https://help.venmo.com/cs/articles/venmo-credit-card-rewards-program-terms-and-cash-back-to-crypto-terms-vhel127) |
| **U.S. Bank Smartly Visa** | 2% base. Bonus tiers need $10k+ in Smartly Checking; excluded categories. For a student, model as **flat 2%**. | [U.S. Bank](https://www.usbank.com/credit-cards/bank-smartly-visa-signature-credit-card.html) |
| **Prime Visa** (Chase/Amazon) | 5% Amazon.com, Whole Foods, Chase Travel; 2% gas, restaurants, local transit; 1% else. Drugstores no longer 2%. | [Chase](https://creditcards.chase.com/cash-back-credit-cards/amazon-prime-rewards) |
| **Chase Freedom Unlimited** | 5% Chase Travel; 3% dining + drugstores; 1.5% else. | [Chase](https://creditcards.chase.com/cash-back-credit-cards/freedom/unlimited) |
| **Discover it Student** | 5% on up to $1,500/quarter rotating **after activation**, 1% else. Cashback Match doubles first-year earnings. | [Discover](https://www.discover.com/credit-cards/cash-back/cashback-calendar.html) |

**Discover 2026 calendar:** Q1 grocery/wholesale/streaming; Q2 restaurants/home improvement; Q3 gas/EV/transportation/drugstores; Q4 entertainment/restaurants/utilities.

### What to compute
- **Effective rate function** `rate(card, category, date, state)` because Venmo depends on your own spend ranking, Discover on quarter + activation + cap, Smartly on balance tier.
- **"Which card should I have used":** per transaction `leak = amount × (best_rate − actual_rate)`. Simulate Discover's $1,500 cap greedily in date order. Venmo's top category is endogenous; simulate shifts. Cashback Match year makes Discover best for nearly everything except Amazon.
- **Expected steady-state mapping:** Amazon/Whole Foods → Prime Visa; dining/drugstore → CFU 3% unless Venmo's 3% lands on dining; current Discover quarter → Discover until cap; everything else → Smartly 2%.
- **Utilization and dates:** FICO uses **statement-close balance**. Track per card: close date, due date, projected statement balance, utilization at close. Alert >30% projected at close (pay before close). 1–9% optimal.
- **Interest avoidance:** `paid_in_full_flag` per statement; interest charged should be $0; "grace period at risk" alert.

---

## 3. Investment Analytics (Roth IRA + Taxable)

- **Returns:** both **XIRR** (money-weighted) and **TWR** (chain-linked). **Benchmark:** replay the same dated cash flows into VTI at historical closes and compare. ([Bogleheads](https://www.bogleheads.org/wiki/Calculating_personal_returns))
- **Allocation and drift:** target vs actual across both accounts; **5/25 rule** for rebalance alerts. Rebalance with contributions, inside the Roth.
- **Expense ratio drag:** `weighted_ER`, annual dollar drag, 30-year projection with/without.
- **Dividends:** per holding, TTM yield, qualified vs ordinary (taxable). Flag DRIP in taxable (small lots, wash-sale risk).
- **Cost basis and lots:** every lot with date, shares, cost; short vs long term.
- **Wash sales:** 61-day window across **all** accounts incl. Roth; Roth replacement **permanently** forfeits the loss (Rev. Rul. 2008-5). Most dangerous pattern: same fund in Roth with DRIP and in taxable.
- **TLH candidates (informational):** taxable lots with loss > $500 and > 5%, with a pairing suggestion (VTI → ITOT). $3,000/yr ordinary offset.
- **Roth tracking:** 2026 limit **$7,500**; capped at taxable compensation; track by tax year (through April 15) and YTD compensation. ([IRS](https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500))
- **Concentration:** flag single stock >5% (watch), >10% (plan).

---

## 4. Net Worth & Goals

- **Net worth series:** snapshot `assets − liabilities`, decomposed liquid / invested / debt. MoM change split **contributions vs market**.
- **Emergency fund months** = liquid cash / trailing-3-month *essential* expenses. New grad without a job: target 6 months.
- **Credit card float:** sum(card balances) vs checking; flag if float > checking.
- **Post-grad scenario model:** salary, state, 401k %, match, rent, loan payment → take-home, savings rate, emergency-fund fill date, Roth max date. 2–3 scenarios side by side.

---

## 5. Student / New-Grad Specifics

- Federal loans: 6-month grace; RAP and Tiered Standard plans since July 1, 2026; SAVE gone.
- Roth needs earned income (W-2 box 1); scholarships only if in box 1.
- 401(k): capture full match first; 2026 employee limit $24,500.
- Withholding: partial-year start over-withholds; use IRS estimator.
- State residency: mid-year move → two part-year returns.
- HSA 2026 $4,400 self-only; FSA $3,400.
- Common mistakes: lifestyle inflation, closing oldest card, not activating Discover quarters, same fund in Roth+taxable with DRIP.

---

## 6. Reporting Cadence

- **Weekly (5 min):** uncategorized to tag; anomalies; upcoming statement closes with projected utilization; Discover cap remaining.
- **Monthly:** cash flow (income, need/want/save, savings rate); budget vs actual; recurring list with price changes; reward leak report; net worth delta (contributions vs market); all cards paid in full.
- **Quarterly:** allocation drift (5/25); TWR/XIRR vs VTI; Roth YTD vs $7,500 and vs compensation; Discover activation; emergency fund months.
- **Annual:** credit reports; wash-sale/lot review; TLH; W-4; beneficiaries; IPS.

**Useful KPIs:** savings rate, emergency-fund months, utilization at close, reward leak $, TWR vs benchmark, drift, paid-in-full streak. **Vanity:** daily portfolio value, lifetime rewards, credit score to the point.

---

## 7. Privacy & Security

- Encrypt at rest (SQLCipher or `age`; FileVault). Never commit data: gitignore `*.csv *.ofx *.qfx *.db data/`; gitleaks pre-commit.
- Secrets in Keychain or gitignored `.env`; never in code or notebooks.
- Least privilege: read-only aggregator tokens; never store bank passwords.
- LLM APIs: strip account numbers and names; prefer aggregates where possible; check retention policy.
- Backups: encrypted, versioned, tested.
