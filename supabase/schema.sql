-- moneyFlow — Supabase schema
-- Run in the Supabase SQL editor. Enables RLS on every user-owned table.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type transaction_type as enum ('income', 'expense', 'transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_type as enum ('bank', 'wallet', 'cash', 'card', 'savings');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('active', 'completed', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type emi_status as enum ('active', 'closed', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_cycle as enum ('weekly', 'monthly', 'quarterly', 'yearly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insight_type as enum ('saving','overspending','budgeting','prediction','optimization','alert','summary');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insight_severity as enum ('positive','neutral','warning','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('alert','reminder','achievement','digest','system');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  currency text not null default 'USD',
  monthly_salary numeric(14,2) not null default 0,
  savings_target numeric(14,2) not null default 0,
  onboarding_complete boolean not null default false,
  streak_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Accounts ----------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type account_type not null default 'bank',
  balance numeric(14,2) not null default 0,
  institution text,
  color_tag text not null default '#c6f432',
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  type transaction_type not null,
  amount numeric(14,2) not null check (amount >= 0),
  category text not null,
  note text,
  merchant text,
  is_big_expense boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, occurred_at desc);

-- ---------- EMIs ----------
create table if not exists public.emis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  name text not null,
  principal numeric(14,2) not null default 0,
  monthly_amount numeric(14,2) not null default 0,
  remaining_months int not null default 0,
  total_months int not null default 0,
  interest_rate numeric(6,2) not null default 0,
  due_day int not null default 1,
  status emi_status not null default 'active',
  created_at timestamptz not null default now()
);

-- ---------- Budgets ----------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  "limit" numeric(14,2) not null default 0,
  spent numeric(14,2) not null default 0,
  month text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category, month)
);

-- ---------- Saving goals ----------
create table if not exists public.saving_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  target_amount numeric(14,2) not null default 0,
  saved_amount numeric(14,2) not null default 0,
  deadline timestamptz,
  status goal_status not null default 'active',
  color_tag text not null default '#57b8ff',
  created_at timestamptz not null default now()
);

-- ---------- Subscriptions ----------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric(14,2) not null default 0,
  cycle subscription_cycle not null default 'monthly',
  category text not null default 'subscriptions',
  next_charge_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- AI insights ----------
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type insight_type not null,
  severity insight_severity not null default 'neutral',
  title text not null,
  body text not null,
  metric numeric(14,2),
  created_at timestamptz not null default now()
);

-- ---------- Monthly summaries ----------
create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  income numeric(14,2) not null default 0,
  expenses numeric(14,2) not null default 0,
  saved numeric(14,2) not null default 0,
  carried_forward numeric(14,2) not null default 0,
  health_score int not null default 0,
  health_band text not null default 'fair',
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

-- ---------- Notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Row level security ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','accounts','transactions','emis','budgets',
    'saving_goals','subscriptions','ai_insights','monthly_summaries','notifications'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles use id = auth.uid(); other tables use user_id = auth.uid()
create policy "profiles self access" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','transactions','emis','budgets',
    'saving_goals','subscriptions','ai_insights','monthly_summaries','notifications'
  ]
  loop
    execute format(
      'create policy "%1$s owner access" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
