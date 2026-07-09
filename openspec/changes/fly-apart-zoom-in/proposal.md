## Why

The fractal viewport's nested glass faces already foreshadow the next zoom subdivision visually at idle, but on zoom-in those faces do not yet animate toward the grid positions they will become. Locking down the fly-apart behavior — where the 64 nested faces launch from their idle positions and land at the next 8×8 tile grid — gives the interaction spatial continuity that reinforces the fractal recursion and makes the explorer feel alive rather than cut. A working spike has validated the structural approach; this change captures the behavioral contract and presentation constraints before those code paths stabilize.

## What Changes

- **Zoom-in fly-apart animation**: Selecting a macro tile triggers its 64 nested faces to animate from idle toward their next-grid destinations, with move and scale running in parallel using quadratic ease-in timing (scale held until 25% of the transition elapses, then ease-in over the remainder).
- **Visual continuity during fly-apart**: Flying faces retain their nested-glass decoration (specular highlights, milkiness) throughout the animation; transparent-region compositing must not wash out those cues relative to idle appearance.
- **Specular shape refinement**: The L-shaped specular on nested faces stretches most of the way along the top and right edges, tapering thinner toward the far corners, with a complementary softer catch at the bottom-left for transparent tiles.
- **Subpixel presentation stability**: Nested glass faces must not exhibit periodic bright-column banding caused by uneven pixels-per-cell; even face pixelization is a behavioral contract.

## Capabilities

### New Capabilities

- `fly-apart-zoom-in`: The animation behavior for zoom-in tile selection — how the 64 nested faces move from idle positions to their next-grid destinations, including the parallel move+scale timing and easing contract.

### Modified Capabilities

- `fractal-viewport`: The zoom-in transition changes from a single-tile linear scale to a nested-face fly-apart animation. Zoom-out behavior is explicitly unchanged.
- `nested-glass-tiles`: Specular shape is refined; visual continuity during fly-apart and even face pixelization are added as observable behavioral requirements.

## Impact

- Rendering and animation paths in the viewport and tile code (spike files exist in `src/` but are not yet part of this change — apply executes against this spec).
- No API, backend, or multi-repo impact.
- Zoom-out fly-apart, selection/peer highlight infrastructure, exact duration constants, and shader parameter names are out of scope.
