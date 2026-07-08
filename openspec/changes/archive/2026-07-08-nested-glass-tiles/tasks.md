## 1. Reconcile nested-glass render

- [x] 1.1 Align nested-face sampling with the 8×8 zoom partition (64 micro-faces across the view) in the fractal render path used for idle and zoom frames
- [x] 1.2 Implement soft seam coverage (partial transparency) and rounded-square face mask without opaque grid strokes
- [x] 1.3 Implement specular-led glass shading with primary glossy L flush to the upper-right edge and a subtle opposite catch-light
- [x] 1.4 Add minimum glass-substrate milkiness only where fractal samples are transparent, thinning toward the face edge; leave opaque fractal color unwashed

## 2. Macro presentation and interaction

- [x] 2.1 Widen macro-tile starfield gaps enough that nested faces still read as distinct pieces
- [x] 2.2 Add subtle idle wander / loose layout for macro tiles while keeping hit-testing on the logical 8×8 grid
- [x] 2.3 Ensure zoom transitions continue to sample nested-glass treatment so idle and motion language match

## 3. Acceptance

- [x] 3.1 Visually verify nested faces, soft seams, upper-right specular L, transparent milkiness, and starfield bleed on desktop
- [x] 3.2 Visually verify the same on a mobile-width viewport and confirm taps still select the logical tile under the finger
- [x] 3.3 Confirm idle redraw remains realtime (no multi-second stalls when the view is idle or after a zoom)

## Explicitly deferred

- Selection, peer, and transition indication redesigns that *consume* the nested-glass language as shared infrastructure (follow-on change once this visual contract is archived).
- Photoreal refraction or expensive per-frame mesh warps.
