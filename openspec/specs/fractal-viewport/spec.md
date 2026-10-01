# fractal-viewport Specification

## Purpose
Interactive Mandelbrot exploration with letterboxed viewport, 8×8 tile grid, and expand-in-place tile zoom.

## Requirements

### Requirement: Mandelbrot set is rendered in the viewport
The application SHALL render the Mandelbrot set for the complex-plane region currently in view.

#### Scenario: Initial load shows the canonical region
- **WHEN** a visitor opens the application for the first time
- **THEN** the Mandelbrot set for the canonical square region (real axis −2 through +2, imaginary axis −2 through +2) is visible

### Requirement: Canonical region is centered and letterboxed
The canonical square region SHALL be centered in the viewport. The square SHALL fill the narrow screen dimension with empty margin on the long dimension.

#### Scenario: Portrait orientation uses full width
- **WHEN** the viewport is taller than it is wide
- **THEN** the canonical square spans the full viewport width
- **AND** empty space appears above and below the square

#### Scenario: Landscape orientation uses full height
- **WHEN** the viewport is wider than it is tall
- **THEN** the canonical square spans the full viewport height
- **AND** empty space appears to the left and right of the square

### Requirement: Visible region is partitioned into an 8×8 tile grid
The currently visible square region SHALL be divided into an 8×8 grid of 64 equal tiles that cover the full visible area.

#### Scenario: Grid is visible on initial view
- **WHEN** the canonical region is displayed
- **THEN** exactly 64 tiles are presented over the visible square
- **AND** each tile covers an equal portion of the complex-plane region in view

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

### Requirement: Each zoomed view is re-tiled into 8×8
After a tile-selection transition completes, the new visible square SHALL again be partitioned into an 8×8 grid of 64 equal tiles.

#### Scenario: Repeated zoom subdivides the new view
- **WHEN** a tile-selection transition completes
- **THEN** the newly centered square is overlaid with 64 equal tiles
- **AND** selecting any of those tiles can zoom again using the same rules

### Requirement: Exploration input is mobile-first
Tile selection SHALL work reliably on mobile web browsers as a first-class interaction, without requiring hover-only or keyboard-only affordances.

#### Scenario: Touch is sufficient to navigate
- **WHEN** a visitor uses only touch input on a mobile browser
- **THEN** they can select tiles and zoom repeatedly through multiple levels

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
The 8×8 tile grid SHALL separate adjacent macro tiles with narrow gaps that show the starfield behind them rather than opaque gray grid lines drawn over the fractal. Gaps SHALL remain wide enough that neighboring macro tiles read as distinct pieces when nested glass faces and subtle wander are present.

#### Scenario: Gaps between tiles show stars
- **GIVEN** the tile grid is visible over the fractal
- **WHEN** a visitor looks at the boundaries between neighboring macro tiles
- **THEN** they see the starfield through the gap instead of a solid gray divider line

#### Scenario: Gaps remain readable with nested glass faces
- **GIVEN** macro tiles show nested glass faces and subtle idle wander
- **WHEN** a visitor looks between neighboring macro tiles
- **THEN** a clear starfield seam still separates the macro tiles as distinct pieces

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

### Requirement: Fractal color comes from coloring windows
The application SHALL color a pixel only from coloring windows its Mandelbrot orbit enters. A coloring window is a rectangular complex-plane region with one hue. Entry SHALL be tested at the orbit position on each step, not at the pixel's location. The same rule SHALL apply at every zoom level. The escape-time rainbow palette SHALL NOT color the fractal.

#### Scenario: One window paints only its hue
- **GIVEN** a single coloring window
- **WHEN** an orbit enters that window and no other
- **THEN** the pixel is a shade of that window's hue only
- **AND** no rainbow banding from escape time is visible

#### Scenario: Zoomed-in and zoomed-out views use the same rule
- **GIVEN** the visitor zooms from the canonical region into a smaller tile
- **WHEN** the picture is colored before and after that zoom
- **THEN** color still depends only on which coloring windows contain the orbit position
- **AND** the zoom changes the size and position of the local window rather than switching coloring methods

#### Scenario: An orbit that misses every window stays clear
- **GIVEN** an orbit that never enters a coloring window
- **WHEN** that pixel is shown
- **THEN** it stays clear so the starfield shows through

#### Scenario: A trapped orbit that revisits a window is strongly colored
- **GIVEN** an orbit that never escapes and repeatedly enters a coloring window
- **WHEN** that pixel is shown
- **THEN** it is strongly colored from that window
- **AND** it is not left clear merely because it never escaped

### Requirement: Repeated entries to a coloring window matter less
For each coloring window, the first time an orbit enters it SHALL change that pixel more than a later entry to the same window. Further entries SHALL keep adding less.

#### Scenario: A single entry is visible
- **GIVEN** an orbit that enters a coloring window once
- **WHEN** that pixel is compared with a pixel whose orbit never enters a window
- **THEN** the single entry produces a clearly visible amount of that hue

#### Scenario: Another revisit after many entries changes little
- **GIVEN** an orbit that has already entered the same coloring window many times
- **WHEN** it enters that window once more
- **THEN** the pixel changes only slightly compared with the change from the first entry

### Requirement: Multiple window hues stay vivid
When an orbit enters more than one coloring window, the pixel SHALL show a vivid combination of those hues. Greater influence SHALL pull the hue more. The result SHALL stay saturated. A combination that would otherwise look gray, brown, or dull SHALL resolve to a vivid hue led by the more influential window.

#### Scenario: Two windows blend without mud
- **GIVEN** two coloring windows of different hues
- **AND** an orbit that enters both
- **WHEN** the pixel is shown
- **THEN** its hue is closer to the window that influenced it more
- **AND** the color stays vivid rather than turning gray or brown

#### Scenario: Widely different hues do not wash out
- **GIVEN** three coloring windows of widely different hues
- **AND** an orbit that enters all three
- **WHEN** the pixel is shown
- **THEN** the color stays vivid
- **AND** it does not collapse toward gray

### Requirement: The local view is a coloring window
The visitor's current visible complex-plane square SHALL be a coloring window in the visitor's own hue, including while exploring alone and while a zoom transition is in progress. During a transition that window SHALL follow the region being displayed.

#### Scenario: Solo view is colored by the local window
- **GIVEN** no other participants are connected
- **WHEN** the visitor views the fractal
- **THEN** the fractal is colored by the local view window in the visitor's hue

#### Scenario: The local window tracks a zoom transition
- **GIVEN** a zoom transition is playing
- **WHEN** orbits are colored during that transition
- **THEN** the local coloring window matches the moving view region
- **AND** it is not stuck on only the starting frame or only the ending frame
