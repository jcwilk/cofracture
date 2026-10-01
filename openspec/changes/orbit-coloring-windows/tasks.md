# Tasks

## 1. Orbit coloring

- [ ] 1.1 Color each orbit from coloring-window entries in the shared fractal evaluation used for the idle view and both zoom directions: test the orbit position, accumulate harmonic weight per window, and map brightness so the first entry is already an opaque visible color while later entries add less. Verify a solo canonical frame uses only the local hue, stays clear where the orbit never enters that window, and shows no escape-time rainbow.
- [ ] 1.2 Combine the two strongest windows in hue space along the shorter arc, keep saturation high, let the leader win when the hues are nearly opposite, and let any further windows add brightness only. Verify two different hues produce a vivid blend rather than gray or brown, and a third widely different hue does not wash that blend toward gray.

## 2. Windows in, rectangles out

- [ ] 2.1 Feed the local view as a coloring window in the visitor's hue on every frame, including the moving region during a zoom transition. Verify solo exploration stays colored, and during a zoom the local hue follows the moving view instead of popping only at the start or end frame.
- [ ] 2.2 Feed each connected peer's shared region as a coloring window and remove the filled and stroked peer rectangles. Verify a peer's hue shows up on orbits that pass through their region, no rectangle is drawn, and losing the peer stops that hue without stopping the local window.

## 3. Hot path

- [ ] 3.1 Keep the per-step tests inside a fixed slot cap with the local window always reserved, mask empty slots, skip edge tests for a window that covers the bailout region, and avoid texture fetches inside the iteration loop. Verify an idle frame and a zoom transition stay interactive, with no multi-second stall.

## 4. Acceptance

- [ ] 4.1 Visually check the canonical solo view, a deep zoom, a zoom transition, an orbit that stays clear, and a strongly colored interior cycle, on a desktop viewport. Verify the coloring rule matches the fractal-viewport scenarios and glass still shows milkiness only on uncolored samples.
- [ ] 4.2 Visually check the same desktop view with at least two other participant windows of different hues. Verify their hues are distinguishable, no rectangles are drawn, and a failed or stopped session leaves only the local window.

## Explicitly deferred

- Raising the orbit iteration budget, or supporting coloring windows beyond the fixed slot cap as a product guarantee for very large sessions.
- Changing mesh discovery, the presence payload, tile hit-testing, or glass decoration beyond which samples count as clear versus colored.
