## Why

Visitors can zoom into the Mandelbrot set by selecting tiles, but there is no way to move back out without reloading. After several zoom levels, exploration dead-ends unless they remember to refresh. A dedicated zoom-out control restores upward navigation and should sit near the fractal view without obscuring the tile grid.

## What Changes

- Add a **zoom-out control** in the upper-left area of the viewport.
- **Letterbox-aware placement**: when the render square is inset (portrait or landscape), the control sits just outside the square’s upper-left corner in the margin; when the viewport is nearly square, the control may sit in the viewport’s upper-left corner.
- **Zoom-out behavior**: each activation reverses one tile zoom level, using the same quick linear transition style as zoom-in, until the visitor returns to the canonical region.
- At the canonical zoom level, the control is not offered (hidden or disabled).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `fractal-viewport`: zoom-out navigation control, placement relative to letterboxed render field, and parent-level zoom reversal

## Impact

- Viewport navigation state (parent bounds history on zoom-in)
- UI overlay or DOM control positioned from `computeSquareLayout()` letterbox geometry
- `src/viewport.ts`, `src/main.ts`, `src/styles.css` (apply phase)
- Living `openspec/specs/fractal-viewport/spec.md` after archive

## Non-Goals

- Jump-to-arbitrary depth or a full zoom history browser
- Keyboard shortcuts or gesture-based zoom-out (button only in v1)
- Changes to collaborative presence or mesh discovery
