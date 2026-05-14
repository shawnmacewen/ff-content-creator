alter table public.source_content
  add column if not exists content_designation text,
  add column if not exists categories text[] default '{}'::text[],
  add column if not exists sub_categories text[] default '{}'::text[],
  add column if not exists bas_content_id text,
  add column if not exists bas_content_filename text,
  add column if not exists content_format text,
  add column if not exists finra_letter_url text,
  add column if not exists finra_approved boolean,
  add column if not exists ap_content_type text,
  add column if not exists evergreen boolean;

create index if not exists idx_source_content_content_designation on public.source_content (content_designation);
create index if not exists idx_source_content_bas_content_id on public.source_content (bas_content_id);
create index if not exists idx_source_content_bas_content_filename on public.source_content (bas_content_filename);
create index if not exists idx_source_content_content_format on public.source_content (content_format);
create index if not exists idx_source_content_finra_approved on public.source_content (finra_approved);
create index if not exists idx_source_content_ap_content_type on public.source_content (ap_content_type);
create index if not exists idx_source_content_evergreen on public.source_content (evergreen);

create index if not exists idx_source_content_categories_gin on public.source_content using gin (categories);
create index if not exists idx_source_content_sub_categories_gin on public.source_content using gin (sub_categories);
