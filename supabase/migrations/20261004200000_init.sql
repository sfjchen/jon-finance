-- jon-finance initial schema
-- Conventions: amounts are numeric(14,2), signed from the account's point of view:
--   negative = money leaves the account, positive = money arrives.
-- All tables have RLS enabled. Reads are owner-only via is_owner(). Pipeline writes use the service role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Owner allowlist and RLS predicate
-- ---------------------------------------------------------------------------
create table if not exists allowed_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function is_owner() from public;
grant execute on function is_owner() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type account_kind as enum ('depository', 'credit', 'investment', 'loan', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type data_source as enum ('plaid', 'csv', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type category_kind as enum ('income', 'expense', 'transfer', 'investment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type budget_bucket as enum ('need', 'want', 'save', 'income', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type category_source as enum ('user', 'rule', 'merchant', 'plaid', 'llm', 'transfer', 'none');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Reference: categories (Plaid Personal Finance Category taxonomy)
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id text primary key,                 -- e.g. FOOD_AND_DRINK_RESTAURANT or FOOD_AND_DRINK (primary)
  parent_id text references categories(id) on delete restrict,
  name text not null,
  kind category_kind not null,
  bucket budget_bucket not null,
  color text not null,                 -- hex, inherited from primary
  icon text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_parent_idx on categories(parent_id);

-- ---------------------------------------------------------------------------
-- Plaid items (access tokens are service-role only)
-- ---------------------------------------------------------------------------
create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  item_id text not null unique,
  access_token text not null,
  institution_id text,
  institution_name text,
  institution_logo text,               -- base64 png from Plaid, nullable
  institution_color text,
  products text[] not null default '{}',
  transactions_cursor text,
  status text not null default 'active', -- active | login_required | error | removed
  error_code text,
  error_message text,
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cards (reward program config for credit accounts)
-- ---------------------------------------------------------------------------
create table if not exists cards (
  id text primary key,                 -- slug e.g. 'chase-cfu'
  name text not null,
  issuer text not null,
  network text,
  reward_program jsonb not null default '{}'::jsonb,
  statement_close_day int,
  due_day int,
  credit_limit numeric(14,2),
  annual_fee numeric(10,2) not null default 0,
  opened_on date,
  notes text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Accounts
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  source data_source not null,
  plaid_item_id uuid references plaid_items(id) on delete set null,
  plaid_account_id text unique,
  institution_name text not null,
  name text not null,
  official_name text,
  mask text,
  kind account_kind not null,
  subtype text,
  currency text not null default 'USD',
  card_id text references cards(id) on delete set null,
  is_active boolean not null default true,
  include_in_net_worth boolean not null default true,
  include_in_cash_flow boolean not null default true,
  current_balance numeric(14,2),
  available_balance numeric(14,2),
  credit_limit numeric(14,2),
  balance_as_of timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_item_idx on accounts(plaid_item_id);

create table if not exists balance_snapshots (
  id bigint generated always as identity primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  as_of date not null,
  current numeric(14,2),
  available numeric(14,2),
  credit_limit numeric(14,2),
  source data_source not null default 'plaid',
  created_at timestamptz not null default now(),
  unique (account_id, as_of)
);

-- ---------------------------------------------------------------------------
-- Merchants (categorization cache keyed by normalized name)
-- ---------------------------------------------------------------------------
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  category_id text references categories(id) on delete set null,
  source category_source not null default 'none',
  confidence numeric(4,3),
  reason text,
  logo_url text,
  website text,
  locked boolean not null default false,    -- true when the user set it
  txn_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  source data_source not null,
  source_id text not null,
  posted_date date not null,
  authorized_date date,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  raw_description text not null,
  merchant_raw text,
  merchant_norm text not null,
  merchant_id uuid references merchants(id) on delete set null,
  category_id text references categories(id) on delete set null,
  category_source category_source not null default 'none',
  category_confidence numeric(4,3),
  plaid_pfc_primary text,
  plaid_pfc_detailed text,
  plaid_pfc_confidence text,
  payment_channel text,
  pending boolean not null default false,
  pending_source_id text,
  is_transfer boolean not null default false,
  transfer_group_id uuid,
  is_excluded boolean not null default false,
  superseded_by uuid references transactions(id) on delete set null,
  needs_review boolean not null default false,
  notes text,
  logo_url text,
  website text,
  location jsonb,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, source_id)
);
create index if not exists transactions_date_idx on transactions(posted_date desc);
create index if not exists transactions_account_date_idx on transactions(account_id, posted_date desc);
create index if not exists transactions_merchant_norm_idx on transactions(merchant_norm);
create index if not exists transactions_category_idx on transactions(category_id);
create index if not exists transactions_review_idx on transactions(needs_review) where needs_review;
create index if not exists transactions_transfer_idx on transactions(transfer_group_id) where transfer_group_id is not null;

-- ---------------------------------------------------------------------------
-- Category rules (deterministic, evaluated before merchants/plaid/llm)
-- ---------------------------------------------------------------------------
create table if not exists category_rules (
  id uuid primary key default gen_random_uuid(),
  priority int not null default 100,
  match_field text not null default 'merchant_norm' check (match_field in ('merchant_norm', 'raw_description')),
  pattern text not null,
  is_regex boolean not null default false,
  account_id uuid references accounts(id) on delete cascade,
  amount_min numeric(14,2),
  amount_max numeric(14,2),
  category_id text references categories(id) on delete cascade,
  set_display_name text,
  mark_transfer boolean not null default false,
  mark_excluded boolean not null default false,
  enabled boolean not null default true,
  hit_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Investments
-- ---------------------------------------------------------------------------
create table if not exists securities (
  id uuid primary key default gen_random_uuid(),
  plaid_security_id text unique,
  ticker text,
  name text,
  type text,
  cusip text,
  isin text,
  is_cash_equivalent boolean not null default false,
  close_price numeric(18,6),
  close_price_as_of date,
  expense_ratio numeric(6,4),
  asset_class text,                  -- us_stock | intl_stock | bond | cash | crypto | other (user-maintained)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists securities_ticker_idx on securities(ticker);

create table if not exists holdings (
  id bigint generated always as identity primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  security_id uuid not null references securities(id) on delete cascade,
  as_of date not null,
  quantity numeric(20,8) not null,
  cost_basis numeric(14,2),
  institution_price numeric(18,6),
  institution_value numeric(14,2),
  source data_source not null default 'plaid',
  created_at timestamptz not null default now(),
  unique (account_id, security_id, as_of)
);

create table if not exists investment_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  security_id uuid references securities(id) on delete set null,
  source data_source not null,
  source_id text not null,
  date date not null,
  type text not null,                 -- buy | sell | dividend | fee | transfer | cash | cancel
  subtype text,
  name text,
  quantity numeric(20,8),
  price numeric(18,6),
  fees numeric(14,2),
  amount numeric(14,2) not null,      -- signed, account point of view
  currency text not null default 'USD',
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, source_id)
);
create index if not exists inv_txn_account_date_idx on investment_transactions(account_id, date desc);

create table if not exists security_prices (
  security_id uuid not null references securities(id) on delete cascade,
  date date not null,
  close numeric(18,6) not null,
  primary key (security_id, date)
);

-- ---------------------------------------------------------------------------
-- Credit liabilities (statement/due tracking from Plaid liabilities)
-- ---------------------------------------------------------------------------
create table if not exists credit_statements (
  id bigint generated always as identity primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  as_of date not null,
  last_statement_balance numeric(14,2),
  last_statement_issue_date date,
  next_payment_due_date date,
  minimum_payment_amount numeric(14,2),
  last_payment_amount numeric(14,2),
  last_payment_date date,
  is_overdue boolean,
  purchase_apr numeric(6,3),
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, as_of)
);

-- ---------------------------------------------------------------------------
-- Operational tables
-- ---------------------------------------------------------------------------
create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  plaid_item_id uuid references plaid_items(id) on delete set null,
  trigger text not null default 'manual',     -- manual | cron | link
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',     -- running | ok | error
  added int not null default 0,
  modified int not null default 0,
  removed int not null default 0,
  categorized int not null default 0,
  error text
);

