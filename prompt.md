# Instagram Carousel v2.0 — Prompt (Rollback Reference)

This file captures the **exact prompt architecture** used for our best results so far, including the system-controlled instructions and the per-masterplate prompt template.

Last updated: 2026-05-17

---

## Overview

We generate a carousel by batching into **3:1 masterplates**:
- Masterplate size: **1536×512**
- Each masterplate yields up to **3 slides** (cropped into **512×512** squares)
- Carousels support **2–10 slides** via multiple masterplates.

Cohesion strategies:
- **Prompt Based Cohesion**: text-only continuation instructions.
- **Image Reference Cohesion**: for plate 2+, send a prior masterplate image back as a reference (image edits) and use special continuation language to prevent direct scene duplication.

---

## User-controlled input

### Topic (user input)

Examples:
- `Canadian housing market`
- `interest rates in Canada`
- `TFSA vs RRSP`

---

## System-controlled global prompt parts

### System suffix

```
from the lens of a financial advisor.
```

### Masterplate layout spec (appended to every masterplate prompt)

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

---

## Per-masterplate prompt template (exact structure)

For a carousel with totalSlides = **N** (2–10), and for a given masterplate with `slideStart..slideEnd`:

### 1) System prefix + topic + suffix (system-controlled wrapper)

```
Create an Instagram carousel of {totalSlides} slides about {topic} from the lens of a financial advisor.
```

### 2) Slide range line

```
This masterplate represents carousel slides {slideStart}–{slideEnd} (inclusive).
```

### 3) Panel map + unused panel rule

Panel map format:

```
Panel 1 (x=0..512) = slide {slideStart} | Panel 2 (x=512..1024) = slide {slideStart+1 or UNUSED} | Panel 3 (x=1024..1536) = slide {slideStart+2 or UNUSED}
```

If the final masterplate is partial (only 1–2 real slides), we inject:

```
UNUSED PANEL RULE: This masterplate has only {slotsUsed} real slide(s). Any UNUSED panel(s) must contain ONLY seamless background/texture/visual continuation with NO readable text, NO CTA, and NO new messaging. ({slotMap})
```

Otherwise:

```
PANEL MAP: {slotMap}
```

### 4) Outro rule (always present)

If this masterplate includes the final slide:

```
OUTRO REQUIREMENT: Make slide {totalSlides} (the FINAL slide of the entire carousel) a strong closing slide with a clear CTA and summary bullets. Do not create any other outro/CTA on earlier slides.
```

Otherwise:

```
NON-FINAL PLATE RULE: These slides are NOT the end of the carousel. Do NOT include any outro, conclusion language, "wrap-up", or CTA on slides {slideStart}–{slideEnd}. Save the CTA for the final slide {totalSlides}.
```

### 5) Continuation rule (depends on cohesion method)

#### Prompt Based Cohesion (plateIndex > 0)

```
CONTINUATION REQUIREMENT: Continue seamlessly from the previous masterplate. Maintain the same visual universe, illustration style, typography treatment, colour palette, lighting direction, composition, and financial-advisor tone. The left edge of this new masterplate should visually continue from the right edge of the previous masterplate, as if the carousel is moving left-to-right through one connected visual story.
```

#### Image Reference Cohesion (plateIndex > 0)

```
IMAGE-REFERENCE CONTINUATION REQUIREMENT: Use the provided reference image ONLY to match the visual universe (style, palette, typography treatment, lighting direction, rendering style) and to align the left edge continuation zone with the previous masterplate’s right edge. Do NOT copy/paste or recreate the exact same scene/scenery. Create a NEW composition and new background details that feel like the next moment/location in the same story/world. Change camera framing slightly (pan/zoom/angle), introduce new background elements, and vary the scenery while keeping seamless edge continuity and consistent art direction.
```

### 6) Layout spec (appended)

Append the **Masterplate layout spec** block shown above.

---

## Notes (why this version performed well)
- Fixes “plate looks like its own mini-carousel” by telling the model the carousel has **{totalSlides}** slides.
- Prevents accidental “extra CTA” on slide 3 of plate 1 for longer carousels.
- Forces unused panels on partial final plates to be **background-only**.
- Strong anti-numbering constraints (still not perfect, but materially improved).
- Image Reference Cohesion improves cross-plate continuity; prompt explicitly discourages copying the exact same scenery.
