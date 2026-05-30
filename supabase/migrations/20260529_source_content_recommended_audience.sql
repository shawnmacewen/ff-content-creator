alter table public.source_content
  add column if not exists recommended_audience text;

comment on column public.source_content.recommended_audience is 'One short phrase describing the recommended audience for advisory teams or marketing users considering this source content.';
