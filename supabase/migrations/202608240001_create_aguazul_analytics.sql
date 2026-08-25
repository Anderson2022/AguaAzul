create extension if not exists pgcrypto;

create table if not exists public.lead_records (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null unique,
  payload jsonb not null default '{}'::jsonb,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_records_last_seen_idx on public.lead_records (last_seen desc);
create index if not exists lead_records_source_idx on public.lead_records ((payload->>'source'));
create index if not exists lead_records_status_idx on public.lead_records ((payload->>'status'));
create index if not exists lead_records_geo_city_idx on public.lead_records ((payload->>'geoCity'));

alter table public.lead_records enable row level security;
revoke all on table public.lead_records from anon, authenticated;
grant select, insert, update, delete on table public.lead_records to service_role;

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  name text not null,
  status text,
  objective text,
  daily_budget numeric(14,2),
  target_cpa numeric(14,2),
  target_roas numeric(10,2),
  target_ctr numeric(10,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);

create table if not exists public.ad_metrics_daily (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  metric_date date not null,
  spend numeric(14,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  leads integer not null default 0,
  purchases integer not null default 0,
  conversion_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, metric_date)
);

alter table public.ad_campaigns enable row level security;
alter table public.ad_metrics_daily enable row level security;
revoke all on table public.ad_campaigns, public.ad_metrics_daily from anon, authenticated;
grant select, insert, update, delete on table public.ad_campaigns, public.ad_metrics_daily to service_role;
grant usage, select on all sequences in schema public to service_role;

