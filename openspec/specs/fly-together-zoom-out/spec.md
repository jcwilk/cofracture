# fly-together-zoom-out Specification

## Purpose
TBD - created by archiving change fly-together-zoom-out. Update Purpose after archive.
## Requirements
### Requirement: Macro faces fly together into the parent nested slots on zoom-out
When a visitor activates zoom-out, the current view's 64 macro faces SHALL animate from their grid positions into the nested-face slots of the parent tile that was selected for the most recent zoom-in. The animation SHALL complete with the parent region restored as the full visible square and re-tiled as the navigable 8×8 grid.

#### Scenario: Fly-together begins on zoom-out
- **GIVEN** the visitor has zoomed in at least once and the zoom-out control is available
- **WHEN** they activate the zoom-out control
- **THEN** the 64 current macro faces begin moving toward the nested-face slots of the parent tile from the most recent zoom-in
- **AND** the animation completes with the parent view filling the visible square as an 8×8 tile grid

#### Scenario: All 64 faces reach parent nested slots
- **GIVEN** a fly-together zoom-out animation is in progress
- **WHEN** the transition duration elapses
- **THEN** all 64 faces have arrived at their respective nested-face positions within the parent tile
- **AND** no face is visually out of place relative to that parent nested layout

### Requirement: Scale and move animate in parallel on zoom-out
During fly-together, scaling and positional movement of each face SHALL both animate over the full transition duration, running concurrently rather than sequentially.

#### Scenario: Move does not wait for scale to complete
- **GIVEN** a fly-together animation has begun
- **WHEN** the midpoint of the animation is observed
- **THEN** each converging face has both changed size and, if past the move-delay threshold, changed position — neither dimension waits for the other to finish

### Requirement: Scale uses quadratic ease-in over the full zoom-out duration
The scale of each face during fly-together SHALL follow a quadratic ease-in curve across the full transition duration, starting slowly and accelerating toward the nested-face size.

#### Scenario: Faces start shrinking slowly and accelerate
- **GIVEN** a fly-together animation is in progress
- **WHEN** the early portion of the animation is observed
- **THEN** the faces appear to begin shrinking slowly and accelerate toward nested-face size
- **AND** the scale motion is consistent with quadratic ease-in rather than a constant rate or ease-out

### Requirement: Move holds, then quadratic ease-in over the remaining zoom-out span
During fly-together, each face's position SHALL remain at its starting grid center for the first quarter of the total transition duration. After that hold, positional movement SHALL follow a quadratic ease-in curve toward the parent nested-face destination over the remaining three-quarters of the duration.

#### Scenario: Move does not begin in the first quarter
- **GIVEN** a fly-together animation has just begun
- **WHEN** less than one-quarter of the transition duration has elapsed
- **THEN** the converging faces have not drifted from their starting grid centers
- **AND** only scale change is visible during this window

#### Scenario: Move completes by end of transition
- **GIVEN** a fly-together animation entered its move phase after the initial hold
- **WHEN** the full transition duration elapses
- **THEN** each face has arrived at its parent nested-face destination
- **AND** the motion completed with accelerating travel consistent with ease-in

