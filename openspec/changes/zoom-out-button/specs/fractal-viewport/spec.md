## ADDED Requirements

### Requirement: Visitor can zoom out one level at a time
The application SHALL provide a dedicated zoom-out control that returns the view to the parent region from the previous tile zoom, using a quick linear transition comparable to tile zoom-in, until the canonical region is reached.

#### Scenario: Zoom out after a tile zoom
- **GIVEN** a visitor has zoomed into the fractal at least once by selecting a tile
- **WHEN** they activate the zoom-out control
- **THEN** the view animates back to the region that was visible before the most recent tile zoom
- **AND** the visible square is again partitioned into an 8×8 tile grid after the transition completes

#### Scenario: Zoom out at canonical depth
- **GIVEN** a visitor is viewing the canonical region with no deeper zoom history
- **WHEN** they look for a zoom-out control
- **THEN** no zoom-out control is available to activate

### Requirement: Zoom-out control is placed at the upper-left near the render field
The zoom-out control SHALL appear in the upper-left area of the viewport, positioned relative to the letterboxed render square so it remains reachable without covering the fractal tile grid when margins exist.

#### Scenario: Portrait letterbox places control above the square
- **GIVEN** the viewport is taller than it is wide so the render square has vertical margins
- **WHEN** the zoom-out control is shown
- **THEN** it appears just outside the render square near its upper-left corner in the top margin

#### Scenario: Landscape letterbox places control beside the square
- **GIVEN** the viewport is wider than it is tall so the render square has horizontal margins
- **WHEN** the zoom-out control is shown
- **THEN** it appears just outside the render square near its upper-left corner in the side margin

#### Scenario: Nearly square viewport uses the corner
- **GIVEN** the viewport aspect ratio is close to square with little or no letterbox margin
- **WHEN** the zoom-out control is shown
- **THEN** it appears in the upper-left corner of the viewport
