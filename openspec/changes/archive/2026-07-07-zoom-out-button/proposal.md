## Why

Visitors can zoom into the Mandelbrot set by selecting tiles, but there is no way to move back out without reloading. After several zoom levels, exploration dead-ends unless they remember to refresh. A dedicated zoom-out control restores upward navigation and should sit near the fractal view without obscuring the tile grid. The letterbox margins and tile grid lines currently read as flat gray; a subtle starfield behind the render field will make the UI feel less stark and let grid spacing read as depth rather than harsh dividers.

## What Changes

- Add a **zoom-out control** in the upper-left area of the viewport.
- **Letterbox-aware placement**: when the render square is inset (portrait or landscape), the control sits just outside the square’s upper-left corner in the margin; when the viewport is nearly square, the control may sit in the viewport’s upper-left corner.
- **Zoom-out behavior**: each activation reverses one tile zoom level, using the same quick linear transition style as zoom-in, until the visitor returns to the canonical region.
- At the canonical zoom level, the control is not offered (hidden or disabled).
- Add a **subtle floating starfield** behind the fractal view, visible in letterbox margins and **through the gaps between tiles** instead of opaque gray grid lines.
- **Zoom-in animation**: as the selected tile expands, the surrounding pre-zoom view **fades out** so the starfield bleeds through; the expanding tile stays opaque.
- **Zoom-out animation** (reverse): the current view **shrinks into the tile** it came from while the parent view **fades in from the starfield** around it.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `fractal-viewport`: zoom-out control; starfield background; tile-gap grid; zoom transitions with outer-region fade to/from starfield

## Impact

- Viewport navigation state (parent bounds history on zoom-in)
- UI overlay or DOM control positioned from `computeSquareLayout()` letterbox geometry
- Zoom transition rendering (fade compositing in zoom-in/out shaders or canvas path)
- `src/viewport.ts`, `src/mandelbrot-gl.ts`, `src/main.ts`, `src/styles.css` (apply phase)
- Living `openspec/specs/fractal-viewport/spec.md` after archive

## Non-Goals

- Jump-to-arbitrary depth or a full zoom history browser
- Keyboard shortcuts or gesture-based zoom-out (button only in v1)
- Changes to collaborative presence or mesh discovery
