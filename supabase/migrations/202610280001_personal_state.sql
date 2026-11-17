-- One private snapshot per authenticated owner. No service-role key belongs in the app.
create table if not exists public.personal_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1,
  payload jsonb not null check (payload->>'version' = '2'),
  updated_at timestamptz not null default now()
);
alter table public.personal_state enable row level security;
revoke all on public.personal_state from anon;
grant select, insert, update on public.personal_state to authenticated;
create policy personal_owner_read on public.personal_state for select to authenticated using ((select auth.uid()) = user_id);
create policy personal_owner_insert on public.personal_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy personal_owner_update on public.personal_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.save_personal_state(p_expected bigint, p_payload jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_payload->>'version' is distinct from '2' then raise exception 'Unsupported data version'; end if;
  if p_expected = 0 then
    insert into public.personal_state(user_id, revision, payload)
      values(auth.uid(), 1, p_payload) on conflict do nothing returning revision into next_revision;
  else
    update public.personal_state set revision = revision + 1, payload = p_payload, updated_at = now()
      where user_id = auth.uid() and revision = p_expected returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'SYNC_CONFLICT'; end if;
  return next_revision;
end;
$$;
revoke all on function public.save_personal_state(bigint,jsonb) from public, anon;
grant execute on function public.save_personal_state(bigint,jsonb) to authenticated;
