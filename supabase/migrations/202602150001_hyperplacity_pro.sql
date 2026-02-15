-- Hyperplacity AI Workers Pro schema
-- Includes WhatsApp sessions, encrypted AI manager settings, workflow nodes, and bugtracker.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  whatsapp_number text,
  ai_keys text, -- encrypted JSON payload (AES/GCM from application layer)
  global_prompt text default 'You are a luxurious web designer focused on premium experiences.',
  creativity_temp numeric(2,1) default 0.6 check (creativity_temp >= 0.2 and creativity_temp <= 1.0),
  tone_preset text default 'luxury-brand',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id text not null references public.workflows (id) on delete cascade,
  type text not null check (type in ('manager', 'programmer', 'code')),
  code_snippet jsonb,
  tests_passed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bugtracks (
  id uuid primary key default gen_random_uuid(),
  workflow_id text not null references public.workflows (id) on delete cascade,
  node_id text not null,
  errors jsonb not null default '{}'::jsonb,
  fixed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_data jsonb not null default '{}'::jsonb,
  linked_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id text not null references public.workflows (id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.workflows enable row level security;
alter table public.nodes enable row level security;
alter table public.bugtracks enable row level security;
alter table public.whatsapp_sessions enable row level security;
alter table public.audit_log enable row level security;

-- Users can only view/update their own encrypted AI keys and WhatsApp fields.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select using (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists workflows_owner_all on public.workflows;
create policy workflows_owner_all on public.workflows
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists nodes_owner_all on public.nodes;
create policy nodes_owner_all on public.nodes
for all
using (
  exists (
    select 1 from public.workflows w
    where w.id = nodes.workflow_id and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workflows w
    where w.id = nodes.workflow_id and w.user_id = auth.uid()
  )
);

drop policy if exists bugtracks_owner_all on public.bugtracks;
create policy bugtracks_owner_all on public.bugtracks
for all
using (
  exists (
    select 1 from public.workflows w
    where w.id = bugtracks.workflow_id and w.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workflows w
    where w.id = bugtracks.workflow_id and w.user_id = auth.uid()
  )
);

drop policy if exists whatsapp_sessions_owner_all on public.whatsapp_sessions;
create policy whatsapp_sessions_owner_all on public.whatsapp_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists audit_owner_read on public.audit_log;
create policy audit_owner_read on public.audit_log
for select
using (auth.uid() = user_id);

drop policy if exists audit_owner_insert on public.audit_log;
create policy audit_owner_insert on public.audit_log
for insert
with check (auth.uid() = user_id);

create index if not exists idx_workflows_user_id on public.workflows (user_id);
create index if not exists idx_bugtracks_workflow_id on public.bugtracks (workflow_id);
create index if not exists idx_whatsapp_sessions_user_id on public.whatsapp_sessions (user_id);
