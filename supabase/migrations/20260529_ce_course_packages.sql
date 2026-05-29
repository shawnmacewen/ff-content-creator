create table if not exists public.ce_course_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  objective text not null,
  description text not null default '',
  theme text not null default '',
  reading_list_summary text not null default '',
  core_themes text[] not null default '{}',
  source_content_ids uuid[] not null default '{}',
  reading_list jsonb not null default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  passing_score integer not null default 60,
  completion_notes text not null default '',
  status text not null default 'draft',
  package_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ce_course_packages_updated_at
  on public.ce_course_packages (updated_at desc);

create index if not exists idx_ce_course_packages_source_content_ids
  on public.ce_course_packages using gin (source_content_ids);

create index if not exists idx_ce_course_packages_theme
  on public.ce_course_packages (theme);

comment on table public.ce_course_packages is 'Saved CE Course Creator packages generated from selected source_content rows.';
comment on column public.ce_course_packages.questions is 'Generated and edited multiple-choice quiz questions, answer key, explanations, and source citations.';
comment on column public.ce_course_packages.package_payload is 'Full normalized CE course package payload for downstream export/API retrieval.';
