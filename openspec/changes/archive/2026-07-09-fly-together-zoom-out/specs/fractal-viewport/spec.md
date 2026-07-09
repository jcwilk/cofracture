## MODIFIED Requirements

### Requirement: Visitor can zoom out one level at a time
The application SHALL provide a dedicated zoom-out control that returns the view to the parent region from the previous tile zoom, using a fly-together animation in which the current 8×8 macro faces converge into the nested-face slots of the parent tile from the most recent zoom-in, until the canonical region is reached.
(Previously: quick linear transition that mirrors tile zoom-in in reverse / single-tile reverse shrink.)

#### Scenario: Zoom out after a tile zoom
- **GIVEN** a visitor has zoomed into the fractal at least once by selecting a tile
- **WHEN** they activate the zoom-out control
- **THEN** the current view's macro faces animate into the nested-face slots of the parent tile from the most recent zoom-in
- **AND** the parent view fades in around the converging faces as the starfield shows through the transitioning outer area
- **AND** the visible square is again partitioned into an 8×8 tile grid after the transition completes

#### Scenario: Zoom out at canonical depth
- **GIVEN** a visitor is viewing the canonical region with no deeper zoom history
- **WHEN** they look for a zoom-out control
- **THEN** no zoom-out control is available to activate

### Requirement: Zoom transitions are quick and snappy
On zoom-in, the transition SHALL animate each of the selected macro tile's nested faces from its idle position to the position it will occupy in the new tile grid, completing quickly enough to feel snappy during repeated exploration. On zoom-out, the transition SHALL animate the current macro faces into the parent tile's nested-face slots with the same snappy duration expectation.
(Previously: zoom-out retained a single-tile reverse animation with no fly-apart.)

#### Scenario: Zoom-in animation uses fly-apart motion
- **WHEN** a visitor selects a macro tile to zoom in
- **THEN** the selected tile's nested faces animate from their idle positions toward the new grid destinations
- **AND** the transition completes in a short, fixed duration suitable for rapid successive selections

#### Scenario: Zoom-out animation uses fly-together motion
- **GIVEN** a visitor has zoomed in at least once
- **WHEN** they activate the zoom-out control
- **THEN** the current macro faces animate into the nested-face slots of the parent tile from the most recent zoom-in
- **AND** the transition completes in a short, fixed duration suitable for rapid successive zoom-outs
