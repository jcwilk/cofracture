## ADDED Requirements

### Requirement: Nested faces maintain glass decoration during fly-together
During a zoom-out fly-together animation, each animating face SHALL present the same specular highlights and glass-substrate milkiness visible at idle. As a face shrinks, its decoration SHALL scale with it. Transparent-region compositing during the animation SHALL NOT wash out or reduce milkiness or specular cues relative to their idle appearance.

#### Scenario: Specular and milkiness persist while converging
- **GIVEN** a fly-together zoom-out animation is in progress
- **WHEN** a visitor observes a face mid-flight
- **THEN** the face shows specular and glass-substrate decoration at the same strength as an idle nested face of that size

#### Scenario: Compositing does not suppress glass cues on zoom-out
- **GIVEN** a fly-together animation is in progress over transparent fractal regions
- **WHEN** the composited result is observed
- **THEN** glass-substrate milkiness and specular highlights are not visually reduced or washed out compared to the idle glass appearance

## MODIFIED Requirements

### Requirement: Macro tiles wander subtly without changing selection targets
While the idle grid is shown, macro tiles SHALL exhibit a subtle loose arrangement (small positional wander) so they feel like arranged pieces rather than a rigidly locked mesh. During zoom-in and zoom-out transitions, unselected macro tiles SHALL continue that same wander without a discontinuous jump in position or phase at transition start or end. Tile selection hit-testing SHALL continue to use the logical 8×8 partition of the visible square, not the momentary visual offset of a wandering tile.
(Previously: wander was specified for idle only; transitions could snap unselected macros to a rigid lattice.)

#### Scenario: Idle wander is visible but taps follow the logical grid
- **GIVEN** the idle 8×8 macro grid is displayed
- **WHEN** a visitor watches without interacting
- **THEN** macro tiles show a subtle positional wander or loose layout relative to a perfect lattice
- **WHEN** the visitor selects a tile by tap or click
- **THEN** the selected region matches the logical grid cell under the pointer, not a misaligned neighbor caused by wander

#### Scenario: Wander continues through zoom boundaries
- **GIVEN** the idle grid shows wandering macro tiles
- **WHEN** a zoom-in or zoom-out transition starts and later ends
- **THEN** unselected macro tiles do not snap to a perfect lattice at the start or end of the transition
- **AND** their motion remains continuous with the idle wander phase rather than restarting from a different offset
