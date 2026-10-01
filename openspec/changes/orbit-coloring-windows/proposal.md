## Why

Fractal color is currently a rainbow of how long each orbit takes to escape, and other participants show up as solid rectangles drawn on top of that picture. Color should come from the view windows themselves: an orbit picks up a window's hue when it passes through that window, so several windows in different places echo through the set instead of sitting on it as overlays.

## What Changes

- **BREAKING:** Remove the escape-time rainbow. A pixel's color is the hue of the coloring windows its orbit enters, at every zoom level, using the same rule. Zoom only changes where those windows sit and how large they are.
- Each coloring window is one hue. One window paints a monochrome picture in that hue. Several windows are the only way a pixel becomes multi-hued, and the mix stays vivid rather than muddy.
- Influence of a window diminishes as the same orbit re-enters it: the first crossing matters more than a later one.
- Orbits that never enter a window stay clear. Orbits that keep revisiting a window, including cycles that never escape, become strongly colored.
- **BREAKING:** Stop drawing other participants' regions as filled or stroked rectangles. Those regions are coloring windows only. The local view is a coloring window too, including while exploring alone and while a zoom transition is playing.
- Glass treatment follows the new color: uncolored samples stay see-through to the starfield; colored samples stay opaque and unmilked.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `fractal-viewport`: Fractal color comes from coloring windows on the orbit, with diminishing influence and a vivid multi-hue mix. The local view is always one such window.
- `collaborative-presence`: Peer regions color orbits instead of appearing as highlights. The local window stays active when no peers are connected. Peer windows appear, move, and disappear with presence.
- `nested-glass-tiles`: Clear versus opaque glass follows whether a sample received coloring-window color, not whether the point is inside the Mandelbrot set or has escaped.
- `networking-architecture`: Solo fallback omits other participants' coloring windows and keeps local exploration, including the local coloring window.

## Impact

- Fractal rendering for idle view and both zoom directions.
- Viewport overlay that currently draws peer rectangles.
- Presence hues and shared view regions already exchanged between participants; this change consumes them as coloring windows and does not add a new presence protocol.
- Nested-glass read of which samples are transparent.
