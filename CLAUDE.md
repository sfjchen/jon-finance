# jon-finance

Single-user, read-only personal finance insights app. Next.js 16 (App Router) + Supabase + Vercel. Owner: Jon (jchen04@stanford.edu, GitHub sfjchen).

## Read first
- `docs/ARCHITECTURE.md`: pipeline stages, data model, security model, pages, build phases.
- `docs/DECISIONS.md`: every decision with rationale. Add a dated entry to change one.
- `docs/research/`: the research that drove the decisions (institutions, tools, analytics methods, UI).

## Hard rules
- **Never move money.** No Plaid `auth`, `transfer`, `payment_initiation`; no brokerage order APIs. Read-only forever.
- **Never commit data or secrets.** `data/`, `*.csv`, `*.ofx`, `*.qfx`, `*.pdf`, `*.db`, `.env*` are gitignored. Do not weaken `.gitignore`.
- **Never echo credentials** (Plaid secrets, service-role key, DB password) in chat, logs, or docs.
- **Service role only server-side.** `src/lib/supabase/admin.ts` is `server-only`. Browser code uses the anon key + RLS.
- **$0 infra.** Free tiers only (Vercel Hobby, Supabase Free, Plaid Trial, Gemini free). Don't add paid services.
- **Sign convention:** `transactions.amount` negative = money leaves the account, positive = arrives. Plaid's sign is inverted at ingest.

## Commands
```bash
npm run dev            # localhost:3000
npm run type-check     # tsc
npm run lint
npm run build
npm run db:push        # apply supabase/migrations to the linked project
npm run db:types       # regenerate src/types/database.ts
npm run seed:categories
```

## Conventions (match jon-fun)
- TypeScript strict, `@/` imports, no `any`, no `console.*` except error paths in the pipeline.
- Server Components fetch via `requireOwner()` (session client, RLS). Route handlers authorize with `isAuthorizedRequest()` (owner session or `CRON_SECRET`).
- shadcn/ui (Radix) + Tailwind v4; Recharts via `components/ui/chart.tsx`; tabular numerals on every amount; money formatting only through `src/lib/format.ts`.
- Category ids are Plaid PFC codes; the taxonomy lives in `src/lib/categories.ts` and is seeded by script.
- New migration: `supabase/migrations/YYYYMMDDHHMMSS_name.sql`, then `npm run db:push && npm run db:types`.
- Pipeline code is idempotent: upserts on `(account_id, source_id)`; cursors persisted per page.

## Environment
`.env.local` (local) and Vercel project env (prod): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ALLOWED_EMAIL`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (sandbox|production), `GEMINI_API_KEY`, `GEMINI_MODEL` (optional), `CRON_SECRET`.

## Infra
- Supabase project `jon-finance` ref `wnwwqpfooftxzxmsjkhn` (us-west-1). Linked via CLI.
- Vercel project `jon-finance` → finance.sfjc.dev. Cron: `GET /api/sync` daily 12:00 UTC.
- GitHub `sfjchen/jon-finance` (private), deploys from `main`.
