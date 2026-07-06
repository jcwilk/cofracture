## Why

Post-launch viewport work refined how tile zoom looks and how the fractal is rendered (GPU-accelerated path, single-pass zoom composite). Living `fractal-viewport` requirements still describe a generic “animate the view” and leave Purpose as a placeholder, so reviewers cannot tell whether the shipped zoom behavior is correct.

## What Changes

- Clarify tile-selection zoom: surrounding region stays on the pre-zoom view while only the selected tile’s region grows to fill the viewport.
- Clarify that linear interpolation applies to the selected tile’s on-screen region (position and size), not a whole-frame bounds morph.
- Replace the `fractal-viewport` Purpose placeholder with a concise capability statement.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `fractal-viewport`: tile-selection zoom mid-animation appearance; linear transition semantics; Purpose text

## Impact

- `openspec/specs/fractal-viewport/spec.md` after archive
- Viewport zoom rendering (already implemented on branch; apply verifies alignment)

## Non-Goals

- Mandelbrot iteration count, cardioid shortcuts, or other renderer tuning
- Changes to collaborative presence or site publication
