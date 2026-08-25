create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  account_name text,
  encrypted_credentials text not null,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integrations enable row level security;
revoke all on table public.integrations from anon, authenticated;
grant select, insert, update, delete on table public.integrations to service_role;

