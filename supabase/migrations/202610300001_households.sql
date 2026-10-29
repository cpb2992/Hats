-- Family sharing: a household with an invite code, its members, and the things they share
-- (grocery list, dinner plan, family events, shared to-dos). Everything else stays private
-- in personal_state. Members only ever see their own household.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our home' check (char_length(name) between 1 and 60),
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{8}$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (user_id)
);

create table if not exists public.household_items (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null check (char_length(id) between 3 and 120),
  kind text not null check (kind in ('grocery', 'dinner', 'event', 'task')),
  payload jsonb not null check (pg_column_size(payload) < 20000),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (household_id, id)
);
create index if not exists household_items_since on public.household_items (household_id, updated_at);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_items enable row level security;
revoke all on public.households, public.household_members, public.household_items from anon;
revoke all on public.households, public.household_members from authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, insert, update on public.household_items to authenticated;

-- The caller's household (or null). Security definer so policies don't recurse.
create or replace function public.my_household()
returns uuid language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members where user_id = (select auth.uid())
$$;
revoke all on function public.my_household() from public, anon;
grant execute on function public.my_household() to authenticated;

create policy household_read on public.households for select to authenticated
  using (id = (select public.my_household()));
create policy members_read on public.household_members for select to authenticated
  using (household_id = (select public.my_household()));
create policy items_read on public.household_items for select to authenticated
  using (household_id = (select public.my_household()));
create policy items_insert on public.household_items for insert to authenticated
  with check (household_id = (select public.my_household()));
create policy items_update on public.household_items for update to authenticated
  using (household_id = (select public.my_household()))
  with check (household_id = (select public.my_household()));

-- Who changed it and when comes from the server, not the phone.
create or replace function public.household_item_stamp()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger household_item_stamp before insert or update on public.household_items
  for each row execute function public.household_item_stamp();

create or replace function public.new_invite_code()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;
revoke all on function public.new_invite_code() from public, anon, authenticated;

create or replace function public.create_household(p_name text, p_display text)
returns json language plpgsql security definer set search_path = '' as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;
  insert into public.households(name, invite_code, created_by)
    values (coalesce(nullif(trim(p_name), ''), 'Our home'), public.new_invite_code(), auth.uid())
    returning * into h;
  insert into public.household_members(household_id, user_id, display_name)
    values (h.id, auth.uid(), coalesce(nullif(trim(p_display), ''), 'Me'));
  return json_build_object('id', h.id, 'name', h.name, 'invite_code', h.invite_code);
end;
$$;

create or replace function public.join_household(p_code text, p_display text)
returns json language plpgsql security definer set search_path = '' as $$
declare h public.households;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_HOUSEHOLD';
  end if;
  select * into h from public.households where invite_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if h.id is null then raise exception 'NO_SUCH_CODE'; end if;
  insert into public.household_members(household_id, user_id, display_name)
    values (h.id, auth.uid(), coalesce(nullif(trim(p_display), ''), 'Me'));
  return json_build_object('id', h.id, 'name', h.name, 'invite_code', h.invite_code);
end;
$$;

create or replace function public.leave_household()
returns void language plpgsql security definer set search_path = '' as $$
declare hid uuid;
begin
  delete from public.household_members where user_id = auth.uid() returning household_id into hid;
  -- The last one out takes the shared things with them.
  if hid is not null and not exists (select 1 from public.household_members where household_id = hid) then
    delete from public.households where id = hid;
  end if;
end;
$$;

create or replace function public.rotate_invite_code()
returns text language plpgsql security definer set search_path = '' as $$
declare code text; hid uuid := public.my_household();
begin
  if hid is null then raise exception 'NOT_IN_HOUSEHOLD'; end if;
  code := public.new_invite_code();
  update public.households set invite_code = code where id = hid;
  return code;
end;
$$;

revoke all on function public.create_household(text, text), public.join_household(text, text),
  public.leave_household(), public.rotate_invite_code() from public, anon;
grant execute on function public.create_household(text, text), public.join_household(text, text),
  public.leave_household(), public.rotate_invite_code() to authenticated;