create table if not exists csv_imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  importer text not null,
  account_id uuid references accounts(id) on delete set null,
  file_hash text not null unique,
  row_count int not null default 0,
  inserted int not null default 0,
  skipped int not null default 0,
  imported_at timestamptz not null default now()
);

create table if not exists llm_cache (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  input_hash text not null,
  model text not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  unique (kind, input_hash)
);

create table if not exists analytics_cache (
  key text primary key,
  payload jsonb not null,
  computed_at timestamptz not null default now()
);

create table if not exists user_settings (
  id uuid primary key,                -- auth.users.id
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['plaid_items', 'accounts', 'merchants', 'transactions', 'securities', 'user_settings']
  loop
    execute format('drop trigger if exists %I_updated_at on %I', t, t);
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Analytics views
-- ---------------------------------------------------------------------------
-- Spend/income rows that analytics should see: posted, not transfers, not excluded, not superseded.
create or replace view v_ledger as
select
  t.*,
  c.parent_id as category_primary,
  coalesce(p.name, c.name) as category_primary_name,
  c.name as category_name,
  c.kind as category_kind,
  c.bucket as category_bucket,
  c.color as category_color,
  a.name as account_name,
  a.institution_name,
  a.kind as account_kind,
  a.card_id
from transactions t
join accounts a on a.id = t.account_id
left join categories c on c.id = t.category_id
left join categories p on p.id = c.parent_id
where t.pending = false
  and t.is_transfer = false
  and t.is_excluded = false
  and t.superseded_by is null
  and a.include_in_cash_flow = true;

create or replace view v_monthly_cash_flow as
select
  date_trunc('month', posted_date)::date as month,
  sum(case when amount > 0 and category_kind = 'income' then amount else 0 end) as income,
  sum(case when amount < 0 and category_kind = 'expense' then -amount else 0 end) as spending,
  sum(case when amount < 0 and category_kind = 'expense' and category_bucket = 'need' then -amount else 0 end) as needs,
  sum(case when amount < 0 and category_kind = 'expense' and category_bucket = 'want' then -amount else 0 end) as wants,
  count(*) as txn_count
from v_ledger
group by 1;

create or replace view v_net_worth_daily as
with days as (
  select distinct as_of from balance_snapshots
),
latest as (
  select d.as_of, a.id as account_id, a.kind,
    (select bs.current from balance_snapshots bs
      where bs.account_id = a.id and bs.as_of <= d.as_of
      order by bs.as_of desc limit 1) as current
  from days d cross join accounts a
  where a.include_in_net_worth
)
select
  as_of,
  sum(case when kind in ('depository', 'investment', 'other') then coalesce(current, 0) else 0 end) as assets,
  sum(case when kind in ('credit', 'loan') then coalesce(current, 0) else 0 end) as liabilities,
  sum(case when kind in ('depository', 'investment', 'other') then coalesce(current, 0) else 0 end)
    - sum(case when kind in ('credit', 'loan') then coalesce(current, 0) else 0 end) as net_worth,
  sum(case when kind = 'depository' then coalesce(current, 0) else 0 end) as cash,
  sum(case when kind = 'investment' then coalesce(current, 0) else 0 end) as invested
from latest
group by as_of
order by as_of;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'allowed_users', 'categories', 'plaid_items', 'cards', 'accounts', 'balance_snapshots',
    'merchants', 'transactions', 'category_rules', 'securities', 'holdings',
    'investment_transactions', 'security_prices', 'credit_statements', 'sync_runs',
    'csv_imports', 'llm_cache', 'analytics_cache', 'user_settings'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists owner_select on %I', t);
    execute format('create policy owner_select on %I for select to authenticated using (is_owner())', t);
  end loop;

  -- Tables the owner may edit from the browser (category fixes, config). Everything else is service-role only.
  foreach t in array array['transactions', 'merchants', 'category_rules', 'cards', 'accounts', 'securities', 'user_settings', 'categories'] loop
    execute format('drop policy if exists owner_insert on %I', t);
    execute format('drop policy if exists owner_update on %I', t);
    execute format('drop policy if exists owner_delete on %I', t);
    execute format('create policy owner_insert on %I for insert to authenticated with check (is_owner())', t);
    execute format('create policy owner_update on %I for update to authenticated using (is_owner()) with check (is_owner())', t);
    execute format('create policy owner_delete on %I for delete to authenticated using (is_owner())', t);
  end loop;
end $$;

-- Access tokens: never readable from the browser, even by the owner.
revoke select (access_token) on plaid_items from anon, authenticated;

-- Views run with the invoker's rights so RLS applies.
alter view v_ledger set (security_invoker = on);
alter view v_monthly_cash_flow set (security_invoker = on);
alter view v_net_worth_daily set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Seed: owner and cards
-- ---------------------------------------------------------------------------
insert into allowed_users (email) values ('jchen04@stanford.edu') on conflict do nothing;

insert into cards (id, name, issuer, network, reward_program, sort) values
  ('venmo-cc', 'Venmo Credit Card', 'Synchrony', 'Visa',
   '{"type":"auto_top_category","tiers":[0.03,0.02,0.01],"categories":["dining","travel","bills_utilities","health_beauty","grocery","gas","transportation","entertainment"],"program_version":"pre-2026-09-25"}', 1),
  ('usbank-smartly', 'U.S. Bank Smartly Visa', 'U.S. Bank', 'Visa',
   '{"type":"flat","base":0.02,"excluded":["education","gift_cards","insurance","tax","b2b"]}', 2),
  ('chase-prime', 'Prime Visa', 'Chase', 'Visa',
   '{"type":"fixed","base":0.01,"rates":{"amazon":0.05,"whole_foods":0.05,"chase_travel":0.05,"gas":0.02,"dining":0.02,"transit":0.02}}', 3),
  ('chase-cfu', 'Chase Freedom Unlimited', 'Chase', 'Visa',
   '{"type":"fixed","base":0.015,"rates":{"chase_travel":0.05,"dining":0.03,"drugstore":0.03}}', 4),
  ('discover-student', 'Discover it Student Cash Back', 'Discover', 'Discover',
   '{"type":"rotating","base":0.01,"bonus":0.05,"quarterly_cap":1500,"requires_activation":true,"calendar":{"2026Q1":["grocery","wholesale","streaming"],"2026Q2":["dining","home_improvement"],"2026Q3":["gas","ev_charging","transportation","drugstore"],"2026Q4":["entertainment","dining","bills_utilities"]},"cashback_match":false}', 5)
on conflict (id) do nothing;
