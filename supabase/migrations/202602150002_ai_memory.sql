-- Lightweight memory vault for AI worker context/state.

create table if not exists public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workflow_id text not null default '',
  namespace text not null default 'general',
  key text not null,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workflow_id, namespace, key)
);

alter table public.ai_memory enable row level security;

drop policy if exists ai_memory_owner_all on public.ai_memory;
create policy ai_memory_owner_all on public.ai_memory
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_ai_memory_user_id on public.ai_memory (user_id);
create index if not exists idx_ai_memory_workflow on public.ai_memory (workflow_id);
