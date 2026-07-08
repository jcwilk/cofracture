## MODIFIED Requirements

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
