## Context

The explorer already partitions the visible Mandelbrot square into an 8×8 macro grid with starfield gaps and expand-in-place zoom. A throwaway spike on the working branch proved a nested glass / mahjong face look: 64 micro-faces per macro tile, soft seams, specular-led glass cues, and subtle idle wander. This change locks that visual language into OpenSpec and reconciles the spike into durable behavior.

Future work will reuse the same nested-arrangement concept for animation and indication (selection, peers, transitions). This design therefore prefers a **shared visual vocabulary** over one-off overlays, while keeping this change’s shipping scope to idle presentation and render continuity through zoom.

## Goals / Non-Goals

**Goals:**

- Nested 8×8 glass faces on each macro tile, aligned with the next zoom partition.
- Flat-ish glass-block / mahjong aesthetic: rounded faces, soft seams, subtle volume, specular-led highlights.
- Transparent Mandelbrot interior remains starfield-visible, with only minimum substrate milkiness where the fractal is transparent (thinner toward edges).
- Macro tiles feel loosely arranged (subtle wander) without changing logical selection targets.
- Realtime performance: treatment must stay cheap enough for continuous idle redraw and zoom frames.

**Non-Goals:**

- Reworking zoom easing, peer protocol, or mesh discovery.
- Shipping selection/peer highlight redesigns that *consume* the nested-glass language (follow-on changes).
- Photoreal refraction, multi-bounce lighting, or expensive per-frame mesh warps.
- Changing the complex-plane math or tile-selection hit rules beyond visual offset of presentation.

## Decisions

1. **UV-space nested faces in the fractal render path (not a CPU mesh of beads)**  
   - *Why:* Spike mesh baking was too slow for realtime idle. Periodic UV warp + soft coverage + shade is O(1) per fragment and matches “math patterns over imperative loops.”  
   - *Alternatives:* Canvas overlay strokes (noisy / minesweeper); nested blit mesh (too slow).

2. **Shared constants for nest count = macro grid size (8 → 64 micro-faces across the view)**  
   - *Why:* Continuity when a macro tile expands into the next 8×8.  
   - *Alternatives:* Decorative hatch unrelated to zoom partition (breaks the “already made of 64” reading).

3. **Specular-led glass with minimum milkiness only on transparent fractal samples**  
   - *Why:* Fractal color stays dominant; set interior stays mostly clear; edges read as glass without a milky plate.  
   - *Alternatives:* Uniform frost (washes fractal); specular-only with zero substrate (boundaries vanish on black set).

4. **Macro wander as presentation offset; hit-test stays on the logical grid**  
   - *Why:* Loose arrangement without mis-taps.  
   - *Alternatives:* Rotating tiles (complicates hit-test and peer outlines).

5. **Keep spike modules thin; treat nested-glass as a named visual concept in design for follow-ons**  
   - *Why:* Later animation/indication work will need a stable concept boundary without baking file paths into specs.  
   - *Alternatives:* Defer all structure until the next change (risk of one-off overlays drifting from the idle look).

## Risks / Trade-offs

- **[Risk] Soft seams + milkiness compete with fractal detail** → Keep milkiness as a *minimum* on transparent samples only; tune specular as edge/L cues, not face fill.  
- **[Risk] Idle wander + continuous redraw costs battery/CPU** → Keep wander amplitude tiny; fractal bitmap remains cached; only presentation offsets change each frame.  
- **[Risk] Zoom frames and idle presentation diverge** → Apply the same nested-glass sampling on zoom tile/parent samples so the language holds during transitions.  
- **[Risk] Follow-on animation work assumes richer “bead” APIs than this change ships** → Specs describe observable language; design notes the concept for reuse without requiring new public APIs in this change.

## Migration Plan

- Reconcile the existing working-branch spike to match the delta requirements (including upper-right specular L placement and minimum milkiness).  
- No data migration. Rollback = revert the change branch / disable nested-glass sampling and wander.  
- Archive via normal `/osf-apply-finish` after apply verification.

## Open Questions

- How strongly should zoom transitions preserve per-micro-face specular continuity vs simplifying during motion? (Default: same sampling; revisit if motion looks noisy.)  
- Exact wander amplitude / gap width are aesthetic knobs—tune during apply acceptance, not locked as numeric constants in specs.
