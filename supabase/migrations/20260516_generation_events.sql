create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool text not null, -- 'generate-content' | 'echowrite'
  content_type text not null,
  success boolean not null default true,
  model text null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_generation_events_created_at on public.generation_events (created_at desc);
create index if not exists idx_generation_events_tool on public.generation_events (tool);
create index if not exists idx_generation_events_content_type on public.generation_events (content_type);
