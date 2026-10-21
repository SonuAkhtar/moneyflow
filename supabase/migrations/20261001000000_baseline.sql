create extension if not exists pgcrypto;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.account_type as enum ('bank', 'wallet', 'cash', 'card', 'savings');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.emi_status as enum ('active', 'closed', 'overdue');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.emi_kind as enum ('loan', 'sip');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  username text,
  full_name text not null default '',
  phone text,
  avatar_url text,
  currency text not null default 'INR',
  monthly_salary numeric(14, 2) not null default 0,
  savings_target numeric(14, 2) not null default 0,
  onboarding_complete boolean not null default false,
  streak_count integer not null default 0,
  major_account_id uuid,
  daily_account_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type public.account_type not null default 'savings',
  balance numeric(14, 2) not null default 0,
  institution text,
  color_tag text not null default '#4ece6e',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on public.accounts (user_id);

do $$ begin
  alter table public.profiles
    add constraint profiles_major_account_fk foreign key (major_account_id)
    references public.accounts (id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles
    add constraint profiles_daily_account_fk foreign key (daily_account_id)
    references public.accounts (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  note text,
  merchant text,
  is_big_expense boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);
create index if not exists transactions_account_id_idx on public.transactions (account_id);

create table if not exists public.emis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  name text not null,
  kind public.emi_kind not null default 'loan',
  start_month text not null default to_char(now(), 'YYYY-MM'),
  principal numeric(14, 2) not null default 0,
  monthly_amount numeric(14, 2) not null default 0,
  remaining_months integer not null default 0,
  total_months integer not null default 0,
  paid_months integer not null default 0,
  interest_rate numeric(6, 3) not null default 0,
  due_day integer not null default 1 check (due_day between 1 and 31),
  status public.emi_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists emis_user_id_idx on public.emis (user_id);

create table if not exists public.emi_payments (
  id uuid primary key default gen_random_uuid(),
  emi_id uuid not null references public.emis (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  month text not null,
  paid_on date,
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists emi_payments_user_id_idx on public.emi_payments (user_id);
create index if not exists emi_payments_emi_id_idx on public.emi_payments (emi_id);

create table if not exists public.borrowings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lender text not null,
  purpose text,
  amount numeric(14, 2) not null default 0,
  borrowed_on date not null default current_date,
  due_date date,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists borrowings_user_id_idx on public.borrowings (user_id);

create table if not exists public.borrowing_payments (
  id uuid primary key default gen_random_uuid(),
  borrowing_id uuid not null references public.borrowings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  paid_on date not null default current_date,
  amount numeric(14, 2) not null default 0,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists borrowing_payments_user_id_idx on public.borrowing_payments (user_id);
create index if not exists borrowing_payments_borrowing_id_idx
  on public.borrowing_payments (borrowing_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
drop trigger if exists emis_set_updated_at on public.emis;
create trigger emis_set_updated_at before update on public.emis
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, username, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(lower(new.raw_user_meta_data ->> 'username'), ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(uname text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(uname)
  );
$$;

create or replace function public.email_for_username(uname text)
returns text language sql stable security definer set search_path = '' as $$
  select email from public.profiles where lower(username) = lower(uname) limit 1;
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;
revoke execute on function public.email_for_username(text) from public, anon, authenticated;
grant execute on function public.email_for_username(text) to service_role;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.emis enable row level security;
alter table public.emi_payments enable row level security;
alter table public.borrowings enable row level security;
alter table public.borrowing_payments enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists accounts_own on public.accounts;
create policy accounts_own on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists transactions_own on public.transactions;
create policy transactions_own on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists emis_own on public.emis;
create policy emis_own on public.emis
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists emi_payments_own on public.emi_payments;
create policy emi_payments_own on public.emi_payments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.emis e
      where e.id = emi_id and e.user_id = (select auth.uid())
    )
  );

drop policy if exists borrowings_own on public.borrowings;
create policy borrowings_own on public.borrowings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists borrowing_payments_own on public.borrowing_payments;
create policy borrowing_payments_own on public.borrowing_payments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.borrowings b
      where b.id = borrowing_id and b.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
