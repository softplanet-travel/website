-- SoftPlanet MVP follow-up schema. Review and apply in Supabase before enabling cloud sync.
create table if not exists trip_blocks (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, block_type text not null,
  status text not null default 'active' check (status in ('active','hidden')), created_at timestamptz default now(), updated_at timestamptz default now(), unique(trip_id, block_type)
);
create table if not exists expenses (
  expense_id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, expense_date date not null, trip_day integer,
  item_name text not null, category text not null, amount numeric not null, currency text not null,
  base_currency text not null, exchange_rate numeric not null, converted_amount numeric not null,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, total_budget numeric not null,
  currency text not null, category_budgets jsonb default '{}'::jsonb, created_at timestamptz default now(), updated_at timestamptz default now(), unique(trip_id)
);
create table if not exists custom_trip_items (
  custom_item_id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, country_id text not null, destination_id text not null,
  area_id text not null, item_type text not null, custom_name text not null, short_note varchar(100),
  google_map_url text, naver_map_url text, map_provider text, map_url text, official_match_id text,
  upgrade_status text default 'none' check (upgrade_status in ('none','available','accepted','dismissed')),
  created_at timestamptz default now(), updated_at timestamptz default now()
);
-- V1 custom cards use up to three platform-neutral reference links.
-- Existing Google/Naver columns remain readable during migration.
alter table custom_trip_items add column if not exists reference_links jsonb default '[]'::jsonb;
create table if not exists exchange_rates (
  id bigint generated always as identity primary key, base_currency text not null, target_currency text not null,
  rate numeric not null, rate_date date not null, updated_at timestamptz default now(), source text not null,
  unique(base_currency,target_currency,rate_date)
);
create table if not exists weather_cache (
  destination_id text primary key, weather_date date not null, payload jsonb not null,
  updated_at timestamptz default now(), source text not null
);

-- Member naming and travel money migration (2026-07-13).
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name varchar(20), display_name text, email text, avatar_url text,
  updated_at timestamptz default now()
);

create table if not exists trip_budgets (
  budget_id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_budget numeric not null, currency text not null,
  category_budgets jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(trip_id)
);

alter table expenses add column if not exists payment_method text default 'cash';
alter table expenses add column if not exists payment_source_id uuid;
alter table expenses add column if not exists expense_status text default 'paid';
alter table expenses add column if not exists short_note varchar(50);

create table if not exists payment_sources (
  payment_source_id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  wallet_type text not null check (wallet_type in ('cash','prepaid_payment','transit_balance')),
  currency text not null, initial_balance numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_payment_source_fk') then
    alter table expenses add constraint expenses_payment_source_fk
      foreign key (payment_source_id) references payment_sources(payment_source_id) on delete set null;
  end if;
end $$;

create table if not exists wallet_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  payment_source_id uuid not null references payment_sources(payment_source_id) on delete cascade,
  transaction_type text not null check (transaction_type in ('initial','top_up','adjustment')),
  amount numeric not null, currency text not null, transaction_date date not null,
  note varchar(50), balance_before numeric, balance_after numeric,
  created_at timestamptz default now()
);

-- Top-ups remain wallet transactions only. Actual purchases remain expenses only,
-- preventing the same travel consumption from being counted twice.
