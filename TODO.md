# TODO

## Deferred

- Revisit `data/content-samples-export.json` later and decide import path (JSON reimport script vs SQL seed ingestion).

- Roadmap: make the Generate Content "Tone" area contextual to the selected KIT/settings items:
  - Tone controls should adapt to the type of settings/KIT items selected instead of feeling generic.
  - The flow should feel more like a checkout/cart experience: users select desired content items, each item is added to a generation list, then users configure those items before generating.
  - Preserve this as a future UX/product task, not an immediate implementation request.

- Roadmap: save default writing options as part of reusable Brand Profiles:
  - Include tone, audience, plain-language preference, call-to-action preference, and any default generation notes in the Brand Profile data model.
  - When a user selects a saved Brand Profile, Creative Direction should restore those writing defaults along with visual/style guidance.
  - This should make partner profiles feel like complete generation defaults, not only color/logo/style rules.

## Next Up (in progress)

- Track Personalized PDF Rendering / newsletter PDF output as a Product Lab prototype:
  - Continue the dedicated `/personalized-pdf-renderer` experimental page that turns selected API/feed content into a personalized newsletter-style PDF preview.
  - Use the two preferred Advisor Portal screenshots as the visual target and compare against the AdvisorStream example customers like less.
  - Capture source content fields, advisor/customer personalization fields, compliance/disclaimer space, layout density, typography, and PDF export requirements before implementing production wiring.
  - Keep the first pass separate from Generate/Library until the team can visually judge the renderer against the screenshots.

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
