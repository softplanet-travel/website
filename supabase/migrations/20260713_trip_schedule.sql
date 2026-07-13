alter table if exists public.trips
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists status text not null default 'planning',
  add column if not exists base_currency text not null default 'TWD';

create table if not exists public.trip_items (
  trip_item_id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null default 'place',
  item_id text,
  custom_item_id uuid,
  guide_id uuid,
  item_name text not null,
  trip_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer,
  display_order integer not null default 0,
  note text check (char_length(note) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.trip_items enable row level security;
drop policy if exists "trip_items_owner_all" on public.trip_items;
create policy "trip_items_owner_all" on public.trip_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists trip_items_trip_date_order_idx on public.trip_items (trip_id, trip_date, start_time, display_order);
