# Architecture

Single-user, read-only personal finance insights app. Data flows one way: institutions → Supabase → dashboard. Nothing in this system can move money.

```
┌─ Institutions ─────────────────────────────┐
│ Plaid (7 Items, OAuth, Trial plan)         │──┐
│ Fidelity CSV (monthly, manual upload)      │──┤
│ One-time CSV backfills (all institutions)  │──┤
└────────────────────────────────────────────┘  │
                                                ▼
┌─ Next.js on Vercel ──────────────────────────────────────────────┐
│ /api/plaid/*     link token, public-token exchange                │
│ /api/sync        Plaid transactions/sync + holdings + liabilities │ ◄── Vercel Cron (daily) + manual button
│ /api/import/csv  parse per-institution CSV → normalized rows      │
│ lib/pipeline/*   normalize → dedupe → transfers → categorize      │
│ lib/analytics/*  cash flow, recurring, rewards, returns, net worth│
│ app/(dashboard)  pages read via Supabase session (RLS)            │
└───────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─ Supabase (Postgres + Auth) ───────────────────────────────────────┐
│ raw: plaid_items, sync_runs, csv_imports                           │
│ core: accounts, transactions, balance_snapshots, holdings,         │
│       securities, investment_transactions, security_prices         │
│ enrichment: categories, merchants, category_rules, llm_cache       │
│ config: cards, allowed_users, user_settings                        │
│ RLS: owner-only read; pipeline writes via service role             │
└────────────────────────────────────────────────────────────────────┘
```

## 1. Pipeline stages

Every transaction passes through the same stages regardless of source. Stages are idempotent and re-runnable.

