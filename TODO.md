# TODO

## Deferred

- Revisit `data/content-samples-export.json` later and decide import path (JSON reimport script vs SQL seed ingestion).

- Roadmap: make the Generate Content "Tone" area contextual to the selected KIT/settings items:
  - Tone controls should adapt to the type of settings/KIT items selected instead of feeling generic.
  - The flow should feel more like a checkout/cart experience: users select desired content items, each item is added to a generation list, then users configure those items before generating.
  - Preserve this as a future UX/product task, not an immediate implementation request.

## Next Up (in progress)

- Evaluate "template-rendered text" vs "AI-rendered text in image" for enterprise use:
  - Template-rendered text (our current SlideCard HTML overlays) is better for compliance/control (easy review, predictable layout, can enforce disclaimers).
  - AI-rendered text directly in images can look more varied/organic, but is harder to QA and risks compliance (hallucinated claims, unreadable text, accidental logos).
  - Decide if we should support an experimental mode that asks `gpt-image-*` to render headlines/bullets, gated behind a compliance warning + review step.

- Export SlideCards as images for Instagram posting:
  - Export each slide as PNG (1080x1350)
  - Download all as ZIP
  - (Optional) save exports to Library/Generated Content

- Wire up Instagram API for basic posting (Graph API):
  - Server env: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_IG_USER_ID`
  - API route: create media container from image URL(s), then publish
  - Start with single-image post; extend to carousel (children containers)

- Replace generated-content localStorage flow with Supabase-backed APIs and UI wiring:
  - Add `/api/generated-content` CRUD routes
  - Move save/edit/delete/list from `lib/storage/local-storage.ts` to API calls
  - Keep existing UI behavior while swapping storage backend
