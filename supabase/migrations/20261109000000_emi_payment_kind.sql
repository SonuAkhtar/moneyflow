alter table public.emi_payments
  add column if not exists kind text not null default 'emi';

do $$
begin
  alter table public.emi_payments add constraint emi_payments_kind_check
    check (kind in ('emi', 'extra'));
exception when duplicate_object then null;
end $$;

do $$ begin
  if exists (
    select 1 from public.emi_payments
    where kind = 'emi'
    group by emi_id, month having count(*) > 1
  ) then
    raise notice 'emi_payments has duplicate (emi_id, month) rows; unique index not changed';
  else
    drop index if exists public.emi_payments_emi_month_key;
    create unique index if not exists emi_payments_emi_month_key
      on public.emi_payments (emi_id, month) where kind = 'emi';
  end if;
end $$;