1. **Acquire.** Plaid `transactions/sync` with a stored cursor per Item (added / modified / removed). Investment accounts additionally call `investments/holdings/get` and `investments/transactions/get`. Credit accounts call `liabilities/get` for statement close, due date, last statement balance, APRs. CSV uploads go through a per-institution parser in `lib/importers/<institution>.ts` that yields the same `NormalizedTxn` shape.
2. **Normalize.** Signed amount convention: **negative = money leaves the account, positive = money arrives**, for every account type (Plaid's sign is inverted on ingest). Dates are `posted_date` (authoritative) and `authorized_date`. `raw_description` is kept verbatim; `merchant_norm` is a cleaned key (uppercase, strip store numbers, dates, `SQ *`, `TST*`, trailing city/state).
3. **Dedupe.** Upsert on `(account_id, source_id)`. Plaid `transaction_id` is the source_id for Plaid rows; CSV rows use `sha256(account_id | posted_date | amount | raw_description | row_ordinal_within_day)`. When Plaid history and a CSV backfill overlap, a second pass matches `(account_id, amount, posted_date ± 3 days, fuzzy description)` and marks the CSV row `superseded_by` the Plaid row so it is excluded from analytics but kept for audit.
4. **Transfers.** Pair opposite-sign equal amounts across the user's own accounts within ± 5 days (card payments, Venmo cash-outs, brokerage deposits, savings moves). Both legs get `is_transfer = true` and a shared `transfer_group_id`, and are excluded from income and spending. Bank-side `VENMO` / `PAYPAL` lines whose counterpart exists in the Venmo/PayPal feed are transfers; unmatched ones stand as real spend/income. Credit-card payments are `LOAN_PAYMENTS.CREDIT_CARD_PAYMENT`, shown separately, never as spending.
5. **Categorize** (first match wins, each stage records `category_source` and `category_confidence`):
   1. `user`: a locked merchant or a manual edit on the transaction.
   2. `rule`: `category_rules` ordered by priority (regex or substring on `merchant_norm` / `raw_description`, optional account and amount bounds).
   3. `merchant`: cached decision in `merchants` for this `merchant_norm`.
   4. `plaid`: Plaid Personal Finance Category when `confidence_level` is `HIGH` or `VERY_HIGH`.
   5. `llm`: Gemini, batched per unique unresolved `merchant_norm`, strict JSON `{category, confidence, reason}`, result written to `merchants` so it runs once per merchant forever. Low confidence lands in the review queue.
6. **Snapshot.** Every sync writes one `balance_snapshots` row per account per day. Net worth history is derived from snapshots, never recomputed from transactions.
7. **Derive.** Analytics are SQL views and TypeScript functions over the core tables (no separate warehouse). Heavy ones (recurring detection, reward leak, TWR) are computed on request and memoized in `analytics_cache` keyed by `(kind, params_hash, max(updated_at) of inputs)`.

## 2. Data model (Postgres)

See `supabase/migrations/0001_init.sql` for the authoritative DDL. Key choices:

- `categories.id` is the Plaid PFC detailed code (`FOOD_AND_DRINK_RESTAURANT`) with `parent_id` = primary (`FOOD_AND_DRINK`). Each has `kind` (income / expense / transfer / investment), `bucket` (need / want / save / income / transfer) for 50/30/20, and a stable `color` from the Paul Tol muted palette assigned at the primary level.
- `transactions.amount` is `numeric(14,2)`, signed as described. `is_transfer`, `is_excluded`, `superseded_by` gate what analytics see; the view `v_spend` applies all three.
- `accounts.kind` ∈ depository / credit / investment / loan / other; `accounts.card_id` links a credit account to its `cards` reward profile.
- `cards.reward_program` is JSON interpreted by `lib/rewards/programs.ts` (fixed tiers, rotating quarters, auto-top-category, caps).
- `plaid_items.access_token` is readable only by the service role (column-level `REVOKE` from `authenticated` and `anon`).
- `allowed_users(email)` seeds the single owner; `is_owner()` is the RLS predicate on every table.

## 3. Security model

- Supabase Auth magic link; `proxy.ts` refreshes the session and redirects unauthenticated requests to `/login`; the dashboard layout additionally rejects any session whose email is not in `ALLOWED_EMAIL`.
- Browser only ever holds the anon key + the user's JWT; RLS makes every table owner-only.
- Pipeline routes (`/api/sync`, `/api/import/*`, `/api/plaid/*`) run server-side with the service role and require either an owner session or the `CRON_SECRET` bearer header.
- Plaid access tokens never leave the server. Products requested: `transactions`, `investments`, `liabilities` only (no `auth`, no `transfer`, no `payment_initiation`).
- No financial data in git: `.gitignore` blocks `data/`, `*.csv`, `*.ofx`, `*.qfx`, `*.pdf`, `*.db`. Secrets live in `.env.local` and Vercel env.
- LLM calls receive `merchant_norm`, amount bucket, account kind, and the category list. Never account numbers, names, or notes.

## 4. Pages (route group `(dashboard)`)

| Route | Purpose | Status |
|---|---|---|
| `/` | Net-worth hero, KPI strip, review-queue button, 6-month cash-flow bars, upcoming recurring, narrative card | slice: hero + KPIs + recent |
| `/transactions` | TanStack table, filters, inline category combobox, keyboard review | slice |
| `/accounts` | Accounts by institution, balances, Link button, CSV upload | slice |
| `/cash-flow` | Sankey, category trends, 50/30/20, savings rate | phase 2 |
| `/recurring` | Subscriptions and bills, price creep, zombies | phase 2 |
| `/cards` | Which-card matrix, reward leak, utilization at close, due dates | phase 3 |
| `/investments` | Taxable / Roth tabs, value vs VTI, TWR/XIRR, allocation, holdings treemap, lots, wash-sale scan | phase 4 |
| `/net-worth` | History, contributions vs market, emergency-fund months, scenarios | phase 4 |
| `/reports` | On-demand monthly narrative with deep links; history | phase 5 |
| `/settings` | Cards config, rules, categories, Plaid item health, data export | slice (minimal) |

## 5. Scheduled jobs (Vercel Cron, Hobby = daily max)

- `0 12 * * *` → `GET /api/sync` (all Items; also keeps Supabase awake).
- Manual "Sync now" button calls the same route with the owner session.

## 6. Build phases

1. **Slice (this session):** repo, schema, auth, Plaid sandbox link, sync, categorization, transactions and accounts pages, home KPIs, deploy to finance.sfjc.dev.
2. **Real data:** switch `PLAID_ENV` to production, link 7 Items, Fidelity CSV importer, backfill importers (WF, Chase, US Bank, Discover, PayPal, Venmo, Robinhood), overlap reconciliation, transfer detection tuning on real data.
3. **Cash flow + recurring:** Sankey, trends, recurring detector, anomalies, review queue polish, ⌘K.
4. **Cards:** reward program engine for the 5 cards, which-card matrix, retrospective leak, statement/due tracking from liabilities.
5. **Investments + net worth:** holdings, prices (Plaid close + daily price fetch), TWR/XIRR, VTI replay benchmark, allocation drift, lots and wash-sale scan, Roth contribution tracking, scenario model.
6. **Reports + MCP:** on-demand narrative, monthly report pages, read-only MCP server so Claude can query the ledger in chat.
