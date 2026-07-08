## Why

The fractal explorer’s 8×8 tiles currently read as flat crops of the Mandelbrot image. Visitors should perceive them as nested glass / mahjong-like pieces—physical enough to support future motion, selection, and highlight language—while the fractal remains the dominant visual and the starfield still shows through transparent set interior and seams.

## What Changes

- Present each macro tile as a nested arrangement of 64 smaller glass-like faces aligned with the same 8×8 partition used for the next zoom level, so zooming into a tile feels continuous with the subdivision already visible on its face.
- Give those faces a flat-ish glass-block / mahjong aesthetic: rounded corners, soft seams with partial transparency (not hard 1px cliffs), subtle volumetric bevel, and specular-led highlights rather than a milky overlay.
- Keep Mandelbrot set-interior regions see-through to the starfield, with only a minimum glass-substrate milkiness where the fractal is transparent (thinning toward edges); opaque fractal color is not washed out by milkiness.
- Separate macro tiles with slightly more open starfield gaps and allow a subtle idle wander / loose layout so the grid feels arranged rather than rigidly locked—without changing logical hit targets for selection.
- Establish this nested-glass visual language as the foundation for later animation and indication work (out of scope for this change’s shipping behavior, but intentional in design).

## Capabilities

### New Capabilities
- `nested-glass-tiles`: Visual language and observable behavior for nested glass / mahjong-like tile faces, soft seams, substrate milkiness on transparent fractal regions, and subtle macro-tile wander.

### Modified Capabilities
- `fractal-viewport`: Clarify that macro-tile gaps remain starfield-revealing and that the idle grid may feel loosely arranged while selection still follows the logical 8×8 partition.

## Impact

- Fractal render path and idle viewport presentation (visual treatment of tiles and gaps).
- No change to complex-plane bounds, zoom selection rules, peer presence protocol, or mesh discovery.
- Spike implementation already exists on the working branch; apply work reconciles it to these requirements and leaves a clean foundation for follow-on animation/highlight infrastructure.
