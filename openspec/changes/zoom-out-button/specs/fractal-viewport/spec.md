## ADDED Requirements

### Requirement: Visitor can zoom out one level at a time
The application SHALL provide a dedicated zoom-out control that returns the view to the parent region from the previous tile zoom, using a quick linear transition that mirrors tile zoom-in in reverse, until the canonical region is reached.

#### Scenario: Zoom out after a tile zoom
- **GIVEN** a visitor has zoomed into the fractal at least once by selecting a tile
- **WHEN** they activate the zoom-out control
- **THEN** the current view shrinks into the tile position from the most recent zoom
- **AND** the parent view fades in around it as the starfield shows through the transitioning outer area
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

### Requirement: Subtle starfield fills the space behind the fractal view
The application SHALL show a low-contrast starfield across the viewport behind the Mandelbrot render field, including letterbox margins, so the area around and between tiles feels like open space rather than flat gray fill.

#### Scenario: Letterbox margins show the starfield
- **GIVEN** the render square is inset with visible margins
- **WHEN** a visitor views the explorer
- **THEN** the margins show the starfield background instead of a solid flat field

#### Scenario: Starfield remains visually subtle
- **GIVEN** the fractal is rendered at normal exploration zoom levels
- **WHEN** a visitor views the explorer
- **THEN** the starfield is visible but does not materially obscure or compete with the Mandelbrot image

### Requirement: Tile grid gaps reveal the starfield
The 8×8 tile grid SHALL separate adjacent tiles with narrow gaps that show the starfield behind them rather than opaque gray grid lines drawn over the fractal.

#### Scenario: Gaps between tiles show stars
- **GIVEN** the tile grid is visible over the fractal
- **WHEN** a visitor looks at the boundaries between neighboring tiles
- **THEN** they see the starfield through the gap instead of a solid gray divider line

## MODIFIED Requirements

### Requirement: Tile selection zooms and recenters the view
When a visitor selects a tile, the application SHALL animate the view so that the selected tile's region becomes the full visible square. During the transition, the region outside the selected tile's growing area SHALL fade toward transparency so the starfield behind the view becomes increasingly visible as the selected tile expands.

#### Scenario: Tap selects and zooms a tile on mobile
- **WHEN** a visitor taps a tile on a touch-capable device
- **THEN** the tapped tile's region grows until it fills the visible square
- **AND** the surrounding area shows the pre-zoom view fading out so the starfield bleeds through as the tile expands

#### Scenario: Click selects and zooms a tile on pointer devices
- **WHEN** a visitor clicks a tile with a pointing device
- **THEN** the clicked tile's region grows until it fills the visible square
- **AND** the surrounding area shows the pre-zoom view fading out so the starfield bleeds through as the tile expands
