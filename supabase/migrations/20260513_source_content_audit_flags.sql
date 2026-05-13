alter table source_content
  add column if not exists needs_update boolean not null default false,
  add column if not exists audit_note text,
  add column if not exists audit_marked_at timestamptz;
