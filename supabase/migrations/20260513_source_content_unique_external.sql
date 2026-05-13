-- Prevent duplicate provider/sample records by logical external identity
create unique index if not exists ux_source_content_source_external
  on source_content(source_system, external_id)
  where external_id is not null and source_system is not null;
