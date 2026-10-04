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
1. Fidelity → Activity & Orders → Download CSV; Positions → Download. Drop both in `data/imports/fidelity/`.
2. Run the Fidelity importer (phase 2).

## Status
Phase 1 (vertical slice) complete: auth, schema, Plaid link + sync, categorization, transactions, accounts, home KPIs. See `docs/ARCHITECTURE.md` §6 for the remaining phases.
