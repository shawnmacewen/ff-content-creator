alter table public.source_content
  add column if not exists body_text text,
  add column if not exists body_format text not null default 'plain';

update public.source_content
set
  body_text = coalesce(nullif(body_text, ''), nullif(body, '')),
  body_format = case
    when body_xml is not null and body_xml <> '' then 'xml'
    else coalesce(nullif(body_format, ''), 'plain')
  end
where body_text is null
   or body_text = ''
   or body_format is null
   or body_format = '';

create index if not exists idx_source_content_body_text_fts
  on public.source_content using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, body, '')));

comment on column public.source_content.body_text is 'Canonical cleaned plain-text body used by app reads, generation, search, and audit.';
comment on column public.source_content.body_format is 'Format of retained rich body column: plain, xml, or provider-specific.';
