-- TWIGA prototype schema. Run once in the Supabase SQL editor.
-- All tables are organization-scoped. RLS is ON with no policies: only the server (service-role key) can read/write.
create extension if not exists pgcrypto;

create table if not exists organizations (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null, phone text not null, email text, company text, tags text, notes text,
  consent_status text not null default 'unknown' check (consent_status in ('unknown','granted','opted_out')),
  consent_source text, consent_at timestamptz, preferred_time text,
  created_at timestamptz default now(), unique (organization_id, phone));

create table if not exists agents (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name text not null, description text, system_prompt text, greeting text, language text default 'en', voice_id text,
  enabled boolean not null default true, created_at timestamptz default now());

create table if not exists knowledge (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  title text not null, content text not null, category text, created_at timestamptz default now());

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  name text not null, description text, agent_id uuid references agents(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','running','paused','completed','cancelled','failed')),
  start_at timestamptz, timezone text default 'Africa/Nairobi', max_calls_per_hour int default 30, max_concurrent int default 2, max_retries int default 2,
  created_at timestamptz default now());

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null, phone text, agent_id uuid references agents(id) on delete set null,
  scheduled_at timestamptz not null, priority text default 'normal' check (priority in ('low','normal','high')),
  instructions text, source text default 'manual', status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_at timestamptz default now());

create table if not exists calls (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')), status text not null default 'in_progress' check (status in ('in_progress','completed','missed','failed')),
  from_number text, to_number text, contact_id uuid references contacts(id) on delete set null, agent_id uuid references agents(id) on delete set null,
  started_at timestamptz default now(), ended_at timestamptz, duration_seconds int, outcome text, transcript jsonb default '[]'::jsonb);
create index if not exists calls_org_started on calls (organization_id, started_at desc);

alter table organizations enable row level security; alter table contacts enable row level security; alter table agents enable row level security;
alter table knowledge enable row level security; alter table campaigns enable row level security; alter table follow_ups enable row level security; alter table calls enable row level security;

-- one organization for the prototype; copy its id into TWIGA_ORG_ID
insert into organizations (name) select 'My Business' where not exists (select 1 from organizations);
select id, name from organizations;
