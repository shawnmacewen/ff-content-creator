alter table public.source_content
  add column if not exists key_takeaways text[] default '{}';

comment on column public.source_content.key_takeaways is 'Three reader-facing takeaways generated from the source title, body, summary/excerpt, and tags. Empty for sources without readable body text.';
