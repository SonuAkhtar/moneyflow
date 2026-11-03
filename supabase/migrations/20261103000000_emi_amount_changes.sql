alter table public.emis
  add column if not exists amount_changes jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.emis add constraint emis_amount_changes_array
    check (jsonb_typeof(amount_changes) = 'array') not valid;
exception when duplicate_object then null;
end $$;
