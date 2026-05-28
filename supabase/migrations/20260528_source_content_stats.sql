create table if not exists public.source_content_stats (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);

comment on table public.source_content_stats is 'Cached derived source-content stats used to avoid page-load scans of source_content.';
comment on column public.source_content_stats.key is 'Stats key, for example source_filters or source_summary.';
comment on column public.source_content_stats.value is 'Cached JSON payload for the stats key.';
comment on column public.source_content_stats.refreshed_at is 'When this cached stats payload was refreshed.';
