## Context

The original change described zoom as bounds interpolation across the full frame. Implementation instead keeps the pre-zoom image stable outside the selected tile while the tile region expands—a clearer visual for an 8×8 grid—and renders each animation frame with a single GPU pass (background sample outside the tile rect, live Mandelbrot inside).

## Goals / Non-Goals

**Goals:**

- Spec language matches what visitors see during zoom.
- Document renderer choice at design level without binding spec to symbols.

**Non-Goals:**

- Re-litigate grid size, duration constants, or peer presence.

## Decisions

### Decision: Expand-in-place zoom over static surround

On tile select, the visible region outside the growing tile continues to show the pre-zoom view until the transition completes. Only pixels inside the tile’s animated screen rectangle show the zoom target’s fractal coordinates.

**Alternatives considered:** Full-frame bounds lerp (whole image morphs)—rejected after user testing as less legible.

### Decision: Linear tile-rectangle interpolation

Position and size of the tile’s screen rectangle interpolate linearly from the grid cell to the full viewport square over the fixed short duration (~250 ms).

### Decision: GPU-first fractal rendering

The client uses hardware-accelerated fragment shading for Mandelbrot pixels when available, with a CPU path when not. Zoom animation bakes the pre-zoom frame to a GPU texture once per zoom so background pixels are sampled rather than recomputed each frame.

**Alternatives considered:** Pure Canvas 2D per-pixel CPU—too slow for animation.

## Risks / Trade-offs

- **[Sharp tile boundary]** → Acceptable; grid overlay still communicates structure.
- **[GPU unavailable]** → CPU fallback preserves behavior, not frame rate.
