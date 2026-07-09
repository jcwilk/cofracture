## Required for this change

### 1. Fly-Together Animation — Scale and Move

- [ ] 1.1 On zoom-out, compute start centers/sizes for all 64 current macro faces and their destination nested-face slots in the parent tile from the most recent zoom-in
- [ ] 1.2 Implement quadratic ease-in (`t²`) for scale of each face over the full transition duration
- [ ] 1.3 Implement move hold for the first 25% of the transition duration (faces remain at starting grid centers)
- [ ] 1.4 Implement quadratic ease-in for positional movement over the remaining 75% of the transition (toward parent nested slots)
- [ ] 1.5 Verify that scale and move animate concurrently — neither waits for the other to finish

### 2. Declarative Math — No Extra Face Buffers

- [ ] 2.1 Compute each face's position and scale analytically per frame as a function of normalized time `t`, with no intermediate render targets dedicated to capturing flying faces
- [ ] 2.2 Confirm transition start and end geometry are fully determined at transition-start time and that no per-frame state accumulates beyond progress and shared wander offsets

### 3. Wander Continuity Through Zoom

- [ ] 3.1 Apply the same per-macro wander offsets used at idle to unselected macros during zoom-in and zoom-out frames
- [ ] 3.2 Ensure fly start/end anchors for the selected/parent cell use the same offset source so faces do not jump relative to idle at transition boundaries
- [ ] 3.3 Visually confirm unselected macros do not snap to a perfect lattice at zoom start or end, and that wander phase matches idle

### 4. Visual Continuity During Fly-Together

- [ ] 4.1 Ensure the same glass rendering path is used for faces during fly-together as during idle / fly-apart
- [ ] 4.2 Verify specular highlights and glass-substrate milkiness remain visible on converging faces at the same strength as idle faces of equivalent size
- [ ] 4.3 Verify transparent-region compositing does not wash out milkiness or specular cues during zoom-out compared to idle

### 5. Performance

- [ ] 5.1 Use a constant-time wander-offset lookup during zoom frames (no WebGL1 dynamic uniform-array scan)
- [ ] 5.2 Confirm zoom-in and zoom-out remain responsive (no obvious multi-frame stalls attributable to wander lookup)

### 6. Viewport Contract Updates

- [ ] 6.1 Replace the single-tile reverse zoom-out path with fly-together so the zoom-out control matches the modified fractal-viewport requirements
- [ ] 6.2 Confirm zoom-in fly-apart behavior remains unchanged relative to living `fly-apart-zoom-in` requirements

### 7. Validation and Archive

- [ ] 7.1 Run `openspec validate "fly-together-zoom-out" --type change` and resolve any failures
- [ ] 7.2 Archive change and verify delta requirements are merged into living specs

## Explicitly deferred

- Peer / selection highlight behavior during fly-together or fly-apart.
- Exact transition duration constants (intentionally not specified; tuned by observation during apply).
- Changing fly-apart zoom-in timing or destinations.
