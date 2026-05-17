# Instagram Carousel 2.0 — Prompt Progress Log

This doc tracks the working prompt(s) for Instagram Carousel 2.0 masterplate generation so we can iterate safely and roll back if needed.

> Note: The “final prompt sent” is a combination of user input + system-controlled instructions appended in the client.

---

## Version 2 (best results so far) — 2026-05-17

This version reflects the current Carousel v2.0 implementation:
- Supports **2–10 slides** by generating multiple 1536×512 masterplates (3 slides per plate)
- Adds overlap-zone rules
- Strong “no numbering” directive
- Includes non-final vs final slide CTA rules
- Supports cohesion via either prompt-only continuation or image-reference continuation (image edits)

### User input (topic)

Example default topic:

```
Canadian housing market
```

### System-controlled prompt wrapper

```
Create an Instagram carousel of {totalSlides} slides about {topic} from the lens of a financial advisor.
```

### Per-masterplate injected lines

#### Slide range

```
This masterplate represents carousel slides {slideStart}–{slideEnd} (inclusive).
```

#### Panel map + unused panel rule

Slot map format:

```
Panel 1 (x=0..512) = slide {slideStart} | Panel 2 (x=512..1024) = slide {slideStart+1 or UNUSED} | Panel 3 (x=1024..1536) = slide {slideStart+2 or UNUSED}
```

If the last plate is partial:

```
UNUSED PANEL RULE: This masterplate has only {slotsUsed} real slide(s). Any UNUSED panel(s) must contain ONLY seamless background/texture/visual continuation with NO readable text, NO CTA, and NO new messaging. ({slotMap})
```

Otherwise:

```
PANEL MAP: {slotMap}
```

#### Outro vs non-final plate rules

Final-plate (includes final slide):

```
OUTRO REQUIREMENT: Make slide {totalSlides} (the FINAL slide of the entire carousel) a strong closing slide with a clear CTA and summary bullets. Do not create any other outro/CTA on earlier slides.
```

Non-final plates:

```
NON-FINAL PLATE RULE: These slides are NOT the end of the carousel. Do NOT include any outro, conclusion language, "wrap-up", or CTA on slides {slideStart}–{slideEnd}. Save the CTA for the final slide {totalSlides}.
```

#### Continuation rules (cohesion method)

Prompt Based Cohesion (plate 2+):

```
CONTINUATION REQUIREMENT: Continue seamlessly from the previous masterplate. Maintain the same visual universe, illustration style, typography treatment, colour palette, lighting direction, composition, and financial-advisor tone. The left edge of this new masterplate should visually continue from the right edge of the previous masterplate, as if the carousel is moving left-to-right through one connected visual story.
```

Image Reference Cohesion (plate 2+):

```
IMAGE-REFERENCE CONTINUATION REQUIREMENT: Use the provided reference image ONLY to match the visual universe (style, palette, typography treatment, lighting direction, rendering style) and to align the left edge continuation zone with the previous masterplate’s right edge. Do NOT copy/paste or recreate the exact same scene/scenery. Create a NEW composition and new background details that feel like the next moment/location in the same story/world. Change camera framing slightly (pan/zoom/angle), introduce new background elements, and vary the scenery while keeping seamless edge continuity and consistent art direction.
```

### System-controlled appended spec (masterplate layout)

```
CAROUSEL MASTERPLATE LAYOUT REQUIREMENTS (do not mention these requirements explicitly):
Canvas: 1536x512 (3:1 landscape).
Split into exactly THREE equal square panels arranged LEFT-TO-RIGHT (each panel = 512x512).
CRITICAL: there must be NO gutters and NO padding between panels, so the image can be cropped deterministically at x=0..512, 512..1024, 1024..1536.
SEAMLESS REQUIREMENT: treat the full 1536x512 as ONE continuous panorama/scene. The background, lighting, color palette, texture, and horizon lines must flow smoothly across the 512px boundaries.
Do NOT add borders, frames, separators, hard edges, or visible seams at the panel boundaries.
Avoid placing faces, key objects, or readable text on or near the seam lines (x≈512 and x≈1024).
OVERLAP ZONE REQUIREMENT: Reserve a soft 20–40px continuation zone at the far left edge and far right edge of the masterplate. Do not place critical text in these edge zones; use them only for background/texture/colour flow/horizon/motion/environmental continuation.
NO NUMBERING: Do NOT render any explicit slide numbering, counters, fractions, or sequence markers anywhere (no "1/3", no "Slide 1", no "1.", no "1 of 10", no digits used as counters).
Text is allowed (headline + short bullets + CTA), but must be large, high-contrast, and fully contained within a single panel (do not straddle boundaries).
No logos or watermarks.
```

### Notes
- This version produced the best overall cohesion/quality so far.
- Remaining failure modes: occasional numeric counters still slip through; image-reference cohesion can overfit and repeat scenery.

---

## Version 1 (initial working) — 2026-05-17

### User prompt (default)

```
Create a set of 3 Instagram carousel posts about the Canadian housing market from the lens of a financial advisor.
```

### System-controlled appended spec (Carousel masterplate)

```
CAROUSEL MASTERPLATE LAYOUT REQUIREMENTS (do not mention these requirements explicitly):
Canvas: 1536x512 (3:1 landscape).
Split into exactly THREE equal square panels arranged LEFT-TO-RIGHT (each panel = 512x512).
CRITICAL: there must be NO gutters and NO padding between panels, so the image can be cropped deterministically at x=0..512, 512..1024, 1024..1536.
SEAMLESS REQUIREMENT: treat the full 1536x512 as ONE continuous panorama/scene. The background, lighting, color palette, texture, and horizon lines must flow smoothly across the 512px boundaries.
Do NOT add borders, frames, separators, hard edges, or visible seams at the panel boundaries.
Avoid placing faces, key objects, or readable text on or near the seam lines (x≈512 and x≈1024).
Text is allowed (headline + short bullets + CTA), but must be large, high-contrast, and fully contained within a single panel (do not straddle boundaries).
No logos or watermarks.
```

### Notes
- Target masterplate size: **1536×512**
- Crop strategy: 3 x-slices at **x=0..512**, **512..1024**, **1024..1536**
- Goal: 3-panel seamless panorama with optional per-panel copy.
