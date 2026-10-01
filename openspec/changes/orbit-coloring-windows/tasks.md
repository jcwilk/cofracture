# Tasks

## 1. Orbit coloring

- [x] 1.1 Color each orbit from coloring-window entries in the shared fractal evaluation used for the idle view and both zoom directions: test the orbit position, accumulate harmonic weight per window, and map brightness so the first entry is already an opaque visible color while later entries add less. Verify a solo canonical frame uses only the local hue, stays clear where the orbit never enters that window, and shows no escape-time rainbow.
- [x] 1.2 Combine the two strongest windows in hue space along the shorter arc, keep saturation high, let the leader win when the hues are nearly opposite, and let any further windows add brightness only. Verify two different hues produce a vivid blend rather than gray or brown, and a third widely different hue does not wash that blend toward gray.

## 2. Windows in, rectangles out

- [x] 2.1 Feed the local view as a coloring window in the visitor's hue on every frame, including the moving region during a zoom transition. Verify solo exploration stays colored, and during a zoom the local hue follows the moving view instead of popping only at the start or end frame.
- [x] 2.2 Feed each connected peer's shared region as a coloring window and remove the filled and stroked peer rectangles. Verify a peer's hue shows up on orbits that pass through their region, no rectangle is drawn, and losing the peer stops that hue without stopping the local window.

## 3. Hot path

- [x] 3.1 Keep the per-step tests inside 16 slots, one of them the local window, matching the mesh cap so every member fits. Mask empty slots, skip edge tests for a window that covers the bailout region, and avoid texture fetches inside the iteration loop. Verify an idle frame and a zoom transition stay interactive, with no multi-second stall.

## 4. Acceptance

- [x] 4.1 Visually check the canonical solo view, a deep zoom, a zoom transition, an orbit that stays clear, and a strongly colored interior cycle, on a desktop viewport. Verify the coloring rule matches the fractal-viewport scenarios and glass still shows milkiness only on uncolored samples.
- [x] 4.2 Visually check the same desktop view with at least two other participant windows of different hues. Verify their hues are distinguishable, no rectangles are drawn, and a failed or stopped session leaves only the local window.

## 5. Mesh capacity

- [x] 5.1 When choosing a mesh to join or merge into, take the oldest live mesh with fewer than 16 participants, skip full meshes, and form a new mesh when none have room. Verify with mesh-selection tests for an open oldest mesh, a full oldest mesh with a newer open mesh, and every mesh full.
- [x] 5.2 Let a listener recognize a full mesh from one member's advertisement without observing every member, and when a mesh is over 16 keep the same 16 participants by a shared rule and send the rest through join-or-form. Verify with tests that a single full advertisement blocks a join and that two members agree who stays when the mesh is over capacity.

## Explicitly deferred

- Raising the orbit iteration budget.
- Changing the presence bounds-and-hue payload, tile hit-testing, or glass decoration beyond which samples count as clear versus colored.
