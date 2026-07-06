## MODIFIED Requirements

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
