# jon-finance

Private, read-only personal finance insights. Plaid and CSV in, Supabase in the middle, a Next.js dashboard out. Nothing here can move money.

- **Docs:** [Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Research](docs/research/)
- **Live:** https://finance.sfjc.dev (owner only)

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in values
npm run db:push               # requires `supabase link` once
npm run seed:categories
npm run dev
```

Sign in at `/login` with the allowed email. In Plaid sandbox, link any bank with `user_good` / `pass_good`.

## Monthly routine (until Fidelity gets an API)
Fidelity → Activity & Orders → Download CSV; Positions → Download. Then **Accounts → Import CSV**. Details and one-time backfills for every institution: [docs/IMPORT-GUIDE.md](docs/IMPORT-GUIDE.md).

## Status
- Phase 1 (vertical slice): auth, schema, Plaid link + sync, categorization, transactions, accounts, home KPIs. Done.
- Phase 2 (CSV): importers for Fidelity (activity + positions), Wells Fargo, Chase, U.S. Bank, Discover, Venmo, PayPal, Robinhood; Plaid-overlap reconciliation; import dialog. Done, pending real-file validation.
- Remaining: see `docs/ARCHITECTURE.md` §6 (cash flow, recurring, cards, investments, net worth, reports).
