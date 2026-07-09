## Context

The fractal viewer renders nested glass faces atop each macro tile. At idle, those 64 faces show the next-zoom subdivision. The zoom-in transition currently scales the selected tile up as a single unit. This change replaces that with a fly-apart where each of the 64 nested faces travels independently to its destination in the new grid — turning a hard cut into a spatially continuous animation.

A spike in `src/` already validates the structural feasibility. This document captures the math and approach commitments for apply.

## Goals / Non-Goals

**Goals:**

- Declarative, per-frame computed positions and scales — no intermediate compositing layers or render-target buffers.
- A single, unified easing contract: quadratic ease-in for move (full duration), staggered quadratic ease-in for scale (delayed 25%, then ease-in over the remaining 75%).
- Visual continuity: same glass decoration at rest and in motion, same compositing path.
- Stable even-pixelization: face dimensions must be multiples of a consistent cell size to prevent periodic banding.

**Non-Goals:**

- Zoom-out fly-apart.
- GPU pipeline changes outside the scope of the animation pass.
- Per-tile tweening variations or choreography offsets between faces.

## Decisions

### Decision: Declarative math, no extra buffers

Each face position and scale is computed analytically each frame as a function of normalized animation time `t ∈ [0, 1]`. The start state (idle grid position inside the macro tile) and end state (destination position in the expanded grid) are known at transition start; every intermediate frame is a pure function of `t`. This avoids layered render targets or captured framebuffers for the flying faces.

### Decision: Quadratic ease-in as `f(t) = t²`

Move uses `p(t) = start + (end − start) × t²` over the full transition, giving the spatial feel of building momentum before the faces land. Scale uses the same curve but remapped: `ts = max(0, (t − 0.25) / 0.75)`, then `s(t) = idleScale + (finalScale − idleScale) × ts²`. This means scale holds during the first quarter of the transition, then ease-in starts from rest — both move and scale finish at `t = 1` together.

The 25/75 split is an intentional design constant (not derived from a measurement); apply may expose it as a single named constant for tuning.

### Decision: Same rendering path for idle and flying faces

Flying faces use the same shader and compositing path as idle faces. The glass decoration (specular, milkiness, bevel) is parameterized by face size and position, not by animation state. As a face scales up, the decoration scales with it without any mode switch.

### Decision: Snap face dimensions to even multiples to prevent banding

The bright-column banding artifact comes from uneven integer pixel counts per cell when the grid dimension does not divide evenly into the face pixel budget. The implementation SHALL ensure that the pixel count allocated per face is a consistent even value (for example, by snapping the macro tile's pixel extent to a multiple of 64 before subdividing). The exact snap unit is an implementation detail; the constraint is that the per-face pixel count is even and identical for all faces in a macro tile.

### Decision: Specular L shape

The primary specular is rendered as a smooth gradient covering most of the top and right edges of each face. Its width tapers from a broader band at the upper-right corner to a thinner trail toward the far ends — giving an asymmetric L that reads as a directional gloss rather than symmetric trim. The bottom-left catch is a softer, secondary gradient visible only on transparent faces where the dark interior otherwise provides no shape cue.

## Risks / Trade-offs

- **Frame cost at 64 flying faces**: Analytical computation of 64 positions/scales per frame is cheap; the risk is overdraw if faces grow to full visible-square size at a step that produces large alpha blends. Mitigated by the scale delay: faces are small for the first 25% of the animation, reducing peak fill-rate pressure.
- **Banding regression**: Snap-to-even must be re-checked whenever the macro tile or viewport size changes. Failing to enforce it re-introduces the banding artifact.

## Open Questions

- None blocking apply. Exact transition duration (intentionally out of spec) may be set by apply and tuned by observation.
