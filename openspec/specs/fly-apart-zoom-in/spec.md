# fly-apart-zoom-in Specification

## Purpose
TBD - created by archiving change fly-apart-zoom-in. Update Purpose after archive.
## Requirements
### Requirement: Nested faces fly to next-grid destinations on zoom-in
When a visitor selects a macro tile to zoom in, the tile's 64 nested faces SHALL animate from their idle positions to the positions they will occupy as the new 8×8 tile grid for that view. The animation SHALL complete with the faces covering the full visible square as the next navigable tile grid.

#### Scenario: Fly-apart begins on tile selection
- **GIVEN** the idle 8×8 macro grid is visible
- **WHEN** a visitor selects a macro tile (by tap or click)
- **THEN** the 64 nested faces on the selected tile begin moving toward the destinations they will occupy as the next 8×8 tile grid
- **AND** the animation completes with each face at its grid destination, covering the full visible square

#### Scenario: All 64 faces reach their destinations
- **GIVEN** a fly-apart zoom-in animation is in progress
- **WHEN** the transition duration elapses
- **THEN** all 64 nested faces have arrived at their respective positions in the new tile grid
- **AND** no face is visually out of place relative to the expected 8×8 layout

### Requirement: Move and scale animate in parallel
During fly-apart, positional movement and scaling of each face SHALL both animate over the full transition duration, running concurrently rather than sequentially.

#### Scenario: Scale does not wait for move to complete
- **GIVEN** a fly-apart animation has begun
- **WHEN** the midpoint of the animation is observed
- **THEN** each flying face has both changed position and, if past the scale-delay threshold, changed size — neither dimension waits for the other to finish

### Requirement: Move uses quadratic ease-in over the full duration
The positional movement of each nested face during fly-apart SHALL follow a quadratic ease-in curve across the full transition duration, starting slowly and accelerating toward the destination.

#### Scenario: Faces start slowly and accelerate
- **GIVEN** a fly-apart animation is in progress
- **WHEN** the early portion of the animation is observed
- **THEN** the faces appear to begin moving slowly and accelerate toward their destinations
- **AND** the motion is consistent with quadratic ease-in rather than a constant rate or ease-out

### Requirement: Scale holds, then quadratic ease-in over the remaining span
During fly-apart, each face's scale SHALL remain at its idle value for the first quarter of the total transition duration. After that hold, scale SHALL follow a quadratic ease-in curve from idle size to final grid size over the remaining three-quarters of the duration.

#### Scenario: Scale does not begin in the first quarter
- **GIVEN** a fly-apart animation has just begun
- **WHEN** less than one-quarter of the transition duration has elapsed
- **THEN** the flying faces have not grown from their idle size
- **AND** only positional movement is visible during this window

#### Scenario: Scale completes by end of transition
- **GIVEN** a fly-apart animation entered its scale phase after the initial hold
- **WHEN** the full transition duration elapses
- **THEN** each face has grown to its final size for the new grid position
- **AND** the scale completed with accelerating motion consistent with ease-in

