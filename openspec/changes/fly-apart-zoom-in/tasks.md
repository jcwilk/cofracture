## Required for this change

### 1. Fly-Apart Animation — Move and Scale

- [ ] 1.1 On zoom-in tile selection, compute idle start positions for all 64 nested faces and their destination positions in the new 8×8 grid
- [ ] 1.2 Implement quadratic ease-in (`t²`) for positional movement of each face over the full transition duration
- [ ] 1.3 Implement scale hold for the first 25% of the transition duration (faces remain at idle size)
- [ ] 1.4 Implement quadratic ease-in for scale over the remaining 75% of the transition (from idle size to final grid size)
- [ ] 1.5 Verify that move and scale animate concurrently — neither waits for the other to finish

### 2. Declarative Math — No Extra Buffers

- [ ] 2.1 Compute each face's position and scale analytically per frame as a function of normalized time `t`, with no intermediate render targets or captured framebuffers for the flying faces
- [ ] 2.2 Confirm that the transition start and end states are fully determined at transition-start time and that no per-frame state accumulates

### 3. Visual Continuity During Fly-Apart

- [ ] 3.1 Ensure the same rendering path (shader and compositing) is used for faces during fly-apart as during idle
- [ ] 3.2 Verify specular highlights and glass-substrate milkiness are visible on flying faces at the same strength as idle faces of equivalent size
- [ ] 3.3 Verify transparent-region compositing does not wash out milkiness or specular cues during the animation compared to idle

### 4. Specular Shape Refinement

- [ ] 4.1 Update primary specular to extend most of the way along the top edge and right edge of each face (not just near the upper-right corner)
- [ ] 4.2 Implement taper so the specular L is thinner toward the far ends (top-left end of the top stroke; bottom of the right stroke)
- [ ] 4.3 Add a softer secondary catch light at the bottom-left of faces over transparent fractal regions
- [ ] 4.4 Visually confirm: specular reads as a directional gloss, not a diffuse wash

### 5. Subpixel Evenness — No Periodic Banding

- [ ] 5.1 Ensure each macro tile's pixel extent is snapped to a consistent multiple before subdividing into 64 nested faces, so the per-face pixel count is even and identical
- [ ] 5.2 Visually confirm no periodic bright-column or bright-row banding is visible at cell boundaries in the idle grid
- [ ] 5.3 Visually confirm no periodic banding appears as faces scale upward during fly-apart

### 6. Zoom-Out Unchanged

- [ ] 6.1 Confirm the zoom-out control continues to use the existing single-tile reverse animation and does not trigger any fly-apart

### 7. Validation and Archive

- [ ] 7.1 Run `openspec validate "fly-apart-zoom-in" --type change` and resolve any failures
- [ ] 7.2 Archive change and verify delta requirements are merged into living specs

## Explicitly deferred

- Zoom-out fly-apart animation (out of scope for this change by intent).
- Selection state or peer-tile highlight changes during fly-apart.
- Exact transition duration constants (intentionally not specified; tuned by observation during apply).
