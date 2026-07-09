## Context

Living specs already define fly-apart zoom-in (`fly-apart-zoom-in`) and nested glass + idle wander (`nested-glass-tiles`). Zoom-out is still specified as a single-tile reverse shrink in `fractal-viewport`. A post-archive spike implemented fly-together zoom-out and continuous wander through both transitions; this design records the technical choices that keep that behavior correct and performant without baking mechanisms into the specs.

## Goals / Non-Goals

**Goals:**

- Mirror fly-apart spatially on zoom-out (64 faces → parent nested slots) with the inverted ease schedule validated in the spike.
- Keep unselected macro wander continuous across idle ↔ zoom boundaries (same phase, no lattice snap).
- Preserve glass decoration continuity during fly-together.
- Keep the approach declarative (analytic geometry per frame) and cheap enough for full-screen zoom frames.

**Non-Goals:**

- Changing fly-apart zoom-in timing or destinations.
- Peer / selection highlight behavior during transitions.
- Specifying exact millisecond duration (remain observationally “snappy”).
- Mandating a particular GPU upload path in living specs (texture vs uniforms is an implementation choice).

## Decisions

1. **Invert the fly-apart schedule for zoom-out**  
   Zoom-in: move over full duration (`t²`), scale holds 25% then `t²`. Zoom-out: scale over full duration (`t²`), move holds 25% then `t²`.  
   *Why:* Feels like a true reverse of the “drift then grow” read without literally reversing the same curve (which looked wrong in the spike).  
   *Alternative considered:* Exact time-reversal of zoom-in curves — rejected after visual check.

2. **Shared wander source for idle and zoom**  
   Compute the same per-macro offsets used at idle and apply them to unselected macros (and to fly start/end anchors) during zoom frames.  
   *Why:* Re-deriving wander in a different numeric domain (e.g. mediump GPU time) caused phase drift and the same snap the change aims to remove.  
   *Alternative considered:* Pure GPU `sin(time)` wander — rejected for precision/phase mismatch.

3. **O(1) offset lookup during zoom**  
   Prefer a small lookup texture (or equivalent constant-time path) over WebGL1 dynamic uniform-array indexing.  
   *Why:* A 64-iteration scan per lookup tanked zoom frame cost; texture NEAREST lookup restored performance while keeping JS as the source of truth.  
   *Alternative considered:* Uniform array with loop-compare — correct but too slow.

4. **Hole the pickup / destination cell**  
   During zoom, the selected parent cell (zoom-out) or selected tile (zoom-in) remains reserved for the flying faces; other macros continue wandering underneath with fade.  
   *Why:* Avoids double-drawing and keeps starfield bleed readable.

## Risks / Trade-offs

- **[Risk] Apply finds spike and living code diverge** → Mitigation: tasks require visual acceptance of both directions plus wander continuity; spike is reference, not automatic merge.
- **[Risk] Offset quantization (if encoded) introduces visible micro-jitter** → Mitigation: encode range covers idle amplitude with headroom; visually check idle vs zoom boundary.
- **[Risk] Performance regresses again if lookup path is “simplified” back to scanned uniforms** → Mitigation: design decision #3; tasks include a zoom-frame responsiveness check.

## Open Questions

None blocking propose — duration remains intentionally unspecified; apply tunes by observation.
