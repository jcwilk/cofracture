## Context

See `proposal.md` for why orbit color replaces the escape-time rainbow and the drawn peer rectangles. Today the fractal shader colors a pixel from how many steps `z ← z² + c` takes to leave `|z| > 2` (or from running out of steps, which stays clear). Peer view rectangles are stroked and filled on a canvas above that image. The local view is not one of those rectangles. Bounds and hues are already shared; zoom already interpolates the local view and peer regions.

The iteration loop is the hot path for every pixel, including during zoom transitions. Extra work per step has to stay tiny. WebGL1 fragment shaders cannot reliably index a uniform array with a runtime index.

## Goals / Non-Goals

**Goals:**

- One coloring rule at every zoom: test the orbit position against each window rectangle.
- Monochrome when one window contributes; vivid hue when several do.
- First entry into a window counts more than a later re-entry.
- Local window always on; peer windows only while those peers are present; no rectangle overlay.
- Idle view and zoom transitions stay realtime.

**Non-Goals:**

- Changing how many orbit steps are followed, the tile grid, glass decoration, or the presence bounds-and-hue payload.
- Coloring from the pixel's own location.
- A residual escape-time rainbow under the window hues.
- Drawing even a faint outline of a coloring window.

## Decisions

1. **Trap the orbit position, not the pixel.** On each step before escape, test `z` against each window in the complex plane. A window that covers the whole bailout disk (the canonical view does) is hit on every step, so dwell still drives that hue. A small zoomed-in window is hit only when `z` is inside it. Same test either way.
   - *Alternatives:* Color by escape count, then tint (keeps the rainbow). Test the pixel coordinate (no hall-of-mirrors; a window only paints its own rectangle).

2. **Harmonic influence per window.** On the k-th entry to a window (k starting at 0), add weight `1/(1+k)`. The running total is the harmonic number, which grows like `ln(n+1)`. Do the divide in the loop; do not call a logarithm there. Brightness uses the sum of those weights across windows, normalized by the harmonic number of a full iteration budget, and mapped so a single entry is already an opaque, clearly visible color while a full budget of entries approaches full brightness. Further entries move brightness less and less. Zero total weight stays fully clear (alpha 0) so existing glass milkiness still applies. Any positive weight is opaque (alpha 1) so a graze is not swallowed by the transparent-glass path.
   - *Alternatives:* Linear step count (the 11th entry looks like the 10th only because both are large, and a graze is a tiny fraction of the budget). Alpha equal to the log curve (a graze falls under the glass transparency cutoff and disappears).

3. **Vivid hue from the two strongest windows, in hue space.** Rank windows by harmonic weight. Convert window colors to hue. The strongest hue wins. The second-strongest may slide that hue along the shorter arc between them, in proportion to its share of the two weights. Keep saturation at least as high as the stronger of those two colors, and floor it high so the result cannot go pale. If the shorter arc is about 150° or more, do not slide: the midpoint is an unrelated hue, and an RGB average of those colors would be dull. Weaker windows still add brightness through their weights and do not enter the hue average, so three spread-out hues cannot cancel to gray. Overlapping windows on the same step each record an entry.
   - *Alternatives:* Average RGB (red and green go brown; three primaries go gray). Circular vector mean of every hue (equal spread-out hues cancel to gray). Leader-only (loses the two-hue mix).

4. **Windows are the local view plus each peer region, uploaded every frame.** The local window is the visitor's hue and the view bounds, interpolated across a zoom with the same progress as the transition. Peer windows use the regions already interpolated for the old overlay, in each peer's hue. Remove the rectangle stroke and fill. Both zoom-direction shaders that evaluate orbits must use the same coloring.
   - *Alternatives:* Keep the overlay and also color (the user rejected drawn squares). Color only at the end of a zoom (the window would pop).

5. **Keep the per-step test branchless and bounded.** Compile 16 coloring-window slots, one of them always the local window, matching the mesh cap so every member of a mesh fits. Unused slots are masked off. Containment is four edge tests with no divergent branch. A window that contains the bailout square skips the edge tests and counts every step until escape. A window that misses the disk `|z| ≤ 2` is omitted before upload. No texture fetch inside the iteration loop. Use high precision for the edge test where the fragment shader allows it.
   - *Alternatives:* Dependent texture lookup per step (too slow). Unbounded dynamic list (WebGL1 indexing and cost). Testing every window even when it covers the whole disk (wastes the common canonical-view case). Dropping the stalest peer while still sharing a mesh (would hide someone the group is supposed to include).

6. **Cap each mesh at 16 participants, including yourself, at join time.** Discovery already groups people into meshes and prefers the oldest formation. Keep that preference, but only among meshes with fewer than 16 live members. A full mesh is not joined and is not a merge target. If every live mesh is full, form a new mesh. Each advertisement carries the sender's current live member count, including themselves, so a listener can treat a mesh as full after hearing from one member rather than waiting to see all 16. Also treat a mesh as full when 16 distinct live advertisers have been observed. If a race pushes a mesh over 16, every member sorts endpoint ids and the lowest 16 stay; the others leave and run the same join-or-form rule. The coloring slots use that same set, so a brief overshoot does not paint a 17th window.
   - *Alternatives:* Keep one global mesh and drop peers only in the shader (the 17th person is in the group but invisible). Refuse to form a second mesh (the 17th visitor is stuck solo while a full mesh exists). A central assigner (this deployment has no coordination server).

## Risks / Trade-offs

- **[Risk] Deep zooms look sparse because `z` starts at 0, usually outside the small local window** → This is the same rule as the wide view, not a second mode. Accept echoes and clear orbits. Do not fall back to the rainbow when a frame looks dark.
- **[Risk] Two newcomers both see 15 members and both join** → The mesh briefly exceeds 16, then the deterministic endpoint-id rule returns it to the same 16 and the extras seek another mesh. Coloring uses that same set.
- **[Risk] Hue-space mix still surprises when two strong complementary windows tie** → Leader wins and saturation stays high, so the pixel stays vivid instead of turning gray. A third hue will not appear as its own tint once two stronger windows exist; it still brightens the pixel.
- **[Risk] Per-step rectangle tests stall zoom frames** → Slot cap, bailout fast path, and no in-loop texture fetch. If a zoom hitch shows up in acceptance, tighten the fast path before raising the iteration count or the slot cap.
- **[Risk] Very deep window edges flicker in medium precision** → Prefer high precision for the containment test.

## Migration Plan

- Ship the coloring and the overlay removal together so peers are not invisible for a frame and not double-drawn.
- Discovery advertisements gain a membership count. Older clients that ignore an unknown field still parse the rest of an advertisement; new clients treat a missing count as "unknown" and fall back to the number of distinct live advertisers they have actually seen. Rollback is restoring escape-time coloring, the rectangle overlay, and uncapped oldest-mesh join.
- Archive through the normal finish path after visual acceptance.

## Open Questions

- None. Brightness mapping and the complement cutoff are aesthetic knobs to tune during visual acceptance without changing the requirements.
