## Why

Zoom-in already flies nested faces apart into the next grid, but zoom-out still uses the older single-tile reverse shrink. That asymmetry breaks the spatial story, and unselected macro tiles snap between wandered idle positions and a rigid lattice at transition boundaries—jarring enough to undermine the glass-tile language. A working spike validated fly-together zoom-out plus continuous wander through both directions; this change locks the behavioral contract before that work is treated as done.

## What Changes

- **Zoom-out fly-together**: Activating zoom-out animates the current 8×8 macro faces from their grid positions into the nested-face slots of the parent tile that was previously selected, completing with the parent view restored as the navigable 8×8 grid.
- **Mirrored timing relative to fly-apart**: Scale shrinks with quadratic ease-in over the full duration; positional motion toward parent nested slots holds for the first quarter, then quadratic ease-in over the remaining three-quarters.
- **Wander continuity through zoom**: Unselected macro tiles keep the same subtle wander (same phase / continuous motion) through zoom-in and zoom-out start and end, so they do not snap to a perfect lattice when a transition begins or ends.
- **Glass continuity on zoom-out**: Flying-together faces retain nested-glass decoration at the same strength as idle faces of equivalent size (same continuity bar already required for fly-apart).

## Capabilities

### New Capabilities

- `fly-together-zoom-out`: Zoom-out animation behavior — how the current 64 macro faces converge into the parent tile’s nested-face slots, including parallel scale+move timing and easing.

### Modified Capabilities

- `fractal-viewport`: Zoom-out changes from a single-tile reverse shrink to fly-together; transition snappiness wording updates for both directions; wander continuity during transitions is reflected in zoom behavior.
- `nested-glass-tiles`: Macro wander is required to continue through zoom transitions without phase discontinuity at boundaries; glass decoration continuity applies during fly-together as well as fly-apart.

## Impact

- Viewport zoom-out animation and idle/zoom presentation of macro wander (spike already exists in working tree; apply reconciles code to this contract).
- No API, backend, or multi-repo impact.
- Exact duration constants, shader/upload mechanisms, and peer/selection highlight behavior during transitions remain out of scope.
