create table if not exists source_sync_logs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  mode text not null,
  page integer not null,
  offset integer not null default 0,
  fetched integer not null default 0,
  normalized integer not null default 0,
  publisher_matched integer not null default 0,
  date_matched integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  elapsed_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_source_sync_logs_created_at on source_sync_logs(created_at desc);
create index if not exists idx_source_sync_logs_run_id on source_sync_logs(run_id);
