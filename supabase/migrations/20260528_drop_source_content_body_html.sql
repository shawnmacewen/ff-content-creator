drop index if exists public.idx_source_content_body_html_present;

alter table public.source_content
  drop column if exists body_html;
