-- GamePulse initial/bootstrap schema reference.
-- For a BRAND-NEW Supabase project only. Do not replay over the existing project.
-- This is the baseline represented by the initial SQL shared for this repository.
-- After applying this baseline, apply the migrations in ../migrations in order.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  normalized_title text not null,
  steam_app_id bigint unique,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_title),
  check (length(trim(title)) > 0)
);
create index if not exists idx_game_catalog_title on public.game_catalog (normalized_title);

create table if not exists public.tracked_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.game_catalog(id) on delete restrict,
  edition text not null default 'Standard',
  created_at timestamptz not null default now(),
  unique (user_id, game_id, edition),
  check (length(trim(edition)) > 0)
);
create index if not exists idx_tracked_games_user on public.tracked_games (user_id);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.game_catalog(id) on delete cascade,
  store text not null,
  product_url text not null,
  product_title text not null,
  edition text,
  currency text not null default 'INR',
  is_verified boolean not null default false,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (store, product_url),
  check (store in ('steam', 'gmg')),
  check (currency ~ '^[A-Z]{3}$')
);
create index if not exists idx_store_products_game on public.store_products (game_id);

create table if not exists public.price_history (
  id bigint generated always as identity primary key,
  store_product_id uuid not null references public.store_products(id) on delete cascade,
  price numeric(12, 2) not null,
  original_price numeric(12, 2),
  discount_percent numeric(5, 2),
  currency text not null default 'INR',
  recorded_at timestamptz not null default now(),
  check (price >= 0),
  check (original_price is null or original_price >= 0),
  check (discount_percent is null or discount_percent between 0 and 100),
  check (currency ~ '^[A-Z]{3}$')
);
create index if not exists idx_price_history_product_time
  on public.price_history (store_product_id, recorded_at desc);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  tracked_game_id uuid not null references public.tracked_games(id) on delete cascade,
  store text not null,
  alert_type text not null,
  target_price numeric(12, 2),
  minimum_discount numeric(5, 2),
  currency text not null default 'INR',
  is_enabled boolean not null default true,
  notify_on_first_listing boolean not null default false,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (store in ('steam', 'gmg', 'both')),
  check (alert_type in ('target_price', 'minimum_discount', 'first_listing')),
  check (target_price is null or target_price >= 0),
  check (minimum_discount is null or minimum_discount between 0 and 100),
  check (currency ~ '^[A-Z]{3}$'),
  check (
    (alert_type = 'target_price' and target_price is not null)
    or (alert_type = 'minimum_discount' and minimum_discount is not null)
    or (alert_type = 'first_listing' and notify_on_first_listing = true)
  )
);
create index if not exists idx_alert_rules_tracked_game on public.alert_rules (tracked_game_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.game_catalog enable row level security;
alter table public.tracked_games enable row level security;
alter table public.store_products enable row level security;
alter table public.price_history enable row level security;
alter table public.alert_rules enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Authenticated users can read game catalog" on public.game_catalog;
create policy "Authenticated users can read game catalog" on public.game_catalog for select to authenticated using (true);

drop policy if exists "Users can read own tracked games" on public.tracked_games;
create policy "Users can read own tracked games" on public.tracked_games for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "Users can add own tracked games" on public.tracked_games;
create policy "Users can add own tracked games" on public.tracked_games for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own tracked games" on public.tracked_games;
create policy "Users can update own tracked games" on public.tracked_games for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own tracked games" on public.tracked_games;
create policy "Users can delete own tracked games" on public.tracked_games for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can read store products" on public.store_products;
create policy "Authenticated users can read store products" on public.store_products for select to authenticated using (true);

drop policy if exists "Users can read prices for tracked games" on public.price_history;
create policy "Users can read prices for tracked games" on public.price_history for select to authenticated
using (exists (
  select 1 from public.store_products sp
  join public.tracked_games tg on tg.game_id = sp.game_id
  where sp.id = price_history.store_product_id and tg.user_id = (select auth.uid())
));

drop policy if exists "Users can read own alert rules" on public.alert_rules;
create policy "Users can read own alert rules" on public.alert_rules for select to authenticated
using (exists (select 1 from public.tracked_games tg
  where tg.id = alert_rules.tracked_game_id and tg.user_id = (select auth.uid())));
drop policy if exists "Users can add own alert rules" on public.alert_rules;
create policy "Users can add own alert rules" on public.alert_rules for insert to authenticated
with check (exists (select 1 from public.tracked_games tg
  where tg.id = alert_rules.tracked_game_id and tg.user_id = (select auth.uid())));
drop policy if exists "Users can update own alert rules" on public.alert_rules;
create policy "Users can update own alert rules" on public.alert_rules for update to authenticated
using (exists (select 1 from public.tracked_games tg
  where tg.id = alert_rules.tracked_game_id and tg.user_id = (select auth.uid())))
with check (exists (select 1 from public.tracked_games tg
  where tg.id = alert_rules.tracked_game_id and tg.user_id = (select auth.uid())));
drop policy if exists "Users can delete own alert rules" on public.alert_rules;
create policy "Users can delete own alert rules" on public.alert_rules for delete to authenticated
using (exists (select 1 from public.tracked_games tg
  where tg.id = alert_rules.tracked_game_id and tg.user_id = (select auth.uid())));

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tracked_games to authenticated;
grant select, insert, update, delete on public.alert_rules to authenticated;
grant select on public.game_catalog, public.store_products, public.price_history to authenticated;
