# Decision Log

Decisions made with Jon on 2026-10-04 after the research in `docs/research/`. Each entry: decision, alternatives, rationale. Change a decision by adding a new dated entry, not by editing history.

## D1. Purpose and scope
**Decision:** Read-only personal finance insights. No money movement, no order placement, no bill pay. Ever.
**Rationale:** Jon wants understanding and recommendations, not active management. Keeps the threat model small: a compromised app can only read.

## D2. Ingestion: Plaid Trial + manual Fidelity CSV + one-time history backfill
**Decision:** Plaid Trial plan (free, 10 Items, real production data) for Wells Fargo, Chase (both cards share one Item), U.S. Bank, Discover, Robinhood, Venmo (payments + Venmo Credit Card via the same Item), PayPal. **Fidelity Roth IRA via monthly manual CSV** (Activity + Positions). One-time CSV backfill of all available history from every institution.
**Alternatives rejected:** SimpleFIN ($15/yr) fails the "covers everything" test (no Venmo/PayPal; Fidelity feed flaky, CUSIPs not tickers). Unofficial scrapers (robin_stocks) require storing passwords and break. Teller has no brokerage.
**Rationale:** Plaid Trial covers 7 of 8 institutions for $0 with OAuth (no stored passwords). Fidelity gates Plaid access to paid Growth tier via Akoya.
**Item budget:** 7 Items used of 10. Deleting Items does not free slots, so link carefully.
**Open risk:** Discover is migrating to Capital One through 2027; expect to relink once.

## D3. Stack: TypeScript everywhere on Vercel + Supabase
**Decision:** Next.js 16 App Router (TypeScript strict, Tailwind v4) on Vercel Hobby. Supabase Free (new dedicated project `jon-finance`, ref `wnwwqpfooftxzxmsjkhn`, us-west-1). Vercel Cron triggers sync and keepalive. shadcn/ui + Recharts v3 + TanStack Table + Geist.
**Alternatives rejected:** Python pipeline (two codebases, needs a machine for cron), Streamlit (UI ceiling too low for the "copy the best apps" goal).
**Rationale:** Matches `jon-fun` conventions, one deploy, no laptop required for syncs.

## D4. LLM: Gemini, on demand only
**Decision:** Gemini (`gemini-2.5-flash`, existing key from jon-fun) for transaction categorization of unresolved merchants and for on-demand narrative insights. **No scheduled narratives.**
**Alternatives rejected:** Claude API (new account, new cost), local models (slow, needs Mac running).
**Rationale:** $0 budget; Jon uses the app sparsely so narratives are generated when a page is opened, not on a timer. Categorization is rule-first with the LLM as fallback, cached per merchant.

## D5. Auth: Supabase Auth, single allowlisted email
**Decision:** Supabase Auth magic link / Google, with a server-side allowlist of exactly one email. Every table has RLS; app reads go through the user session, pipeline writes go through the service role in server-only code.
**Alternatives rejected:** Vercel password protection (Pro only), network-only (loses phone access).

## D6. Budget: $0 infrastructure
**Decision:** Free tiers only: Vercel Hobby, Supabase Free, Plaid Trial, Gemini free tier. A daily keepalive cron prevents Supabase's 7-day idle pause.
**Known limits:** Vercel Hobby crons run at most once per day with loose timing; functions time out at 60 s by default (300 s with `maxDuration`). Supabase Free: 500 MB DB, 2 active projects per org (a third was accepted on 2026-10-04; verify billing).

## D7. Delivery: in-app only
**Decision:** No email digests, no push. Reports render as pages with history.

## D8. Hosting names
**Decision:** GitHub `sfjchen/jon-finance` (private). Vercel project `jon-finance`. Domain `finance.sfjc.dev`.

## D9. UI direction
**Decision:** Follow `docs/research/04-ui-design-research.md` "Design decisions" 1 to 15: 240 px sidebar + ⌘K, net-worth hero home, Recharts via shadcn, neutral palette with one indigo accent, Paul Tol muted category colors, Geist + tabular numerals, Stripe/Linear density, Taxable | Roth tabs, which-card matrix with reward-leak KPI, one narrative card with deep links.

## D10. Card reward models
**Decision:** Venmo CC modeled as the pre-Sep-25-2026 auto-top-category program (3% / 2% / 1%). Discover modeled past first year (no Cashback Match). Smartly modeled as flat 2%. Prime Visa 5/2/1, CFU 5/3/1.5. Re-verify quarterly.

## D11. Personal-situation parameters
**Decision:** Post-grad model ships with 2 to 3 editable salary/city scenarios (Jon is still recruiting). Income today is internship-style and intermittent. Holdings are a mix of index funds and individual stocks, so the investment module includes lot-level cost basis, wash-sale scanning across accounts, and concentration flags.

## D12. This session's milestone
**Decision:** Plan + working vertical slice: repo deployed, schema migrated, auth, Plaid sandbox link end to end into a transactions page with rule + LLM categorization, home page with real KPIs from synced data.
