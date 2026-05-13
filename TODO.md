# TODO

## Deferred

- Revisit `data/content-samples-export.json` later and decide import path (JSON reimport script vs SQL seed ingestion).

## Next Up (in progress)

- Replace generated-content localStorage flow with Supabase-backed APIs and UI wiring:
  - Add `/api/generated-content` CRUD routes
  - Move save/edit/delete/list from `lib/storage/local-storage.ts` to API calls
  - Keep existing UI behavior while swapping storage backend
