create extension if not exists pgcrypto;

create table if not exists source_content (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  source_system text,
  type text not null,
  title text not null,
  body text not null,
  author text,
  tags text[] default '{}',
  published_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_content_type on source_content(type);
create index if not exists idx_source_content_tags on source_content using gin(tags);
create index if not exists idx_source_content_title_body_fts on source_content using gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,'')));

create table if not exists generated_content (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  content text not null,
  source_content_ids uuid[] default '{}',
  prompt text,
  tone text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_content_versions (
  id uuid primary key default gen_random_uuid(),
  generated_content_id uuid not null references generated_content(id) on delete cascade,
  content text not null,
  note text,
  created_at timestamptz not null default now()
);
