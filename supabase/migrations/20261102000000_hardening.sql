alter function public.set_updated_at() set search_path = '';

-- Profiles: users may only edit their own app settings. email and username are
-- owned by auth (email_for_username trusts profiles.email).
revoke update on public.profiles from authenticated;
grant update (
  full_name, phone, avatar_url, currency, monthly_salary, savings_target,
  onboarding_complete, streak_count, major_account_id, daily_account_id
) on public.profiles to authenticated;

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Repair any email that was rewritten through the old table-wide grant.
update public.profiles p set email = u.email
from auth.users u
where u.id = p.id and u.email is not null and p.email is distinct from u.email;

-- Referenced accounts must belong to the same user.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (major_account_id is null or exists (
      select 1 from public.accounts a
      where a.id = major_account_id and a.user_id = (select auth.uid())
    ))
    and (daily_account_id is null or exists (
      select 1 from public.accounts a
      where a.id = daily_account_id and a.user_id = (select auth.uid())
    ))
  );

drop policy if exists emis_own on public.emis;
create policy emis_own on public.emis
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    ))
  );

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
    and (account_id is null or exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    ))
  );

create index if not exists emis_account_id_idx on public.emis (account_id);
create index if not exists emi_payments_account_id_idx on public.emi_payments (account_id);
create index if not exists profiles_major_account_id_idx on public.profiles (major_account_id);
create index if not exists profiles_daily_account_id_idx on public.profiles (daily_account_id);

-- Skipped (with a notice) rather than deleting user data when duplicates exist.
do $$ begin
  if exists (
    select 1 from public.emi_payments group by emi_id, month having count(*) > 1
  ) then
    raise notice 'emi_payments has duplicate (emi_id, month) rows; unique index not created';
  else
    create unique index if not exists emi_payments_emi_month_key
      on public.emi_payments (emi_id, month);
  end if;
end $$;

-- NOT VALID: enforced for new writes without blocking on existing rows.
do $$
declare
  c record;
begin
  for c in select * from (values
    ('profiles', 'profiles_username_format',
      $c$username is null or username ~ '^[a-z0-9_]{3,20}$'$c$),
    ('profiles', 'profiles_amounts_nonneg',
      'monthly_salary >= 0 and savings_target >= 0'),
    ('profiles', 'profiles_full_name_len', 'char_length(full_name) <= 200'),
    ('accounts', 'accounts_name_len', 'char_length(name) <= 200'),
    ('transactions', 'transactions_text_len',
      'char_length(note) <= 500 and char_length(merchant) <= 200'),
    ('emis', 'emis_amounts_nonneg',
      'principal >= 0 and monthly_amount >= 0 and interest_rate >= 0'),
    ('emis', 'emis_months_nonneg',
      'total_months >= 0 and paid_months >= 0 and remaining_months >= 0'),
    ('emis', 'emis_start_month_format', $c$start_month ~ '^\d{4}-\d{2}$'$c$),
    ('emis', 'emis_name_len', 'char_length(name) <= 200'),
    ('emi_payments', 'emi_payments_amount_nonneg', 'amount >= 0'),
    ('emi_payments', 'emi_payments_month_format', $c$month ~ '^\d{4}-\d{2}$'$c$),
    ('borrowings', 'borrowings_amount_nonneg', 'amount >= 0'),
    ('borrowings', 'borrowings_text_len',
      'char_length(lender) <= 200 and char_length(purpose) <= 500 and char_length(note) <= 500'),
    ('borrowing_payments', 'borrowing_payments_amount_nonneg', 'amount >= 0'),
    ('borrowing_payments', 'borrowing_payments_note_len', 'char_length(note) <= 500')
  ) as t(tbl, name, expr) loop
    begin
      execute format('alter table public.%I add constraint %I check (%s) not valid',
        c.tbl, c.name, c.expr);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Avatars: served through public URLs, which don't need a select policy.
-- Owners still need select for list() and upsert.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_owner_read on storage.objects;
create policy avatars_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Balance changes: one ledger row per client op makes replays no-ops.
create table if not exists public.balance_ops (
  op_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists balance_ops_user_id_idx on public.balance_ops (user_id);
create index if not exists balance_ops_account_id_idx on public.balance_ops (account_id);
alter table public.balance_ops enable row level security;
revoke all on public.balance_ops from anon, authenticated;
grant select, insert on public.balance_ops to authenticated;

drop policy if exists balance_ops_own on public.balance_ops;
create policy balance_ops_own on public.balance_ops
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.accounts a
      where a.id = account_id and a.user_id = (select auth.uid())
    )
  );

-- Returns the new balance, the current one if p_op_id was already applied,
-- or null when the account isn't the caller's.
create or replace function public.adjust_balance(
  p_account_id uuid, p_delta numeric, p_op_id uuid
)
returns numeric language plpgsql security invoker set search_path = '' as $$
declare
  v_balance numeric;
begin
  if not exists (
    select 1 from public.accounts
    where id = p_account_id and user_id = (select auth.uid())
  ) then
    return null;
  end if;
  insert into public.balance_ops (op_id, user_id, account_id)
  values (p_op_id, (select auth.uid()), p_account_id)
  on conflict (op_id) do nothing;
  if found then
    update public.accounts set balance = balance + p_delta
    where id = p_account_id and user_id = (select auth.uid())
    returning balance into v_balance;
  else
    select balance into v_balance from public.accounts
    where id = p_account_id and user_id = (select auth.uid());
  end if;
  return v_balance;
end $$;

revoke execute on function public.adjust_balance(uuid, numeric, uuid) from public, anon;
grant execute on function public.adjust_balance(uuid, numeric, uuid) to authenticated;

-- Rate limits shared by all server instances; only the service role may hit them.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Returns 0 when allowed, otherwise the seconds until the window resets.
create or replace function public.hit_rate_limit(
  p_key text, p_max integer, p_window_seconds integer
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then excluded.reset_at else r.reset_at end
  returning count, reset_at into v_count, v_reset;
  -- Occasionally prune expired windows so the table stays small.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now();
  end if;
  if v_count <= p_max then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from v_reset - now())))::integer;
end $$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
