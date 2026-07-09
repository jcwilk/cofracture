## MODIFIED Requirements

### Requirement: Zoom transitions are quick and snappy
On zoom-in, the transition SHALL animate each of the selected macro tile's nested faces from its idle position to the position it will occupy in the new tile grid, completing quickly enough to feel snappy during repeated exploration. On zoom-out, the view SHALL return to the previous region using the existing single-tile reverse animation.
(Previously named "Zoom transitions are quick and linear"; the zoom-in transition now animates each nested face of the selected tile to its next-grid destination rather than scaling a single tile linearly. Zoom-out is unchanged.)

#### Scenario: Zoom-in animation uses fly-apart motion
- **WHEN** a visitor selects a macro tile to zoom in
- **THEN** the selected tile's nested faces animate from their idle positions toward the new grid destinations
- **AND** the transition completes in a short, fixed duration suitable for rapid successive selections

#### Scenario: Zoom-out retains single-tile reverse
- **GIVEN** a visitor has zoomed in at least once
- **WHEN** they activate the zoom-out control
- **THEN** the current view shrinks back into the tile position from the most recent zoom-in
- **AND** no fly-apart animation occurs on zoom-out
