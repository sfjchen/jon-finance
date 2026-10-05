# CSV import guide

Two reasons to import CSVs: **Fidelity every month** (no Plaid), and a **one-time history backfill** for every other institution (Plaid only returns up to 24 months and some banks less).

All imports go through **Accounts → Import CSV**. Formats are auto-detected. Importing the same file twice is a no-op. Rows that overlap with Plaid data are kept for audit but marked superseded so nothing double-counts.

Save the raw files in `data/imports/<institution>/` on your Mac (gitignored) so you always have the originals.

---

## Fidelity Roth IRA (monthly, ~3 minutes)

**Activity (transactions)**
1. fidelity.com → **Accounts & Trade → Portfolio** → select the Roth IRA.
2. **Activity & Orders** tab → **History**.
3. Time period: **Custom** → pick the first of last month to today (max 90 days per download; for the first backfill, repeat in 90-day chunks going back up to 5 years).
4. Click **Download** (top right of the table) → CSV.

**Positions (holdings snapshot)**
1. Same account → **Positions** tab.
2. Click **Download** (top right) → saves `Portfolio_Positions_Mon-DD-YYYY.csv`. Keep that filename; the date in it becomes the snapshot date.

**Import:** drop both files into Import CSV. First time: choose **Create a new manual account**, name it `Roth IRA`, institution `Fidelity`, type Investment. After that, pick that account from the list.

---

## One-time backfills (do once, before or after linking Plaid)

| Institution | Where | Range per file | Notes |
|---|---|---|---|
| **Wells Fargo** | wellsfargo.com → account → **Account Activity → Download Account Activity** → format **Comma Delimited** | up to 18 months | One file per account (checking, savings). Zelle shows up here. Pick the matching Plaid account when importing. |
| **Chase** (each card) | chase.com → card → Activity → download icon → **CSV**, Activity: **All transactions** / custom dates | ~24 months, ~1,000 rows per file | Export each card separately. If a file hits ~1,000 rows, split the date range. |
| **U.S. Bank** | usbank.com (desktop) → card → Transactions tile → download icon → CSV | up to 18 months | |
| **Discover** | discover.com → **Activity & Statements → Download Activity** → CSV, custom dates | ~12-24 months | After the Capital One migration the layout may change; tell Claude. |
| **PayPal** | paypal.com → **Activity → Statements → Custom** → Transaction type: Balance affecting → CSV | 7 years, max 12 months per request | |
| **Venmo** | venmo.com → **Statements** → choose month → **Download CSV** | one month per file | ~3 years available. Select all files at once in Import CSV. |
| **Robinhood** | robinhood.com → **Account → Reports and statements → Account activity report** → Generate (custom dates, all-time) → download when emailed | all-time | Buys/sells/dividends go to investment history; deposits and fees also appear in the ledger. Excludes crypto. |

For Plaid-linked institutions, import **into the Plaid account** (the dropdown marks them "(Plaid)") so overlap reconciliation runs. For Venmo and PayPal before they are linked, create a manual account; after linking you can repoint later.

---

## After importing

- **Transactions page:** new rows are categorized by rules, then Plaid-style merchant cache, then the LLM. Anything low-confidence lands in the review queue.
- **Settings → Sync runs / Top merchants:** sanity-check counts.
- Run `npm run db:stats` locally for a table-level summary.

## Troubleshooting

- *"Could not detect the file format"*: open the file; if the first line doesn't look like the formats above (the bank changed its export), pick the importer manually in the dialog and, if it still fails, paste the header line to Claude.
- *Amounts have the wrong sign:* each importer encodes the institution's convention; if a bank flips it, that is a one-line fix in `src/lib/importers/`.
- *Duplicates after a Plaid link:* run Settings → Sync (or `POST /api/sync?recategorize=1`); reconciliation also runs on every import.
