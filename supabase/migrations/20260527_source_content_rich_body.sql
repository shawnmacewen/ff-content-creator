alter table public.source_content
  add column if not exists body_html text,
  add column if not exists body_xml text;

create index if not exists idx_source_content_body_html_present
  on public.source_content ((body_html is not null));

create index if not exists idx_source_content_body_xml_present
  on public.source_content ((body_xml is not null));
