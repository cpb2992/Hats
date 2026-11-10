-- WHOOP connection. Tokens live only on the server: RLS is on with no policies and the
-- app's roles have no grants, so only the Edge Functions (service role) can touch them.
create table if not exists public.whoop_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default now()
);
create table if not exists public.whoop_oauth_states (
  state text primary key check (length(state) = 8),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.whoop_tokens enable row level security;
alter table public.whoop_oauth_states enable row level security;
revoke all on public.whoop_tokens from anon, authenticated;
revoke all on public.whoop_oauth_states from anon, authenticated;
