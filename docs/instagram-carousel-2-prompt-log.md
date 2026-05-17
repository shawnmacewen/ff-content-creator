# Instagram Carousel 2.0 — Prompt Progress Log

This doc tracks the working prompt(s) for Instagram Carousel 2.0 masterplate generation so we can iterate safely and roll back if needed.

> Note: The “final prompt sent” is a combination of user input + system-controlled spec appended in the client.

---

## Current working prompt (2026-05-17)

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
