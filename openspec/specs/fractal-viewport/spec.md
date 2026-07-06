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

When a visitor selects a tile, the application SHALL animate the view so that the selected tile's region becomes the full visible square. During the transition, the region outside the selected tile's growing area SHALL continue to show the pre-zoom view unchanged.

#### Scenario: Tap selects and zooms a tile on mobile

- **WHEN** a visitor taps a tile on a touch-capable device
- **THEN** the tapped tile's region grows until it fills the visible square
- **AND** the surrounding area continues to display the view from before the tap until the transition completes

#### Scenario: Click selects and zooms a tile on pointer devices

- **WHEN** a visitor clicks a tile with a pointing device
- **THEN** the clicked tile's region grows until it fills the visible square
- **AND** the surrounding area continues to display the view from before the click until the transition completes

### Requirement: Zoom transitions are quick and linear

Tile-selection transitions SHALL use linear interpolation of the selected tile's on-screen region (position and size) and complete quickly enough to feel snappy during repeated exploration.

#### Scenario: Animation completes without easing delay

- **WHEN** a visitor selects a tile
- **THEN** the selected tile's screen region moves and scales at a constant rate from its grid cell to the full visible square
- **AND** the transition completes in a short, fixed duration suitable for rapid successive selections

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

