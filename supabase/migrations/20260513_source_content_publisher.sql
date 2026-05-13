alter table source_content
  add column if not exists publisher text;

create index if not exists idx_source_content_publisher on source_content(publisher);
